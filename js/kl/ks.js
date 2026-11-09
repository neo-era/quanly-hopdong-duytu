// ks.js — Liên kết app Khảo sát (neo-era.github.io/khaosat) ↔ KL theo vị trí. Hàm thuần, không DOM, không gọi mạng.
// Thiết kế + tiêu chí: docs/04_LienKet-KhaoSat.md.
//  - anhXa: 1 bản ghi khảo sát (khoá = tiêu đề cột tiếng Việt của sheet) → vị trí đề xuất
//  - xemTruoc / apDung: phân loại (mới / thay đổi / trùng phụ lục / đã xoá…) rồi đưa vào PHỤ LỤC NHÁP
//  - chuyenNhap: nháp → đợt phụ lục thật (chỉ vị trí có KL, có gói, đã xác nhận thuộc Sở)
//  - tomTat: bản tóm tắt HĐ đẩy sang app Khảo sát (4 bảng HD_*)
import { norm, keyVT, apMau, gopMa, doiChieu, maGoiThauCua, LOAI_TEN } from './core.js';

let seq = 0;
const uid = (p) => `${p}-${Date.now().toString(36)}${(seq++).toString(36)}${Math.random().toString(36).slice(2, 6)}`;

const GHI_CHU = ['Ghi chú', 'Ghi chú (kèm thay cần đèn,...)'];
const QC_TRU = 'Quy cách trụ (loại trụ: chiều cao VD: STK 9m; be tông 8,4m; trang trí;...)';
/**
 * Ánh xạ theo loại khảo sát. dich: PLII/PLIII/KHAC. kl: tiêu đề cột KL (null = để trống cho người dùng nhập).
 * them: cột đưa vào ghi chú. tat: mặc định không lấy (bật bằng opts.layThem).
 */
export const KS_MAP = {
  thay_den:     { ten: 'Thay đèn', dich: 'PLII', kl: null, hienHuu: 'Số đèn hiện hữu', dau: 'Đầu tuyến', cuoi: 'Cuối tuyến', them: ['Công suất đèn hiện hữu'], dvt: 'bộ' },
  thay_tru:     { ten: 'Thay trụ', dich: 'PLIII', kl: 'Số lượng', dau: 'Vị trí', them: [QC_TRU], dvt: 'trụ' },
  vo_tu:        { ten: 'Vỏ tủ điều khiển', dich: 'KHAC', kl: 'Số lượng', dvt: 'tủ' },
  tc_noi:       { ten: 'Thay cáp nổi', dich: 'KHAC', kl: 'Số lượng', them: ['Loại cáp hiện hữu'], dvt: 'm' },
  tc_ngam:      { ten: 'Thay cáp ngầm', dich: 'KHAC', kl: 'Số lượng', them: ['Loại cáp'], dvt: 'm' },
  cap_luon_can: { ten: 'Cáp luồn cần', dich: 'KHAC', kl: 'Số lượng', dau: 'Vị trí', them: ['Loại cáp'], dvt: 'm' },
  hkn:          { ten: 'Hộp kín nước', dich: 'KHAC', kl: 'Số lượng', them: ['Loại hộp (6A, 10A)'], dvt: 'hộp' },
  thay_can:     { ten: 'Thay cần đèn', dich: 'KHAC', kl: 'Số lượng', dau: 'Vị trí', them: ['Loại cần (3,8m ; 3m...)'], dvt: 'cần' },
  choa_den:     { ten: 'Chóa đèn', dich: 'KHAC', kl: 'Số lượng', them: ['Loại chóa'], dvt: 'bộ' },
  nap_tru:      { ten: 'Nắp trụ', dich: 'KHAC', kl: 'Số lượng', dau: 'Số trụ', them: ['Quy cách'], dvt: 'cái' },
  decal_so_tru: { ten: 'Decal số trụ', dich: 'KHAC', kl: 'Số lượng', dau: 'Vị trí', dvt: 'cái' },
  tc_den_kc_xa: { ten: 'Tăng cường đèn KC xa', dich: 'KHAC', kl: 'Số lượng', dau: 'Vị trí', them: ['Chủng loại đèn'], dvt: 'bộ' },
  nang_mong:    { ten: 'Nâng móng trụ', dich: 'KHAC', kl: 'Số lượng', dau: 'Vị trí', them: ['Quy cách móng'], dvt: 'trụ' },
  tang_cuong_den: { ten: 'Tăng cường đèn', dich: 'KHAC', kl: 'Số đèn dự kiến', dau: 'Đầu tuyến', cuoi: 'Cuối tuyến', dvt: 'bộ', tat: true },
  ngam_hoa:     { ten: 'Ngầm hóa', dich: 'KHAC', kl: 'Số đèn dự kiến', dau: 'Đầu tuyến', cuoi: 'Cuối tuyến', dvt: 'bộ', tat: true },
};
export const LOAI_KHAC = 'KHAC';
export const TEN_DICH = { ...LOAI_TEN, KHAC: 'Khác (ngoài phụ lục)' };

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
  const need = ['STT', 'Tuyến đường', 'Phường', 'Tủ điều khiển'].concat(M.kl ? [M.kl] : [], M.hienHuu ? [M.hienHuu] : []);
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
  for (const k of Object.keys(vt)) if (vt[k] === null && !['kl'].includes(k)) delete vt[k];
  const goc = JSON.stringify([vt.tram, vt.phuong, vt.tuyen, vt.kl, vt.hienHuu, vt.lyTrinhDau, vt.lyTrinhCuoi, vt.namLD, vt.ghiChu]);
  vt.nguon = { ks: type + '#' + stt, hash: bam(goc), thuocSo: false, xoa: false };
  return { type, stt, dich: M.dich, dvt: M.dvt, vt, xoa: !!txt(row['Deleted At']), goiYPLIV: type === 'thay_tru' && /trang tr[íi]/i.test(txt(row[QC_TRU])) };
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
  const keyPL = new Set(st.viTri.filter((v) => !v.nguon?.ks && plLoai.get(v.plId)).map((v) => plLoai.get(v.plId).loai + '§' + keyKS(v)));
  const dem = { moi: 0, thayDoi: 0, trungPL: 0, thieuKL: 0, xoa: 0, sttTrung: 0 };
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
    else if (keyPL.has(a.dich + '§' + keyKS(a.vt))) trangThai = 'trungPL';
    else trangThai = 'moi';
    const g = goiTheoPhuong(st, a.vt.phuong, pg);
    const thieuKL = a.vt.kl === null && trangThai !== 'xoa';
    // Vị trí đã vào đợt phụ lục thật / đã thực hiện: thay đổi từ KS không chọn sẵn (phải xem rồi mới cập nhật)
    const daVaoDot = !!cu && !plMap.get(cu.plId)?.nhap;
    const it = { key, type: a.type, stt: a.stt, dich: a.dich, dvt: a.dvt, vt: a.vt, trangThai, thieuKL, goiYPLIV: a.goiYPLIV, daVaoDot,
      goi: cu?.goi || g.goi, goiList: g.list, chon: trangThai === 'moi' || trangThai === 'xoa' || (trangThai === 'thayDoi' && !daVaoDot && cu?.trangThai !== 'da'),
      viTriId: cu?.id || null };
    items.push(it);
    if (dem[trangThai] !== undefined) dem[trangThai]++;
    if (thieuKL && trangThai !== 'daCo' && trangThai !== 'trungPL' && trangThai !== 'sttTrung') dem.thieuKL++;
  }
  return { items, dem };
}

/** Phụ lục nháp "Đề xuất từ KS" theo loại + năm KH (tạo nếu chưa có). */
function plNhap(st, loai, namKH) {
  let p = st.phuLuc.find((x) => x.nhap && x.loai === loai && +x.namKH === +namKH);
  if (!p) {
    p = { id: uid('pl'), loai, nhap: true, nguon: 'KS', sheet: 'Đề xuất từ KS', file: '', tieuDe: '', congVan: '', dot: '', nhomVon: '',
      namKH: +namKH, donGia: null, header: null, nhom: [], ngayNhap: new Date().toISOString() };
    st.phuLuc.push(p);
  }
  return p;
}
const mauCua = (st, loai, type) => (loai === LOAI_KHAC ? st.mau['KS:' + type] : st.mau[loai]) || [];
const chiTietTu = (st, loai, type, kl) => (kl === null || kl === undefined ? [] : apMau(mauCua(st, loai, type), kl));

/** Áp các mục đã chọn. opts: { namKH, chonGoi: {key: 'G2'}, chonDich: {key: 'PLIV'} }. */
export function apDung(st, items, opts = {}) {
  const namKH = +opts.namKH || new Date().getFullYear();
  const kq = { them: 0, capNhat: 0, xoa: 0, giuKL: 0 };
  for (const it of items) {
    if (!it.chon) continue;
    const goi = opts.chonGoi?.[it.key] || (it.goi && it.goi !== 'nhieu' ? it.goi : null);
    const loai = opts.chonDich?.[it.key] || it.dich;
    if (it.trangThai === 'moi') {
      const pl = plNhap(st, loai, namKH);
      if (it.vt.nhom && !pl.nhom.includes(it.vt.nhom)) pl.nhom.push(it.vt.nhom);
      const stt = st.viTri.filter((v) => v.plId === pl.id).length + 1;
      st.viTri.push({ ...it.vt, nguon: { ...it.vt.nguon, type: it.type, stt: it.stt }, id: uid('vt'), plId: pl.id, stt, goi,
        chiTiet: chiTietTu(st, loai, it.type, it.vt.kl), chiTietSua: false, trangThai: 'chua', thangNT: '', thucHien: null });
      kq.them++;
    } else if (it.trangThai === 'thayDoi') {
      const v = st.viTri.find((x) => x.id === it.viTriId);
      if (!v) continue;
      const pl = st.phuLuc.find((p) => p.id === v.plId);
      if (v.trangThai === 'da') { v.nguon = { ...v.nguon, doiSauTH: true, hash: it.vt.nguon.hash }; kq.giuKL++; continue; }
      const thuocSo = v.nguon?.thuocSo;
      const giu = { id: v.id, plId: v.plId, stt: v.stt, goi: goi || v.goi, donVi: v.donVi, trangThai: v.trangThai, thangNT: v.thangNT, thucHien: v.thucHien,
        chiTiet: v.chiTiet, chiTietSua: v.chiTietSua };
      for (const k of Object.keys(v)) delete v[k];
      Object.assign(v, it.vt, giu, { nguon: { ...it.vt.nguon, type: it.type, stt: it.stt, thuocSo: !!thuocSo } });
      if (!v.chiTietSua) v.chiTiet = chiTietTu(st, pl?.loai || loai, it.type, v.kl);
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
  for (const v of st.viTri) if (set.has(v.id)) { v.goi = goi || null; n++; }
  return n;
}
export function suaKL(st, id, kl) {
  const v = st.viTri.find((x) => x.id === id);
  if (!v) return false;
  const pl = st.phuLuc.find((p) => p.id === v.plId);
  v.kl = kl === '' || kl === null || kl === undefined ? null : docSo(kl);
  if (!v.chiTietSua) v.chiTiet = chiTietTu(st, pl?.loai, v.nguon?.type, v.kl);
  return true;
}

/** Lý do 1 vị trí (lấy từ KS) chưa được vào đợt phụ lục thật / chưa xuất được; '' = đủ điều kiện. */
export function lyDoChan(st, v, pl = st.phuLuc.find((p) => p.id === v.plId)) {
  if (v.kl === null || v.kl === undefined || v.kl === '') return 'Thiếu KL';
  if (!v.goi || v.goi === 'nhieu') return 'Chưa rõ gói';
  if (v.nguon?.ks && pl?.loai !== LOAI_KHAC && !v.nguon.thuocSo) return 'Chưa xác nhận thuộc Sở quản lý';
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
    let dst = st.phuLuc.find((p) => !p.nhap && p.nguon === 'KS' && p.loai === src.loai && +p.namKH === +src.namKH && p.dot === dot);
    if (!dst) {
      dst = { ...src, id: uid('pl'), nhap: false, dot, nhomVon, nhom: [], ngayNhap: new Date().toISOString(),
        sheet: (TEN_DICH[src.loai] || src.loai).split(' · ')[0] + (dot ? ' - ' + dot : '') + ' (KS)' };
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
export function kiemXuat(st, plIds) {
  const out = [];
  for (const id of plIds) {
    const pl = st.phuLuc.find((p) => p.id === id);
    if (!pl) continue;
    if (pl.nhap) { out.push({ plId: id, sheet: pl.sheet, lyDo: 'Phụ lục nháp (đề xuất từ khảo sát) — chuyển sang đợt thật trước khi xuất', n: 0 }); continue; }
    if (pl.loai === LOAI_KHAC) { out.push({ plId: id, sheet: pl.sheet, lyDo: 'Nhóm "Khác" không có mẫu phụ lục trình Sở', n: 0 }); continue; }
    const dem = new Map();
    for (const v of st.viTri) if (v.plId === id && v.nguon?.ks) { const ly = lyDoChan(st, v, pl); if (ly) dem.set(ly, (dem.get(ly) || 0) + 1); }
    for (const [lyDo, n] of dem) out.push({ plId: id, sheet: pl.sheet, lyDo, n });
  }
  return out;
}

/** Nhãn phụ lục của 1 vị trí cho app Khảo sát. */
function nhanPL(pl) {
  if (!pl) return '';
  if (pl.nhap) return 'Nháp';
  return (TEN_DICH[pl.loai] || pl.loai).split(' · ')[0] + (pl.dot ? ' · ' + pl.dot : pl.sheet ? ' · ' + pl.sheet : '');
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
  const loaiHM = [];
  for (const [type, M] of Object.entries(KS_MAP)) {
    const mau = M.dich === LOAI_KHAC ? st.mau['KS:' + type] : st.mau[M.dich];
    for (const ma of gopMa((mau || []).map((m) => ({ ma: m.ma, kl: 1 }))).map((x) => x.ma)) loaiHM.push([type, ma]);
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
  const ids = new Set(st.phuLuc.filter((p) => p.loai === LOAI_KHAC).map((p) => p.id));
  let n = 0;
  for (const v of st.viTri) {
    if (!ids.has(v.plId) || v.nguon?.type !== type || (v.chiTietSua && !ghiDe)) continue;
    v.chiTiet = chiTietTu(st, LOAI_KHAC, type, v.kl); v.chiTietSua = false; n++;
  }
  return n;
}
