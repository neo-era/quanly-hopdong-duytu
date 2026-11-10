// drive.js — Đăng nhập Google (OAuth token, Google Identity Services) + đọc/ghi 1 file JSON trên Drive.
// Scope drive.file: chỉ thấy file do chính app này tạo. Không đụng file khác của anh.
import { CONFIG } from './config.js';

const FILE_NAME = 'hdduytu-data.json';
const SCOPE = 'https://www.googleapis.com/auth/drive.file';
let tokenClient = null;
let accessToken = null;
let tokenExpiry = 0;
let fileId = null;

// Giữ đăng nhập (anh yêu cầu 11/11/2026 "luôn đăng nhập"):
// - Token Google (hạn ~1 giờ, quyền drive.file) lưu trên máy → mở lại app trong hạn là vào thẳng.
// - Hết hạn: nhớ "đã từng đăng nhập" → lần chạm đầu tiên tự xin token mới không hỏi lại (prompt '').
//   Trình duyệt chỉ cho mở cửa sổ Google khi người dùng chạm, nên không làm được lúc vừa mở app.
// - Đăng xuất xoá hết.
const K_TOK = 'hd_gauth_v1', K_NHO = 'hd_gauth_nho';
const ls = {
  get(k) { try { return localStorage.getItem(k); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch { /* bỏ qua */ } },
  del(k) { try { localStorage.removeItem(k); } catch { /* bỏ qua */ } },
};
function luuToken() { ls.set(K_TOK, JSON.stringify({ t: accessToken, exp: tokenExpiry })); ls.set(K_NHO, '1'); }
(function napToken() {
  try {
    const o = JSON.parse(ls.get(K_TOK) || 'null');
    if (o && typeof o.t === 'string' && Number(o.exp) > Date.now()) { accessToken = o.t; tokenExpiry = Number(o.exp); }
  } catch { /* hỏng → coi như chưa có */ }
})();
/** Đã từng đăng nhập trên máy này (chưa bấm Đăng xuất). */
export function wasSignedIn() { return ls.get(K_NHO) === '1'; }
/** Còn bao nhiêu ms trước khi token hết hạn (0 nếu đã hết). */
export function msConLai() { return accessToken ? Math.max(0, tokenExpiry - Date.now()) : 0; }

const listeners = new Set();
export function onAuthChange(fn) { listeners.add(fn); return () => listeners.delete(fn); }
function emit() { listeners.forEach(fn => fn(isSignedIn())); }

export function isSignedIn() { return !!accessToken && Date.now() < tokenExpiry; }
export function hasConfig() { return !!(CONFIG.clientId && CONFIG.clientId !== 'DAN-CLIENT-ID-VAO-DAY'); }

/** Nạp thư viện Google Identity Services (1 lần). */
function loadGis() {
  return new Promise((resolve, reject) => {
    if (window.google?.accounts?.oauth2) return resolve();
    const s = document.createElement('script');
    s.src = 'https://accounts.google.com/gsi/client';
    s.async = true; s.defer = true;
    s.onload = resolve;
    s.onerror = () => reject(new Error('Không tải được thư viện Google. Kiểm tra mạng.'));
    document.head.appendChild(s);
  });
}

export async function initAuth() {
  if (!hasConfig()) throw new Error('Chưa cấu hình Client ID Google (xem README).');
  await loadGis();
  tokenClient = window.google.accounts.oauth2.initTokenClient({
    client_id: CONFIG.clientId,
    scope: SCOPE,
    callback: () => {}, // gán động khi gọi
  });
}

/** Đăng nhập tương tác (mở popup chọn tài khoản Google). */
export function signIn() {
  return new Promise((resolve, reject) => {
    if (!tokenClient) return reject(new Error('Chưa khởi tạo đăng nhập.'));
    tokenClient.callback = (resp) => {
      if (resp.error) return reject(new Error(resp.error));
      accessToken = resp.access_token;
      tokenExpiry = Date.now() + (resp.expires_in - 60) * 1000;
      luuToken();
      emit();
      resolve(true);
    };
    tokenClient.requestAccessToken({ prompt: accessToken || wasSignedIn() ? '' : 'consent' });
  });
}

let dangXin = null;
/** Xin token mới không hỏi (gọi trong thao tác chạm). Trả true/false, không ném lỗi. */
export function signInSilent() {
  if (!tokenClient) return Promise.resolve(false);
  if (dangXin) return dangXin;
  dangXin = new Promise((resolve) => {
    const xong = (ok) => { clearTimeout(t); dangXin = null; resolve(ok); };
    const t = setTimeout(() => xong(false), 20000);
    tokenClient.callback = (resp) => {
      if (resp.error || !resp.access_token) return xong(false);
      accessToken = resp.access_token;
      tokenExpiry = Date.now() + (resp.expires_in - 60) * 1000;
      luuToken();
      emit();
      xong(true);
    };
    try { tokenClient.error_callback = () => xong(false); } catch { /* bản GIS cũ */ }
    try { tokenClient.requestAccessToken({ prompt: '' }); } catch { xong(false); }
  });
  return dangXin;
}

export function signOut() {
  if (accessToken && window.google?.accounts?.oauth2)
    window.google.accounts.oauth2.revoke(accessToken, () => {});
  accessToken = null; tokenExpiry = 0; fileId = null;
  ls.del(K_TOK); ls.del(K_NHO);
  emit();
}

async function api(url, opts = {}) {
  const r = await fetch(url, { ...opts, headers: { Authorization: 'Bearer ' + accessToken, ...(opts.headers || {}) } });
  if (r.status === 401) { accessToken = null; tokenExpiry = 0; ls.del(K_TOK); emit(); throw new Error('Phiên đăng nhập hết hạn — chạm bất kỳ chỗ nào để tiếp tục phiên.'); }
  if (!r.ok) throw new Error('Lỗi Drive ' + r.status + ': ' + (await r.text()).slice(0, 200));
  return r;
}

/** Tìm (hoặc nhớ) fileId của file dữ liệu trên Drive. */
async function findFile() {
  if (fileId) return fileId;
  const q = encodeURIComponent(`name='${FILE_NAME}' and trashed=false`);
  const r = await api(`https://www.googleapis.com/drive/v3/files?q=${q}&spaces=drive&fields=files(id,modifiedTime)`);
  const j = await r.json();
  if (j.files?.length) { fileId = j.files[0].id; return fileId; }
  return null;
}

/** Đọc dữ liệu từ Drive. Trả { data, modifiedTime } hoặc null nếu chưa có file. */
export async function loadData() {
  const id = await findFile();
  if (!id) return null;
  const meta = await (await api(`https://www.googleapis.com/drive/v3/files/${id}?fields=modifiedTime`)).json();
  const r = await api(`https://www.googleapis.com/drive/v3/files/${id}?alt=media`);
  const data = await r.json();
  return { data, modifiedTime: meta.modifiedTime };
}

/** Ghi dữ liệu lên Drive (tạo mới nếu chưa có). Trả modifiedTime mới.
 *  Dùng multipart/related đúng chuẩn Google Drive (không dùng FormData). */
export async function saveData(data) {
  const id = await findFile();
  const metadata = id ? {} : { name: FILE_NAME, mimeType: 'application/json' };
  const boundary = 'hdduytu' + Date.now();
  const body =
    `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n` +
    JSON.stringify(metadata) +
    `\r\n--${boundary}\r\nContent-Type: application/json\r\n\r\n` +
    JSON.stringify(data, null, 2) +
    `\r\n--${boundary}--`;
  const url = id
    ? `https://www.googleapis.com/upload/drive/v3/files/${id}?uploadType=multipart&fields=id,modifiedTime`
    : `https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,modifiedTime`;
  const r = await api(url, {
    method: id ? 'PATCH' : 'POST',
    headers: { 'Content-Type': `multipart/related; boundary=${boundary}` },
    body,
  });
  const j = await r.json();
  fileId = j.id;
  return j.modifiedTime;
}

/** Kiểm tra bản trên Drive có mới hơn baseModifiedTime không (chống ghi đè). */
export async function remoteNewerThan(baseModifiedTime) {
  const id = await findFile();
  if (!id || !baseModifiedTime) return false;
  const meta = await (await api(`https://www.googleapis.com/drive/v3/files/${id}?fields=modifiedTime`)).json();
  return new Date(meta.modifiedTime) > new Date(baseModifiedTime);
}
