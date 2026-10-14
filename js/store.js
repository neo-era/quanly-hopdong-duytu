// store.js — Trạng thái trong bộ nhớ + cache offline (IndexedDB) + nháp cục bộ.
import { SEED } from '../sample/seed.js';

const DB_NAME = 'hdduytu';
const STORE = 'kv';
let _db = null;

function db() {
  if (_db) return Promise.resolve(_db);
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => { req.result.createObjectStore(STORE); };
    req.onsuccess = () => { _db = req.result; resolve(_db); };
    req.onerror = () => reject(req.error);
  });
}
async function idbGet(key) {
  try {
    const d = await db();
    return await new Promise((res, rej) => {
      const r = d.transaction(STORE).objectStore(STORE).get(key);
      r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
    });
  } catch { return undefined; }
}
async function idbSet(key, val) {
  try {
    const d = await db();
    return await new Promise((res, rej) => {
      const t = d.transaction(STORE, 'readwrite');
      t.objectStore(STORE).put(val, key);
      t.oncomplete = () => res(true); t.onerror = () => rej(t.error);
    });
  } catch { return false; }
}

const state = {
  data: { version: 1, updatedAt: null, contracts: [] },
  baseModifiedTime: null,  // mốc Drive của bản đang giữ (để so xung đột)
  dirty: false,            // có thay đổi chưa lưu Drive
  loadedFrom: null,        // 'drive' | 'cache' | 'seed'
};
const subs = new Set();
export function subscribe(fn) { subs.add(fn); return () => subs.delete(fn); }
function notify() { subs.forEach(fn => fn(state)); }

export function getState() { return state; }
export function getData() { return state.data; }

/** Kiểm tra dữ liệu hợp lệ (có mảng contracts). */
export function hopLe(d) { return !!d && Array.isArray(d.contracts); }

/** Nạp từ cache offline (dùng khi mở app lúc chưa/không đăng nhập được). */
export async function loadFromCache() {
  const cached = await idbGet('data');
  if (cached?.data && hopLe(cached.data)) {
    state.data = cached.data;
    state.baseModifiedTime = cached.modifiedTime || null;
    state.loadedFrom = 'cache';
    notify();
    return true;
  }
  return false;
}

/** Đặt dữ liệu vừa đọc từ Drive vào state + cache lại. Ném lỗi nếu sai định dạng. */
export async function setFromDrive(data, modifiedTime) {
  if (!hopLe(data)) throw new Error('File dữ liệu trên Drive sai định dạng (thiếu danh sách hợp đồng).');
  state.data = data;
  state.baseModifiedTime = modifiedTime || null;
  state.dirty = false;
  state.loadedFrom = 'drive';
  await idbSet('data', { data, modifiedTime });
  notify();
}

/** Nạp dữ liệu mẫu (demo). */
export async function loadSeed() {
  state.data = structuredClone(SEED);
  state.dirty = true;
  state.loadedFrom = 'seed';
  await idbSet('data', { data: state.data, modifiedTime: null });
  notify();
}

/** Cập nhật dữ liệu (dùng khi thêm/sửa/xoá). Đánh dấu dirty + ghi nháp cache. */
export async function mutate(fn) {
  fn(state.data);
  state.data.updatedAt = new Date().toISOString();
  state.dirty = true;
  await idbSet('data', { data: state.data, modifiedTime: state.baseModifiedTime });
  notify();
}

export function markSaved(modifiedTime) {
  state.baseModifiedTime = modifiedTime || null;
  state.dirty = false;
  idbSet('data', { data: state.data, modifiedTime: state.baseModifiedTime });
  notify();
}

// Tiện ích: lấy / sửa 1 HĐ
export function getContract(id) { return state.data.contracts.find(c => c.id === id); }
export function uid(prefix = 'id') { return prefix + '-' + Math.random().toString(36).slice(2, 9); }
