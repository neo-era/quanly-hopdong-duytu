// ks.js — Liên kết app Khảo sát (neo-era.github.io/khaosat) ↔ KL theo vị trí. Hàm thuần, không DOM, không gọi mạng.
// Thiết kế + tiêu chí: docs/04_LienKet-KhaoSat.md.
//  - anhXa: 1 bản ghi khảo sát (khoá = tiêu đề cột tiếng Việt của sheet) → vị trí đề xuất
//  - xemTruoc / apDung: phân loại (mới / thay đổi / trùng phụ lục / đã xoá…) rồi đưa vào PHỤ LỤC NHÁP
//  - chuyenNhap: nháp → đợt phụ lục thật (chỉ vị trí có KL, có gói, đã xác nhận thuộc Sở)
//  - tomTat: bản tóm tắt HĐ đẩy sang app Khảo sát (4 bảng HD_*)
import { norm, keyVT, apMau, gopMa, doiChieu, maGoiThauCua, LOAI_TEN, kenhPL } from './core.js';
import { goiYMa, MA_THEO_LOAI, heSoDVT, coTrongGoi } from './ksma.js';
import { nhomCua } from './ksnhom.js';

let seq = 0;
const uid = (p) => `${p}-${Date.now().toString(36)}${(seq++).toString(36)}${Math.random().toString(36).slice(2, 6)}`;

const GHI_CHU = ['Ghi chú', 'Ghi chú (kèm thay cần đèn,...)'];
const QC_TRU = 'Quy cách trụ (loại trụ: chiều cao VD: STK 9m; be tông 8,4m; trang trí;...)';
/**
 * Ánh xạ theo loại khảo sát. dich: PLII/PLIII/KHAC. kl: tiêu đề cột KL (null = để trống cho người dùng nhập).
 * them: cột đưa vào ghi chú. tat: mặc định không lấy (bật bằng opts.layThem).
 */
export const KS_MAP = {
  // Anh chốt 11/11/2026 (doc 05 mục 2): mỗi loại có phụ lục trình Sở đích; loại chưa có mẫu riêng → khuôn chung 'KS:<loại>'.
  thay_den:     { ten: 'Thay đèn', dich: 'PLII', kl: 'Số đèn hiện hữu', hienHuu: 'Số đèn hiện hữu', dau: 'Đầu tuyến', cuoi: 'Cuối tuyến', them: ['Công suất đèn hiện hữu'], dvt: 'bộ' },
  thay_tru:     { ten: 'Thay trụ', dich: 'PLIII', kl: 'Số lượng', hienHuu: 'Số lượng', dau: 'Vị trí', them: [QC_TRU], qc: QC_TRU, dvt: 'trụ' },
  thay_sua_tu:  { ten: 'Thay sửa tủ điều khiển', dich: 'PLI', kl: 'Số lượng', them: ['Hiện trạng tủ'], dvt: 'tủ' },
  vo_tu:        { ten: 'Vỏ tủ điều khiển', tenHM: 'thay vỏ tủ điều khiển', dich: 'KS:vo_tu', kl: 'Số lượng', dvt: 'tủ', luonTT: true },
  ngam_hoa:     { ten: 'Ngầm hóa', dich: 'HANGAM', kl: 'Số trụ', kl2: 'Chiều dài cáp ngầm (md)', dau: 'Đầu tuyến', cuoi: 'Cuối tuyến', dvt: 'trụ', dvt2: 'md' },
  tang_cuong_den: { ten: 'Tăng cường đèn', dich: 'TANGCUONG', kl: 'Số đèn dự kiến', dau: 'Đầu tuyến', cuoi: 'Cuối tuyến', dvt: 'bộ' },
  tc_den_kc_xa: { ten: 'Tăng cường đèn KC xa', dich: 'TANGCUONG', kl: 'Số lượng', dau: 'Vị trí', them: ['Chủng loại đèn'], qc: 'Chủng loại đèn', dvt: 'bộ' },
  tc_ngam:      { ten: 'Thay cáp ngầm', dich: 'CAPNGAM', kl: 'Số lượng', them: ['Loại cáp'], dvt: 'md' },
  tc_noi:       { ten: 'Thay cáp nổi', tenHM: 'thay thế cáp nguồn nổi', dich: 'KS:tc_noi', kl: 'Số lượng', them: ['Loại cáp hiện hữu'], qc: 'Loại cáp hiện hữu', dvt: 'm' },
  cap_luon_can: { ten: 'Cáp luồn cần', tenHM: 'thay cáp luồn cần đèn', dich: 'KS:cap_luon_can', kl: 'Số lượng', dau: 'Vị trí', them: ['Loại cáp'], qc: 'Loại cáp', dvt: 'm' },
  hkn:          { ten: 'Hộp kín nước', tenHM: 'thay hộp kín nước', dich: 'KS:hkn', kl: 'Số lượng', them: ['Loại hộp (6A, 10A)'], qc: 'Loại hộp (6A, 10A)', dvt: 'hộp' },
  thay_can:     { ten: 'Thay cần đèn', tenHM: 'thay cần đèn', dich: 'KS:thay_can', kl: 'Số lượng', dau: 'Vị trí', them: ['Loại cần (3,8m ; 3m...)'], qc: 'Loại cần (3,8m ; 3m...)', dvt: 'cần' },
  choa_den:     { ten: 'Chóa đèn', tenHM: 'thay chóa đèn', dich: 'KS:choa_den', kl: 'Số lượng', them: ['Loại chóa'], qc: 'Loại chóa', dvt: 'bộ' },
  nap_tru:      { ten: 'Nắp trụ', tenHM: 'thay nắp cửa trụ', dich: 'KS:nap_tru', kl: 'Số lượng', dau: 'Số trụ', them: ['Quy cách'], qc: 'Quy cách', dvt: 'cái' },
  decal_so_tru: { ten: 'Decal số trụ', tenHM: 'dán decal số trụ', dich: 'KS:decal_so_tru', kl: 'Số lượng', dau: 'Vị trí', dvt: 'cái' },
  nang_mong:    { ten: 'Nâng móng trụ', tenHM: 'nâng móng trụ', dich: 'KS:nang_mong', kl: 'Số lượng', dau: 'Vị trí', them: ['Quy cách móng'], dvt: 'trụ' },
  thao_go_bang_ron: { ten: 'Tháo gỡ băng rôn', tenHM: 'tháo gỡ băng rôn', dich: 'KS:thao_go_bang_ron', kl: 'Số lượng', dau: 'Vị trí', them: ['Loại quảng cáo'], dvt: 'tấm', khongTDK: true },
  // Báo cáo sự cố không có cột số lượng → KL để trống, người dùng nhập theo mã HM
  bao_cao_su_co: { ten: 'Báo cáo sự cố', tenHM: 'khắc phục sự cố', dich: 'KS:bao_cao_su_co', kl: null, them: ['Mã tủ', 'Hiện trạng sự cố', 'Đề xuất khắc phục'], dvt: 'lần' },
};
export const LOAI_KHAC = 'KHAC';
export const TEN_DICH = { ...LOAI_TEN, KHAC: 'Khác (ngoài phụ lục)' };
/** Tên phụ lục đích, kể cả khuôn chung 'KS:<loại>'. */
export const tenDich = (d) => TEN_DICH[d] || (/^KS:/.test(String(d || '')) ? 'Khác · ' + (KS_MAP[d.slice(3)]?.ten || d.slice(3)) : String(d || ''));
/** Đọc cột "Trình Sở" (so khớp bỏ dấu, hoa/thường) → 'TS' | 'TT' | null (trống hoặc giá trị lạ = chưa phân loại). */
export function docKenh(x) {
  const t = norm(x);
  if (t === 'trinh so') return 'TS';
  if (t === 'khong trinh so') return 'TT';
  return null;
}
export const TEN_KENH = { TS: 'Trình Sở', TT: 'KL Trung tâm' };
// Cùng quy tắc với máy chủ (laDenHps_) và form (trinh-so.js): có chữ HPS/sodium/natri/cao áp mà KHÔNG có LED
const laHPS = (t) => { const x = norm(t); return /\b(hps|sodium|natri|cao ap|son)\b/.test(x) && !/\bled\b/.test(x); };

/** Đọc số: 6 · "1,5" · "30m" → số; chữ tự do / trống → null (không ghi 0, không đoán). */
export function docSo(x) {
  if (typeof x === 'number') return isFinite(x) ? x : null;
  let t = String(x ?? '').trim();
  if (!t) return null;
  const m = t.match(/^(\d+(?:[.,]\d+)*)\s*(m|mét|met)?$/i);
  if (!m) return null;
  t = m[1];
  // Kiểu Việt Nam: "." tách nghìn, "," thập phân. "1.234" / "1.234.567" = hàng nghìn; "1.5" = thập phân
  if (/^\d{1,3}(\.\d{3})+$/.test(t)) t = t.replace(/\./g, '');
  else if (t.includes(',') && t.includes('.')) t = t.replace(/\./g, '').replace(',', '.');
  else if (t.includes(',')) t = t.replace(',', '.');
  const n = Number(t);
  return isFinite(n) ? n : null;
}
const txt = (x) => (x === null || x === undefined ? '' : String(x).trim());
const bo = (p) => txt(p).replace(/^(?:(?:phường|phuong|xã|xa)\s+|p\.\s*|p\s+)/i, '').trim();
/** Khoá so trùng vị trí: trạm + phường (bỏ tiền tố) + tuyến. */
const keyKS = (v) => keyVT({ tram: v.tram, phuong: bo(v.phuong), tuyen: v.tuyen });
/** Băm ngắn (FNV-1a) — phát hiện bản ghi khảo sát đã đổi. */
export function bam(s) {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return h.toString(36);
}

/** 1 bản ghi khảo sát → { type, stt, dich, vt, goiYPLIV } ; null nếu loại không lấy. Thiếu cột bắt buộc → ném lỗi. */
export function anhXa(row, opts = {}) {
  const type = row?._type;
  const M = KS_MAP[type];
  if (!M || (M.tat && !(opts.layThem || []).includes(type))) return null;
  // Cột KL thiếu (vd Ngầm hóa bản cũ chưa có 2 cột mới) → KL trống, vào nhóm "Thiếu KL"; không dừng cả loại (doc 05 K3b)
  const need = ['STT', 'Tuyến đường', 'Phường'].concat(M.khongTDK ? [] : ['Tủ điều khiển']);
  const thieu = need.filter((h) => !(h in row));
  if (thieu.length) throw new Error(`Thiếu cột "${thieu.join('", "')}" ở loại ${M.ten} — kiểm tra lại sheet khảo sát`);
  const stt = txt(row.STT);
  const ghiChu = [...(M.them || []).map((h) => txt(row[h])), ...GHI_CHU.map((h) => txt(row[h]))].filter(Boolean).join('; ');
  const vt = {
    tram: txt(row['Tủ điều khiển']), phuong: bo(row['Phường']), tuyen: txt(row['Tuyến đường']),
    nhom: bo(row['Phường']),
    kl: M.kl ? docSo(row[M.kl]) : null,
    lyTrinhDau: M.dau ? txt(row[M.dau]) || null : null,
    lyTrinhCuoi: M.cuoi ? txt(row[M.cuoi]) || null : null,
    namLD: docSo(row['Năm lắp đặt']),
    ghiChu: ghiChu || null,
    link: txt(row['Link Google Map'] || row.link) || null,
    lat: docSo(row['vĩ độ']), lng: docSo(row['kinh độ']),
    donVi: '',
  };
  if (M.hienHuu) vt.hienHuu = docSo(row[M.hienHuu]);
  if (M.kl2) { const k2 = docSo(row[M.kl2]); if (k2 !== null) vt.kl2 = k2; }
  // Kênh do người khảo sát chọn ('TS' | 'TT'); vỏ tủ luôn TT; trống / giá trị lạ → chưa phân loại
  const coKenh = txt(row['Trình Sở']) !== '';
  let kenhKS = M.luonTT ? 'TT' : docKenh(row['Trình Sở']);
  let kenhLoi = '';
  if (kenhKS === 'TS' && M.dich === 'TANGCUONG' && M.qc && laHPS(row[M.qc])) { kenhKS = null; kenhLoi = 'Đèn HPS chọn Trình Sở — PL tăng cường chỉ nhận LED'; }
  if (M.qc && txt(row[M.qc])) vt.thuoc = { qc: txt(row[M.qc]) };   // thuộc tính để gợi ý mã HM (ksma.js)
  for (const k of Object.keys(vt)) if (vt[k] === null && !['kl'].includes(k)) delete vt[k];
  const ksChon = docChon(row._hd);
  if (ksChon) vt.ksChon = ksChon;
  const gocArr = [vt.tram, vt.phuong, vt.tuyen, vt.kl, vt.hienHuu, vt.lyTrinhDau, vt.lyTrinhCuoi, vt.namLD, vt.ghiChu, vt.thuoc?.qc];
  // kl2 / Trình Sở chỉ vào hash khi có → bản cũ không bị báo "thay đổi" hàng loạt (doc 05 H1)
  if (vt.kl2 !== undefined) gocArr.push(['kl2', vt.kl2]);
  if (coKenh) gocArr.push(['kenh', txt(row['Trình Sở'])]);
  // Lựa chọn của người KS chỉ vào hash khi có → bản cũ không chọn giữ nguyên hash (không báo "thay đổi" hàng loạt)
  if (ksChon) gocArr.push([ksChon.nam, ksChon.goi, ksChon.ds.map((d) => d.ma + '*' + d.heSo).join(',')]);
  const goc = JSON.stringify(gocArr);
  vt.nguon = { ks: type + '#' + stt, hash: bam(goc), thuocSo: false, xoa: false, kenhKS: kenhKS || null };
  // Trụ trang trí ở chung PL Thay trụ, ghi chú "Trụ trang trí" (bỏ gợi ý PL IV — doc 05 mục 2)
  if (type === 'thay_tru' && /trang tr[íi]/i.test(txt(row[QC_TRU])) && !/trang tr[íi]/i.test(vt.ghiChu || '')) vt.ghiChu = 'Trụ trang trí' + (vt.ghiChu ? '; ' + vt.ghiChu : '');
  return { type, stt, dich: M.dich, dvt: M.dvt, vt, kenh: kenhKS || null, kenhLoi, xoa: !!txt(row['Deleted At']), goiYPLIV: false };
}

/**
 * Lựa chọn hạng mục HĐ người khảo sát gửi kèm bản ghi (trường ảo `_hd` của action list, máy chủ đã kiểm).
 * Kiểm lại phía app HĐ (không tin dữ liệu chéo app): tối đa 3 mã, mã là chuỗi, hệ số số dương ≤ 100.
 */
export function docChon(h) {
  if (!h || typeof h !== 'object' || !Array.isArray(h.ds)) return null;
  const ds = [];
  for (const d of h.ds) {
    if (ds.length >= 3) break;
    if (!d || typeof d.ma !== 'string' || !/^HM\d{1,4}[A-Za-z0-9]{0,4}$/.test(d.ma) || ds.some((x) => x.ma === d.ma)) continue;
    const heSo = d.heSo === undefined || d.heSo === null || d.heSo === '' ? 1 : Number(d.heSo);
    if (!isFinite(heSo) || heSo <= 0 || heSo > 100) continue;
    ds.push({ ma: d.ma, heSo });
  }
  if (!ds.length) return null;
  const out = { nam: +h.nam || null, goi: /^G\d{1,2}$/.test(String(h.goi || '')) ? String(h.goi) : null, goiTay: !!h.goiTay, ds };
  if (!out.nam) delete out.nam;
  if (!out.goi) delete out.goi;
  if (!out.goiTay) delete out.goiTay;
  return out;
}

/** Phường (chuẩn hoá) → tập gói, rút từ vị trí trong phụ lục THẬT đã nhập từ file (không tính vị trí lấy từ KS). */
export function phuongGoi(st) {
  const real = new Set(st.phuLuc.filter((p) => !p.nhap && p.nguon !== 'KS').map((p) => p.id));
  const m = new Map();
  for (const v of st.viTri) {
    if (!real.has(v.plId) || !v.goi || !v.phuong) continue;
    const k = norm(bo(v.phuong));
    if (!m.has(k)) m.set(k, new Set());
    m.get(k).add(v.goi);
  }
  return m;
}
/** CSKV của vị trí KS: theo vị trí phụ lục thật cùng phường (+ cùng gói nếu có), chỉ khi duy nhất. */
export function donViTheoPhuong(st, phuong, goi) {
  const real = new Set(st.phuLuc.filter((p) => !p.nhap && p.nguon !== 'KS').map((p) => p.id));
  const k = norm(bo(phuong));
  const ds = new Set(st.viTri.filter((v) => real.has(v.plId) && v.donVi && v.phuong && norm(bo(v.phuong)) === k && (!goi || !v.goi || v.goi === goi)).map((v) => v.donVi));
  return ds.size === 1 ? [...ds][0] : '';
}
export function goiTheoPhuong(st, phuong, pg = phuongGoi(st)) {
  const list = [...(pg.get(norm(bo(phuong))) || [])].sort();
  return { goi: list.length === 1 ? list[0] : list.length > 1 ? 'nhieu' : null, list };
}

/**
 * Xem trước: rows = bản ghi từ action list (mọi loại). Trả { items, dem }.
 * trangThai: moi | thayDoi | daCo | trungPL | xoa | sttTrung.  chon: mặc định có chọn không.
 */
export function xemTruoc(st, rows, opts = {}) {
  const pg = phuongGoi(st);
  const daLay = new Map(st.viTri.filter((v) => v.nguon?.ks).map((v) => [v.nguon.ks, v]));
  const plLoai = new Map(st.phuLuc.map((p) => [p.id, p]));
  // Khoá trùng phụ lục có kênh: TS và TT trùng vị trí không báo trùng nhau (doc 05 H2)
  const keyPL = new Set(st.viTri.filter((v) => !v.nguon?.ks && plLoai.get(v.plId)).map((v) => plLoai.get(v.plId).loai + '§' + kenhPL(plLoai.get(v.plId)) + '§' + keyKS(v)));
  const dem = { moi: 0, thayDoi: 0, trungPL: 0, thieuKL: 0, xoa: 0, sttTrung: 0, chuaPL: 0, TS: 0, TT: 0 };
  // Cùng loại + vị trí đã có ở kênh kia → nhãn "trùng vị trí khác kênh" (không chặn — H2)
  const kenhKhoa = new Map();
  for (const v of st.viTri) { const p = plLoai.get(v.plId); if (!p || v.nguon?.ks) continue; const k = p.loai + '§' + keyKS(v); if (!kenhKhoa.has(k)) kenhKhoa.set(k, new Set()); kenhKhoa.get(k).add(kenhPL(p)); }
  const sttCount = new Map();
  for (const r of rows) if (KS_MAP[r?._type] && !txt(r['Deleted At'])) { const k = r._type + '#' + txt(r.STT); sttCount.set(k, (sttCount.get(k) || 0) + 1); }
  const plMap = new Map(st.phuLuc.map((p) => [p.id, p]));
  const items = [];
  for (const row of rows) {
    const a = anhXa(row, opts);
    if (!a) continue;
    const key = a.vt.nguon.ks;
    const cu = daLay.get(key);
    let trangThai;
    // Bản đã xoá: bỏ qua nếu chưa từng lấy, đã đánh dấu, hoặc còn bản hiệu lực cùng STT
    if (a.xoa) { if (!cu || cu.nguon.xoa || sttCount.get(key)) continue; trangThai = 'xoa'; }
    else if ((sttCount.get(key) || 0) > 1) trangThai = 'sttTrung';
    else if (cu) trangThai = cu.nguon.hash === a.vt.nguon.hash && !cu.nguon.xoa ? 'daCo' : 'thayDoi';
    else if (a.kenh && keyPL.has(a.dich + '§' + a.kenh + '§' + keyKS(a.vt))) trangThai = 'trungPL';
    else trangThai = 'moi';
    const g = goiTheoPhuong(st, a.vt.phuong, pg);
    // Phường chưa có trong HĐ / thuộc nhiều gói → dùng gói người KS chọn (cờ goiKS); phường có 1 gói thật khác gói KS chọn → nhãn lệch gói
    const kc = a.vt.ksChon;
    const goiKS = !cu?.goi && !!kc?.goi && (!g.goi || (g.goi === 'nhieu' && g.list.includes(kc.goi)));
    const lechGoi = !!kc?.goi && !!g.goi && g.goi !== 'nhieu' && g.goi !== kc.goi;
    const goiVT = cu?.goi || (goiKS ? kc.goi : g.goi);
    const thieuKL = a.vt.kl === null && trangThai !== 'xoa';
    // Vị trí đã vào đợt phụ lục thật / đã thực hiện: thay đổi từ KS không chọn sẵn (phải xem rồi mới cập nhật)
    const daVaoDot = !!cu && !plMap.get(cu.plId)?.nhap;
    // Kênh: vị trí đã có → kênh phụ lục đang chứa; mới → kênh KS chọn (null = Chưa phân loại)
    const kenh = cu ? kenhPL(plMap.get(cu.plId)) : a.kenh;
    const it = { key, type: a.type, stt: a.stt, dich: a.dich, dvt: a.dvt, vt: a.vt, trangThai, thieuKL, goiYPLIV: false, daVaoDot,
      kenh, kenhKS: a.kenh, kenhLoi: a.kenhLoi || '',
      trungKhacKenh: !!kenh && [...(kenhKhoa.get(a.dich + '§' + keyKS(a.vt)) || [])].some((x) => x !== kenh),
      goiY: goiYCua(st, a.dich, a.type, a.vt.thuoc, { ksChon: kc, goi: goiVT }), coMau: mauCua(st, a.dich, a.type).some((m) => m.ma),
      goi: goiVT, goiKS, lechGoi, goiList: g.list, chon: (trangThai === 'moi' && !!kenh) || trangThai === 'xoa' || (trangThai === 'thayDoi' && !daVaoDot && cu?.trangThai !== 'da'),
      viTriId: cu?.id || null };
    items.push(it);
    if (dem[trangThai] !== undefined) dem[trangThai]++;
    if (trangThai === 'moi' || trangThai === 'thayDoi') { if (kenh) dem[kenh]++; else dem.chuaPL++; }
    if (thieuKL && trangThai !== 'daCo' && trangThai !== 'trungPL' && trangThai !== 'sttTrung') dem.thieuKL++;
  }
  return { items, dem };
}

/** Phụ lục nháp "Đề xuất từ KS" theo loại + năm KH (tạo nếu chưa có). */
function plNhap(st, loai, namKH, kenh = 'TS') {
  let p = st.phuLuc.find((x) => x.nhap && x.loai === loai && +x.namKH === +namKH && kenhPL(x) === kenh);
  if (!p) {
    p = { id: uid('pl'), loai, nhap: true, nguon: 'KS', sheet: 'Đề xuất từ KS' + (kenh === 'TT' ? ' · KL TT' : ''), file: '', tieuDe: '', congVan: '', dot: '', nhomVon: '',
      namKH: +namKH, donGia: null, header: null, nhom: [], ngayNhap: new Date().toISOString() };
    if (kenh === 'TT') p.kenh = 'TT';
    st.phuLuc.push(p);
  }
  return p;
}
/** Đánh lại stt + nhóm phường của 1 phụ lục (sau khi chuyển vị trí ra/vào). */
function sapLai(st, pl) {
  let i = 0;
  const nhom = [];
  for (const v of st.viTri) if (v.plId === pl.id) { v.stt = ++i; if (v.nhom && !nhom.includes(v.nhom)) nhom.push(v.nhom); }
  pl.nhom = nhom;
}
/** Chuyển 1 vị trí nháp sang phụ lục nháp của kênh khác. */
function chuyenKenh(st, v, kenh) {
  const src = st.phuLuc.find((p) => p.id === v.plId);
  if (!src) return false;
  const dst = plNhap(st, src.loai, src.namKH, kenh);
  v.plId = dst.id;
  sapLai(st, src); sapLai(st, dst);
  return true;
}
/**
 * Văn phòng đặt kênh tay (Đặt TS / Đặt TT) cho vị trí đã lấy: lưu `kenhTay` (văn phòng thắng KS).
 * Chỉ chuyển được vị trí đang nháp và chưa thực hiện; còn lại trả vào boQua.
 */
export function datKenh(st, ids, kenh) {
  kenh = kenh === 'TT' ? 'TT' : 'TS';
  const set = new Set(ids);
  const kq = { doi: 0, boQua: [] };
  for (const v of st.viTri) {
    if (!set.has(v.id)) continue;
    const pl = st.phuLuc.find((p) => p.id === v.plId);
    if (!pl?.nhap || v.trangThai === 'da') { kq.boQua.push({ id: v.id, lyDo: 'Đã vào đợt phụ lục / đã thực hiện' }); continue; }
    if (v.nguon?.ks && KS_MAP[v.nguon.type]?.luonTT && kenh === 'TS') { kq.boQua.push({ id: v.id, lyDo: 'Vỏ tủ luôn thuộc KL Trung tâm' }); continue; }
    v.kenhTay = kenh;
    if (kenhPL(pl) !== kenh) chuyenKenh(st, v, kenh);
    if (v.nguon?.doiTrinhSo) v.nguon = { ...v.nguon, doiTrinhSo: undefined };
    kq.doi++;
  }
  return kq;
}
const mauCua = (st, loai, type) => (loai === LOAI_KHAC ? st.mau['KS:' + type] : st.mau?.[loai]) || [];
/**
 * Chi tiết HM cho vị trí lấy từ KS: có MẪU người dùng khai cho loại đó → theo mẫu; chưa có mẫu → mặc định theo mã HM
 * trong danh mục HĐ của app (ksma.js, chọn theo quy cách khảo sát). theoMau: chỉ dùng mẫu (nút "Áp mẫu").
 */
// Thứ tự ưu tiên (anh chốt 10/11/2026 "app HĐ dùng đúng mã người KS chọn"):
// chi tiết sửa tay (xử lý ở nơi gọi) > mã KS chọn > mẫu người dùng khai > mặc định ksma.js.
function chonHopLe(st, ksChon, goi) {
  return (ksChon?.ds || []).filter((d) => st.catalog?.[d.ma] && coTrongGoi(st.catalog[d.ma], goi));
}
function chiTietTu(st, loai, type, kl, thuoc, { theoMau = false, ksChon = null, goi = null, kl2 } = {}) {
  if (kl === null || kl === undefined) return [];
  if (!theoMau) {
    const ds = chonHopLe(st, ksChon, goi);
    if (ds.length) return ds.map((d) => ({ ma: d.ma, kl: Math.round(kl * d.heSo * heSoDVT(st.catalog[d.ma].dvt) * 1e6) / 1e6 }));
  }
  const mau = mauCua(st, loai, type).filter((m) => m.ma);
  if (mau.length || theoMau) return apMau(mau, kl, kl2);
  return goiYMa(type, thuoc, kl, st.catalog, goi)?.chiTiet || [];
}
/** Gợi ý mã HM (để hiện cho người dùng xem lại): {ma, chac, ly} | null; null khi đang theo mẫu. */
export function goiYCua(st, loai, type, thuoc, { ksChon = null, goi = null } = {}) {
  const ds = chonHopLe(st, ksChon, goi);
  if (ds.length) return { ma: ds[0].ma, chac: true, ly: 'người khảo sát chọn' + (ds.length > 1 ? ' (+' + (ds.length - 1) + ' mã)' : '') };
  if (mauCua(st, loai, type).some((m) => m.ma)) return null;
  const g = goiYMa(type, thuoc, 1, st.catalog, goi);
  return g ? { ma: g.ma, chac: g.chac, ly: g.ly } : null;
}

/** Áp các mục đã chọn. opts: { namKH, chonGoi: {key: 'G2'}, chonDich: {key: 'PLIV'} }. */
export function apDung(st, items, opts = {}) {
  const namKH = +opts.namKH || new Date().getFullYear();
  const kq = { them: 0, capNhat: 0, xoa: 0, giuKL: 0 };
  // Khoá trùng theo kênh — kiểm lại cho bản văn phòng vừa đặt kênh (xemTruoc không kiểm được bản chưa phân loại)
  const plMap0 = new Map(st.phuLuc.map((p) => [p.id, p]));
  const keyPL = new Set(st.viTri.filter((v) => !v.nguon?.ks && plMap0.get(v.plId)).map((v) => plMap0.get(v.plId).loai + '§' + kenhPL(plMap0.get(v.plId)) + '§' + keyKS(v)));
  for (const it of items) {
    if (!it.chon) continue;
    const goi = opts.chonGoi?.[it.key] || (it.goi && it.goi !== 'nhieu' ? it.goi : null);
    const loai = opts.chonDich?.[it.key] || it.dich;
    if (it.trangThai === 'moi') {
      // Chưa phân loại (KS chưa chọn / giá trị lạ) → không tự vào đâu, trừ khi văn phòng đặt kênh (kenhTay)
      const kenhTay = opts.chonKenh?.[it.key] === 'TT' || opts.chonKenh?.[it.key] === 'TS' ? opts.chonKenh[it.key] : null;
      const kenh = kenhTay || it.kenh;
      if (!kenh) { kq.chuaPL = (kq.chuaPL || 0) + 1; continue; }
      if (kenhTay && keyPL.has(loai + '§' + kenh + '§' + keyKS(it.vt))) { kq.trungPL = (kq.trungPL || 0) + 1; continue; }
      const pl = plNhap(st, loai, namKH, kenh);
      if (it.vt.nhom && !pl.nhom.includes(it.vt.nhom)) pl.nhom.push(it.vt.nhom);
      const stt = st.viTri.filter((v) => v.plId === pl.id).length + 1;
      const o = { ksChon: it.vt.ksChon, goi };
      const donVi = it.vt.donVi || donViTheoPhuong(st, it.vt.phuong, goi);
      st.viTri.push({ ...it.vt, donVi, nguon: { ...it.vt.nguon, type: it.type, stt: it.stt }, id: uid('vt'), plId: pl.id, stt, goi,
        ...(it.goiKS && goi === it.vt.ksChon?.goi ? { goiKS: true } : {}), ...(it.lechGoi ? { lechGoi: true } : {}), ...(kenhTay ? { kenhTay } : {}),
        chiTiet: chiTietTu(st, loai, it.type, it.vt.kl, it.vt.thuoc, { ...o, kl2: it.vt.kl2 }), goiY: goiYCua(st, loai, it.type, it.vt.thuoc, o), chiTietSua: false, trangThai: 'chua', thangNT: '', thucHien: null });
      kq.them++;
    } else if (it.trangThai === 'thayDoi') {
      const v = st.viTri.find((x) => x.id === it.viTriId);
      if (!v) continue;
      const pl = st.phuLuc.find((p) => p.id === v.plId);
      const kenhCu = kenhPL(pl), kenhMoi = it.vt.nguon.kenhKS;
      const nhanDoi = kenhMoi && kenhMoi !== (v.kenhTay || kenhCu) ? { tu: v.kenhTay || kenhCu, sang: kenhMoi } : undefined;
      if (v.trangThai === 'da') { v.nguon = { ...v.nguon, doiSauTH: true, hash: it.vt.nguon.hash, kenhKS: kenhMoi, doiTrinhSo: nhanDoi }; if (!nhanDoi) delete v.nguon.doiTrinhSo; kq.giuKL++; continue; }
      const thuocSo = v.nguon?.thuocSo;
      const doiChon = JSON.stringify(v.ksChon || null) !== JSON.stringify(it.vt.ksChon || null);
      const giu = { id: v.id, plId: v.plId, stt: v.stt, goi: goi || v.goi, donVi: v.donVi || donViTheoPhuong(st, it.vt.phuong, goi || v.goi), trangThai: v.trangThai, thangNT: v.thangNT, thucHien: v.thucHien,
        chiTiet: v.chiTiet, chiTietSua: v.chiTietSua, ...(v.goiKS ? { goiKS: true } : {}), ...(v.goiDuyetKS !== undefined ? { goiDuyetKS: v.goiDuyetKS } : {}),
        ...(v.kenhTay ? { kenhTay: v.kenhTay } : {}), ...(v.ngoaiKHTay !== undefined ? { ngoaiKHTay: v.ngoaiKHTay } : {}) };
      for (const k of Object.keys(v)) delete v[k];
      Object.assign(v, it.vt, giu, { nguon: { ...it.vt.nguon, type: it.type, stt: it.stt, thuocSo: !!thuocSo } });
      // Văn phòng đã gán gói khi KS chọn gói này → không gắn lại cờ lệch (chỉ gắn khi KS đổi sang gói khác)
      if (it.lechGoi && v.goiDuyetKS !== (it.vt.ksChon?.goi ?? '')) v.lechGoi = true;
      const o = { ksChon: v.ksChon, goi: v.goi };
      if (!v.chiTietSua) { v.chiTiet = chiTietTu(st, pl?.loai || loai, it.type, v.kl, v.thuoc, { ...o, kl2: v.kl2 }); v.goiY = goiYCua(st, pl?.loai || loai, it.type, v.thuoc, o); }
      else if (doiChon) v.nguon.doiMa = true;   // KS đổi mã sau khi văn phòng đã sửa tay → chỉ gắn nhãn, không ghi đè
      // KS đổi Trình Sở ↔ Không trình Sở: nháp chưa thực hiện + văn phòng chưa đặt tay → chuyển kênh; còn lại chỉ gắn nhãn (doc 05 H2)
      if (nhanDoi) {
        if (pl?.nhap && !v.kenhTay) { chuyenKenh(st, v, kenhMoi); kq.doiKenh = (kq.doiKenh || 0) + 1; }
        else v.nguon.doiTrinhSo = nhanDoi;
      }
      kq.capNhat++;
    } else if (it.trangThai === 'xoa') {
      const v = st.viTri.find((x) => x.id === it.viTriId);
      if (v) { v.nguon = { ...v.nguon, xoa: true }; kq.xoa++; }
    }
  }
  return kq;
}

export function xacNhanThuocSo(st, ids, val = true) {
  const set = new Set(ids); let n = 0;
  for (const v of st.viTri) if (set.has(v.id) && v.nguon?.ks) { v.nguon = { ...v.nguon, thuocSo: !!val }; n++; }
  return n;
}
export function ganGoi(st, ids, goi) {
  const set = new Set(ids); let n = 0;
  // Gán gói tay ở app HĐ = văn phòng đã xem → bỏ cờ gói KS chọn / lệch gói
  for (const v of st.viTri) if (set.has(v.id)) { v.goi = goi || null; v.goiDuyetKS = v.ksChon?.goi ?? ''; delete v.goiKS; delete v.lechGoi; n++; }
  return n;
}
export function suaKL(st, id, kl) {
  const v = st.viTri.find((x) => x.id === id);
  if (!v) return false;
  const pl = st.phuLuc.find((p) => p.id === v.plId);
  v.kl = kl === '' || kl === null || kl === undefined ? null : docSo(kl);
  if (!v.chiTietSua) v.chiTiet = chiTietTu(st, pl?.loai, v.nguon?.type, v.kl, v.thuoc, { ksChon: v.ksChon, goi: v.goi, kl2: v.kl2 });
  return true;
}

/** Lý do 1 vị trí (lấy từ KS) chưa được vào đợt phụ lục thật / chưa xuất được; '' = đủ điều kiện. */
export function lyDoChan(st, v, pl = st.phuLuc.find((p) => p.id === v.plId)) {
  if (v.kl === null || v.kl === undefined || v.kl === '') return 'Thiếu KL';
  if (!v.goi || v.goi === 'nhieu') return 'Chưa rõ gói';
  if (v.lechGoi) return 'Lệch gói (KS chọn khác phụ lục) — gán lại gói';
  if (v.nguon?.doiTrinhSo) return 'KS đổi ' + TEN_KENH[v.nguon.doiTrinhSo.tu] + ' → ' + TEN_KENH[v.nguon.doiTrinhSo.sang] + ' — xem lại';
  if (v.nguon?.ks && pl?.loai !== LOAI_KHAC && kenhPL(pl) === 'TS' && !v.nguon.thuocSo) return 'Chưa xác nhận thuộc Sở quản lý';
  if (v.nguon?.xoa) return 'Bản khảo sát đã bị xoá';
  return '';
}

/** Nháp → đợt phụ lục thật (cùng loại, năm KH; tạo mới theo đợt nếu chưa có). */
export function chuyenNhap(st, ids, { dot = '', nhomVon = '' } = {}) {
  const set = new Set(ids);
  const kq = { chuyen: 0, boQua: [] };
  for (const v of st.viTri) {
    if (!set.has(v.id)) continue;
    const src = st.phuLuc.find((p) => p.id === v.plId);
    if (!src?.nhap) continue;
    const ly = lyDoChan(st, v, src);
    if (ly) { kq.boQua.push({ id: v.id, lyDo: ly }); continue; }
    let dst = st.phuLuc.find((p) => !p.nhap && p.nguon === 'KS' && p.loai === src.loai && +p.namKH === +src.namKH && p.dot === dot && kenhPL(p) === kenhPL(src));
    if (!dst) {
      dst = { ...src, id: uid('pl'), nhap: false, dot, nhomVon, nhom: [], ngayNhap: new Date().toISOString(),
        sheet: tenDich(src.loai).split(' · ')[0] + (dot ? ' - ' + dot : '') + (kenhPL(src) === 'TT' ? ' (KL TT)' : ' (KS)') };
      st.phuLuc.push(dst);
    }
    if (v.nhom && !dst.nhom.includes(v.nhom)) dst.nhom.push(v.nhom);
    v.plId = dst.id;
    v.stt = st.viTri.filter((x) => x.plId === dst.id).length;
    kq.chuyen++;
  }
  return kq;
}

/** Kiểm trước khi xuất phụ lục trình Sở: [{plId, sheet, lyDo, n}] — rỗng là xuất được. */
export function kiemXuat(st, plIds, opts = {}) {
  const out = [];
  const coVT = (id) => st.viTri.some((v) => v.plId === id && (!opts.goi || v.goi === opts.goi));
  // Mỗi loại phụ lục trình Sở chỉ 1 sheet / lần xuất — 2 phụ lục cùng loại sẽ trùng số La Mã
  const theoLoai = new Map();
  for (const id of plIds) { const pl = st.phuLuc.find((p) => p.id === id); if (!pl || pl.nhap || kenhPL(pl) !== 'TS' || !coVT(id)) continue; theoLoai.set(pl.loai, [...(theoLoai.get(pl.loai) || []), pl]); }
  for (const [loai, ds] of theoLoai) if (ds.length > 1) out.push({ plId: ds[1].id, sheet: ds.map((p) => p.sheet + (p.dot ? ' · ' + p.dot : '')).join(' + '), lyDo: `${ds.length} phụ lục trình Sở cùng loại "${tenDich(loai).split(' · ').pop()}" — mỗi lần xuất chọn 1 phụ lục mỗi loại để đánh số đúng`, n: 0 });
  for (const id of plIds) {
    const pl = st.phuLuc.find((p) => p.id === id);
    if (!pl) continue;
    if (pl.nhap) { out.push({ plId: id, sheet: pl.sheet, lyDo: 'Phụ lục nháp (đề xuất từ khảo sát) — chuyển sang đợt thật trước khi xuất', n: 0 }); continue; }
    if (pl.loai === LOAI_KHAC) { out.push({ plId: id, sheet: pl.sheet, lyDo: 'Nhóm "Khác" không có mẫu phụ lục trình Sở', n: 0 }); continue; }
    const dem = new Map();
    for (const v of st.viTri) {
      if (v.plId !== id || !v.nguon?.ks || (opts.goi && v.goi !== opts.goi)) continue;
      const ly = lyDoChan(st, v, pl) || (!(v.chiTiet || []).length ? 'Chưa gắn mã HM (không tính được tiền và cột X)' : '');
      if (ly) dem.set(ly, (dem.get(ly) || 0) + 1);
    }
    for (const [lyDo, n] of dem) out.push({ plId: id, sheet: pl.sheet, lyDo, n });
  }
  return out;
}

/** Cảnh báo (không chặn) trước khi xuất: cùng loại + cùng vị trí nằm ở cả phụ lục trình Sở và KL Trung tâm → dễ thanh toán 2 lần. */
export function canhBaoXuat(st, plIds) {
  const plMap = new Map(st.phuLuc.map((p) => [p.id, p]));
  const ids = new Set(plIds);
  const kenhTheoKhoa = new Map();
  for (const v of st.viTri) {
    const pl = plMap.get(v.plId);
    if (!pl || pl.nhap) continue;
    const k = pl.loai + '§' + keyKS(v);
    if (!kenhTheoKhoa.has(k)) kenhTheoKhoa.set(k, { kenh: new Set(), vt: [] });
    const o = kenhTheoKhoa.get(k); o.kenh.add(kenhPL(pl)); if (ids.has(v.plId)) o.vt.push(v);
  }
  const trung = [...kenhTheoKhoa.values()].filter((o) => o.kenh.size > 1 && o.vt.length).flatMap((o) => o.vt);
  return trung.length ? [{ lyDo: `${trung.length} vị trí cùng loại, cùng trạm + phường + tuyến có ở cả phụ lục trình Sở và KL Trung tâm — kiểm tra để không thanh toán 2 lần`, vt: trung.slice(0, 20).map((v) => v.tram + ' · ' + v.tuyen) }] : [];
}

/** Nhãn phụ lục của 1 vị trí cho app Khảo sát. */
function nhanPL(pl) {
  if (!pl) return '';
  if (pl.nhap) return 'Nháp';
  return (kenhPL(pl) === 'TT' ? 'KL TT · ' : '') + tenDich(pl.loai).split(' · ')[0] + (pl.dot ? ' · ' + pl.dot : pl.sheet ? ' · ' + pl.sheet : '');
}

/**
 * Bản tóm tắt đẩy sang app Khảo sát (action hd_push). Số = phần Sapulico (phan 'sap'), khớp màn Đối chiếu.
 * Trả { tomTat, phuongGoi, loaiHM, lienKet } — mảng dòng đúng thứ tự cột HD_SPEC bên Code.gs.
 */
export function tomTat(st, nam) {
  nam = +nam;
  const goiSet = new Set();
  for (const it of Object.values(st.catalog || {})) for (const g of Object.keys(it.goi || {})) goiSet.add(g);
  const tt = [];
  for (const goi of [...goiSet].sort()) {
    const dc = new Map(doiChieu(st, goi, nam, { phan: 'sap' }).rows.map((r) => [r.ma, r]));
    const mgt = maGoiThauCua(st, goi);
    for (const [ma, it] of Object.entries(st.catalog)) {
      const g = it.goi?.[goi];
      const hd = g ? (g.klSap?.[nam] ?? g.kl?.[nam]) : undefined;
      const r = dc.get(ma);
      if (hd === undefined && !r) continue;
      const kh = r ? r.kh : 0;
      tt.push([goi, mgt, nam, ma, it.ten || '', it.dvt || '', hd ?? 0, kh, r ? r.hdConLai : Math.round(((hd ?? 0) - kh) * 1e6) / 1e6, r?.ntLK ?? null]);
    }
  }
  const pg = [];
  const hienThi = new Map();
  const real = new Set(st.phuLuc.filter((p) => !p.nhap && p.nguon !== 'KS').map((p) => p.id));
  for (const v of st.viTri) {
    if (!real.has(v.plId) || !v.goi || !v.phuong) continue;
    const k = bo(v.phuong) + '§' + v.goi;
    if (!hienThi.has(norm(k))) { hienThi.set(norm(k), 1); pg.push([bo(v.phuong), v.goi]); }
  }
  // Mã HM theo loại khảo sát, kèm NHÓM (anh yêu cầu 10/11/2026 "phân loại nhóm hạng mục theo từng loại khảo sát"):
  // mẫu đã khai → nhóm "Theo mẫu đã khai"; rồi các nhóm theo tên hạng mục (ksnhom.js); loại không có nhóm nào khớp → mã mặc định ksma.js.
  // Không đẩy mã _cg (anh chốt ẩn). Cột 3 "Nhóm" — máy chủ KS nhận cả bản 2 cột cũ.
  const loaiHM = [];
  for (const [type, M] of Object.entries(KS_MAP)) {
    const da = new Set();
    const them = (ma, nhom) => { if (!ma || da.has(ma) || /_cg$/i.test(ma) || !st.catalog?.[ma]) return; da.add(ma); loaiHM.push([type, ma, nhom]); };
    const mau = mauCua(st, M.dich, type);
    for (const x of gopMa(mau.filter((m) => m.ma).map((m) => ({ ma: m.ma, kl: 1 })))) them(x.ma, 'Theo mẫu đã khai');
    const nh = nhomCua(type, st.catalog || {});
    for (const n of nh) for (const ma of n.ma) them(ma, n.nhom);
    if (!nh.length) for (const ma of MA_THEO_LOAI[type] || []) them(ma, 'Mặc định');
  }
  const plMap = new Map(st.phuLuc.map((p) => [p.id, p]));
  const lienKet = [];
  for (const v of st.viTri) {
    if (!v.nguon?.ks || v.nguon.xoa) continue;
    const [type, ...rest] = v.nguon.ks.split('#');
    const pl = plMap.get(v.plId);
    const trangThai = pl?.nhap ? 'Đề xuất (nháp)' : v.trangThai === 'da' ? 'Đã thực hiện' : 'Đã vào PL';
    const thang = v.trangThai === 'da' && /^\d{4}-\d{2}$/.test(v.thangNT || '') ? v.thangNT.slice(5) + '/' + v.thangNT.slice(0, 4) : '';
    lienKet.push([type, rest.join('#'), v.goi || '', (v.chiTiet || [])[0]?.ma || '', nhanPL(pl), trangThai, thang]);
  }
  return { tomTat: tt, phuongGoi: pg, loaiHM, lienKet };
}

/** Áp mẫu "Khác" của 1 loại khảo sát cho các vị trí lấy từ loại đó (giữ vị trí đã sửa tay trừ khi ghiDe). */
export function apMauKS(st, type, ghiDe = false) {
  const ids = new Set(st.phuLuc.filter((p) => p.loai === LOAI_KHAC || p.loai === 'KS:' + type).map((p) => p.id));
  let n = 0;
  for (const v of st.viTri) {
    if (!ids.has(v.plId) || v.nguon?.type !== type || (v.chiTietSua && !ghiDe)) continue;
    v.chiTiet = chiTietTu(st, 'KS:' + type, type, v.kl, v.thuoc, { theoMau: true, kl2: v.kl2 }); v.goiY = null; v.chiTietSua = false; n++;
  }
  return n;
}
