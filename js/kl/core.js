// core.js — Kho dữ liệu "KL theo vị trí" và các phép tính đối chiếu với hạng mục HĐ. Hàm thuần, không DOM.
// Trạng thái (lưu trong file JSON trên Drive, nhánh data.klvt):
//   catalog: { HMxxx: { ten, dvt, dgChuaVat, goi: { G2: { kl: {2026: n}, dg } } } }
//   catalogNam: [2026, …]
//   mau: { PLI: [{ma, heSo}], … }          — mẫu chi tiết HM theo loại phụ lục
//   phuLuc: [{ id, loai, sheet, file, tieuDe, congVan, dot, nhomVon, namKH, donGia, header, nhom:[tên phường theo thứ tự] }]
//   viTri:  [{ id, plId, stt, tram, phuong, tuyen, nhom, kl, goi, donVi, dot, donGia, …cột riêng,
//              chiTiet:[{ma, kl}], trangThai:'chua'|'dang'|'da', thangNT, thucHien: {ma: kl} | null }]

export const LOAI_TEN = { PLI: 'PL I · Thay/sửa tủ', PLII: 'PL II · HPS→LED', PLIII: 'PL III · Sửa/thay trụ', PLIV: 'PL IV · Trụ trang trí' };

export function emptyState() {
  return { catalog: {}, catalogNam: [], catalogNguon: null, mau: { PLI: [], PLII: [], PLIII: [], PLIV: [] }, phuLuc: [], viTri: [] };
}

/** Chuẩn hoá chữ để so khớp: bỏ dấu, đ→d, thường, gộp khoảng trắng. */
export function norm(x) {
  return String(x ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/gi, 'd').toLowerCase().replace(/\s+/g, ' ').trim();
}
export const keyVT = (v) => [v.tram, v.phuong, v.tuyen].map(norm).join('|');
export function maGoi(t) { const m = String(t ?? '').match(/(\d+)/); return m ? 'G' + m[1] : null; }

let seq = 0;
const uid = (p) => `${p}-${Date.now().toString(36)}${(seq++).toString(36)}${Math.random().toString(36).slice(2, 6)}`;

/** Chi tiết HM từ mẫu: KL vị trí × hệ số. */
export function apMau(mau, kl) {
  return (mau || []).filter((m) => m.ma).map((m) => ({ ma: m.ma, kl: round((+kl || 0) * (+m.heSo || 0)) }));
}
const round = (x) => Math.round(x * 1e6) / 1e6;

/**
 * Nhập 1 phụ lục đã đọc (kết quả parsePLSheet) vào kho.
 * opts: { dot, nhomVon, namKH, file, goiMacDinh, mode: 'replace'|'skip' }
 * Cùng file + sheet + loại đã có: không mode → { trung: true } (để hỏi người dùng); 'skip' bỏ qua; 'replace' thay
 * (giữ lại trạng thái thực hiện / chi tiết HM đã sửa của các vị trí trùng khoá).
 */
export function importPL(st, r, opts = {}) {
  const old = st.phuLuc.find((p) => p.file === (opts.file || '') && p.sheet === r.sheet && p.loai === r.loai);
  if (old && !opts.mode) return { them: 0, trung: true, plId: old.id };
  if (old && opts.mode === 'skip') return { them: 0, boQua: true, plId: old.id };
  const giuLai = new Map();
  if (old) {
    for (const v of st.viTri) if (v.plId === old.id) giuLai.set(keyVT(v) + '#' + v.stt, v);
    st.viTri = st.viTri.filter((v) => v.plId !== old.id);
    st.phuLuc = st.phuLuc.filter((p) => p.id !== old.id);
  }
  const pl = {
    id: old ? old.id : uid('pl'), loai: r.loai, sheet: r.sheet, file: opts.file || '', tieuDe: r.tieuDe, congVan: r.congVan,
    dot: opts.dot || '', nhomVon: opts.nhomVon || '', namKH: +opts.namKH || new Date().getFullYear(),
    donGia: r.viTri.find((v) => v.donGia)?.donGia ?? null, header: r.header || null,
    nhom: r.groups.map((g) => g.ten), ngayNhap: new Date().toISOString(),
  };
  st.phuLuc.push(pl);
  const mau = st.mau[r.loai] || [];
  for (const v of r.viTri) {
    const prev = giuLai.get(keyVT(v) + '#' + v.stt);
    const n = { ...v, id: prev?.id || uid('vt'), plId: pl.id, goi: v.goi || opts.goiMacDinh || null };
    delete n.row; delete n.hidden;
    n.chiTiet = prev?.chiTietSua ? prev.chiTiet : apMau(mau, v.kl);
    n.chiTietSua = !!prev?.chiTietSua;
    n.trangThai = prev?.trangThai || 'chua';
    n.thangNT = prev?.thangNT || '';
    n.thucHien = prev?.thucHien || null;
    st.viTri.push(n);
  }
  return { them: r.viTri.length, plId: pl.id };
}

/** Áp lại mẫu cho mọi vị trí của 1 loại (bỏ qua vị trí đã sửa tay chi tiết, trừ khi ghiDe). */
export function apMauChoLoai(st, loai, ghiDe = false) {
  const ids = new Set(st.phuLuc.filter((p) => p.loai === loai).map((p) => p.id));
  let n = 0;
  for (const v of st.viTri) {
    if (!ids.has(v.plId) || (v.chiTietSua && !ghiDe)) continue;
    v.chiTiet = apMau(st.mau[loai], v.kl); v.chiTietSua = false; n++;
  }
  return n;
}

export function suaChiTiet(st, id, chiTiet) {
  const v = st.viTri.find((x) => x.id === id);
  if (!v) return false;
  v.chiTiet = chiTiet.filter((c) => c.ma).map((c) => ({ ma: String(c.ma).trim().toUpperCase(), kl: +c.kl || 0 }));
  v.chiTietSua = true;
  return true;
}

/** Đánh dấu hàng loạt "đã thực hiện" (KL thực hiện = KL kế hoạch). */
export function danhDauThucHien(st, ids, thang, trangThai = 'da') {
  const set = new Set(ids);
  let n = 0;
  for (const v of st.viTri) if (set.has(v.id)) { v.trangThai = trangThai; v.thangNT = trangThai === 'da' ? thang || v.thangNT : ''; if (trangThai !== 'da') v.thucHien = null; n++; }
  return n;
}

/** Ghi KL thực hiện khác kế hoạch cho 1 vị trí: { HM120: 1 } — mã không nêu giữ bằng KL kế hoạch. */
export function suaThucHien(st, id, klTheoMa, thang) {
  const v = st.viTri.find((x) => x.id === id);
  if (!v) return false;
  const base = Object.fromEntries((v.chiTiet || []).map((c) => [c.ma, c.kl]));
  v.thucHien = { ...base, ...(v.thucHien || {}), ...klTheoMa };
  v.trangThai = 'da';
  if (thang) v.thangNT = thang;
  return true;
}

const klTH = (v) => (v.trangThai !== 'da' ? {} : v.thucHien || Object.fromEntries((v.chiTiet || []).map((c) => [c.ma, c.kl])));

function vtTheo(st, goi, nam) {
  const plNam = new Map(st.phuLuc.map((p) => [p.id, +p.namKH]));
  return st.viTri.filter((v) => (!goi || v.goi === goi) && (!nam || plNam.get(v.plId) === +nam));
}

/** Đối chiếu theo mã HM cho 1 gói + 1 năm. */
export function doiChieu(st, goi, nam) {
  const vts = vtTheo(st, goi, nam);
  const acc = new Map();
  const get = (ma) => { if (!acc.has(ma)) acc.set(ma, { ma, kh: 0, th: 0, nVT: 0 }); return acc.get(ma); };
  for (const v of vts) {
    const seen = new Set();
    for (const c of v.chiTiet || []) { const a = get(c.ma); a.kh += +c.kl || 0; if (!seen.has(c.ma)) { a.nVT++; seen.add(c.ma); } }
    for (const [ma, kl] of Object.entries(klTH(v))) get(ma).th += +kl || 0;
  }
  const rows = [...acc.values()].map((a) => {
    const it = st.catalog[a.ma];
    const g = it?.goi?.[goi];
    const hd = g?.kl?.[nam] ?? 0;
    const dg = g?.dg ?? it?.dgChuaVat ?? 0;
    const kh = round(a.kh), th = round(a.th);
    return {
      ma: a.ma, ten: it?.ten || '', dvt: it?.dvt || '', hd, kh, th, nVT: a.nVT,
      khConLai: round(kh - th), hdConLai: round(hd - kh), vuot: kh - hd > 1e-9,
      khongCoTrongHD: !it, dg, tienKH: kh * dg, tienTH: th * dg,
    };
  });
  rows.sort((x, y) => (y.vuot - x.vuot) || ((y.vuot ? y.kh - y.hd : 0) - (x.vuot ? x.kh - x.hd : 0)) || x.ma.localeCompare(y.ma, 'vi', { numeric: true }));
  return {
    goi, nam, rows,
    soVuot: rows.filter((r) => r.vuot).length,
    chuaGanHM: vts.filter((v) => !(v.chiTiet || []).length).length,
    soVT: vts.length, soVTDaTH: vts.filter((v) => v.trangThai === 'da').length,
    tienKH: rows.reduce((a, r) => a + r.tienKH, 0),
  };
}

/** Các vị trí có góp vào 1 mã HM (để xem "vị trí cấu thành"). */
export function viTriCuaHM(st, ma, goi, nam) {
  return vtTheo(st, goi, nam).filter((v) => (v.chiTiet || []).some((c) => c.ma === ma));
}

/**
 * Khớp file "đã thực hiện" (đúng form phụ lục, cột KL = KL thực hiện) vào kho theo trạm + phường + tuyến.
 * Dòng không khớp được liệt kê, không ghi. apply=false để xem trước.
 */
export function khopThucHien(st, r, thang, { apply = true } = {}) {
  const ids = new Set(st.phuLuc.filter((p) => p.loai === r.loai).map((p) => p.id));
  const pool = new Map();
  for (const v of st.viTri) if (ids.has(v.plId)) { const k = keyVT(v); if (!pool.has(k)) pool.set(k, []); pool.get(k).push(v); }
  const used = new Set();
  const khop = [], khongKhop = [];
  for (const row of r.viTri) {
    const cand = (pool.get(keyVT(row)) || []).find((v) => !used.has(v.id));
    if (!cand) { khongKhop.push(row); continue; }
    used.add(cand.id);
    khop.push({ id: cand.id, tram: cand.tram, kl: row.kl, klKH: cand.kl });
    if (!apply) continue;
    cand.trangThai = 'da'; cand.thangNT = thang || cand.thangNT;
    cand.thucHien = row.kl === cand.kl || !cand.kl ? null
      : Object.fromEntries((cand.chiTiet || []).map((c) => [c.ma, round(c.kl * row.kl / cand.kl)]));
  }
  return { khop, khongKhop };
}

/** Xoá 1 phụ lục và các vị trí của nó. */
export function xoaPhuLuc(st, plId) {
  st.viTri = st.viTri.filter((v) => v.plId !== plId);
  st.phuLuc = st.phuLuc.filter((p) => p.id !== plId);
}

/** Lọc vị trí cho bảng. */
export function locViTri(st, f = {}) {
  const q = norm(f.q || '');
  return st.viTri.filter((v) =>
    (!f.plId || v.plId === f.plId) && (!f.loai || st.phuLuc.find((p) => p.id === v.plId)?.loai === f.loai) &&
    (!f.goi || v.goi === f.goi) && (!f.donVi || v.donVi === f.donVi) &&
    (!f.trangThai || (f.trangThai === 'chuaGan' ? !(v.chiTiet || []).length : v.trangThai === f.trangThai)) &&
    (!q || norm(`${v.tram} ${v.phuong} ${v.tuyen} ${v.nhom}`).includes(q)));
}
