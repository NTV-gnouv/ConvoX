'use strict';

/* ========== Imports / Requires ========== */
const fs = require('fs');
const path = require('path');
const mkdirp = require('mkdirp');
const util = require('util');
const ytdlp = require('yt-dlp-exec');
const {
  YOUTUBE_DL_PATH,
  YOUTUBE_DL_HOST,
  YOUTUBE_DL_DIR,
  YOUTUBE_DL_FILE,
} = require('yt-dlp-exec/src/constants');

/* ========== Global flags ========== */
let warningHandlerAdded = false;

/* ========== Fetch helpers ========== */
const safeFetch = typeof globalThis.fetch === 'function'
  ? globalThis.fetch.bind(globalThis)
  : (...args) => import('node-fetch').then(({ default: f }) => f(...args));

async function responseToBuffer(res) {
  if (typeof res.buffer === 'function') return res.buffer();
  const ab = await res.arrayBuffer();
  return Buffer.from(ab);
}

function fetchWithTimeout(url, opts = {}, ms = 15000) {
  const ctrl = new AbortController();
  const id = setTimeout(() => ctrl.abort(), ms);
  const finalOpts = { ...opts, signal: ctrl.signal };
  return safeFetch(url, finalOpts).finally(() => clearTimeout(id));
}

/* ========== Logging & timeout helpers ========== */
function now() { return new Date().toISOString(); }

function logStart(threadID, url) {
  console.log(`[autodown] Thread ${threadID}: Đang xử lý ${url}`);
}

function logComplete(threadID, success = true) {
  const status = success ? '✅ Hoàn thành' : '❌ Thất bại';
  console.log(`[autodown] Thread ${threadID}: ${status}`);
}

function logError(threadID, error) {
  console.log(`[autodown] Thread ${threadID}: ❌ Lỗi - ${error.message || error}`);
}

function formatErr(e) {
  if (!e) return 'Unknown error';
  if (e instanceof Error) {
    const plain = {};
    Object.getOwnPropertyNames(e).forEach(k => { plain[k] = e[k]; });
    return JSON.stringify(plain, null, 2);
  }
  try { return JSON.stringify(e, Object.getOwnPropertyNames(e), 2); }
  catch { return util.inspect(e, { depth: 5, colors: false }); }
}

function withTimeout(promise, ms, label='op') {
  let timeoutId;
  const t = new Promise((_, rej) => {
    timeoutId = setTimeout(() => rej(new Error(`TIMEOUT ${label} after ${ms}ms`)), ms);
  });
  return Promise.race([promise.finally(() => clearTimeout(timeoutId)), t]);
}

function startWatchdog(ms, onFire) {
  const id = setTimeout(() => {
    try { onFire(); } catch {}
  }, ms);
  return () => clearTimeout(id);
}

/* ========== Text helpers ========== */
function truncateText(input, max = 50) {
  try {
    const arr = Array.from(String(input || ''));
    if (arr.length <= max) return arr.join('');
    return arr.slice(0, max).join('') + '.....';
  } catch {
    const s = String(input || '');
    return s.length <= max ? s : s.slice(0, max) + '.....';
  }
}

/* ========== Project meta & credits ========== */
const pkg = (() => {
  try {
    return require(path.join(process.cwd(), 'package.json'));
  } catch {
    return {};
  }
})();
const PROJECT_NAME = process.env.BOT_NAME || 'ConvoX';
const PROJECT_VER  = process.env.BOT_VERSION || '1.0.0';
const SHOW_CREDIT  = process.env.CONVOX_SHOW_CREDIT !== '0';
const CREDIT_LINE  = `${PROJECT_NAME} v${PROJECT_VER}`;

// Hidden credit guard
function creditGuard() {
  try {
    if (process.env.CONVOX_CREDIT_OK === '1') return true;
    const expect = (process.env.BOT_AUTHOR || 'Thanh Vương').toLowerCase();
    const author = String(pkg.author || '').toLowerCase();
    const name = String(pkg.name || '').toLowerCase();
    return author.includes(expect) || author.includes('convox') || name.includes('convox');
  } catch (_) { return true; }
}

/* ========== Binary bootstrap (yt-dlp) ========== */
async function ensureYtDlp() {
  if (fs.existsSync(YOUTUBE_DL_PATH)) return;

  const BINARY_CONTENT_TYPES = [
    'binary/octet-stream',
    'application/octet-stream',
    'application/x-binary',
  ];

  const response = await safeFetch(YOUTUBE_DL_HOST);
  const contentType = response.headers.get('content-type');

  let buffer;
  if (BINARY_CONTENT_TYPES.includes(contentType)) {
    buffer = await responseToBuffer(response);
  } else {
    const [{ assets }] = await response.json();
    const asset = assets.find(({ name }) => name === YOUTUBE_DL_FILE);
    const downloadRes = await safeFetch(asset.browser_download_url);
    buffer = await responseToBuffer(downloadRes);
  }

  await mkdirp(YOUTUBE_DL_DIR);
  await fs.promises.writeFile(YOUTUBE_DL_PATH, buffer, { mode: 0o755 });
}

/* ========== Cache & state ========== */
const cacheDir = path.join(__dirname, 'cache');
if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir);

const stateFile = path.join(cacheDir, 'autodown_state.json');

function loadState() {
  try {
    return JSON.parse(fs.readFileSync(stateFile, 'utf8'));
  } catch {
    return {};
  }
}

function saveState(state) {
  fs.writeFileSync(stateFile, JSON.stringify(state, null, 2));
}

/* ========== URL & TikTok utilities ========== */
async function resolveRedirect(url) {
  try {
    const head = await fetchWithTimeout(url, { method: 'HEAD', redirect: 'follow' }, 8000);
    if (head && head.url) return head.url;

    const res = await fetchWithTimeout(url, { method: 'GET', redirect: 'follow' }, 12000);
    if (res && res.url) return res.url;

    return url;
  } catch {
    return url;
  }
}

async function expandTikTokUrlByYtDlp(url) {
  try {
    const info = await ytdlp(url, {
      dumpSingleJson: true,
      skipDownload: true,
      noWarnings: true,
      noCheckCertificates: true,
      noPlaylist: true,
      quiet: true,
    });
    const meta = typeof info === 'string' ? JSON.parse(info) : info || {};
    if (meta.webpage_url) return meta.webpage_url;
  } catch {}
  return url;
}

async function fetchTikTokImagesViaTikWM(tiktokUrl) {
  const apiUrl = `https://www.tikwm.com/api/?url=${encodeURIComponent(tiktokUrl)}`;
  const headers = {
    'User-Agent': 'Mozilla/5.0',
    'Accept': 'application/json',
    'Referer': 'https://www.tikwm.com/',
  };

  for (let attempt = 0; attempt < 2; attempt++) {
    const res = await fetchWithTimeout(apiUrl, { headers }, 15000);
    const json = await res.json().catch(() => null);
    if (json && json.code === 0 && json.data) {
      const { images = [], author = {}, title = '', id } = json.data;
      if (Array.isArray(images) && images.length > 0) {
        return {
          id,
          images,
          author_name: author.unique_id || author.nickname || '',
          title,
        };
      }
    }
    await new Promise(r => setTimeout(r, 300));
  }
  return null;
}

async function downloadToFile(fileUrl, destPath) {
  const res = await fetchWithTimeout(fileUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0',
      'Accept': 'image/*,*/*;q=0.8',
      'Referer': 'https://www.tiktok.com/',
    }
  }, 20000);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const buf = await responseToBuffer(res);
  await fs.promises.writeFile(destPath, buf);
}

function isSupportedUrl(url) {
  const supported = [
    'facebook.com',
    'tiktok.com',
    'vt.tiktok.com',
    'v.douyin.com',
    'instagram.com',
    'youtube.com',
    'youtu.be',
  ];
  return supported.some(domain => url.includes(domain));
}

function looksLikeTikTok(url) {
  return /(tiktok\.com|vt\.tiktok\.com|v\.douyin\.com)/i.test(url);
}

function maybePhotoByPattern(url) {
  return /tiktok\.com\/.+\/photo\/\d+/i.test(url);
}

function isTikTokPhotoUrl(url) {
  return /tiktok\.com\/.+\/photo\/\d+/i.test(url);
}

function hasVideoInMeta(meta) {
  if (!meta) return false;
  const items = Array.isArray(meta.entries) && meta.entries.length ? meta.entries : [meta];
  for (const it of items) {
    const fmts = it.formats || it.requested_formats || [];
    if (fmts.some(f => f && f.vcodec && f.vcodec !== 'none')) return true;
    if ((it.vcodec && it.vcodec !== 'none') ||
        (it.ext && ['mp4','webm','mkv','mov'].includes(String(it.ext).toLowerCase()))) {
      return true;
    }
  }
  return false;
}

function isIGThreadsFB(url) {
  return /(instagram\.com|facebook\.com)/i.test(url);
}

function extractSlideshowImagesFromMeta(meta) {
  const info = meta || {};
  const ipi = info.image_post_info || info.image_post || {};
  const arr = ipi.images || [];
  const urls = [];
  for (const img of arr) {
    const list = (img.url_list || [])
      .concat(img.image_url ? [img.image_url] : [])
      .concat(img.display_image && img.display_image.url_list ? img.display_image.url_list : []);
    const best = list.find(Boolean);
    if (best) urls.push(best);
  }
  return urls;
}

/* ========== Facebook API helpers ========== */
function sendMessageAsync(api, msg, threadID, replyTo) {
  return new Promise((resolve, reject) => {
    api.sendMessage(msg, threadID, (err, info) => {
      if (err) return reject(err);
      resolve(info);
    }, replyTo);
  });
}

function unsendMessageAsync(api, messageID) {
  return new Promise((resolve, reject) => {
    api.unsendMessage(messageID, (err) => {
      if (err) return reject(err);
      resolve();
    });
  });
}

function setReactionAsync(api, reaction, messageID) {
  return new Promise((resolve, reject) => {
    api.setMessageReaction(reaction, messageID, (err) => {
      if (err) return reject(err);
      resolve();
    });
  });
}

async function sendMessageSafe(api, msg, threadID, replyTo, { timeoutMs = 60000, retries = 1 } = {}) {
  const attempt = async (i) => {
    return withTimeout(new Promise((resolve, reject) => {
      api.sendMessage(msg, threadID, (err, info) => {
        if (err) return reject(err);
        resolve(info);
      }, replyTo);
    }), timeoutMs, `sendMessage[${i}]`).then((r) => r);
  };

  let lastErr;
  for (let i = 1; i <= 1 + retries; i++) {
    try { return await attempt(i); } catch (e) { lastErr = e; }
    await new Promise(r => setTimeout(r, 400));
  }
  throw lastErr;
}

async function setReactionSafe(api, reaction, messageID, { timeoutMs = 15000 } = {}) {
  try {
    await withTimeout(new Promise((resolve, reject) => {
      api.setMessageReaction(reaction, messageID, (err) => err ? reject(err) : resolve());
    }), timeoutMs, `setReaction(${reaction||'clear'})`);
    return true;
  } catch (e) {
    return false;
  }
}

function loadAttachmentsAsStreams(filePaths) {
  const streams = [];
  let i = 0;
  for (const f of filePaths) {
    i++;
    const s = fs.createReadStream(f);
    s.on('error', (err) => {});
    streams.push(s);
  }
  return streams;
}

/* ========== Core Class: AutoDown Plugin ========== */
class AutoDownPlugin {
  constructor(api, config, authManager, logger) {
    this.api = api;
    this.config = config;
    this.authManager = authManager;
    this.logger = logger;
    this.name = 'AutoDown Plugin';
    this.version = PROJECT_VER;
    this.isInitialized = false;
  }

  async initialize() {
    try {
      if (!warningHandlerAdded) {
        process.on('warning', (w) => {
          if (w.name === 'DeprecationWarning' && w.code === 'DEP0044') {
            return;
          }
          console.warn(`[autodown] ${w.name} (${w.code||'-'}): ${w.message}`);
        });
        warningHandlerAdded = true;
      }

      if (!fs.existsSync(cacheDir)) {
        fs.mkdirSync(cacheDir, { recursive: true });
      }

      await ensureYtDlp();
      
      this.isInitialized = true;
    } catch (error) {
      this.logger.logError(error, 'Failed to initialize AutoDown plugin');
      throw error;
    }
  }

  registerCommands(commandHandler) {}

  async cleanup() {
    try {
      // Optional future cleanup
    } catch (error) {
      this.logger.logError(error, 'Error during AutoDown cleanup');
    }
  }

  async handleMessage(event) {
  if (!creditGuard()) return false;
    if (!this.isInitialized) return false;
    const { threadID, messageID, body } = event || {};
    if (!body) return false;

    const match = body.match(/https?:\/\/[^\s]+/g);
    if (!match) return false;
    let url = match[0].replace(/[^\w:/?&=%.@#-]/g, '');
    
    if (/vt\.tiktok\.com/i.test(url)) {
      const expanded = await resolveRedirect(url);
      if (expanded) url = expanded;
      const expanded2 = await expandTikTokUrlByYtDlp(url).catch(() => url);
      if (expanded2) url = expanded2;
    }

    const normalizedUrl = url.split('?')[0];

    // Strict allowlist: ignore any links not in supported domains
    if (!isSupportedUrl(url) && !isSupportedUrl(normalizedUrl)) {
      return false;
    }

    logStart(threadID, url);

    let reacted = false;
    let jobDone = false;
    const stopWatchdog = startWatchdog(90000, async () => {
      console.warn('[autodown] WATCHDOG FIRED after 90s');
      try { 
        if (reacted && !jobDone) {
          await setReactionSafe(this.api, '', messageID, { timeoutMs: 5000 }); 
        }
      } catch (e) {}
    });

    try { 
      const success = await setReactionSafe(this.api, '⌛', messageID, { timeoutMs: 8000 }); 
      reacted = success;
    } catch (e) {}

    try { await ensureYtDlp(); } catch (_) {}

    if (isIGThreadsFB(normalizedUrl)) {
      try {
        const metaProbe = await ytdlp(normalizedUrl, {
          dumpSingleJson: true,
          skipDownload: true,
          noWarnings: true,
          noCheckCertificates: true,
          noPlaylist: true,
          quiet: true,
        });
        const meta = typeof metaProbe === 'string' ? JSON.parse(metaProbe) : (metaProbe || {});
        if (!hasVideoInMeta(meta)) {
          try { await setReactionSafe(this.api, '❌', messageID, { timeoutMs: 5000 }); } catch {}
          jobDone = true;
          return true;
        }
      } catch (e) {}
    }

    try {
      const state = loadState();
      const threadState = state[threadID];
      
      if (!threadState || !threadState.enabled) {
        state[threadID] = { enabled: true };
        saveState(state);
      }

      if (!isSupportedUrl(url)) return false;

      const tmpDir = path.join(cacheDir, `${Date.now()}_${Math.random().toString(36).slice(2)}`);
      fs.mkdirSync(tmpDir);

      try {
        await ensureYtDlp();

        if (looksLikeTikTok(normalizedUrl)) {
          const info = await fetchTikTokImagesViaTikWM(normalizedUrl);
          if (info?.images?.length) {
            const files = [];
            let index = 1;
            for (const imgUrl of info.images) {
              const p = new URL(imgUrl).pathname;
              const ext = path.extname(p) || '.jpg';
              const fname = `${info.id || Date.now()}_${String(index++).padStart(2,'0')}${ext}`;
              const fpath = path.join(tmpDir, fname);
              await downloadToFile(imgUrl, fpath);
              files.push(fpath);
            }

            const attachments = loadAttachmentsAsStreams(files);
            const header = `[TIKTOK]`;
            const infoText =
              `👤 Tác giả: ${info.author_name || 'Không rõ'}\n` +
              `💬 Tiêu đề: ${truncateText(info.title || 'Không có tiêu đề', 50)}`;
            const creditSuffix = SHOW_CREDIT ? `\n— ${CREDIT_LINE}` : '';

            await sendMessageSafe(
              this.api,
              { body: `${header}\n\n${infoText}${creditSuffix}`, attachment: attachments },
              threadID,
              messageID,
              { timeoutMs: 60000, retries: 1 }
            );
            
            await setReactionSafe(this.api, '✅', messageID, { timeoutMs: 5000 });
            jobDone = true;
            logComplete(threadID, true);

            try { files.forEach(f => fs.unlinkSync(f)); } catch {}
            return true;
          }
        }

        if (maybePhotoByPattern(normalizedUrl)) {
          let metadata = {};
          try {
            const info = await ytdlp(normalizedUrl, {
              dumpSingleJson: true, skipDownload: true,
              noWarnings: true, noCheckCertificates: true, noPlaylist: true, quiet: true,
              ...(looksLikeTikTok(normalizedUrl) ? { extractorArgs: ['tiktok:simulate_app=True'] } : {}),
            });
            metadata = typeof info === 'string' ? JSON.parse(info) : (info || {});
          } catch(e) {}

          const imageUrls = extractSlideshowImagesFromMeta(metadata);

          if (imageUrls.length) {
            const files = [];
            let i = 1;
            for (const u of imageUrls) {
              const ext = path.extname(new URL(u).pathname) || '.jpg';
              const fname = `${(metadata.id || metadata.webpage_url || Date.now()).toString().replace(/\D/g,'')}_${String(i++).padStart(2,'0')}${ext}`;
              const fpath = path.join(tmpDir, fname);
              await downloadToFile(u, fpath);
              files.push(fpath);
            }

            const attachments = loadAttachmentsAsStreams(files);
            const header = `[TIKTOK] - Slideshow (Metadata)`;
            const infoText =
              `👤 Tác giả: ${metadata.uploader || 'Không rõ'}\n` +
              `💬 Tiêu đề: ${truncateText(metadata.title || 'Không có tiêu đề', 50)}`;
            const creditSuffix = SHOW_CREDIT ? `\n— ${CREDIT_LINE}` : '';

            await sendMessageSafe(
              this.api,
              { body: `${header}\n\n${infoText}${creditSuffix}`, attachment: attachments },
              threadID,
              messageID,
              { timeoutMs: 60000, retries: 1 }
            );
            
            await setReactionSafe(this.api, '✅', messageID, { timeoutMs: 5000 });
            jobDone = true;
            logComplete(threadID, true);

            try { files.forEach(f => fs.unlinkSync(f)); } catch {}
            return true;
          }

          return false;
        }

        try {
          await ytdlp(url, {
            output: path.join(tmpDir, '%(id)s.%(ext)s'),
            restrictFilenames: true, noPlaylist: true, quiet: true,
            ...(looksLikeTikTok(normalizedUrl) ? { extractorArgs: ['tiktok:simulate_app=True'] } : {}),
          });
        } catch (e) {
          const msg = ((e && (e.stderr || e.stdout || e.message)) || '').toString();
          if (isIGThreadsFB(normalizedUrl) && /There is no video in this post/i.test(msg)) {
            try { await setReactionSafe(this.api, '❌', messageID, { timeoutMs: 5000 }); } catch {}
            jobDone = true;
            return true;
          }
          throw e;
        }

        const files = fs.readdirSync(tmpDir).map(f => path.join(tmpDir, f));
        if (!files.length) return false;

        const attachments = loadAttachmentsAsStreams(files);

        let metadata = {};
        try {
          const info = await ytdlp(url, {
            dumpSingleJson: true, skipDownload: true,
            noWarnings: true, noCheckCertificates: true, noPlaylist: true, quiet: true,
            ...(looksLikeTikTok(normalizedUrl) ? { extractorArgs: ['tiktok:simulate_app=True'] } : {}),
          });
          metadata = typeof info === 'string' ? JSON.parse(info) : (info || {});
        } catch {}

        const creditSuffix = SHOW_CREDIT ? `\n— ${CREDIT_LINE}` : '';
        const header = `[${(metadata.extractor || 'Unknown').toUpperCase()}] - Tự Động Tải`;
        const infoText =
          `👤 Tác giả: ${metadata.uploader || 'Không rõ'}\n` +
          `💬 Tiêu đề: ${truncateText(metadata.title || 'Không có tiêu đề', 50)}`;

        await sendMessageSafe(
          this.api,
          { body: `${header}\n\n${infoText}${creditSuffix}`, attachment: attachments },
          threadID,
          messageID,
          { timeoutMs: 90000, retries: 1 }
        );
        
        await setReactionSafe(this.api, '✅', messageID, { timeoutMs: 5000 });
        jobDone = true;
        logComplete(threadID, true);

        try { files.forEach(f => fs.unlinkSync(f)); } catch {}
        return true;

      } catch (err) {
        logError(threadID, err);
        logComplete(threadID, false);
        return false;
      } finally {
        try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch {}
        if (reacted && !jobDone) {
          try { 
            await setReactionSafe(this.api, '', messageID, { timeoutMs: 5000 }); 
          }
          catch (e) {}
        }
      }
    } finally {
      stopWatchdog();
    }
  }

  getInfo() {
    return {
      name: this.name,
      version: this.version,
      description: 'Tự động tải video/ảnh từ các nền tảng khi phát hiện link',
      credits: CREDIT_LINE
    };
  }
}

/* ========== Export ========== */
module.exports = AutoDownPlugin;