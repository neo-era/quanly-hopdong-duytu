// sample/seed.js — KHÔNG chứa số liệu hợp đồng thật (repo công khai — anh chốt 20/11/2026).
// Danh sách HĐ thật chỉ nằm trong file dữ liệu trên Google Drive của anh (hdduytu-data.json) và bản sao lưu JSON.
export const SEED = { version: 2, nguonDuLieu: null, contracts: [] };

/** Bản demo rất cũ (số liệu giả 380/330/300 tỉ) — nhận ra để báo người dùng nạp lại từ Drive/JSON. */
export function laDemoCu(d) {
  const by = Object.fromEntries((d?.contracts || []).map((c) => [c.id, c]));
  return !d?.nguonDuLieu && by.g2?.giaTri === 380_000_000_000 && by.g3?.giaTri === 330_000_000_000 && by.g4?.giaTri === 300_000_000_000;
}
