// ksapi.js — Gọi máy chủ app Khảo sát (Apps Script) từ app HĐ. Token phạm vi 'hd' (30 ngày) lưu IndexedDB.
// Không lưu mật khẩu; đăng nhập 1 lần (phiên 8 giờ) chỉ để đổi lấy token 'hd'. Xem docs/04_LienKet-KhaoSat.md.
import { kvGet, kvSet } from '../store.js';

// URL máy chủ app Khảo sát — đã công khai sẵn trong repo khaosat (js/config.js)
export const KS_URL = 'https://script.google.com/macros/s/AKfycbxX9mgYO6g9A4BRTmJN3QpiZg1VutAeWcNgm4hY8zHPaPykgWYmgFv8M20S7YG8oCp7/exec';
const KEY = 'ksLink';

export class KsLoi extends Error {
  constructor(msg, ma) { super(msg); this.ma = ma; }
}

async function post(body, fetchFn = fetch) {
  let res;
  try {
    res = await fetchFn(KS_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(body) });
  } catch { throw new KsLoi('Không kết nối được máy chủ Khảo sát (mạng?)', 'mang'); }
  if (!res.ok) throw new KsLoi('Máy chủ Khảo sát lỗi HTTP ' + res.status, 'http');
  const j = await res.json();
  if (!j.ok) {
    const e = String(j.error || 'Lỗi máy chủ');
    if (/^unknown action/.test(e)) throw new KsLoi('Máy chủ Khảo sát chưa cập nhật bản có liên kết HĐ — cần triển khai phiên bản mới Apps Script', 'cu');
    if (/token expired|invalid token|user disabled|user not found/.test(e)) throw new KsLoi('Liên kết app Khảo sát đã hết hạn — liên kết lại', 'token');
    throw new KsLoi(e, 'server');
  }
  return j;
}

export async function ksLinkInfo() {
  const l = await kvGet(KEY);
  if (!l || !l.token) return null;
  if (l.expires_at && Date.now() > l.expires_at) return { ...l, hetHan: true };
  return l;
}
export async function ksUnlink() { await kvSet(KEY, null); }

/** Phiên app Khảo sát đang đăng nhập trên máy này (cùng origin) — chỉ đọc tên để hỏi người dùng. */
export function ksPhienMay() {
  try {
    const s = sessionStorage.getItem('auth') || localStorage.getItem('auth');
    const o = s ? JSON.parse(s) : null;
    if (!o?.token || (o.expires_at && Date.now() > o.expires_at)) return null;
    return { username: o.username, full_name: o.full_name, role: o.role, token: o.token };
  } catch { return null; }
}

/** Liên kết: bằng mật khẩu (đăng nhập 8 giờ rồi đổi token) hoặc bằng phiên KS trên máy. */
export async function ksLink({ username, password, phien } = {}, fetchFn) {
  let tok = phien?.token;
  if (!tok) {
    const r = await post({ action: 'login', username, password, remember: false }, fetchFn);
    tok = r.token;
  }
  const l = await post({ action: 'hd_link', token: tok }, fetchFn);
  const info = { token: l.token, expires_at: l.expires_at, username: l.username, full_name: l.full_name, role: l.role, can_push: !!l.can_push, at: Date.now() };
  await kvSet(KEY, info);
  return info;
}

async function tokenHd() {
  const l = await ksLinkInfo();
  if (!l) throw new KsLoi('Chưa liên kết app Khảo sát', 'chua');
  if (l.hetHan) throw new KsLoi('Liên kết app Khảo sát đã hết hạn — liên kết lại', 'token');
  return l.token;
}

/** Lấy bản ghi từng loại (tuần tự, có tiến độ). Trả { rows, loi: {type: msg} }. */
export async function ksList(types, { from, to } = {}, onTienDo = () => {}, fetchFn) {
  const token = await tokenHd();
  const rows = [], loi = {};
  for (let i = 0; i < types.length; i++) {
    onTienDo(i, types.length, types[i]);
    try {
      const r = await post({ action: 'list', token, type: types[i], from: from ? from + 'T00:00:00' : undefined, to: to ? to + 'T23:59:59' : undefined, includeDeleted: true }, fetchFn);
      rows.push(...(r.rows || []));
    } catch (e) {
      if (e.ma === 'token' || e.ma === 'mang') throw e;
      loi[types[i]] = e.message;
    }
  }
  onTienDo(types.length, types.length, '');
  return { rows, loi };
}

export async function ksPush(data, meta, { force = false } = {}, fetchFn) {
  const token = await tokenHd();
  return post({ action: 'hd_push', token, data, meta, force }, fetchFn);
}
