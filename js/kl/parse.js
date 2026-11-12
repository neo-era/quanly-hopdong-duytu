// parse.js — Đọc phụ lục trình Sở và bảng giá HĐ. Hàm thuần, nhận thư viện XLSX (SheetJS) từ ngoài vào.
// Nguyên tắc: chỉ dùng số CÓ THẬT trong ô; vị trí được tính khi nằm trong vùng công thức cộng của dòng phường.
import { tplCua } from './templates2.js';

const LOAI_BY_ROMAN = { I: 'PLI', II: 'PLII', III: 'PLIII', IV: 'PLIV' };
const s = (v) => (v === null || v === undefined ? '' : String(v)).trim();
const isNum = (v) => typeof v === 'number' && Number.isFinite(v);

/** Cột chữ → chỉ số (A=0). */
export function colIdx(letter) { let n = 0; for (const ch of letter) n = n * 26 + (ch.charCodeAt(0) - 64); return n - 1; }
export function colLetter(i) { let s2 = ''; i += 1; while (i > 0) { const m = (i - 1) % 26; s2 = String.fromCharCode(65 + m) + s2; i = Math.floor((i - 1) / 26); } return s2; }

/** Các số dòng mà công thức tham chiếu ở cột `col` (SUM/SUBTOTAL/E12+E37…). Không có tham chiếu → null. */
export function rowsInFormula(f, col) {
  if (!f) return null;
  const out = new Set();
  const re = /\$?([A-Z]{1,3})\$?(\d+)(?::\$?([A-Z]{1,3})\$?(\d+))?/g;
  let m, any = false;
  while ((m = re.exec(f))) {
    if (m[1] !== col) continue;
    any = true;
    const a = +m[2], b = m[4] ? +m[4] : a;
    for (let r = Math.min(a, b); r <= Math.max(a, b); r++) out.add(r);
  }
  return any ? [...out].sort((x, y) => x - y) : null;
}

const fold = (x) => s(x).normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/gi, 'd').toLowerCase().replace(/\s+/g, ' ');
/**
 * Loại phụ lục theo NỘI DUNG tiêu đề (anh gửi mẫu 21-09, 11/11/2026: số La Mã đổi theo từng đợt — đợt 4/5 PL I = tủ,
 * đợt 21-09 PL I = Hạ ngầm). Thứ tự so khớp quan trọng (chuyên gia kỹ thuật duyệt Bước 0). Không nhận ra → null.
 */
export function loaiTuTieuDe(t) {
  const f = fold(t);
  if (!f) return null;
  if (/tru trang tri/.test(f)) return 'PLIV';
  if (/hps.*(thu hoi|an ninh)/.test(f)) return 'HPS_AN';
  if (/my thuat/.test(f)) return 'MYTHUAT';
  if (/ha ngam|ngam hoa/.test(f)) return 'HANGAM';
  if (/thay the cap (nguon )?ngam/.test(f)) return 'CAPNGAM';
  if (/tu dieu khien/.test(f)) return 'PLI';
  if (/hps.*led|den (chieu sang )?led/.test(f) && !/tang cuong|trang tri/.test(f)) return 'PLII';
  if (/tang cuong/.test(f)) return 'TANGCUONG';
  if (/thay the tru|tru chieu sang/.test(f)) return 'PLIII';
  return null;
}
/** Nhận loại phụ lục: dòng "Phụ lục …" rồi đọc dòng tiêu đề kế tiếp. Tiêu đề lạ (vd mẫu đèn trang trí cũ) → null. */
export function detectLoai(rows) {
  for (let i = 0; i < Math.min(rows.length, 8); i++) {
    for (const c of rows[i] || []) {
      if (!/^Ph[ụu]\s*l[ụu]c\b/i.test(s(c))) continue;
      for (let j = i + 1; j < Math.min(rows.length, i + 4); j++) {
        const t = (rows[j] || []).map(s).find(Boolean);
        if (!t) continue;
        const loai = loaiTuTieuDe(t);
        if (loai) return { loai, row: i, tieuDeRow: j };
        if (/^\(?Đính kèm/i.test(t)) break;
      }
      // Tiêu đề không nhận ra: số La Mã I–IV kiểu cũ chỉ dùng khi không có dòng tiêu đề nào
      const m = s(c).match(/^Ph[ụu]\s*l[ụu]c\s+(IV|I{1,3})$/i);
      const coTieuDe = (rows[i + 1] || []).some((x) => s(x));
      if (m && !coTieuDe) return { loai: LOAI_BY_ROMAN[m[1].toUpperCase()], row: i, tieuDeRow: i + 1 };
      return { loai: null, row: i };
    }
  }
  return null;
}
/** Đơn vị (CSKV) — chuẩn hoá nhãn: CSTT = "CST Tâm" = "CS T Tâm" = CS Trung tâm; "LG" = Lữ Gia. */
export function chuanCSKV(t) {
  const f = fold(t).replace(/\./g, '');
  if (/^(cstt|cs ?t ?tam|cs trung tam|cskv trung tam|cskvtt)$/.test(f)) return 'CS Trung tâm';
  if (/^(lg|lu gia)$/.test(f)) return 'Lữ Gia';
  if (/^cs ?(tay|bac|nam|dong)$/.test(f)) return 'CS ' + { tay: 'Tây', bac: 'Bắc', nam: 'Nam', dong: 'Đông' }[f.replace(/^cs ?/, '')];
  return null;
}

/** Đọc 1 sheet phụ lục. Trả về null nếu sheet không phải phụ lục. */
export function parsePLSheet(XLSX, ws, sheetName) {
  if (!ws || !ws['!ref']) return null;
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: null, blankrows: true });
  const det = detectLoai(rows);
  if (!det) return null;
  if (!det.loai) return { sheet: sheetName, loai: null, loi: 'Không nhận ra loại phụ lục từ tiêu đề — bỏ qua sheet này.' };
  const tpl = tplCua(det.loai);
  const hdr = rows.findIndex((r) => s(r?.[0]) === 'Stt');
  if (hdr < 0) return { sheet: sheetName, loai: det.loai, loi: 'Không thấy dòng tiêu đề cột "Stt".' };
  // Khuôn cũ (Tuyến đường · Quận – Huyện, không có cột Trạm đèn) — vd mẫu ẩn năm 2021/2022 trong file 21-09
  if (!/^Tr[ạa]m/i.test(s(rows[hdr][colIdx(tpl.cols.tram)]))) return { sheet: sheetName, loai: det.loai, loi: 'Khuôn phụ lục cũ (không có cột "Trạm đèn") — không nhập.' };

  // Cột KL: tiêu đề "Khối lượng (đề xuất|thực hiện) Duy trì…"; không thấy thì theo mẫu
  let kc = tpl.kl2 ? -1 : (rows[hdr] || []).findIndex((x) => /^Kh[ốo]i l[ưu][ợo]ng (đề xuất|th[ưự]c hiện) Duy tr[ìi]/i.test(s(x)));
  if (kc < 0) kc = colIdx(tpl.kl);   // mẫu có 2 cột KL (Hạ ngầm: cáp + trụ) → theo mẫu
  const KL = colLetter(kc);

  const tieuDe = s((rows[det.tieuDeRow ?? det.row + 1] || []).map(s).find(Boolean));
  const congVan = s(rows.slice(det.row + 1, hdr).map((r) => r?.[0]).find((x) => /Đính kèm/i.test(s(x))));

  // Dòng TỔNG CỘNG (ô nào trong dòng cũng được)
  let tot = -1;
  for (let i = hdr + 1; i < rows.length && tot < 0; i++) if ((rows[i] || []).some((c) => /^T[ỔO]NG C[ỘO]NG/i.test(s(c)))) tot = i;
  const tongFile = tot >= 0 && isNum(rows[tot][kc]) ? rows[tot][kc] : null;
  // Công thức TỔNG CỘNG liệt kê từng vùng (file 21-09: dòng phường ghi SUM sai 1 ô nhưng TỔNG vẫn tính đủ) → dòng nằm trong TỔNG vẫn nhận
  const totF = tot >= 0 ? ws[KL + (tot + 1)]?.f : null;
  const totRows = totF && /,/.test(totF) ? new Set(rowsInFormula(totF, KL) || []) : null;
  // Có thể có 2 dòng TỔNG liền nhau (file D5) → dữ liệu bắt đầu sau dòng TỔNG cuối
  let start = tot >= 0 ? tot + 1 : hdr + 2;
  while (start < rows.length && (rows[start] || []).some((c) => /^T[ỔO]NG C[ỘO]NG/i.test(s(c)))) start++;

  const cols = tpl.cols;
  const hidden = new Set((ws['!rows'] || []).map((r, i) => (r && r.hidden ? i : -1)).filter((i) => i >= 0));
  const groups = [], viTri = [], ngoai = [], klTrong = [];
  let g = null;
  const isStt = (v) => isNum(v) || /^\d+$/.test(s(v));

  for (let i = start; i < rows.length; i++) {
    const r = rows[i] || [];
    const a = r[0];
    if (!isStt(a)) {
      const t = s(a);
      if (!t || /^Đơn vị tính/i.test(t) || /^T[ỔO]NG/i.test(t)) continue;
      const cell = ws[KL + (i + 1)];
      g = { ten: t, row: i + 1, klFile: isNum(r[kc]) ? r[kc] : null, include: rowsInFormula(cell?.f, KL), klDoc: 0, n: 0 };
      // Dòng phường (khuôn 21-09) mang Gói + CSKV → vị trí bên dưới thiếu thì lấy theo phường (không lấy cột C: còn tên cũ)
      for (const x of r.slice(1)) { const tx = s(x); if (/^G[óo]i\s*\d+$/i.test(tx)) g.goi = maGoiLocal(tx); else if (chuanCSKV(tx) || /^CS\s/i.test(tx)) g.donVi = chuanCSKV(tx) || tx; }
      groups.push(g);
      continue;
    }
    const v = readRow(r, cols, kc);
    v.row = i + 1; v.hidden = hidden.has(i); v.nhom = g ? g.ten : '';
    if (g && !v.goi && g.goi) v.goi = g.goi;
    if (g && !v.donVi && g.donVi) v.donVi = g.donVi;
    const inRange = !g || !g.include || g.include.includes(i + 1) || !!totRows?.has(i + 1);
    if (!inRange) { ngoai.push(v); continue; }
    if (!isNum(v.kl)) { klTrong.push(v); continue; }
    viTri.push(v);
    if (g) { g.klDoc += v.kl; g.n++; }
  }
  // Nhóm không có số ở cột KL (vd PL II nhóm để trống) → coi số file = số đọc để không báo lệch giả
  for (const gg of groups) { if (gg.klFile === null) gg.klFile = gg.klDoc; delete gg.include; delete gg.goi; delete gg.donVi; }
  const tongDoc = viTri.reduce((a, v) => a + v.kl, 0);
  return {
    sheet: sheetName, loai: det.loai, tieuDe, congVan, klCol: KL, tongFile,
    groups, viTri, ngoai, klTrong,
    checks: { tongDoc, khop: tongFile === null ? true : Math.abs(tongDoc - tongFile) < 1e-9, nhomLech: groups.filter((x) => Math.abs(x.klFile - x.klDoc) > 1e-9).map((x) => x.ten) },
    header: captureHeader(ws, hdr, tot),
  };
}

function readRow(r, cols, kc) {
  const v = {};
  for (const [field, L] of Object.entries(cols)) {
    const x = r[colIdx(L)];
    v[field] = field === 'kl' ? (isNum(r[kc]) ? r[kc] : (s(r[kc]) && !isNaN(+s(r[kc])) ? +s(r[kc]) : null))
      : field === 'kl2' ? (isNum(x) ? x : (s(x) && !isNaN(+s(x)) ? +s(x) : null)) : x === null ? '' : x;
  }
  v.stt = isNum(v.stt) ? v.stt : +s(v.stt);
  for (const k of ['tram', 'phuong', 'tuyen', 'ghiChu']) if (k in v) v[k] = s(v[k]);
  // Cột phụ phía sau: gói, đơn vị, đợt, đơn giá — nhận theo giá trị, vì vị trí cột mỗi file một khác
  const last = Math.max(...Object.values(cols).map(colIdx));
  const textCols = new Set(['tram', 'phuong', 'tuyen', 'lyTrinhDau', 'lyTrinhCuoi', 'tinhHinh'].filter((k) => cols[k]).map((k) => colIdx(cols[k])));
  v.goi = null; v.donVi = ''; v.dot = ''; v.donGia = null;
  r.forEach((x, j) => {
    if (textCols.has(j)) return; // không dò gói/đơn vị trong tên trạm, tuyến…
    const t = s(x);
    if (/^G[óo]i\s*\d+$/i.test(t)) v.goi = maGoiLocal(t);
    else if (chuanCSKV(t)) v.donVi = chuanCSKV(t);
    else if (/^(CS\s|L[ữu] Gia)/i.test(t)) v.donVi = t;
    else if (/^Đợt\s*\d+/i.test(t)) v.dot = t;
    else if (j > last && isNum(x) && x >= 100000 && v.donGia === null) v.donGia = x;
  });
  if (/^Đợt\s*\d+/i.test(v.ghiChu || '')) v.dot = v.ghiChu;
  return v;
}
function maGoiLocal(t) { const m = s(t).match(/(\d+)/); return m ? 'G' + m[1] : null; }

/** Giữ lại phần đầu sheet (tiêu đề, đầu cột) để khi xuất trả về đúng form của chính file đã nhập. */
function captureHeader(ws, hdr, tot) {
  const last = tot >= 0 ? tot : hdr + 3;
  const cells = {};
  for (const [addr, c] of Object.entries(ws)) {
    if (addr[0] === '!') continue;
    const row = +addr.replace(/^[A-Z]+/, '');
    if (row < 1 || row > last) continue;
    if (typeof c.v === 'string' && !c.f && row <= last && !/^T[ỔO]NG C[ỘO]NG/i.test(c.v)) cells[addr] = c.v;
  }
  const merges = (ws['!merges'] || []).filter((m) => m.e.r + 1 <= last).map((m) => `${colLetter(m.s.c)}${m.s.r + 1}:${colLetter(m.e.c)}${m.e.r + 1}`);
  const widths = {};
  (ws['!cols'] || []).forEach((c, i) => { if (c && (c.wch || c.width)) widths[colLetter(i)] = Math.round((c.wch || c.width) * 10) / 10; });
  return { cells, merges, widths, hdrRow: hdr + 1, totRow: tot >= 0 ? tot + 1 : null };
}

/** Đọc mọi sheet phụ lục trong một file. */
export function parsePLWorkbook(XLSX, wb) {
  // Sheet ẩn: vẫn đọc (file D5 để PL II–IV ở sheet ẩn) nhưng gắn cờ `an` → màn xem trước mặc định bỏ chọn
  const an = new Set((wb.Workbook?.Sheets || []).map((x, i) => (x?.Hidden ? wb.SheetNames[i] : null)).filter(Boolean));
  return wb.SheetNames.map((n) => { const r = parsePLSheet(XLSX, wb.Sheets[n], n); if (r && an.has(n)) r.an = true; return r; }).filter(Boolean);
}

const keyOf = (v) => [v.tram, v.phuong, v.tuyen].map((x) => s(x).normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/gi, 'd').toLowerCase().replace(/\s+/g, ' ')).join('|');

/** Sheet nào là tập con của sheet khác cùng loại (vd PLI_Goi2 ⊂ PLI_ThaySuaTu) → { con: cha }. */
export function findSubsetSheets(results) {
  const out = {};
  const sets = results.filter((r) => r.viTri?.length).map((r) => ({ r, k: new Set(r.viTri.map(keyOf)) }));
  for (const a of sets) {
    for (const b of sets) {
      if (a === b || a.r.loai !== b.r.loai || a.k.size >= b.k.size) continue;
      if ([...a.k].every((x) => b.k.has(x))) { out[a.r.sheet] = b.r.sheet; break; }
    }
  }
  return out;
}

/**
 * Sheet tổng để trống gói/đơn vị ở một số dòng, trong khi sheet tách (tập con) của cùng file có ghi →
 * chép gói/đơn vị từ sheet tách sang (khớp trạm + phường + tuyến). Trả { sheetTổng: số dòng đã bổ sung }.
 */
export function boSungTuSheetCon(results) {
  const sub = findSubsetSheets(results);
  const out = {};
  for (const [con, cha] of Object.entries(sub)) {
    const C = results.find((r) => r.sheet === con), P = results.find((r) => r.sheet === cha);
    const map = new Map();
    for (const v of C.viTri) if (v.goi || v.donVi) map.set(keyOf(v), v);
    for (const v of P.viTri) {
      const src = map.get(keyOf(v));
      if (!src) continue;
      let changed = false;
      if (!v.goi && src.goi) { v.goi = src.goi; changed = true; }
      if (!v.donVi && src.donVi) { v.donVi = src.donVi; changed = true; }
      if (changed) { v.boSungTu = con; out[cha] = (out[cha] || 0) + 1; }
    }
  }
  return out;
}

/** Đọc danh mục HM + KL HĐ theo gói/năm (sheet "Tong hop HM") + đơn giá theo gói (sheet Gx_11C). */
export function parseHMCatalog(XLSX, wb) {
  const ws = wb.Sheets['Tong hop HM'];
  if (!ws) throw new Error('Không thấy sheet "Tong hop HM" trong file bảng giá HĐ.');
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: null });
  const h = rows.findIndex((r) => (r || []).some((c) => s(c) === 'Mã Hạng mục'));
  if (h < 0) throw new Error('Sheet "Tong hop HM" không có cột "Mã Hạng mục".');
  const H = rows[h].map(s);
  const cMa = H.indexOf('Mã Hạng mục'), cTen = H.indexOf('Hạng mục công việc'), cDvt = H.indexOf('Đơn vị tính');
  const cDg = H.indexOf('Đơn giá chưa VAT');
  const klCols = [];
  H.forEach((t, i) => { const m = t.match(/^(G\d+)-NĂM\s*(\d{4})$/i); if (m) klCols.push({ i, goi: m[1].toUpperCase(), nam: +m[2] }); });
  const hm = {};
  for (const r of rows.slice(h + 1)) {
    const ma = s(r[cMa]);
    if (!/^HM\d+/i.test(ma) || hm[ma]) continue;
    const item = { ten: s(r[cTen]), dvt: s(r[cDvt]), dgChuaVat: isNum(r[cDg]) ? r[cDg] : null, goi: {} };
    for (const k of klCols) {
      const v = r[k.i];
      if (!isNum(v)) continue;
      (item.goi[k.goi] ||= { kl: {}, dg: null }).kl[k.nam] = v;
    }
    hm[ma] = item;
  }
  // Đơn giá theo gói từ Gx_11C (cột "Đơn giá", dòng có mã HM ở cột B)
  for (const sn of wb.SheetNames) {
    const m = sn.match(/^(G\d+)_11C$/i);
    if (!m) continue;
    const goi = m[1].toUpperCase();
    const rr = XLSX.utils.sheet_to_json(wb.Sheets[sn], { header: 1, raw: true, defval: null });
    for (const r of rr) {
      const ma = s(r[1]);
      if (!hm[ma] || !isNum(r[7])) continue;
      const gg = (hm[ma].goi[goi] ||= { kl: {}, dg: null });
      if (gg.dg === null) gg.dg = r[7];
    }
  }
  const nam = [...new Set(klCols.map((k) => k.nam))].sort();
  return { hm, nam, goi: [...new Set(klCols.map((k) => k.goi))] };
}

// ================== Bảng giá ký hợp đồng (BGHD) ==================
const nfc = (x) => s(x).normalize('NFC').replace(/\s+/g, ' ').trim();
export const normTen = (x) => nfc(x).toLowerCase();

/**
 * Chọn sheet Bảng giá HĐ là "bản chốt" của file. Mỗi file biểu giá chứa BGHD của cả 4 gói; chỉ sheet của chính gói đó là bản chốt:
 *  - sheet tên đúng "BGHD" (không hậu tố) = gói của file (G1, G3);
 *  - không có → lấy "BGHD Gx" theo số gói trong tên file (G2_…, G4_…);
 *  - file ký HĐ dạng 1 sheet "Bảng giá HĐ …" (không có mã HM) → loại 'kyHD', cần ghép mã với bảng giá đã nhập.
 * Trả { sheet, goi (có thể null nếu phải dò), loai: 'bghd'|'kyHD', canChon: [...] }.
 */
export function chonSheetBangGia(sheetNames, fileName = '') {
  const hint = (String(fileName).match(/(?:^|[^A-Za-z0-9])G(\d)(?=[^0-9]|$)/i) || [])[1];
  const bg = sheetNames.filter((n) => /^BGHD(\s+G\d+)?$/i.test(n.trim()));
  if (sheetNames.some((n) => n.trim() === 'BGHD')) return { sheet: sheetNames.find((n) => n.trim() === 'BGHD'), goi: hint ? 'G' + hint : null, loai: 'bghd', canChon: bg };
  if (hint) { const sh = sheetNames.find((n) => new RegExp(`^BGHD\\s+G${hint}$`, 'i').test(n.trim())); if (sh) return { sheet: sh, goi: 'G' + hint, loai: 'bghd', canChon: bg }; }
  const ky = sheetNames.filter((n) => /^Bảng giá HĐ/i.test(nfc(n)));
  if (ky.length === 1 && !bg.length) return { sheet: ky[0], goi: hint ? 'G' + hint : null, loai: 'kyHD', canChon: ky };
  return { sheet: null, goi: null, loai: 'bghd', canChon: bg };
}

/** Đọc 1 sheet Bảng giá HĐ: dòng năm, khu vực (A/B), dòng hạng mục; nhận dạng liên danh (cột KL tách Sapulico / đối tác). */
export function docBGHD(XLSX, ws) {
  const r0 = XLSX.utils.decode_range(ws['!ref']).s.r;
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: '' });
  const hi = rows.findIndex((r) => nfc(r[0]) === 'STT' && /Hạng mục/i.test(nfc(r[1])));
  if (hi < 0) throw new Error('Không thấy dòng tiêu đề "STT | Hạng mục công tác" của Bảng giá HĐ.');
  const sub = rows[hi + 1] || [];
  const lienDanh = /^(Tổng cộng|Cộng)$/i.test(nfc(sub[3]));
  const doiTac = lienDanh ? nfc(sub[5]).replace(/^Công ty cổ phần\s*/i, 'CTCP ') : null;
  const num = (v) => (isNum(v) ? v : null);
  let y = null, kv = '';
  const out = [], nam = [];
  for (let i = hi + 1; i < rows.length; i++) {
    const r = rows[i], a = nfc(r[0]), b = nfc(r[1]);
    const m = b.match(/^NĂM\s*(\d{4})/i);
    if (m && /^([IVX]+)?$/.test(a)) {
      y = +m[1];
      nam.push({ kv, y, tt: num(lienDanh ? r[7] : r[5]), ttSap: lienDanh ? num(r[8]) : null, row: i + 1 + r0, coSo: !!a });
      continue;
    }
    if (/^[A-Z]$/.test(a) && b) { kv = b; continue; }
    if (!isNum(r[0]) || !b) continue;
    out.push(lienDanh
      ? { y, kv, stt: r[0], ten: b, dvt: nfc(r[2]), kl: num(r[3]), klSap: num(r[4]), klDT: num(r[5]), dg: num(r[6]), tt: num(r[7]), ttSap: num(r[8]), row: i + 1 + r0 }
      : { y, kv, stt: r[0], ten: b, dvt: nfc(r[2]), kl: num(r[3]), klSap: num(r[3]), klDT: 0, dg: num(r[4]), tt: num(r[5]), ttSap: num(r[5]), row: i + 1 + r0 });
  }
  return { lienDanh, doiTac, rows: out, nam };
}

/** Dòng hạng mục của sheet Gx_11C (bảng giá dự thầu): có mã HM ở cột B. */
export function doc11C(XLSX, ws) {
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: '' });
  let y = null, nhom = ''; const out = [];
  for (const r of rows) {
    const d = nfc(r[3]); const m = d.match(/^NĂM\s*(\d{4})/i);
    if (m) { y = +m[1]; continue; }
    const ma = nfc(r[1]);
    if (/^HM/i.test(ma)) { out.push({ y, ma, ten: d, dvt: nfc(r[6]), kl: isNum(r[5]) ? r[5] : null, dg: isNum(r[7]) ? r[7] : null, nhom }); continue; }
    if (/QUẢN LÝ VẬN HÀNH/i.test(d)) nhom = 'QLVH'; else if (/^Bảo dưỡng thường xuyên/i.test(d)) nhom = 'BDTX';
    else if (/KHÔNG THƯỜNG XUYÊN/i.test(d)) nhom = 'DTKTX'; else if (/duy tu bảo dưỡng/i.test(d)) nhom = ''; else if (/Trung tâm điều khiển/i.test(d) && !ma) nhom = 'TTDK';
  }
  return out;
}

/** Ghép mã HM: dòng thứ i của BGHD ↔ dòng thứ i của Gx_11C (cùng năm, cùng tên). Trả số dòng ghép được và dòng lệch đầu tiên. */
export function ghepMa(bghd, c11) {
  const n = Math.min(bghd.length, c11.length);
  for (let i = 0; i < n; i++) {
    if (bghd[i].y !== c11[i].y || normTen(bghd[i].ten) !== normTen(c11[i].ten)) return { ok: false, khop: i, lech: { i, bghd: bghd[i], c11: c11[i] } };
  }
  if (bghd.length !== c11.length) return { ok: false, khop: n, lech: { i: n, soDong: [bghd.length, c11.length] } };
  return { ok: true, khop: n };
}

/**
 * Đọc trọn file biểu giá: chọn bản chốt, ghép mã HM, kiểm tra nội bộ.
 * wb phải có các sheet: bản chốt + G1..G6_11C (+ "Tong hop HM" nếu có để lấy danh mục).
 */
export function parseBangGiaKy(XLSX, wb, fileName = '') {
  const chon = chonSheetBangGia(wb.SheetNames, fileName);
  if (!chon.sheet) throw new Error(`Không xác định được sheet Bảng giá HĐ chốt (các sheet: ${chon.canChon.join(', ') || 'không có'}). Đặt tên file có "G1…G4" để chọn đúng gói.`);
  const b = docBGHD(XLSX, wb.Sheets[chon.sheet]);
  const res = { file: fileName, sheet: chon.sheet, loai: chon.loai, goi: chon.goi, lienDanh: b.lienDanh, doiTac: b.doiTac, rows: b.rows, nam: b.nam, ghep: null, giaDuThau: null };
  if (chon.loai === 'bghd') {
    const c11s = wb.SheetNames.filter((n) => /^G\d+_11C$/i.test(n)).map((n) => ({ goi: n.split('_')[0].toUpperCase(), rows: doc11C(XLSX, wb.Sheets[n]) }));
    const thu = chon.goi ? c11s.filter((c) => c.goi === chon.goi) : c11s;
    for (const c of thu) {
      const g = ghepMa(b.rows, c.rows);
      if (g.ok) { res.goi = c.goi; res.ghep = g; b.rows.forEach((x, i) => { x.ma = c.rows[i].ma; x.dgDuThau = c.rows[i].dg; x.nhom = c.rows[i].nhom || ''; }); break; }
      res.ghep = g;
    }
    if (!res.ghep?.ok) throw new Error(`Không ghép được mã HM cho ${chon.sheet}: ${res.ghep ? `lệch ở dòng ${res.ghep.khop + 1}` : 'không có sheet Gx_11C'}.`);
  }
  // Kiểm tra nội bộ (chỉ dùng số có trong file)
  const ttSai = b.rows.filter((x) => x.dg !== null && x.tt !== null && (b.lienDanh
    ? Math.abs((x.ttSap ?? 0) - Math.round((x.klSap || 0) * x.dg)) > 1 || Math.abs(x.tt - (x.ttSap ?? 0) - (x.klDT || 0) * x.dg) > 1
    : Math.abs(x.tt - Math.round((x.kl || 0) * x.dg)) > 1)).length;
  const tachSai = b.lienDanh ? b.rows.filter((x) => Math.abs((x.klSap || 0) + (x.klDT || 0) - (x.kl || 0)) > 1e-6).length : 0;
  const cong = new Map();
  for (const x of b.rows) { const k = `${x.kv}|${x.y}`; cong.set(k, (cong.get(k) || 0) + (x.tt || 0)); }
  const namLech = b.nam.filter((n) => n.tt !== null && Math.abs(n.tt - (cong.get(`${n.kv}|${n.y}`) || 0)) > 0.5)
    .map((n) => ({ kv: n.kv, y: n.y, dongNam: n.tt, congDong: Math.round(cong.get(`${n.kv}|${n.y}`) || 0), row: n.row }));
  const tong = {}, tongSap = {};
  for (const x of b.rows) { tong[x.y] = (tong[x.y] || 0) + (x.tt || 0); tongSap[x.y] = (tongSap[x.y] || 0) + (x.ttSap ?? x.tt ?? 0); }
  res.checks = { ttSai, tachSai, namLech };
  res.tong = tong; res.tongSap = tongSap;
  return res;
}

// ================== Biểu khối lượng theo Mã gói thầu + Mã HM (file đơn vị: G101TT, G201NA, G301TB…) ==================
/** Mã gói thầu đã thấy trong file thật của Công ty. Gói Thủ Đức chưa có mã → để trống, người dùng tự nhập. */
export const MA_GOI_THAU = { G1: 'G101TT', G2: 'G201NA', G3: 'G301TB' };
export const NHOM_HM = { QLVH: 'Quản lý vận hành', BDTX: 'Bảo dưỡng thường xuyên', DTKTX: 'Duy tu không thường xuyên', TTDK: 'Trung tâm điều khiển' };

/**
 * Đọc các sheet có dòng tiêu đề "Mã gói thầu | Mã Hạng mục công tác | Năm công tác | Nhóm hạng mục công tác | … | Đơn giá | KL hợp đồng | …".
 * Các cột số sau cột KL hợp đồng (đến trước cột "Đơn vị") là các cột KL (thực hiện, giao, dự kiến, nhóm vốn…), giữ nguyên tên cột của file.
 */
export function parseBieuMaGoi(XLSX, wb) {
  const out = [];
  for (const sn of wb.SheetNames) {
    const ws = wb.Sheets[sn]; if (!ws || !ws['!ref']) continue;
    const rows = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: '' });
    const hi = rows.slice(0, 15).findIndex((r) => nfc(r[0]) === 'Mã gói thầu' && /^Mã Hạng mục/i.test(nfc(r[1])));
    if (hi < 0) continue;
    const H = rows[hi].map(nfc);
    const cDV = H.findIndex((t, i) => i > 8 && /^Đơn vị$/i.test(t));
    const end = cDV > 0 ? cDV : H.length;
    const cols = [];
    for (let i = 9; i < end; i++) if (H[i]) cols.push({ i, ten: H[i] });
    const data = [];
    for (const r of rows.slice(hi + 1)) {
      const maGoi = nfc(r[0]), ma = nfc(r[1]);
      if (!/^G\d/i.test(maGoi) || !/^HM/i.test(ma)) continue;
      data.push({ maGoi, ma, nam: +r[2] || null, nhom: nfc(r[3]), stt: r[4], ten: nfc(r[5]), dvt: nfc(r[6]), dg: isNum(r[7]) ? r[7] : null,
        klHD: isNum(r[8]) ? r[8] : null, v: cols.map((c) => (isNum(r[c.i]) ? r[c.i] : 0)), donVi: cDV > 0 ? nfc(r[cDV]) : '' });
    }
    if (!data.length) continue;
    const donVi = [...new Set(data.map((d) => d.donVi).filter(Boolean))];
    const maGoi = [...new Set(data.map((d) => d.maGoi))];
    const chinh = Math.max(0, cols.findIndex((c) => /dự kiến/i.test(c.ten)));
    const giaTri = cols.map((c, j) => Math.round(data.reduce((a, d) => a + d.v[j] * (d.dg || 0), 0)));
    out.push({ sheet: sn, cotKLHD: H[8], cols: cols.map((c) => c.ten), chinh, donVi, maGoi, nam: [...new Set(data.map((d) => d.nam))], rows: data, giaTri });
  }
  return out;
}

// ================== Biên bản nghiệm thu khối lượng tháng (BBNT) ==================
/**
 * Đọc mọi sheet dạng BBNT: dòng tiêu đề "Stt | Hạng mục…", cột "Lũy kế … kỳ trước", "Khối lượng tháng N năm YYYY" (Thực hiện / Nghiệm thu),
 * "Lũy kế … đến hết kỳ này", "Đơn giá"/"ĐG". Giữ nguyên số trong file; không tự suy giá trị.
 */
export function parseBBNT(XLSX, wb) {
  const out = [];
  for (const sn of wb.SheetNames) {
    const ws = wb.Sheets[sn]; if (!ws || !ws['!ref']) continue;
    const off = XLSX.utils.decode_range(ws['!ref']).s.r;
    const rows = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: '' });
    const hi = rows.slice(0, 120).findIndex((r) => /^stt$/i.test(nfc(r[0])) && r.some((x) => /Hạng mục/i.test(nfc(x))));
    if (hi < 0) continue;
    const h1 = (rows[hi] || []).map(nfc), h2 = (rows[hi + 1] || []).map(nfc);
    const f1 = (re) => h1.findIndex((t) => re.test(t)), f2 = (re) => h2.findIndex((t) => re.test(t));
    const iThang = f1(/tháng \d+ năm \d{4}/i);
    if (iThang < 0) continue;
    const mt = h1[iThang].match(/tháng (\d+) năm (\d{4})/i);
    const iTen = h1.map((t, i) => [t, i]).filter(([t]) => /^Hạng mục/i.test(t));
    const iMa = [...h1.keys(), ...h2.keys()].find((i) => /^work_item_cs_id/.test(h1[i] || '') || /^work_item_cs_id/.test(h2[i] || ''));
    const c = { ma: iMa === undefined ? -1 : iMa, ten: (iTen.find(([t]) => !/\btheo\b/i.test(t)) || iTen[0] || [, -1])[1], dvt: f1(/^Đơn vị tính/i),
      klHD: f1(/^Khối lượng/i), lkTruoc: f1(/kỳ trước/i), th: f2(/^Thực hiện$/i), nt: f2(/^Nghiệm thu$/i), lk: f1(/đến hết kỳ này/i), dg: f1(/^Đơn giá/i) };
    c.klSap = f2(/^Công ty (CP|Cổ phần) Chiếu sáng/i); if (c.klSap > c.lkTruoc) c.klSap = -1;
    if (c.dg < 0) c.dg = f2(/^ĐG$/);
    c.gt = f2(/^(Giá trị tháng|thành tiền Tháng)/i);
    if (c.nt < 0 || c.lk < 0 || c.lkTruoc < 0) continue;
    const num = (v) => (isNum(v) ? v : null);
    let y = null, kv = ''; const items = [], namRow = [];
    for (let i = hi + 2; i < rows.length; i++) {
      const r = rows[i], a = nfc(r[0]);
      const txt = r.slice(1, 8).map(nfc).find((x) => x && !/^G\d/.test(x) && isNaN(+x)) || '';
      const m = txt.match(/^NĂM\s*(\d{4})$/i);
      if (m) { y = +m[1]; namRow.push({ kv, y, gt: c.gt >= 0 ? num(r[c.gt]) : null, row: i + 1 + off }); continue; }
      if (/^[A-Z]$/.test(a) && txt) { kv = txt; continue; }
      if (!isNum(r[0])) continue;
      items.push({ y, kv, stt: r[0], row: i + 1 + off, ma: c.ma >= 0 ? nfc(r[c.ma]) : '', ten: nfc(r[c.ten]) || nfc(r[1]), dvt: nfc(r[c.dvt]),
        klHD: num(r[c.klHD]), klSap: c.klSap >= 0 ? num(r[c.klSap]) : null, lkTruoc: num(r[c.lkTruoc]) || 0,
        th: c.th >= 0 ? num(r[c.th]) : null, nt: num(r[c.nt]) || 0, lk: num(r[c.lk]) || 0, dg: num(r[c.dg]), gt: c.gt >= 0 ? num(r[c.gt]) : null });
    }
    if (!items.length || items.every((x) => !x.nt && !x.lk && !x.lkTruoc)) continue; // sheet căn cứ / mẫu trống
    out.push({ sheet: sn, thang: +mt[1], nam: +mt[2], nhanCotGT: c.gt >= 0 ? h2[c.gt] : '', items, namRow,
      gtThang: items.reduce((s, x) => s + x.nt * (x.dg || 0), 0) });
  }
  return out;
}
