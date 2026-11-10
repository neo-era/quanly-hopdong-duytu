// ksma.js — Gợi ý mã hạng mục HĐ (bảng giá ký) cho từng bản ghi khảo sát, theo tên hạng mục trong danh mục của app.
// Hàm thuần. Chỉ trả mã CÓ trong danh mục HĐ đang nhập; không chắc thì trả chac:false để người dùng xem lại.
// Quy tắc dựng theo tên hạng mục thật của bảng giá ký HĐ 2026–2029 (Tong hop HM), anh chốt 09/11/2026:
// "mọi hạng mục khảo sát đều có hạng mục HĐ" và mặc định lấy theo mã HM trong app.

const fold = (x) => String(x ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/gi, 'd').toLowerCase();
/** Số mét đầu tiên trong chuỗi ("STK 9m", "8,4m", "3,8m"). */
const met = (s) => { const m = fold(s).match(/(\d+(?:[.,]\d+)?)\s*m\b/); return m ? +m[1].replace(',', '.') : null; };
/** Công suất W đầu tiên ("LED 120W"). */
const watt = (s) => { const m = fold(s).match(/(\d+(?:[.,]\d+)?)\s*w\b/); return m ? +m[1].replace(',', '.') : null; };

/** Hệ số quy đổi theo ĐVT danh mục: "100m" → 1/100, "40m" → 1/40, "100m2"/"10m2"/"100m3" → 1/100, 1/10, 1/100; còn lại 1. */
export function heSoDVT(dvt) {
  const m = fold(dvt).trim().match(/^(\d+)\s*m[23]?$/);
  return m && +m[1] > 1 ? 1 / +m[1] : 1;
}
/** Mã có trong gói không. Danh mục không ghi gói (dữ liệu cũ / test) → coi như có. */
export function coTrongGoi(it, goi) {
  if (!it) return false;
  if (!goi || !it.goi) return true;
  return Object.prototype.hasOwnProperty.call(it.goi, goi);
}

// Trụ thép nhúng kẽm (dày 4mm) theo chiều cao
const TRU_THEP = [[6, 'HM283'], [7, 'HM284'], [8, 'HM285'], [9, 'HM286'], [10, 'HM279'], [16, 'HM280']];
// Bộ đèn đường LED lắp đặt theo dải công suất [từ, đến)
const LED = [[30, 40, 'HM199'], [40, 50, 'HM200'], [50, 60, 'HM201'], [60, 70, 'HM202'], [70, 80, 'HM203'], [80, 90, 'HM204'], [90, 100, 'HM205'],
  [100, 110, 'HM187'], [110, 120, 'HM188'], [120, 130, 'HM189'], [130, 140, 'HM190'], [140, 160, 'HM191'], [160, 180, 'HM192'], [180, 200, 'HM193'],
  [200, 220, 'HM194'], [220, 240, 'HM195'], [240, 280, 'HM196'], [280, 320, 'HM197'], [320, 360, 'HM198']];

/** Quy tắc theo loại: (thuộc tính khảo sát) → { ma, chac, ly }. */
const RULE = {
  thay_tru: (a) => {
    const q = fold(a.qc);
    if (/trang tri/.test(q)) return /tham co/.test(q) ? { ma: 'HM289', chac: true, ly: 'trụ trang trí thảm cỏ' }
      : /hoa van/.test(q) ? { ma: 'HM288', chac: true, ly: 'trụ trang trí đế gang hoa văn' }
      : /gang/.test(q) ? { ma: 'HM287', chac: true, ly: 'trụ trang trí đế gang' } : { ma: 'HM290', chac: false, ly: 'trụ trang trí — mặc định thép nhúng kẽm' };
    if (/be ?tong|btlt|\bbt\b/.test(q)) return { ma: 'HM278', chac: true, ly: 'trụ bê tông ly tâm' };
    const h = met(q);
    if (h) { const r = TRU_THEP.find(([max]) => h <= max); if (r) return { ma: r[1], chac: /thep|stk|sat|kem|con tron|bat giac/.test(q), ly: `trụ thép cao ${h}m (≤${r[0]}m, dày 4mm)` }; }
    return null;
  },
  vo_tu: () => ({ ma: 'HM131', chac: true, ly: 'thay thế vỏ tủ' }),
  tc_noi: () => ({ ma: 'HM347', chac: true, ly: 'thay thế cáp nguồn nổi' }),
  // HM346 (100m) ở G1–G3, HM346m (m) ở G4 → chọn mã có trong gói của vị trí
  tc_ngam: (a, cat, goi) => (cat.HM346m && coTrongGoi(cat.HM346m, goi) && (!goi || !coTrongGoi(cat.HM346, goi) || !cat.HM346)
    ? { ma: 'HM346m', chac: true, ly: 'thay thế cáp ngầm (m)' } : { ma: 'HM346', chac: true, ly: 'thay thế cáp ngầm (100m)' }),
  cap_luon_can: (a) => (/5\s*x/.test(fold(a.qc)) ? { ma: 'HM331', chac: true, ly: 'dây lên đèn cáp 5x2,5' }
    : { ma: 'HM330', chac: /3\s*x/.test(fold(a.qc)), ly: 'dây lên đèn cáp 3x2,5' }),
  hkn: () => ({ ma: 'HM099', chac: false, ly: 'hộp nối kín nước — mặc định rẽ nhánh (liên thông: HM100)' }),
  thay_can: (a) => {
    const q = fold(a.qc);
    const dep = /chim hac|canh buom|son mau/.test(q);
    if (/\bdoi\b/.test(q)) return { ma: dep ? 'HM306' : 'HM305', chac: true, ly: 'cần đèn đôi' };
    if (/\bba\b/.test(q)) return { ma: /son|con|bat giac/.test(q) ? 'HM314' : 'HM313', chac: true, ly: 'cần đèn ba' };
    if (dep) return { ma: 'HM308', chac: true, ly: 'cần đơn chim hạc/cánh buồm' };
    if (/con|bat giac/.test(q)) return { ma: 'HM307', chac: true, ly: 'cần đơn côn/bát giác' };
    const l = met(q);
    if (l) return l <= 3 ? { ma: 'HM310', chac: true, ly: `cần Ø49 dài ${l}m` } : l <= 3.8 ? { ma: 'HM311', chac: true, ly: `cần Ø49 dài ${l}m` }
      : l <= 4.5 ? { ma: 'HM312', chac: true, ly: `cần Ø49 dài ${l}m` } : null;
    if (/60/.test(q)) return { ma: 'HM309', chac: false, ly: 'cần đơn Ø60' };
    return null;
  },
  choa_den: (a) => {
    const q = fold(a.qc);
    if (/pha/.test(q)) return { ma: 'HM093', chac: true, ly: 'chóa đèn pha' };
    if (/cau/.test(q) && /400/.test(q)) return { ma: 'HM102', chac: true, ly: 'chóa cầu Ø400' };
    if (/cau/.test(q)) return { ma: 'HM101', chac: /300/.test(q), ly: 'chóa cầu Ø300' };
    if (/bong hue|bup sen/.test(q)) return { ma: 'HM103', chac: true, ly: 'chóa bông huệ/búp sen' };
    if (/non/.test(q)) return { ma: 'HM104', chac: true, ly: 'chóa hình nón' };
    if (/nu hoang/.test(q)) return { ma: 'HM105', chac: true, ly: 'chóa nữ hoàng' };
    if (/trang tri|dac biet/.test(q)) return { ma: 'HM092', chac: false, ly: 'chóa kiểu đặc biệt' };
    if (/led/.test(q)) return null;   // chóa đèn LED: không có mã thay chóa riêng → người dùng chọn
    return { ma: 'HM091', chac: /hps|onyx/.test(q), ly: 'chóa đèn HPS 70–400W' };
  },
  nap_tru: (a) => (/composite/.test(fold(a.qc)) ? { ma: 'HM423', chac: true, ly: 'nắp cửa trụ composite' } : { ma: 'HM254', chac: true, ly: 'nắp cửa trụ thép' }),
  decal_so_tru: () => ({ ma: 'HM246', chac: true, ly: 'dán decal số trụ' }),
  nang_mong: () => ({ ma: 'HM244', chac: true, ly: 'nâng móng trụ' }),
  thao_go_bang_ron: () => ({ ma: 'HM433', chac: true, ly: 'tháo gỡ băng rôn' }),
  tc_den_kc_xa: (a) => { const w = watt(a.qc); const r = w && LED.find(([lo, hi]) => w >= lo && w < hi); return r ? { ma: r[2], chac: true, ly: `lắp đặt đèn LED ${w}W` } : null; },
  tang_cuong_den: (a) => { const w = watt(a.qc); const r = w && LED.find(([lo, hi]) => w >= lo && w < hi); return r ? { ma: r[2], chac: true, ly: `lắp đặt đèn LED ${w}W` } : null; },
};

/**
 * Gợi ý chi tiết HM cho 1 vị trí lấy từ khảo sát.
 * @returns {{chiTiet:[{ma,kl}], ma, chac, ly} | null} null = không có quy tắc / mã không có trong danh mục HĐ.
 */
export function goiYMa(type, thuoc, kl, catalog = {}, goi = null) {
  const f = RULE[type];
  if (!f) return null;
  const r = f(thuoc || {}, catalog, goi);
  if (!r || !catalog[r.ma] || !coTrongGoi(catalog[r.ma], goi)) return null;   // mã phải đúng gói của vị trí
  const chiTiet = kl === null || kl === undefined ? [] : [{ ma: r.ma, kl: Math.round(kl * heSoDVT(catalog[r.ma].dvt) * 1e6) / 1e6 }];
  return { ...r, chiTiet };
}
export const LOAI_CO_QUY_TAC = Object.keys(RULE);

/** Các mã HM có thể gán cho từng loại khảo sát (để app Khảo sát hiện KL HĐ còn lại theo loại). */
export const MA_THEO_LOAI = {
  thay_tru: [...TRU_THEP.map((x) => x[1]), 'HM281', 'HM282', 'HM278', 'HM287', 'HM288', 'HM289', 'HM290'],
  vo_tu: ['HM131'], tc_noi: ['HM347'], tc_ngam: ['HM346m', 'HM346'], cap_luon_can: ['HM330', 'HM331'], hkn: ['HM099', 'HM100'],
  thay_can: ['HM305', 'HM306', 'HM307', 'HM308', 'HM309', 'HM310', 'HM311', 'HM312', 'HM313', 'HM314'],
  choa_den: ['HM091', 'HM092', 'HM093', 'HM101', 'HM102', 'HM103', 'HM104', 'HM105'],
  nap_tru: ['HM254', 'HM423'], decal_so_tru: ['HM246'], nang_mong: ['HM244'], thao_go_bang_ron: ['HM433'],
  tc_den_kc_xa: LED.map((x) => x[2]), tang_cuong_den: LED.map((x) => x[2]),
};
