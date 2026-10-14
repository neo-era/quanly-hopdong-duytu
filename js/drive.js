// drive.js — Đăng nhập Google (OAuth token, Google Identity Services) + đọc/ghi 1 file JSON trên Drive.
// Scope drive.file: chỉ thấy file do chính app này tạo. Không đụng file khác của anh.
import { CONFIG } from './config.js';

const FILE_NAME = 'hdduytu-data.json';
const SCOPE = 'https://www.googleapis.com/auth/drive.file';
let tokenClient = null;
let accessToken = null;
let tokenExpiry = 0;
let fileId = null;

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
      emit();
      resolve(true);
    };
    tokenClient.requestAccessToken({ prompt: accessToken ? '' : 'consent' });
  });
}

export function signOut() {
  if (accessToken && window.google?.accounts?.oauth2)
    window.google.accounts.oauth2.revoke(accessToken, () => {});
  accessToken = null; tokenExpiry = 0; fileId = null; emit();
}

async function api(url, opts = {}) {
  const r = await fetch(url, { ...opts, headers: { Authorization: 'Bearer ' + accessToken, ...(opts.headers || {}) } });
  if (r.status === 401) { accessToken = null; tokenExpiry = 0; emit(); throw new Error('Phiên đăng nhập hết hạn, mời đăng nhập lại.'); }
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
