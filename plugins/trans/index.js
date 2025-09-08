'use strict';

const axios = require('axios');
const path = require('path');

// Hidden credit guard
function creditGuard() {
  try {
    if (process.env.CONVOX_CREDIT_OK === '1') return true;
    const expect = (process.env.BOT_AUTHOR || 'Thanh Vương').toLowerCase();
    const pkg = require(path.join(process.cwd(), 'package.json')) || {};
    const author = String(pkg.author || '').toLowerCase();
    const name = String(pkg.name || '').toLowerCase();
    const hasBrand = author.includes(expect) || author.includes('convox') || name.includes('convox');
    return hasBrand;
  } catch (_) {
    return true; // fail-open to avoid breaking legit setups
  }
}

// Simple VN diacritics remover for name matching
function stripVN(s = '') {
  return String(s)
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim();
}

// Language aliases map (names in English/Vietnamese/common variants) -> ISO 639-1 code
const LANG_MAP = (() => {
  const m = new Map();
  const add = (aliases, code) => aliases.forEach(a => m.set(stripVN(a), code));

  add(['auto', 'detect', 'tudong', 'tu dong'], 'auto');
  add(['vietnam', 'viet nam', 'vietnamese', 'tieng viet', 'vi', 'vn'], 'vi');
  add(['english', 'anh', 'tieng anh', 'en', 'eng', 'uk english'], 'en');
  add(['ukraine', 'ukraina', 'ukrainian', 'tieng ukraina', 'ua', 'ukr'], 'uk');
  add(['china', 'chinese', 'tieng trung', 'trung', 'zh', 'zh-cn', 'zhcn', 'simplified chinese'], 'zh-CN');
  add(['traditional chinese', 'zh-tw', 'zhtw', 'taiwan'], 'zh-TW');
  add(['japanese', 'nhat', 'tieng nhat', 'ja'], 'ja');
  add(['korean', 'han quoc', 'tieng han', 'ko'], 'ko');
  add(['thai', 'tieng thai', 'th'], 'th');
  add(['lao', 'laos', 'tieng lao', 'lo'], 'lo');
  add(['cambodian', 'khmer', 'tieng khmer', 'km'], 'km');
  add(['french', 'phap', 'tieng phap', 'fr'], 'fr');
  add(['german', 'duc', 'tieng duc', 'de'], 'de');
  add(['spanish', 'tay ban nha', 'tieng tay', 'es'], 'es');
  add(['portuguese', 'bo dao nha', 'pt'], 'pt');
  add(['russian', 'nga', 'tieng nga', 'ru'], 'ru');
  add(['hindi', 'an do', 'hi'], 'hi');
  add(['indonesian', 'indo', 'tieng indo', 'id'], 'id');
  add(['malay', 'tieng malaysia', 'ms'], 'ms');
  add(['filipino', 'tagalog', 'tl', 'philipines'], 'tl');
  add(['italian', 'y', 'tieng y', 'it'], 'it');
  add(['turkish', 'tho nhi ky', 'tr'], 'tr');
  add(['arabic', 'a rap', 'ar'], 'ar');
  add(['polish', 'ba lan', 'pl'], 'pl');
  add(['dutch', 'ha lan', 'nl'], 'nl');
  add(['uk', 'ua'], 'uk'); // fallbacks commonly used

  return m;
})();

function resolveLang(input, fallback = null) {
  if (!input) return fallback;
  const key = stripVN(input);
  // If input already looks like a code we support, accept quickly
  if (LANG_MAP.has(key)) return LANG_MAP.get(key);
  // If two-letter or pattern like zh-cn
  if (/^[a-z]{2}(-[A-Z]{2})?$/.test(input)) return input;
  return fallback;
}

async function translateGoogle(text, { from = 'auto', to = 'vi' } = {}) {
  if (!text || !String(text).trim()) {
    throw new Error('EMPTY_TEXT');
  }
  const params = new URLSearchParams({
    client: 'gtx',
    sl: from || 'auto',
    tl: to || 'vi',
    dt: 't',
    q: text
  });
  const url = `https://translate.googleapis.com/translate_a/single?${params.toString()}`;

  const { data } = await axios.get(url, { timeout: 15000 });
  // Expected shape: [ [ [ translatedText, originalText, ... ], ... ], null, detectedSourceLang, ... ]
  const segments = Array.isArray(data?.[0]) ? data[0] : [];
  const translated = segments.map(seg => (Array.isArray(seg) ? seg[0] : '')).join('');
  const detected = typeof data?.[2] === 'string' ? data[2] : (data?.[8]?.[0]?.[0] || 'auto');

  if (!translated) {
    throw new Error('TRANSLATE_FAILED');
  }

  return { text: translated, detectedFrom: detected };
}

class TranslatePlugin {
  constructor(api, config, authManager, logger) {
    this.api = api;
    this.config = config || {};
    this.authManager = authManager;
    this.logger = logger;
    this.name = 'Translate Plugin';
    this.version = '1.0.0';
    this.defaultTarget = this.config.defaultTarget || 'vi';
  }

  async initialize() { /* no-op */ }

  registerCommands(commandHandler) {
    commandHandler.registerCommand('trans', this.handleTrans.bind(this), {
      description: 'Dịch đa ngôn ngữ (reply hoặc kèm văn bản).',
      usage: '!trans [đích] / !trans [nguồn -> đích] / !trans [đích] [văn bản]',
      example: '!trans vi (reply) / !trans ukraina -> vietnam / !trans en Xin chào',
      category: 'utility',
      cooldown: 2,
      aliases: ['translate', 'dich']
    });
  }

  async cleanup() { /* no-op */ }

  parseCommandArgs(args) {
    // Join args to parse patterns like: "ukraina -> vietnam", or "vi Xin chao"
    const joined = (args || []).join(' ').trim();
    if (!joined) return {};

    // Pattern with arrow
    const arrowIdx = joined.indexOf('->');
    if (arrowIdx !== -1) {
      const left = joined.slice(0, arrowIdx).trim();
      const right = joined.slice(arrowIdx + 2).trim();
      return { fromRaw: left, toRaw: right, textRaw: '' };
    }

    // Pattern: first token is language, rest is text
    const tokens = joined.split(/\s+/);
    if (tokens.length >= 2) {
      const langTok = tokens[0];
      const rest = tokens.slice(1).join(' ');
      return { fromRaw: null, toRaw: langTok, textRaw: rest };
    }

    // Only target language provided
    return { fromRaw: null, toRaw: joined, textRaw: '' };
  }

  async handleTrans(event, args) {
    if (!creditGuard()) {
      // Soft-block if credits altered (owner can override by CONVOX_CREDIT_OK=1)
      return this.sendMessage(event.threadID, '❌ Credit không hợp lệ.', event.messageID);
    }
    const { threadID, messageID } = event;
    try {
      const reply = event.messageReply || event.replyToMessage || event.quotedMessage;

      const { fromRaw, toRaw, textRaw } = this.parseCommandArgs(args);
      const from = resolveLang(fromRaw, 'auto');
      const to = resolveLang(toRaw, this.defaultTarget);

      // Determine input text
      const inputText = (reply?.body && reply.body.trim()) || (textRaw && textRaw.trim());

      if (!to) {
        return this.sendMessage(threadID, '❌ Vui lòng chỉ định ngôn ngữ đích. Ví dụ: !trans vi hoặc !trans ukraina -> vietnam', messageID);
      }

      if (!inputText) {
        return this.sendMessage(threadID, '❌ Không có văn bản để dịch. Hãy reply tin nhắn cần dịch hoặc nhập: !trans vi Xin chào', messageID);
      }

      if ((from === 'auto' || !from) && to && stripVN(to) === stripVN('auto')) {
        return this.sendMessage(threadID, '❌ Ngôn ngữ đích không hợp lệ.', messageID);
      }

  const { text: translated } = await translateGoogle(inputText, { from: from || 'auto', to });

  const replyToId = reply?.messageID || messageID;

  await this.sendMessage(threadID, String(translated || '').trim() || '...', replyToId);
    } catch (error) {
      const code = error?.message || 'UNKNOWN_ERROR';
      await this.sendMessage(threadID, `❌ Không thể dịch: ${code}`, messageID);
    }
  }

  sendMessage(threadID, message, replyTo) {
    return new Promise((resolve) => {
      const payload = typeof message === 'string' ? { body: message } : (message || {});
      this.api.sendMessage(payload, threadID, () => resolve(), replyTo);
    });
  }

  getInfo() {
    return {
      name: this.name,
      version: this.version,
      description: 'Dịch đa ngôn ngữ sử dụng Google Translate công khai',
    };
  }
}

module.exports = TranslatePlugin;
