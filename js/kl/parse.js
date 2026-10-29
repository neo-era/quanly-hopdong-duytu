// parse.js — Đọc phụ lục trình Sở và bảng giá HĐ. Hàm thuần, nhận thư viện XLSX (SheetJS) từ ngoài vào.
// Nguyên tắc: chỉ dùng số CÓ THẬT trong ô; vị trí được tính khi nằm trong vùng công thức cộng của dòng phường.
import { PL_TEMPLATES } from './templates.js';

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

/** Nhận loại phụ lục từ các dòng đầu ("Phụ lục I/II/III/IV"). */
export function detectLoai(rows) {
  for (let i = 0; i < Math.min(rows.length, 8); i++) {
    for (const c of rows[i] || []) {
      const m = s(c).match(/^Ph[ụu]\s*l[ụu]c\s+(IV|I{1,3})\b/i);
      if (m) return { loai: LOAI_BY_ROMAN[m[1].toUpperCase()], row: i };
    }
  }
  return null;
}

/** Đọc 1 sheet phụ lục. Trả về null nếu sheet không phải phụ lục. */
export function parsePLSheet(XLSX, ws, sheetName) {
  if (!ws || !ws['!ref']) return null;
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: null, blankrows: true });
  const det = detectLoai(rows);
  if (!det) return null;
  const tpl = PL_TEMPLATES[det.loai];
  const hdr = rows.findIndex((r) => s(r?.[0]) === 'Stt');
  if (hdr < 0) return { sheet: sheetName, loai: det.loai, loi: 'Không thấy dòng tiêu đề cột "Stt".' };

  // Cột KL: tiêu đề "Khối lượng (đề xuất|thực hiện) Duy trì…"; không thấy thì theo mẫu
  let kc = (rows[hdr] || []).findIndex((x) => /^Kh[ốo]i l[ưu][ợo]ng (đề xuất|th[ưự]c hiện) Duy tr[ìi]/i.test(s(x)));
  if (kc < 0) kc = colIdx(tpl.kl);
  const KL = colLetter(kc);

  const tieuDe = s(rows[det.row + 1]?.[0]);
  const congVan = s(rows.slice(det.row + 1, hdr).map((r) => r?.[0]).find((x) => /Đính kèm/i.test(s(x))));

  // Dòng TỔNG CỘNG (ô nào trong dòng cũng được)
  let tot = -1;
  for (let i = hdr + 1; i < rows.length && tot < 0; i++) if ((rows[i] || []).some((c) => /^T[ỔO]NG C[ỘO]NG/i.test(s(c)))) tot = i;
  const tongFile = tot >= 0 && isNum(rows[tot][kc]) ? rows[tot][kc] : null;
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
      groups.push(g);
      continue;
    }
    const v = readRow(r, cols, kc);
    v.row = i + 1; v.hidden = hidden.has(i); v.nhom = g ? g.ten : '';
    const inRange = !g || !g.include || g.include.includes(i + 1);
    if (!inRange) { ngoai.push(v); continue; }
    if (!isNum(v.kl)) { klTrong.push(v); continue; }
    viTri.push(v);
    if (g) { g.klDoc += v.kl; g.n++; }
  }
  // Nhóm không có số ở cột KL (vd PL II nhóm để trống) → coi số file = số đọc để không báo lệch giả
  for (const gg of groups) { if (gg.klFile === null) gg.klFile = gg.klDoc; delete gg.include; }
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
    v[field] = field === 'kl' ? (isNum(r[kc]) ? r[kc] : (s(r[kc]) && !isNaN(+s(r[kc])) ? +s(r[kc]) : null)) : x === null ? '' : x;
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
  return wb.SheetNames.map((n) => parsePLSheet(XLSX, wb.Sheets[n], n)).filter(Boolean);
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
