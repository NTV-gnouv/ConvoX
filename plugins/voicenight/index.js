'use strict';

const fs = require('fs-extra');
const path = require('path');

class VoiceNightPlugin {
  constructor(api, config, authManager, logger) {
    this.api = api;
    this.config = config || {};
    this.authManager = authManager;
    this.logger = logger;
    this.name = 'VoiceNight Plugin';
    this.version = '1.0.0';
    this.statePath = path.join(__dirname, 'nn_state.json');
    this.voiceDir = path.join(__dirname, 'voice');
    this.timer = null;
    this.state = { // per thread settings
      // [threadID]: { enabled: true, time: 'HH:mm', lastSentOn: 'YYYY-MM-DD' }
    };
    this.allowedWindow = { startHour: 19, endHour: 4 }; // 19:00 – 04:00
  }

  async initialize() {
    // Hidden credit guard similar to other plugins
    try {
      const pkg = require(path.join(process.cwd(), 'package.json'));
      const author = String(pkg.author || '').toLowerCase();
      const ok = author.includes('convox') || author.includes('thanh vương') || process.env.CONVOX_CREDIT_OK === '1';
      if (!ok) return; // silently do nothing if credit is stripped
    } catch {}
    await this.loadState();
    this.startScheduler();
  }

  registerCommands(commandHandler) {
    commandHandler.registerCommand('nn', this.handleNnCommand.bind(this), {
      description: 'Hẹn giờ gửi 1 voice ngẫu nhiên để chúc ngủ ngon (trong khung 19:00–04:00).',
      usage: '!nn <giờ> | !nn off\nVD: !nn 22h | !nn 22:30 | !nn off',
      example: '!nn 22:15',
      category: 'fun',
      cooldown: 3,
      minRole: 1, // Moderator+
      aliases: []
    });
  }

  async cleanup() {
    try { if (this.timer) clearInterval(this.timer); } catch {}
  }

  async loadState() {
    try {
      if (await fs.pathExists(this.statePath)) {
        this.state = await fs.readJson(this.statePath);
      } else {
        await this.saveState();
      }
    } catch (e) {
      this.state = {};
      try { await this.saveState(); } catch {}
    }
  }

  async saveState() {
    try {
      await fs.writeJson(this.statePath, this.state, { spaces: 2 });
    } catch (e) {
      if (this.logger) this.logger.logError(e, '[voicenight] Failed to save state');
    }
  }

  startScheduler() {
    if (this.timer) clearInterval(this.timer);
    // Check every 30 seconds
    this.timer = setInterval(() => {
      try { this.tick(); } catch (e) { if (this.logger) this.logger.logError(e, '[voicenight] tick error'); }
    }, 30 * 1000);
  }

  getNowParts() {
    const now = new Date();
    const hh = now.getHours();
    const mm = now.getMinutes();
    const hhmm = `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
    const ymd = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    return { now, hh, mm, hhmm, ymd };
  }

  isTimeInAllowedWindow(hh, mm) {
    // Allowed if hour >= 19 or hour < 4 (00:00–04:00)
    if (hh >= this.allowedWindow.startHour) return true;
    if (hh < this.allowedWindow.endHour) return true;
    // include exactly 04:00
    if (hh === this.allowedWindow.endHour && mm === 0) return true;
    return false;
  }

  timesEqualHHMM(t1, t2) { return String(t1) === String(t2); }

  async tick() {
    const { hhmm, ymd } = this.getNowParts();
    const entries = Object.entries(this.state || {});
    if (!entries.length) return;

    for (const [threadID, cfg] of entries) {
      if (!cfg || !cfg.enabled || !cfg.time) continue;
      if (!this.timesEqualHHMM(cfg.time, hhmm)) continue; // only fire at exact minute

      // prevent duplicate sends within same day
      if (cfg.lastSentOn === ymd) continue;

      // ensure group is still allowed
      try {
        if (!this.authManager.isGroupAllowed(threadID)) continue;
      } catch {}

      try {
        await this.sendRandomVoice(threadID);
        cfg.lastSentOn = ymd;
        this.state[threadID] = cfg;
        await this.saveState();
      } catch (e) {
        if (this.logger) this.logger.logError(e, `[voicenight] Failed to send scheduled voice to ${threadID}`);
      }
    }
  }

  parseTimeInput(inputRaw) {
    if (!inputRaw) return null;
    const s = String(inputRaw).trim().toLowerCase();
    if (!s) return null;
    if (s.includes('off')) return { off: true };

    // Accept formats: HH, HHh, HH:mm, HHhmm, H, H:mm, Hhmm
    let hh = null, mm = 0;
    const hms = s.replace(/\s+/g, '');

    const colon = hms.split(':');
    if (colon.length === 2) {
      hh = parseInt(colon[0].replace(/[^0-9]/g, ''), 10);
      mm = parseInt(colon[1].replace(/[^0-9]/g, ''), 10);
    } else if (/^\d{1,2}h\d{1,2}$/.test(hms)) {
      const parts = hms.split('h');
      hh = parseInt(parts[0], 10);
      mm = parseInt(parts[1], 10);
    } else if (/^\d{1,2}h$/.test(hms)) {
      hh = parseInt(hms.replace('h', ''), 10);
      mm = 0;
    } else if (/^\d{1,2}$/.test(hms)) {
      hh = parseInt(hms, 10);
      mm = 0;
    }

    if (hh == null || isNaN(hh) || isNaN(mm)) return null;
    if (hh < 0 || hh > 23) return null;
    if (mm < 0 || mm > 59) return null;
    return { hh, mm };
  }

  fmtHHMM(hh, mm) {
    return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
  }

  async handleNnCommand(event, args) {
    const { senderID, threadID } = event;

    // Only allow in approved groups
    if (!this.authManager.isGroupAllowed(threadID)) {
      return this.api.sendMessage('❌ Nhóm này chưa được duyệt sử dụng tính năng này.', threadID);
    }

    // Double-check permission (CommandHandler enforces minRole, but keep a defensive check)
    if (!this.authManager.hasPermission(senderID, 1, threadID)) {
      return this.api.sendMessage('❌ Bạn cần quyền Moderator trở lên để dùng lệnh này.', threadID);
    }

    const first = (args[0] || '').trim();
    const parsed = this.parseTimeInput(first);

    if (!first || !parsed) {
      return this.api.sendMessage('Cách dùng: !nn <giờ> (trong 19:00–04:00) | !nn off\nVD: !nn 22h | !nn 22:30', threadID);
    }

    if (parsed.off) {
      // Turn off
      if (this.state[threadID]?.enabled) {
        this.state[threadID].enabled = false;
        await this.saveState();
        return this.api.sendMessage('✅ Đã tắt chế độ gửi voice tự động ban đêm cho nhóm này.', threadID);
      } else {
        return this.api.sendMessage('ℹ️ Chế độ tự động hiện đang tắt.', threadID);
      }
    }

    const { hh, mm } = parsed;
    if (!this.isTimeInAllowedWindow(hh, mm)) {
      return this.api.sendMessage('⛔ Khung giờ chỉ từ 19:00 tối đến 04:00 sáng. Không ai ngủ giờ trên cả.', threadID);
    }

    const timeStr = this.fmtHHMM(hh, mm);
    // Save schedule
    this.state[threadID] = this.state[threadID] || {};
    this.state[threadID].enabled = true;
    this.state[threadID].time = timeStr;
    // Reset lastSentOn so tonight it will send when time matches
    delete this.state[threadID].lastSentOn;
    await this.saveState();

    // Send a marker voice immediately
    try {
      await this.sendRandomVoice(threadID, '✅ Đã cài đặt! Sẽ tự động gửi vào lúc ' + timeStr);
    } catch (e) {
      if (this.logger) this.logger.logError(e, '[voicenight] Failed to send marker voice');
      await this.api.sendMessage('✅ Đã cài đặt! (Gửi voice đánh dấu thất bại, nhưng lịch vẫn hoạt động)', threadID);
    }
  }

  pickRandomVoicePath() {
    // Expect files: nn1.m4a .. nn6.m4a
    const total = 6;
    const idx = 1 + Math.floor(Math.random() * total);
    const file = `nn${idx}.m4a`;
    const full = path.join(this.voiceDir, file);
    return full;
  }

  async sendRandomVoice(threadID, extraText = '') {
    // Ensure file exists; retry a few times if random picks a missing one
    let pick = null;
    for (let i = 0; i < 6; i++) {
      const cand = this.pickRandomVoicePath();
      if (await fs.pathExists(cand)) { pick = cand; break; }
    }
    if (!pick) throw new Error('No voice files found');

    const stream = fs.createReadStream(pick);
    const body = (extraText ? `${extraText}\n` : '') ;
    await new Promise((resolve, reject) => {
      this.api.sendMessage({ body, attachment: stream }, threadID, (err) => {
        if (err) reject(err); else resolve();
      });
    });
  }

  getInfo() {
    return {
      name: this.name,
      version: this.version,
      description: 'Gửi voice chúc ngủ ngon theo lịch trong khung 19:00–04:00',
    };
  }
}

module.exports = VoiceNightPlugin;
