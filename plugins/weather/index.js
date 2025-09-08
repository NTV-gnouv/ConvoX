'use strict';

const axios = require('axios');

/**
 * Weather Plugin v1.0.0
 * Tra cứu thời tiết theo địa phương/khu vực/thành phố sử dụng Open‑Meteo (không cần API key)
 *
 * Lệnh:
 *  - !weather <địa điểm>
 *  - !weather now <địa điểm>
 *  - !weather daily <địa điểm>
 *  - Alias: thoitiet, wt, w
 */
class WeatherPlugin {
    constructor(api, config, authManager, logger) {
        this.api = api;
        this.config = {
            enabled: true,
            language: 'vi',
            units: 'metric', // metric|imperial (hiện tại Open-Meteo trả °C, m/s)
            defaultLocation: '',
            ...config
        };
        this.authManager = authManager;
        this.logger = logger;
        this.name = 'Weather';
        this.version = '1.0.0';
        this.isInitialized = false;
    }

    async initialize() {
        try {
            this.isInitialized = true;
            this.logger && this.logger.info('[Weather] Plugin initialized');
        } catch (error) {
            this.logger && this.logger.logError(error, '[Weather] Init failed');
            throw error;
        }
    }

    registerCommands(commandHandler) {
        commandHandler.registerCommand('weather', this.handleWeather.bind(this), {
            description: 'Xem thời tiết theo địa điểm',
            usage: '!weather [now|daily] <địa điểm>',
            example: '!weather Hà Nội / !weather now Đà Nẵng / !weather daily Ho Chi Minh',
            category: 'utility',
            cooldown: 8,
            adminOnly: false
        });
    }

    async handleWeather(event, args = []) {
        const { threadID } = event;

        const sub = (args[0] || '').toLowerCase();
        let mode = 'now';
        let query = '';

        if (['now', 'daily', 'today'].includes(sub)) {
            mode = sub === 'today' ? 'daily' : sub;
            query = args.slice(1).join(' ').trim();
        } else {
            query = args.join(' ').trim();
        }

        if (!query) {
            query = (this.config.defaultLocation || '').trim();
        }

        if (!query) {
            await this.api.sendMessage('Cách dùng: !weather [now|daily] <địa điểm|lat,lon>\nVD: !weather Hà Nội | !weather daily Ho Chi Minh | !weather now 16.00,108.26', threadID);
            return;
        }

        try {
            // 1) Thử parse tọa độ trực tiếp (lat,lon)
            const coords = this.tryParseLatLonPair(query);
            let place;
            if (coords) {
                // Reverse geocoding để hiển thị tên dễ đọc
                place = await this.reverseGeocode(coords.lat, coords.lon, this.config.language) || {
                    name: `(${coords.lat.toFixed(4)}, ${coords.lon.toFixed(4)})`,
                    admin1: '',
                    country: '',
                    latitude: coords.lat,
                    longitude: coords.lon,
                    timezone: 'auto'
                };
            } else {
                // 2) Geocoding theo tên địa điểm
                place = await this.geocode(query, this.config.language);
                if (!place) {
                    await this.api.sendMessage(`Không tìm thấy địa điểm: ${query}`, threadID);
                    return;
                }
            }

            const data = await this.fetchForecast(place.latitude, place.longitude, this.config.language);
            const text = mode === 'daily' ? this.formatDaily(place, data) : this.formatNow(place, data);
            await this.api.sendMessage(text, threadID);
        } catch (err) {
            this.logger && this.logger.logError(err, '[Weather] fetch failed');
            await this.api.sendMessage('Không thể lấy thông tin thời tiết lúc này. Vui lòng thử lại sau.', threadID);
        }
    }

    normalize(str = '') {
        // Remove diacritics, convert đ→d, strip punctuation to spaces, collapse spaces
        return (str || '')
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/đ/g, 'd').replace(/Đ/g, 'D')
            .toLowerCase()
            .replace(/[^a-z0-9\s]/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
    }

    buildGeoQueries(name) {
        const q = (name || '').trim();
        const rawParts = q.split(',').map(s => s.trim()).filter(Boolean);
        const parts = rawParts.map(p => this.normalize(p)).filter(Boolean);
        const lastPart = parts[parts.length - 1] || '';
        const ascii = this.normalize(q);
        const queries = [];

        const langVi = this.config.language || 'vi';

        // Helper to add query variant
        const addQ = (str, lang = langVi) => {
            const v = (str || '').trim();
            if (!v) return;
            queries.push({ q: v, lang });
        };

        // 1) Full string (as-is) + ascii concat without commas
        addQ(q, langVi);
        if (ascii && ascii !== q.toLowerCase()) addQ(ascii, 'en');
        if (parts.length > 1) addQ(parts.join(' '), 'en');

        // 2) Progressive combinations: first + second, first only
        if (rawParts.length >= 2) {
            const firstTwo = `${rawParts[0]} ${rawParts[1]}`.trim();
            addQ(firstTwo, langVi);
            const nFirstTwo = this.normalize(firstTwo);
            addQ(nFirstTwo, 'en');
        }
        if (rawParts.length >= 1) {
            addQ(rawParts[0], langVi);
            addQ(this.normalize(rawParts[0]), 'en');
        }

        // 3) Last part (city/region) if it's not generic country
        if (rawParts.length > 1 && lastPart && lastPart !== 'vietnam' && lastPart !== 'viet nam') {
            addQ(rawParts[rawParts.length - 1], langVi);
            addQ(lastPart, 'en');
        }

        // Special-case Da Nang fallback
        const nq = this.normalize(q);
        if (nq.includes('da nang') || nq.includes('danang')) {
            addQ('Da Nang', 'en');
            addQ('Đà Nẵng', langVi);
        }

        // De-duplicate by key
        const seen = new Set();
        return queries.filter(({ q, lang }) => {
            const key = `${q}|${lang}`;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        });
    }

    scorePlace(place, tokens, parts, originalTokens = [], hasAccents = false) {
        const nName = this.normalize(place.name || '');
        const nAdmin1 = this.normalize(place.admin1 || '');
        const nCountry = this.normalize(place.country || '');
        const oName = (place.name || '').toLowerCase();
        const oAdmin1 = (place.admin1 || '').toLowerCase();
        const oCountry = (place.country || '').toLowerCase();

        let score = 0;

        // Token coverage (normalized words from full query)
        for (const t of tokens) {
            if (!t) continue;
            if (nName.includes(t)) score += 2;
            else if (nAdmin1.includes(t)) score += 1.5;
            else if (nCountry.includes(t)) score += 0.5;
        }

        // Accent-aware boost: if user typed accents, prioritize exact (diacritic) substring matches
        let accentBoost = 0;
        for (const ot of originalTokens) {
            if (ot.length <= 2) continue; // skip very short tokens
            if (oName.includes(ot)) accentBoost += 4;
            else if (oAdmin1.includes(ot)) accentBoost += 3;
            else if (oCountry.includes(ot)) accentBoost += 1;
        }
        score += accentBoost;

        // Part coverage (comma-separated specificity)
        const pFirst = parts[0] || '';
        const pLast = parts[parts.length - 1] || '';
        if (pFirst) {
            if (nName.includes(pFirst)) score += 3;
            else if (nAdmin1.includes(pFirst)) score += 2;
        }
        if (pLast && pLast !== 'vietnam' && pLast !== 'viet nam') {
            if (nName.includes(pLast)) score += 2.5;
            else if (nAdmin1.includes(pLast)) score += 2;
        }

        // Prefer VN but penalize if only country matches
        const isVN = nCountry === 'vietnam' || nCountry === 'viet nam';
        if (isVN) score += 0.3;
        const matchedNameOrAdmin = parts.some(p => p && (nName.includes(p) || nAdmin1.includes(p)));
        const matchedOnlyCountry = !matchedNameOrAdmin && parts.some(p => nCountry.includes(p));
        if (matchedOnlyCountry) score -= 2; // avoid country-only picks

        // If user used accents but we didn't match any accent-aware token in name/admin1, penalize
        if (hasAccents && accentBoost === 0) score -= 3;

        // Small bonus for admin1=da nang if mentioned in query
        if (parts.some(p => p.includes('da nang')) && nAdmin1.includes('da nang')) score += 1;

        return score;
    }

    async geocode(name, language = 'vi') {
        const url = 'https://geocoding-api.open-meteo.com/v1/search';
    const candidates = this.buildGeoQueries(name);
    const normalizedFull = this.normalize(name);
    const qTokens = normalizedFull.split(/\s+/).filter(Boolean);
    const qParts = normalizedFull.split(',').map(s => s.trim()).filter(Boolean);
    const originalLower = (name || '').toLowerCase();
    const originalTokens = originalLower.split(/\s+/).filter(Boolean);
    const hasAccents = /[\u00C0-\u024F\u1E00-\u1EFFđĐ]/.test(name); // rough check for accents

        let best = null;
        for (const { q, lang } of candidates) {
            try {
                const params = { name: q, count: 10, language: lang, format: 'json' };
                const res = await axios.get(url, { params, timeout: 10000 });
                const results = (res.data && res.data.results) || [];
                for (const r of results) {
                    const score = this.scorePlace(r, qTokens, qParts, originalTokens, hasAccents);
                    if (!best || score > best.score) {
                        best = { score, r };
                    }
                }
                // Thresholds: if accents used, require higher confidence; otherwise moderate
                if (best && best.score >= (hasAccents ? 7 : 5)) break; // good enough match
            } catch (_) {
                // continue to next candidate
            }
        }

        if (!best) return null;
        const r = best.r;
        return {
            name: r.name,
            admin1: r.admin1,
            country: r.country,
            latitude: r.latitude,
            longitude: r.longitude,
            timezone: r.timezone
        };
    }

    async fetchForecast(lat, lon, language = 'vi') {
        const url = 'https://api.open-meteo.com/v1/forecast';
        const params = {
            latitude: lat,
            longitude: lon,
            current: [
                'temperature_2m',
                'relative_humidity_2m',
                'apparent_temperature',
                'is_day',
                'precipitation',
                'weather_code',
                'wind_speed_10m',
                'wind_direction_10m'
            ].join(','),
            hourly: [
                'temperature_2m',
                'precipitation_probability',
                'weather_code'
            ].join(','),
            daily: [
                'weather_code',
                'temperature_2m_max',
                'temperature_2m_min',
                'precipitation_sum'
            ].join(','),
            timezone: 'auto',
            forecast_days: 3,
            language
        };
        const res = await axios.get(url, { params, timeout: 12000 });
        return res.data;
    }

    tryParseLatLonPair(text) {
        const m = (text || '').trim().match(/\b(-?\d{1,3}(?:\.\d+)?)[,\s]+(-?\d{1,3}(?:\.\d+)?)\b/);
        if (!m) return null;
        const lat = parseFloat(m[1]);
        const lon = parseFloat(m[2]);
        if (isFinite(lat) && isFinite(lon) && Math.abs(lat) <= 90 && Math.abs(lon) <= 180) {
            return { lat, lon };
        }
        return null;
    }

    // Removed map link parsing by request; only direct lat,lon remains

    async reverseGeocode(lat, lon, language = 'vi') {
        try {
            const url = 'https://geocoding-api.open-meteo.com/v1/reverse';
            const params = { latitude: lat, longitude: lon, language, format: 'json', count: 1 };
            const res = await axios.get(url, { params, timeout: 10000 });
            const results = res.data && res.data.results;
            if (results && results.length > 0) {
                const r = results[0];
                return {
                    name: r.name,
                    admin1: r.admin1,
                    country: r.country,
                    latitude: lat,
                    longitude: lon,
                    timezone: r.timezone || 'auto'
                };
            }
        } catch (_) { /* ignore */ }
        return null;
    }

    weatherCodeToText(code) {
        // Nguồn: https://open-meteo.com/en/docs#weathervariables
        const map = {
            0: 'Trời quang',
            1: 'Nhiều nắng',
            2: 'Có mây',
            3: 'U ám',
            45: 'Sương mù',
            48: 'Sương mù đóng băng',
            51: 'Mưa phùn nhẹ',
            53: 'Mưa phùn',
            55: 'Mưa phùn dày',
            56: 'Mưa phùn băng nhẹ',
            57: 'Mưa phùn băng dày',
            61: 'Mưa nhẹ',
            63: 'Mưa vừa',
            65: 'Mưa to',
            66: 'Mưa băng nhẹ',
            67: 'Mưa băng to',
            71: 'Tuyết nhẹ',
            73: 'Tuyết vừa',
            75: 'Tuyết to',
            80: 'Mưa rào nhẹ',
            81: 'Mưa rào',
            82: 'Mưa rào to',
            85: 'Mưa tuyết rào nhẹ',
            86: 'Mưa tuyết rào to',
            95: 'Dông',
            96: 'Dông kèm mưa đá nhẹ',
            99: 'Dông kèm mưa đá to'
        };
        return map[code] || 'Không rõ';
    }

    arrow(dirDeg = 0) {
        // 8 hướng đơn giản
        const dirs = ['↑', '↗', '→', '↘', '↓', '↙', '←', '↖'];
        const idx = Math.round(dirDeg / 45) % 8;
        return dirs[idx];
    }

    placeLine(place) {
        const parts = [place.name];
        if (place.admin1) parts.push(place.admin1);
        if (place.country) parts.push(place.country);
        return parts.join(', ');
    }

    formatNow(place, data) {
        const c = data.current || {};
        const code = c.weather_code;
        const cond = this.weatherCodeToText(code);
        const temp = c.temperature_2m;
        const feel = c.apparent_temperature;
        const hum = c.relative_humidity_2m;
        const wind = c.wind_speed_10m;
        const wdir = c.wind_direction_10m;
        const precip = c.precipitation;

        const loc = this.placeLine(place);
        const arrow = this.arrow(wdir);

        return (
            `🌤️ Thời tiết hiện tại: ${loc}\n` +
            `• Trạng thái: ${cond}\n` +
            `• Nhiệt độ: ${temp}°C (cảm giác: ${feel}°C)\n` +
            `• Độ ẩm: ${hum}%\n` +
            `• Gió: ${wind} m/s ${arrow}\n` +
            `• Lượng mưa: ${precip || 0} mm`
        );
    }

    formatDaily(place, data) {
        const d = data.daily || {};
        const times = d.time || [];
        const minT = d.temperature_2m_min || [];
        const maxT = d.temperature_2m_max || [];
        const wCodes = d.weather_code || [];    
        const rain = d.precipitation_sum || [];
        const loc = this.placeLine(place);

        const lines = [`📅 Dự báo 3 ngày: ${loc}`];
        for (let i = 0; i < Math.min(3, times.length); i++) {
            const day = times[i];
            const cond = this.weatherCodeToText(wCodes[i]);
            lines.push(
                `• ${day}: ${cond} | ${minT[i]}°C → ${maxT[i]}°C | Mưa: ${rain[i] || 0} mm`
            );
        }
        lines.push(`\nDùng "!weather <địa điểm>" để xem thời tiết hiện tại`);
        return lines.join('\n');
    }

    async cleanup() {
        // nothing to cleanup
        this.logger && this.logger.info('[Weather] Plugin cleaned up');
    }

    getInfo() {
        return {
            name: this.name,
            version: this.version,
            description: 'Plugin xem thời tiết theo địa điểm (Open‑Meteo)',
            credits: 'ConvoX Team'
        };
    }
}

module.exports = WeatherPlugin;
