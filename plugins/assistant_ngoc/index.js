'use strict';

/**
 * Assistant Ngọc AI Plugin v2.0.0
 * Trợ lý AI thông minh với Gemini - Gen Z assistant cho ConvoX
 * 
 * @author ConvoX Team
 * @credits Powered by Google Gemini AI
 * @requires .env file with GEMINI_API_KEY
 * @requires training.txt for persona configuration
 * @version 1.0.0
 */

/* ========== DEPENDENCIES ========== */
const fs = require('fs');
const path = require('path');

// Load environment variables early for API configuration
try { require('dotenv').config(); } catch (_) {}

const { GoogleGenerativeAI } = require('@google/generative-ai');

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
  } catch (_) { return true; }
}

/* ========== CONFIGURATION ========== */
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const MODEL_NAME = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

// Validate required environment variables
if (!GEMINI_API_KEY) {
  throw new Error('GEMINI_API_KEY is required in .env file. Please check your environment configuration.');
}

/* ========== UTILITY FUNCTIONS ========== */
const stripVN = (s = '') =>
  s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();

const normUid = (x) => String(x || '').replace(/^fbid:/, '');

const normMid = (x) => {
  const s = String(x || '').replace(/^m_?/i, '').replace(/^mid\./i, '').replace(/^m\./i, '');
  const i = s.lastIndexOf('$');
  return i >= 0 ? s.slice(i + 1) : s;
};

const eqId = (a, b) => normUid(String(a || '')) === normUid(String(b || ''));

/* ========== NAME RESOLUTION (DISPLAY/NICKNAME) ========== */
// Cache display names per thread to reduce API calls
const __nameCache = new Map(); // key: `${threadID}:${senderID}` -> displayName

async function getDisplayName(api, threadID, senderID) {
  const key = `${threadID}:${senderID}`;
  if (__nameCache.has(key)) return __nameCache.get(key);

  let displayName = '';

  // Try to get nickname in the current thread (group or DM)
  try {
    const threadInfo = await new Promise((resolve, reject) => {
      if (typeof api.getThreadInfo !== 'function') return resolve(null);
      api.getThreadInfo(threadID, (err, info) => (err ? reject(err) : resolve(info || null)));
    });

    if (threadInfo && threadInfo.nicknames) {
      const nick = threadInfo.nicknames[String(senderID)] || threadInfo.nicknames[normUid(senderID)];
      if (nick && String(nick).trim()) displayName = String(nick).trim();
    }
  } catch (_) {}

  // Fallback to user's full name
  if (!displayName) {
    try {
      const userMap = await new Promise((resolve, reject) => {
        if (typeof api.getUserInfo !== 'function') return resolve(null);
        api.getUserInfo(senderID, (err, info) => (err ? reject(err) : resolve(info || null)));
      });
      const u = userMap && (userMap[String(senderID)] || userMap[normUid(senderID)]);
      const name = u?.name || u?.firstName || u?.fullName;
      if (name) displayName = String(name).trim();
    } catch (_) {}
  }

  if (!displayName) displayName = 'bạn';
  __nameCache.set(key, displayName);
  return displayName;
}

/* ========== SESSION MANAGEMENT ========== */
class SessionStore {
  constructor() {
    this.history = new Map();
  }

  getHistory(threadID) {
    const key = String(threadID);
    if (!this.history.has(key)) {
      this.history.set(key, []);
    }
    return this.history.get(key);
  }

  addMessage(threadID, role, text) {
    const history = this.getHistory(threadID);
    history.push({ role, text: String(text || '') });
    
    const maxMessages = 50;
    if (history.length > maxMessages) {
      history.splice(0, history.length - maxMessages);
    }
  }

  clearHistory(threadID) {
    this.history.delete(String(threadID));
  }
}

const sessionStore = globalThis.__ngocStore || (globalThis.__ngocStore = new SessionStore());

/* ========== TRAINING DATA ========== */
function loadTrainingData() {
  try {
    const trainingPath = path.join(__dirname, 'training.txt');
    return fs.readFileSync(trainingPath, 'utf8');
  } catch (error) {
    console.error('[assistant_ngoc] Error loading training data:', error.message);
    return 'Default training data not available';
  }
}

const NGOC_PERSONA = loadTrainingData();

/* ========== TRIGGER LOGIC ========== */
async function shouldTrigger({ api, event, myId }) {
  const text = event.body || '';
  const hasNgoc = stripVN(text).includes('ngoc');

  const mentions = event.mentions || {};
  const mentionsMe = myId && Object.keys(mentions).some(id => eqId(id, myId));

  const replied = event.messageReply || 
                  event.replyToMessage || 
                  event.replyTo || 
                  event.reply || 
                  event.messageReplyTo || 
                  event.parentMessage || 
                  event.quotedMessage;
                  
  const repliedMessageID = replied?.messageID || 
                           event.replyToMessageID || 
                           event.parentMessageID || 
                           event.quotedMessageID;
                           
  let isReplyToMe = false;
  let replyHasNgoc = false;
  let replyMatchesBotHistory = false;

  if (replied) {
    replyHasNgoc = stripVN(replied.body || '').includes('ngoc');

    const replySenderIdRaw =
      replied.author ||
      replied.senderID ||
      replied.userID ||
      replied.from ||
      replied.participantID;
    
    if (replySenderIdRaw) {
      isReplyToMe = eqId(replySenderIdRaw, myId);
    }

    if (!isReplyToMe && repliedMessageID) {
      try {
        const info = await new Promise((resolve, reject) => {
          if (typeof api.getMessageInfo === 'function') {
            api.getMessageInfo(repliedMessageID, (err, info) =>
              err ? reject(err) : resolve(info || {})
            );
          } else if (typeof api.getThreadHistory === 'function') {
            api.getThreadHistory(event.threadID, 10, undefined, (err, hist) => {
              if (err) return reject(err);
              resolve((hist || []).find(m => m.messageID === repliedMessageID) || {});
            });
          } else {
            resolve({});
          }
        });

        const senderId =
          info?.senderID ||
          info?.message?.senderID ||
          info?.message_sender?.id ||
          info?.author ||
          info?.from;
        
        if (senderId) {
          isReplyToMe = eqId(senderId, myId);
        }
      } catch (e) {
        // Silent error handling
      }
    }

    if (!isReplyToMe && repliedMessageID) {
      try {
        const hist = sessionStore.getHistory(event.threadID);
        const botMessageIds = hist
          .filter(m => m.role === 'bot_message_id')
          .map(m => normMid(m.text))
          .filter(Boolean);

        const repliedId = normMid(repliedMessageID);
        replyMatchesBotHistory = botMessageIds.includes(repliedId);
      } catch (e) {
        // Silent error handling
      }
    }

    if (!isReplyToMe && !replyMatchesBotHistory && (replied.body || '').trim()) {
      try {
        const hist = sessionStore.getHistory(event.threadID);
        const lastBotTexts = hist
          .filter(m => m.role === 'model')
          .slice(-5)
          .map(m => stripVN((m.text || '').trim()))
          .filter(Boolean);

        const replyBodyNorm = stripVN((replied.body || '').trim());
        replyMatchesBotHistory = lastBotTexts.some(t => {
          const head = s => s.slice(0, Math.min(30, s.length));
          return replyBodyNorm.startsWith(head(t)) || t.startsWith(head(replyBodyNorm));
        });
      } catch (e) {
        // Silent error handling
      }
    }
  }

  return hasNgoc || mentionsMe || isReplyToMe || replyHasNgoc || replyMatchesBotHistory;
}

/* ========== MAIN PLUGIN CLASS ========== */
class AssistantNgocPlugin {
  constructor(api, config, authManager, logger) {
    this.api = api;
    this.config = config;
    this.authManager = authManager;
    this.logger = logger;
    this.name = 'Assistant Ngọc AI';
    this.version = '2.0.0';
    this.isInitialized = false;
    this.genAI = null;
    this.model = null;
  }

  async initialize() {
    try {
  if (!creditGuard()) throw new Error('CREDIT_INVALID');
      this.genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
      this.model = this.genAI.getGenerativeModel({
        model: MODEL_NAME,
        systemInstruction: NGOC_PERSONA
      });

  await this.testConnection();
  this.isInitialized = true;
  // silent on success
    } catch (error) {
      console.error('[assistant_ngoc] Init failed:', error.message);
      try { this.logger?.logError?.(error, 'Failed to initialize Assistant Ngọc plugin'); } catch {}
      throw error;
    }
  }

  async testConnection() {
    try {
  const result = await this.model.generateContent('ping');
  await result.response.text();
  // silent on success
    } catch (error) {
      console.error('[assistant_ngoc] Gemini API connection test failed:', error.message);
      throw error;
    }
  }

  registerCommands(_commandHandler) {
    // No commands needed for this plugin
  }

  async cleanup() {
    try {
      // Optional cleanup operations
    } catch (error) {
      try { this.logger?.logError?.(error, 'Error during Assistant Ngọc cleanup'); } catch {}
    }
  }

  async shouldRespond(event) {
    const myId = normUid(this.api.getCurrentUserID?.());
    return await shouldTrigger({ api: this.api, event, myId });
  }

  async generateResponse(threadID, userMessage, senderName) {
    try {
      const history = sessionStore.getHistory(threadID);
      
      const geminiHistory = history.map(h => ({
        role: h.role === 'model' ? 'model' : 'user',
        parts: [{ text: h.text }],
      }));

  const chat = this.model.startChat({ history: geminiHistory });
      const preface = senderName
        ? `Thông tin người nhắn: tên hiển thị/nickname là "${senderName}". Khi trả lời, có thể xưng hô thân thiện theo ngôn ngữ genz : bro, mom, bà thơ, .. hoặc tên ( không cần tên đệm hoặc họ )\n\n` 
        : '';
      const result = await chat.sendMessage(preface + String(userMessage || ''));
      const text = await result.response.text();

      sessionStore.addMessage(threadID, 'user', String(userMessage || ''));
      sessionStore.addMessage(threadID, 'model', text || '');

      return text;
    } catch (error) {
      console.error('[assistant_ngoc] Error generating response:', error.message);
      return 'Ngọc đang gặp chút vấn đề kỹ thuật. Bạn thử lại sau nhé :v';
    }
  }

  async sendMessage(message, threadID, replyTo) {
    return new Promise((resolve, reject) => {
      const payload = typeof message === 'string' ? { body: message } : (message || {});
      
      this.api.sendMessage(payload, threadID, (err, info) => {
        if (err) return reject(err);
        
        if (info?.messageID) {
          sessionStore.addMessage(threadID, 'bot_message_id', info.messageID);
        }
        
        resolve(info);
      }, replyTo);
    });
  }

  async handleMessage(event) {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }
    } catch (error) {
      if (String(error?.message).includes('CREDIT_INVALID')) {
        return false;
      }
      console.error('[assistant_ngoc] Auto-init failed:', error.message);
      return false;
    }

  const { threadID, messageID, body } = event || {};
  const senderID = event?.senderID || event?.author || event?.userID || event?.from || event?.participantID;
    const botID = this.api.getCurrentUserID?.();
    
    if (botID && String(senderID) === String(botID)) {
      return false;
    }

    const shouldRespond = await this.shouldRespond(event);
    
    if (!shouldRespond) {
      return false;
    }

    try {
      // Resolve a friendly name for the sender (nickname in thread > user name)
      const senderName = await getDisplayName(this.api, threadID, senderID);
      const response = await this.generateResponse(threadID, body, senderName);
      
      if (response && response.trim()) {
        await this.sendMessage(response, threadID, messageID);
        return true;
      }
      return false;
    } catch (error) {
      console.error(`[assistant_ngoc] Thread ${threadID}: Error handling message:`, error.message);
      return false;
    }
  }

  getInfo() {
    return {
      name: this.name,
      version: this.version,
      description: 'Trợ lý AI Ngọc với Gemini - Gen Z assistant cho ConvoX (v1.0)',
      credits: 'ConvoX Team - Powered by Google Gemini'
    };
  }
}

module.exports = AssistantNgocPlugin;