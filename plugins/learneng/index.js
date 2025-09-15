'use strict';

// LearnEng plugin: vocabulary learning with simple storage and translation
const fs = require('fs');
const path = require('path');
const axios = require('axios');

const STORE_FILE = path.join(__dirname, 'data.json');
const WORDS_FILE = path.join(__dirname, 'words.json');

function readJsonSafe(file, fallback) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (_) {
    return fallback;
  }
}

function writeJsonSafe(file, data) {
  try {
    fs.writeFileSync(file, JSON.stringify(data, null, 2));
  } catch (e) {
    // ignore
  }
}

function stripVN(s = '') {
  return String(s)
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim();
}

class LearnEngPlugin {
  constructor(api, config, authManager, logger) {
    this.api = api;
    this.config = config || {};
    this.authManager = authManager;
    this.logger = logger;
    this.words = [];
    this.store = { _cache: {}, _quiz: {} }; // _quiz: per-thread pending quiz { threadID: { userID, word, vi } }
    this.ephemeral = new Map(); // threadID -> [{ id, timer }]
  }

  async initialize() {
    // Load words list
    try {
      this.words = readJsonSafe(WORDS_FILE, []);
      if (!Array.isArray(this.words) || this.words.length === 0) this.words = [];
    } catch (_) { this.words = []; }
    // Load store
    this.store = readJsonSafe(STORE_FILE, { _cache: {}, _quiz: {} });
  }

  registerCommands(commandHandler) {
    commandHandler.registerCommand('learneng', this.handleLearnEng.bind(this), {
      description: 'Lấy N từ tiếng Anh mới kèm nghĩa tiếng Việt',
      usage: '!learnEng <n=5>',
      example: '!learnEng 10',
      category: 'education',
      cooldown: 3,
      aliases: ['learn', 'le']
    });

    commandHandler.registerCommand('note', this.handleNote.bind(this), {
      description: 'Ghi nhớ các từ vào bộ nhớ của bạn',
      usage: '!note word1,word2,word3',
      example: '!note one,two,three',
      category: 'education',
      cooldown: 2
    });

    commandHandler.registerCommand('ttl', this.handleTTL.bind(this), {
      description: 'Test bài: bot hỏi ngẫu nhiên 1 từ đã lưu, bạn reply nghĩa tiếng Việt',
      usage: '!ttl',
      example: '!ttl',
      category: 'education',
      cooldown: 2
    });
  }

  // Persist state
  save() { writeJsonSafe(STORE_FILE, this.store); }

  getUserDict(userID) {
    const uid = String(userID);
    if (!this.store[uid]) this.store[uid] = {};
    return this.store[uid];
  }

  // Translation using MyMemory API with caching
  async translateEnToVi(text) {
    const key = String(text).toLowerCase().trim();
    if (!key) return '';
    if (this.store._cache && this.store._cache[key] && this.store._cache[key].vi) {
      return this.store._cache[key].vi;
    }

    try {
      const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(key)}&langpair=en|vi`;
      const res = await axios.get(url, { timeout: 8000 });
      const vi = res?.data?.responseData?.translatedText || '';
      if (vi) {
        this.store._cache[key] = { vi, ts: Date.now() };
        this.save();
        return vi;
      }
    } catch (e) {
      // ignore API errors, will fallback
    }
    // Fallback: return key itself
    return key;
  }

  pickNewWordsForUser(userID, n = 5) {
    const uidDict = this.getUserDict(userID);
    const learned = new Set(Object.keys(uidDict));
    const pool = this.words.filter(w => !learned.has(String(w).toLowerCase()));
    // shuffle simple
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    return pool.slice(0, n);
  }

  // Ephemeral message helpers
  async sendEphemeral(message, threadID, ttlMs = 600000) {
    try {
      const info = await new Promise((resolve, reject) => {
        this.api.sendMessage(message, threadID, (err, msgInfo) => {
          if (err) reject(err); else resolve(msgInfo);
        });
      });
      if (info?.messageID) this.scheduleEphemeral(threadID, info.messageID, ttlMs);
      return info;
    } catch (e) {
      try { await this.api.sendMessage(message, threadID); } catch {}
      return null;
    }
  }

  scheduleEphemeral(threadID, messageID, ttlMs) {
    const timers = this.ephemeral.get(threadID) || [];
    const timer = setTimeout(async () => {
      try { await this.api.unsendMessage(messageID); } catch {}
      this.removeEphemeral(threadID, messageID);
    }, ttlMs);
    timers.push({ id: messageID, timer });
    this.ephemeral.set(threadID, timers);
  }

  removeEphemeral(threadID, messageID) {
    const timers = this.ephemeral.get(threadID);
    if (!timers) return;
    const next = timers.filter(t => t.id !== messageID);
    if (next.length === 0) this.ephemeral.delete(threadID);
    else this.ephemeral.set(threadID, next);
  }

  async handleLearnEng(event, args) {
    const { threadID, senderID } = event;
    const nRaw = parseInt(args?.[0] || '5', 10);
    const n = Math.min(Math.max(isNaN(nRaw) ? 5 : nRaw, 1), 50);

    const selected = this.pickNewWordsForUser(senderID, n);
    if (selected.length === 0) {
      await this.api.sendMessage('✅ Bạn đã học hết danh sách từ cơ bản hiện có!', threadID);
      return;
    }

    const lines = ['📚 Từ mới hôm nay:'];
    for (const word of selected) {
      const vi = await this.translateEnToVi(word);
      lines.push(`• ${word} — ${vi}`);
    }
    lines.push('\n💡 Dùng "!note word1,word2" để lưu lại các từ muốn ôn.');

    // Auto-unsend after 10 minutes (600000 ms)
    await this.sendEphemeral(lines.join('\n'), threadID, 600000);
  }

  async handleNote(event, args) {
    const { threadID, senderID } = event;
    const raw = (args || []).join(' ').trim();
    if (!raw) {
      await this.api.sendMessage('❌ Dùng: !note word1,word2,word3', threadID);
      return;
    }
    // Split by comma or spaces
    const list = raw
      .split(/[;,\n]+|\s{2,}/)
      .map(s => String(s).trim().toLowerCase())
      .filter(Boolean);

    if (list.length === 0) {
      await this.api.sendMessage('❌ Không tìm thấy từ hợp lệ để lưu.', threadID);
      return;
    }

    const dict = this.getUserDict(senderID);
    const added = [];
    for (const w of list) {
      if (!dict[w]) {
        const vi = await this.translateEnToVi(w);
        dict[w] = { vi, correct: 0, wrong: 0, addedAt: Date.now(), lastTest: 0 };
        added.push(`${w} — ${vi}`);
      }
    }
    this.save();

    if (added.length === 0) {
      await this.api.sendMessage('ℹ️ Tất cả các từ đã tồn tại trong bộ nhớ của bạn.', threadID);
    } else {
      const msg = '✅ Đã lưu các từ:\n' + added.map(x => '• ' + x).join('\n');
      await this.api.sendMessage(msg, threadID);
    }
  }

  async handleTTL(event) {
    const { threadID, senderID } = event;
    const dict = this.getUserDict(senderID);
    const words = Object.keys(dict);
    if (words.length === 0) {
      await this.api.sendMessage('❌ Bạn chưa lưu từ nào. Dùng "!note" trước nhé.', threadID);
      return;
    }

    // pick random, bias to ones with fewer correct or older lastTest
    words.sort((a, b) => {
      const A = dict[a], B = dict[b];
      const scoreA = (A.correct - A.wrong) + Math.min(0, Date.now() - (A.lastTest || 0)) / 1e13; // simple heuristic
      const scoreB = (B.correct - B.wrong) + Math.min(0, Date.now() - (B.lastTest || 0)) / 1e13;
      return scoreA - scoreB;
    });
    const pick = words[Math.floor(Math.random() * Math.min(words.length, 20))] || words[0];
    const vi = dict[pick]?.vi || (await this.translateEnToVi(pick));

    // Save pending quiz for this thread
    if (!this.store._quiz) this.store._quiz = {};
    this.store._quiz[String(threadID)] = { userID: String(senderID), word: pick, vi };
    this.save();

    await this.api.sendMessage(`📝 Dịch sang tiếng Việt: "${pick}"\n➡️ Hãy reply tin nhắn này bằng nghĩa tiếng Việt.`, threadID);
  }

  // Passive handler to capture replies to TTL questions
  async handleMessage(event) {
    try {
      const { threadID, senderID, body, messageReply } = event || {};
      if (!threadID || !body) return false;
      const pending = this.store?._quiz?.[String(threadID)];
      if (!pending) return false;
      if (String(pending.userID) !== String(senderID)) return false; // only the same user can answer

      // Must be a reply to the TTL prompt, best-effort check
      const replied = messageReply || event?.message_replied || event?.replyTo || null;
      if (!replied) return false; // only evaluate when user replies

      const userAns = stripVN(body);
      const correctAns = stripVN(pending.vi);
      const ok = userAns && correctAns && (userAns === correctAns || correctAns.includes(userAns) || userAns.includes(correctAns));

      const dict = this.getUserDict(senderID);
      if (dict[pending.word]) {
        if (ok) dict[pending.word].correct = (dict[pending.word].correct || 0) + 1;
        else dict[pending.word].wrong = (dict[pending.word].wrong || 0) + 1;
        dict[pending.word].lastTest = Date.now();
      }
      this.save();

      // Clear quiz after answer
      delete this.store._quiz[String(threadID)];
      this.save();

      if (ok) {
        await this.api.sendMessage('✅ Đúng!', threadID);
      } else {
        await this.api.sendMessage(`❌ Sai!\nĐáp án: ${pending.vi} (${pending.word})`, threadID);
      }

      return true;
    } catch (e) {
      return false;
    }
  }

  getInfo() {
    return {
      name: 'LearnEng',
      version: '1.0.0',
      description: 'Học từ vựng tiếng Anh: learnEng, note, ttl'
    };
  }
}

module.exports = LearnEngPlugin;
