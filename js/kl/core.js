// core.js — Kho dữ liệu "KL theo vị trí" và các phép tính đối chiếu với hạng mục HĐ. Hàm thuần, không DOM.
// Trạng thái (lưu trong file JSON trên Drive, nhánh data.klvt):
//   catalog: { HMxxx: { ten, dvt, dgChuaVat, goi: { G2: { kl: {2026: n}, dg } } } }
//   catalogNam: [2026, …]
//   mau: { PLI: [{ma, heSo}], … }          — mẫu chi tiết HM theo loại phụ lục
//   phuLuc: [{ id, loai, sheet, file, tieuDe, congVan, dot, nhomVon, namKH, donGia, header, nhom:[tên phường theo thứ tự] }]
//   viTri:  [{ id, plId, stt, tram, phuong, tuyen, nhom, kl, goi, donVi, dot, donGia, …cột riêng,
//              chiTiet:[{ma, kl}], trangThai:'chua'|'dang'|'da', thangNT, thucHien: {ma: kl} | null }]
import { MA_GOI_THAU } from './parse.js';

export const LOAI_TEN = { PLI: 'PL I · Thay/sửa tủ', PLII: 'PL II · HPS→LED', PLIII: 'PL III · Sửa/thay trụ', PLIV: 'PL IV · Trụ trang trí', KHAC: 'Khác · ngoài phụ lục' };

export function emptyState() {
  return { catalog: {}, catalogNam: [], catalogNguon: null, bangGia: {}, mau: { PLI: [], PLII: [], PLIII: [], PLIV: [] }, phuLuc: [], viTri: [] };
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
  return gopMa((mau || []).filter((m) => m.ma).map((m) => ({ ma: m.ma, kl: round((+kl || 0) * (+m.heSo || 0)) })));
}
/** Gộp các dòng trùng mã HM trong 1 vị trí (cộng KL) — mỗi mã chỉ 1 dòng để KH/TH luôn nhất quán. */
export function gopMa(list) {
  const m = new Map();
  for (const c of list || []) { const ma = String(c.ma || '').trim().toUpperCase(); if (!ma) continue; m.set(ma, round((m.get(ma) || 0) + (+c.kl || 0))); }
  return [...m].map(([ma, kl]) => ({ ma, kl }));
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
  v.chiTiet = gopMa(chiTiet);
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
export const laDoiTac = (v) => /lữ gia|lu gia|phú thọ|phu tho/i.test(String(v.donVi || ''));
export function doiChieu(st, goi, nam, { phan = 'ld' } = {}) {
  // Vị trí trong phụ lục NHÁP (đề xuất lấy từ app Khảo sát) không cộng vào "Đã vào KH" — chỉ hiện cột khKS
  const nhapIds = new Set(st.phuLuc.filter((p) => p.nhap).map((p) => p.id));
  const all = vtTheo(st, goi, nam).filter((v) => phan !== 'sap' || !laDoiTac(v));
  const vts = all.filter((v) => !nhapIds.has(v.plId));
  const acc = new Map();
  const get = (ma) => { if (!acc.has(ma)) acc.set(ma, { ma, kh: 0, th: 0, nVT: 0, khKS: 0 }); return acc.get(ma); };
  for (const v of all) if (nhapIds.has(v.plId)) for (const c of v.chiTiet || []) get(c.ma).khKS += +c.kl || 0;
  for (const v of vts) {
    const seen = new Set();
    for (const c of v.chiTiet || []) { const a = get(c.ma); a.kh += +c.kl || 0; if (!seen.has(c.ma)) { a.nVT++; seen.add(c.ma); } }
    for (const [ma, kl] of Object.entries(klTH(v))) get(ma).th += +kl || 0;
  }
  // KL kế hoạch theo biểu mã gói thầu của các đơn vị (cột chính của từng biểu)
  const maGT = maGoiThauCua(st, goi);
  const dvMap = new Map();
  if (maGT) for (const bd of st.bieuDV || []) for (const r of bd.rows) {
    if (r[0] !== maGT || +r[2] !== +nam) continue;
    const v = +r[3 + bd.chinh] || 0; if (!v && !acc.has(r[1])) continue;
    const o = dvMap.get(r[1]) || { tong: 0, theo: [] }; o.tong += v; o.theo.push({ id: bd.id, donVi: bd.donVi.join(', ') || bd.file, v }); dvMap.set(r[1], o);
    get(r[1]);
  }
  const bbnt = bbntMoiNhat(st, goi, nam);
  const ntMap = new Map((bbnt?.rows || []).map((r) => [r[0], r[2]]));
  for (const ma of ntMap.keys()) if (ntMap.get(ma)) get(ma);
  const rows = [...acc.values()].map((a) => {
    const it = st.catalog[a.ma];
    const g = it?.goi?.[goi];
    const hd = (phan === 'sap' ? g?.klSap?.[nam] ?? g?.kl?.[nam] : g?.kl?.[nam]) ?? 0;
    const dg = g?.dgNam?.[nam] ?? g?.dg ?? it?.dgChuaVat ?? 0;
    const kh = round(a.kh), th = round(a.th);
    return {
      ma: a.ma, ten: it?.ten || '', dvt: it?.dvt || '', hd, kh, th, nVT: a.nVT,
      khConLai: round(kh - th), hdConLai: round(hd - kh), vuot: kh - hd > 1e-9,
      khongCoTrongHD: !it, dg, tienKH: kh * dg, tienTH: th * dg, nhom: it?.nhom || '',
      khDV: dvMap.has(a.ma) ? round(dvMap.get(a.ma).tong) : null, khDVTheo: dvMap.get(a.ma)?.theo || [],
      vuotDV: dvMap.has(a.ma) && dvMap.get(a.ma).tong - hd > 1e-9,
      ntLK: bbnt ? round(ntMap.get(a.ma) || 0) : null,
      khKS: round(a.khKS),
    };
  });
  rows.sort((x, y) => (y.vuot - x.vuot) || ((y.vuot ? y.kh - y.hd : 0) - (x.vuot ? x.kh - x.hd : 0)) || x.ma.localeCompare(y.ma, 'vi', { numeric: true }));
  return {
    goi, nam, rows,
    soVuot: rows.filter((r) => r.vuot).length,
    chuaGanHM: vts.filter((v) => !(v.chiTiet || []).length).length,
    soVT: vts.length, soVTDaTH: vts.filter((v) => v.trangThai === 'da').length,
    tienKH: rows.reduce((a, r) => a + r.tienKH, 0),
    maGoiThau: maGT, coBieuDV: dvMap.size > 0, soVuotDV: rows.filter((r) => r.vuotDV).length,
    tienDV: rows.reduce((a, r) => a + (r.khDV || 0) * r.dg, 0),
    bbnt: bbnt ? { thang: bbnt.thang, file: bbnt.file, tienLK: (bbnt.rows || []).reduce((a, r) => a + r[2] * (r[3] || 0), 0) } : null,
  };
}

/** Các vị trí có góp vào 1 mã HM (để xem "vị trí cấu thành"). */
export function viTriCuaHM(st, ma, goi, nam, { phan = 'ld' } = {}) {
  return vtTheo(st, goi, nam).filter((v) => phan !== 'sap' || !laDoiTac(v)).filter((v) => (v.chiTiet || []).some((c) => c.ma === ma));
}

/**
 * Khớp file "đã thực hiện" (đúng form phụ lục, cột KL = KL thực hiện) vào kho theo trạm + phường + tuyến.
 * Dòng không khớp được liệt kê, không ghi. apply=false để xem trước.
 */
export function khopThucHien(st, r, thang, { apply = true } = {}) {
  // Không khớp vào phụ lục nháp (đề xuất từ app Khảo sát) — chỉ phụ lục thật
  const ids = new Set(st.phuLuc.filter((p) => p.loai === r.loai && !p.nhap).map((p) => p.id));
  const pool = new Map();
  for (const v of st.viTri) if (ids.has(v.plId)) { const k = keyVT(v); if (!pool.has(k)) pool.set(k, []); pool.get(k).push(v); }
  const used = new Set();
  const khop = [], khongKhop = [];
  for (const row of r.viTri) {
    const ds = (pool.get(keyVT(row)) || []).filter((v) => !used.has(v.id));
    // Ưu tiên vị trí chưa đánh dấu thực hiện, rồi năm KH mới nhất — tránh ghi đè vị trí đã nghiệm thu đợt trước
    const namPL = (v) => +(st.phuLuc.find((p) => p.id === v.plId)?.namKH || 0);
    ds.sort((a, b) => (a.trangThai === 'da') - (b.trangThai === 'da') || namPL(b) - namPL(a));
    const cand = ds[0];
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

// ================== Bảng giá ký hợp đồng ==================
/**
 * Ghép file ký HĐ dạng 1 sheet (không có mã HM, vd "Bảng giá ký HĐ Thủ Đức") với bảng giá đã nhập của 1 gói:
 * dòng thứ i ↔ dòng thứ i (cùng năm, cùng tên hạng mục). Trả { ok, khop, lech, khac: {kl, klSap, dg, tt} }.
 */
export function ghepKyHD(st, res, goi) {
  const bg = st.bangGia?.[goi];
  if (!bg) return { ok: false, loi: `Chưa nhập file biểu giá của ${goi} để ghép mã HM.` };
  const ten = (ma) => String(st.catalog[ma]?.ten || '').normalize('NFC').replace(/\s+/g, ' ').trim().toLowerCase();
  const n = Math.min(bg.rows.length, res.rows.length);
  const khac = { kl: 0, klSap: 0, dg: 0, tt: 0 };
  for (let i = 0; i < n; i++) {
    const [y, ma, kl, klSap, dg, tt] = bg.rows[i]; const x = res.rows[i];
    if (x.y !== y || x.ten.normalize('NFC').replace(/\s+/g, ' ').trim().toLowerCase() !== ten(ma)) return { ok: false, khop: i, lech: { i, file: x, bangGia: { y, ma, ten: st.catalog[ma]?.ten } } };
    if ((x.kl ?? 0) !== kl) khac.kl++;
    if ((x.klSap ?? 0) !== klSap) khac.klSap++;
    if ((x.dg ?? 0) !== dg) khac.dg++;
    if ((x.tt ?? 0) !== tt) khac.tt++;
  }
  if (bg.rows.length !== res.rows.length) return { ok: false, khop: n, lech: { soDong: [res.rows.length, bg.rows.length] } };
  res.rows.forEach((x, i) => { x.ma = bg.rows[i][1]; });
  res.goi = goi;
  return { ok: true, khop: n, khac };
}

/**
 * Áp bảng giá ký HĐ của 1 gói vào danh mục: thay KL HĐ (tổng liên danh + phần Sapulico) và đơn giá ký HĐ theo năm của gói đó;
 * các gói khác giữ nguyên. Các dòng cùng mã + năm (vd 2 khu vực) được cộng KL; đơn giá giữ dòng đầu, khác nhau thì ghi vào canhBao.
 */
export function apBangGiaKy(st, res) {
  const goi = res.goi;
  if (!goi || res.rows.some((x) => !x.ma)) throw new Error('Bảng giá chưa ghép đủ mã HM.');
  st.bangGia ||= {};
  const agg = new Map(); const canhBao = [];
  for (const x of res.rows) {
    const k = `${x.ma}|${x.y}`;
    const a = agg.get(k) || { ma: x.ma, y: x.y, kl: 0, klSap: 0, tt: 0, ttSap: 0, dg: x.dg, ten: x.ten, dvt: x.dvt, nhom: x.nhom || '' };
    a.kl = round(a.kl + (x.kl || 0)); a.klSap = round(a.klSap + (x.klSap ?? x.kl ?? 0));
    a.tt += x.tt || 0; a.ttSap += x.ttSap ?? x.tt ?? 0;
    if (x.dg !== a.dg) canhBao.push(`${x.ma} năm ${x.y}: 2 đơn giá ${a.dg} / ${x.dg}`);
    agg.set(k, a);
  }
  // Xoá số liệu cũ của gói này (để mã không còn trong bảng giá ký không mang KL cũ)
  for (const it of Object.values(st.catalog)) if (it.goi?.[goi]) it.goi[goi] = { kl: {}, klSap: {}, dgNam: {}, dg: null };
  for (const a of agg.values()) {
    const it = (st.catalog[a.ma] ||= { ten: a.ten, dvt: a.dvt, dgChuaVat: null, goi: {} });
    if (a.nhom && !it.nhom) it.nhom = a.nhom;
    const g = (it.goi[goi] ||= { kl: {}, klSap: {}, dgNam: {}, dg: null });
    g.kl ||= {}; g.klSap ||= {}; g.dgNam ||= {};
    g.kl[a.y] = a.kl; g.klSap[a.y] = a.klSap; g.dgNam[a.y] = a.dg;
    if (g.dg === null || g.dg === undefined) g.dg = a.dg;
  }
  const nam = [...new Set(res.rows.map((x) => x.y))];
  st.catalogNam = [...new Set([...(st.catalogNam || []), ...nam])].sort();
  st.bangGia[goi] = {
    file: res.file, sheet: res.sheet, ngay: new Date().toISOString(), lienDanh: res.lienDanh, doiTac: res.doiTac,
    maGoiThau: st.bangGia[goi]?.maGoiThau || MA_GOI_THAU[goi] || '',
    tong: res.tong, tongSap: res.tongSap, rows: res.rows.map((x) => [x.y, x.ma, x.kl ?? 0, x.klSap ?? x.kl ?? 0, x.dg ?? 0, x.tt ?? 0]),
  };
  return { soMa: new Set(res.rows.map((x) => x.ma)).size, canhBao };
}

/** Gộp danh mục từ "Tong hop HM": bổ sung tên/ĐVT; KL HĐ chỉ ghi cho gói CHƯA có bảng giá ký HĐ (bảng giá ký là nguồn ưu tiên). */
export function gopDanhMuc(st, cat) {
  const daKy = new Set(Object.keys(st.bangGia || {}));
  for (const [ma, it] of Object.entries(cat.hm)) {
    const cur = (st.catalog[ma] ||= { ten: it.ten, dvt: it.dvt, dgChuaVat: it.dgChuaVat, goi: {} });
    cur.ten ||= it.ten; cur.dvt ||= it.dvt; cur.dgChuaVat ??= it.dgChuaVat; cur.goi ||= {};
    for (const [g, v] of Object.entries(it.goi || {})) if (!daKy.has(g)) cur.goi[g] = v;
  }
  st.catalogNam = [...new Set([...(st.catalogNam || []), ...(cat.nam || [])])].sort();
}

// ================== Mã gói thầu + biểu KL của đơn vị ==================
/** Mã gói thầu của 1 gói: ưu tiên mã người dùng đã nhập cho bảng giá ký, sau đó mã đã biết (G101TT…). */
export function maGoiThauCua(st, goi) { return st.bangGia?.[goi]?.maGoiThau || st.maGoiThau?.[goi] || MA_GOI_THAU[goi] || ''; }
export function goiCuaMaGoiThau(st, maGT) {
  const all = { ...MA_GOI_THAU, ...(st.maGoiThau || {}) };
  for (const [g, b] of Object.entries(st.bangGia || {})) if (b.maGoiThau) all[g] = b.maGoiThau;
  return Object.keys(all).find((g) => all[g] === maGT) || null;
}
/** Kiểm tra 1 biểu đơn vị với danh mục: mã HM có trong HĐ, nhóm, đơn giá ký, KL HĐ (tổng hoặc phần Sapulico). */
export function kiemBieuDV(st, b) {
  const kq = { khongCoMa: [], lechNhom: [], lechDG: [], lechKL: [], khongRoGoi: [] };
  for (const d of b.rows) {
    const goi = goiCuaMaGoiThau(st, d.maGoi);
    if (!goi) { kq.khongRoGoi.push(d.maGoi); continue; }
    const it = st.catalog[d.ma]; const g = it?.goi?.[goi];
    if (!it || !g) { kq.khongCoMa.push(d.ma); continue; }
    if (d.nhom && it.nhom && d.nhom !== it.nhom) kq.lechNhom.push(`${d.ma}: ${d.nhom} ≠ ${it.nhom}`);
    const dg = g.dgNam?.[d.nam] ?? g.dg;
    if (d.dg !== null && dg !== null && dg !== undefined && Math.abs(d.dg - dg) > 0.5) kq.lechDG.push(`${d.ma} ${d.nam}: ${d.dg} ≠ ${dg}`);
    const kl = g.kl?.[d.nam], ks = g.klSap?.[d.nam];
    if (d.klHD !== null && kl !== undefined && Math.abs(d.klHD - kl) > 1e-6 && (ks === undefined || Math.abs(d.klHD - ks) > 1e-6)) kq.lechKL.push(`${d.ma} ${d.nam}: ${d.klHD} ≠ ${kl}`);
  }
  kq.khongRoGoi = [...new Set(kq.khongRoGoi)];
  return kq;
}
/** Lưu biểu đơn vị (thay bản cũ cùng file + sheet). chinh = chỉ số cột KL dùng làm "KH đơn vị". */
export function themBieuDV(st, b, { file = '', chinh = b.chinh } = {}) {
  st.bieuDV ||= [];
  const old = st.bieuDV.find((x) => x.file === file && x.sheet === b.sheet);
  const rec = { id: old?.id || uid('bdv'), file, sheet: b.sheet, ngay: new Date().toISOString(), donVi: b.donVi, maGoi: b.maGoi, nam: b.nam,
    cols: b.cols, chinh: +chinh, rows: b.rows.map((d) => [d.maGoi, d.ma, d.nam, ...d.v]) };
  st.bieuDV = st.bieuDV.filter((x) => x !== old).concat([rec]);
  return rec;
}
export function xoaBieuDV(st, id) { st.bieuDV = (st.bieuDV || []).filter((x) => x.id !== id); }

// ================== Biên bản nghiệm thu (BBNT) ==================
const tenChuan = (x) => String(x || '').normalize('NFC').replace(/\s+/g, ' ').trim().toLowerCase();
/**
 * Ghép 1 BBNT với bảng giá ký HĐ đã nhập: thử từng gói có cùng số dòng của năm đó, dòng i ↔ dòng i (cùng tên).
 * Trả { ok, goi, lech: {ten, kl, dg}, ... } và gắn x.ma cho từng dòng khi ok.
 */
export function ghepBBNT(st, b) {
  let tot = null;
  for (const [goi, bg] of Object.entries(st.bangGia || {})) {
    const rs = bg.rows.filter((r) => +r[0] === +b.nam);
    if (rs.length !== b.items.length) continue;
    // BBNT có cột mã HM (work_item_cs_id) → ghép theo mã (mã trùng giữa 2 khu vực lấy lần lượt)
    if (b.items.every((x) => x.ma)) {
      const kho = new Map(); rs.forEach((r) => { if (!kho.has(r[1])) kho.set(r[1], []); kho.get(r[1]).push(r); });
      const gan = b.items.map((x) => kho.get(x.ma)?.shift());
      if (gan.every(Boolean)) {
        const k3 = { ok: true, goi, theoMa: true, lechTen: [], lechKL: [], lechDG: [] };
        b.items.forEach((x, i) => {
          const [, ma, kl, klSap, dg] = gan[i];
          if (tenChuan(x.ten) !== tenChuan(st.catalog[ma]?.ten)) k3.lechTen.push(`${ma}: "${x.ten}" ≠ "${st.catalog[ma]?.ten}"`);
          const klF = x.klSap ?? x.klHD, klK = x.klSap !== null && x.klSap !== undefined ? klSap : kl;
          if (klF !== null && Math.abs(klF - klK) > 1e-6) k3.lechKL.push(`${ma}: ${klF} ≠ ${klK}`);
          if (x.dg !== null && Math.abs(x.dg - dg) > 0.5) k3.lechDG.push(`${ma}: ${x.dg} ≠ ${dg}`);
          x.maK = ma; x.tran = klF ?? (klSap || kl);
        });
        return k3;
      }
    }
    const kq = { ok: true, goi, lechTen: [], lechKL: [], lechDG: [] };
    for (let i = 0; i < rs.length; i++) {
      const [, ma, kl, klSap, dg] = rs[i]; const x = b.items[i];
      if (tenChuan(x.ten) !== tenChuan(st.catalog[ma]?.ten)) { kq.lechTen.push(`dòng ${x.row}: "${x.ten}" ≠ ${ma}`); if (kq.lechTen.length > 20) break; continue; }
      if (x.ma && x.ma !== ma) kq.lechTen.push(`dòng ${x.row}: mã ${x.ma} ≠ ${ma}`);
      const klF = x.klSap ?? x.klHD, klK = x.klSap !== null && x.klSap !== undefined ? klSap : kl;
      if (klF !== null && Math.abs(klF - klK) > 1e-6) kq.lechKL.push(`${ma}: ${klF} ≠ ${klK}`);
      if (x.dg !== null && Math.abs(x.dg - dg) > 0.5) kq.lechDG.push(`${ma}: ${x.dg} ≠ ${dg}`);
    }
    if (kq.lechTen.length) {
      // Thứ tự dòng khác bảng giá → ghép theo tên + ĐVT (tên trùng thì lấy lần lượt theo thứ tự xuất hiện)
      const kho = new Map();
      rs.forEach((r) => { const k = tenChuan(st.catalog[r[1]]?.ten) + '|' + tenChuan(st.catalog[r[1]]?.dvt).replace(/^1\s+/, ''); if (!kho.has(k)) kho.set(k, []); kho.get(k).push(r); });
      const gan = []; let hong = null;
      for (const x of b.items) {
        const k = tenChuan(x.ten) + '|' + tenChuan(x.dvt).replace(/^1\s+/, '');
        const r = kho.get(k)?.shift();
        if (!r) { hong = `dòng ${x.row}: "${x.ten}" (${x.dvt}) không có trong bảng giá ${goi}`; break; }
        gan.push(r);
      }
      if (hong) { tot ||= { ...kq, ok: false, lechTen: [hong] }; continue; }
      const k2 = { ok: true, goi, theoTen: true, lechTen: [], lechKL: [], lechDG: [] };
      b.items.forEach((x, i) => {
        const [, ma, kl, klSap, dg] = gan[i];
        const klF = x.klSap ?? x.klHD, klK = x.klSap !== null && x.klSap !== undefined ? klSap : kl;
        if (klF !== null && Math.abs(klF - klK) > 1e-6 && Math.abs(klF - klSap) > 1e-6) k2.lechKL.push(`${ma}: ${klF} ≠ ${klK}`);
        if (x.dg !== null && Math.abs(x.dg - dg) > 0.5) k2.lechDG.push(`${ma}: ${x.dg} ≠ ${dg}`);
        x.maK = ma; x.tran = klF ?? (klSap || kl);
      });
      return k2;
    }
    b.items.forEach((x, i) => { x.maK = rs[i][1]; x.tran = (x.klSap ?? x.klHD) ?? (rs[i][3] || rs[i][2]); });
    return kq;
  }
  return tot || { ok: false, goi: null, lechTen: [], lechKL: [], lechDG: [], loi: 'Không khớp bảng giá ký HĐ của gói nào (số dòng / tên hạng mục khác).' };
}
/** Kiểm tra nội bộ + nối tiếp với BBNT tháng trước đã có trong kho. */
export function kiemBBNT(st, b, goi) {
  const kq = { lkSai: [], vuot: [], thKhacNT: [], noiTiep: [], thangTruoc: null };
  for (const x of b.items) {
    if (Math.abs(x.lkTruoc + x.nt - x.lk) > 1e-6) kq.lkSai.push(`${x.maK || x.stt}: ${x.lkTruoc} + ${x.nt} ≠ ${x.lk}`);
    if (x.tran !== null && x.tran !== undefined && x.lk - x.tran > 1e-6) kq.vuot.push(`${x.maK}: lũy kế ${x.lk} > HĐ ${x.tran}`);
    if (x.th !== null && Math.abs(x.th - x.nt) > 1e-6) kq.thKhacNT.push(`${x.maK}: TH ${x.th} ≠ NT ${x.nt}`);
  }
  const L = (st.nghiemThu || []).filter((n) => n.goi === goi && n.nam === b.nam && n.thang < b.thang);
  const tMax = L.length ? Math.max(...L.map((n) => n.thang)) : null;
  const truoc = tMax ? gopThang(L.filter((n) => n.thang === tMax)) : null;
  if (truoc) {
    kq.thangTruoc = truoc.thang;
    const lkT = new Map(truoc.rows.map((r) => [r[0], r[2]]));
    for (const x of b.items) { const p = lkT.get(x.maK) || 0; if (Math.abs(p - x.lkTruoc) > 1e-6) kq.noiTiep.push(`${x.maK}: kỳ trước ${x.lkTruoc} ≠ lũy kế T${truoc.thang} ${p}`); }
  }
  return kq;
}
/**
 * Lưu BBNT. Một tháng có thể có nhiều biên bản theo đơn vị (vd G3 T8: CSKV Tây + CSKV Bắc, cùng lũy kế kỳ trước):
 * thay bản cũ cùng gói + năm + tháng + sheet; thay hết bản cũ của tháng khi themDonVi = false.
 * rows: [ma, KL nghiệm thu tháng, lũy kế đến hết kỳ, đơn giá, lũy kế kỳ trước].
 */
export function luuBBNT(st, b, goi, file, { themDonVi = false } = {}) {
  st.nghiemThu ||= [];
  st.nghiemThu = st.nghiemThu.filter((n) => !(n.goi === goi && n.nam === b.nam && n.thang === b.thang && (!themDonVi || n.sheet === b.sheet)));
  const rec = { id: uid('nt'), goi, nam: b.nam, thang: b.thang, file, sheet: b.sheet, ngay: new Date().toISOString(), gt: b.gtThang,
    rows: b.items.filter((x) => x.nt || x.lk || x.lkTruoc).map((x) => [x.maK, x.nt, x.lk, x.dg || 0, x.lkTruoc || 0]) };
  st.nghiemThu.push(rec);
  return rec;
}
/** Gộp các biên bản cùng tháng (theo đơn vị): NT tháng cộng lại, lũy kế = lũy kế kỳ trước + Σ NT. */
export function gopThang(list) {
  if (!list.length) return null;
  if (list.length === 1 && list[0].rows.every((r) => r.length < 5)) return list[0];
  const m = new Map();
  for (const n of list) n.rows.forEach((r) => { const o = m.get(r[0]) || { nt: 0, dg: r[3], lkTruoc: r[4] ?? (r[2] - r[1]) }; o.nt += r[1]; m.set(r[0], o); });
  const rows = [...m].map(([ma, o]) => [ma, o.nt, o.lkTruoc + o.nt, o.dg, o.lkTruoc]);
  return { ...list[0], id: list.map((n) => n.id).join('+'), sheet: list.map((n) => n.sheet).join(' + '), gt: list.reduce((a, n) => a + n.gt, 0), rows, soBB: list.length };
}
/** BBNT mới nhất của gói trong năm (đã gộp các biên bản đơn vị cùng tháng). */
export function bbntMoiNhat(st, goi, nam) {
  const L = (st.nghiemThu || []).filter((n) => n.goi === goi && n.nam === +nam);
  if (!L.length) return null;
  const t = Math.max(...L.map((n) => n.thang));
  return gopThang(L.filter((n) => n.thang === t));
}
