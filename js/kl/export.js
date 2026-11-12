// export.js — Xuất bộ phụ lục trình Sở đúng form gốc + TongHop + Đối chiếu HM, công thức sống. Dùng ExcelJS (truyền vào).
import { doiChieu, kenhPL, ngoaiKHCua, THU_TU_PL } from './core.js';
import { colIdx, colLetter } from './parse.js';
import { tplCua } from './templates2.js';
import { KS_MAP, tenDich } from './ks.js';

const FONT = 'Times New Roman';
const thin = { style: 'thin', color: { argb: 'FF000000' } };
const BOX = { top: thin, left: thin, bottom: thin, right: thin };
const SHEET_TEN = { PLI: 'PLI_ThaySuaTu', PLII: 'PLII_LED', PLIII: 'PLIII_Tru', PLIV: 'PLIV_TruTrangTri' };
const rowOf = (a) => +a.replace(/^[A-Z]+/, '');
const colOf = (a) => a.replace(/\d+$/, '');

const RESERVED = new Set(['tonghop', 'tonghop_tt', 'chitiet_hm', 'doichieu_hm']);
const DG_CELL = { PLI: 'I6', PLII: 'Q8', PLIII: 'L5' };
const LA_MA = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII', 'XIII', 'XIV', 'XV'];
const tenPLX = (pl) => (kenhPL(pl) === 'TT' ? 'KL TT · ' : '') + tenDich(pl.loai);
const TIEN_TO = 'DUY TRÌ HỆ THỐNG CHIẾU SÁNG ĐÔ THỊ - ';
function uniqueName(wb, base) {
  const b = base.replace(/[\\/?*[\]:']/g, '').slice(0, 31) || 'Sheet';
  let n = b, i = 2;
  while (wb.getWorksheet(n) || RESERVED.has(n.toLowerCase())) n = `${b.slice(0, 28)}_${i++}`;
  return n;
}
/** Tiêu chí SUMIFS khớp đúng nguyên văn (thoát ~ * ? và dấu nháy kép, tránh bị hiểu là toán tử). */
export const tieuChi = (t) => '"=' + String(t).replace(/[~*?]/g, (c) => '~' + c).replace(/"/g, '""') + '"';

/**
 * opts: { templates, phuLucIds: [...], doiChieu: [{goi, nam}] (mặc định: mọi cặp có trong dữ liệu) }
 */
export function buildWorkbook(ExcelJS, st, opts) {
  const T = opts.templates;
  const wb = new ExcelJS.Workbook();
  wb.creator = 'App Quản lý HĐ Duy tu — CSKVTT';
  wb.created = new Date();
  const pls = (opts.phuLucIds || st.phuLuc.map((p) => p.id)).map((id) => st.phuLuc.find((p) => p.id === id)).filter(Boolean);
  // Xuất theo gói (opts.goi) → chỉ vị trí của gói đó (doc 05 H7)
  const st2 = opts.goi ? { ...st, viTri: st.viTri.filter((v) => v.goi === opts.goi) } : st;
  // Số La Mã theo thứ tự mẫu 21-09 cho phụ lục trình Sở; kênh TT đánh Biểu TT-01, TT-02… (doc 05 mục 1–2)
  const thuTu = (l) => { const i = THU_TU_PL.indexOf(l); return i < 0 ? 99 : i; };
  const loaiTS = [...new Set(pls.filter((p) => kenhPL(p) === 'TS' && st2.viTri.some((v) => v.plId === p.id)).map((p) => p.loai))].sort((a, b) => thuTu(a) - thuTu(b));
  const outSheets = [];
  let nTT = 0;
  const sorted = [...pls].sort((a, b) => (kenhPL(a) === 'TT') - (kenhPL(b) === 'TT') || thuTu(a.loai) - thuTu(b.loai));
  for (const pl of sorted) {
    // Phụ lục không còn vị trí (thường gặp khi xuất theo gói) → bỏ, không sinh sheet rỗng mang số cũ
    if (!st2.viTri.some((v) => v.plId === pl.id)) continue;
    const tt = kenhPL(pl) === 'TT';
    const so = tt ? 'TT-' + String(++nTT).padStart(2, '0') : LA_MA[loaiTS.indexOf(pl.loai)] || '';
    const o = writePL(wb, st2, pl, T?.[pl.loai] || tplCua(pl.loai, KS_MAP), { so, tt });
    if (o) outSheets.push(o);
  }
  writeTongHop(wb, outSheets.filter((o) => !o.tt));
  const ids = new Set(pls.map((p) => p.id));
  const sub = { ...st2, phuLuc: pls, viTri: st2.viTri.filter((v) => ids.has(v.plId)) };
  writeDoiChieu(wb, sub, opts.doiChieu);
  writeTongHopTT(wb, sub);
  // Đưa TongHop lên đầu như file gốc
  const th = wb.getWorksheet('TongHop'); if (th) th.orderNo = -1;
  return wb;
}

function writePL(wb, st, pl, tpl, { so = '', tt = false } = {}) {
  if (!tpl) return null;
  const ten = (tt ? 'Bieu ' + so + ' ' + tenDich(pl.loai).split(' · ').pop() : pl.sheet || SHEET_TEN[pl.loai] || tenDich(pl.loai)).replace(/\//g, '-');
  const ws = wb.addWorksheet(uniqueName(wb, ten), {
    pageSetup: { orientation: 'landscape', paperSize: 9, fitToPage: true, fitToWidth: 1, fitToHeight: 0, horizontalCentered: true,
      margins: { left: 0.4, right: 0.3, top: 0.5, bottom: 0.5, header: 0.2, footer: 0.2 } },
    views: [{ showGridLines: false }],
  });
  const H = tpl.header;
  const cols = tpl.cols;
  const KL = tpl.kl, TIEN = tpl.tien;
  const lastCore = colLetter(Math.max(...Object.values(cols).map(colIdx)));
  // KL Trung tâm: không ghi tiền theo đơn giá phụ lục Sở (tiền tính ở TongHop_TT theo đơn giá HĐ) — chỉ một con số
  const donGia = tt ? null : pl.donGia ?? tpl.donGia ?? null;
  const dgCell = tpl.donGiaCell || DG_CELL[pl.loai] || null;
  const dgRef = dgCell ? '$' + dgCell.replace(/(\d+)/, '$$$1') : null;

  // Độ rộng cột + chiều cao dòng phần đầu (theo file gốc)
  for (const [c, w] of Object.entries({ ...H.widths, ...(pl.header?.widths || {}) })) ws.getColumn(c).width = w;
  for (const [r, h] of Object.entries(H.heights)) if (+r < H.totRow) ws.getRow(+r).height = h;
  // Ô chữ phần đầu: mẫu, rồi đè bằng chữ của chính file đã nhập (giữ nguyên văn)
  const cells = { ...H.cells };
  if (pl.header?.cells) for (const [a, v] of Object.entries(pl.header.cells)) if (rowOf(a) < H.totRow) cells[a] = v;
  if (pl.tieuDe) cells['A' + H.tieuDeRow] = pl.tieuDe;
  if (pl.congVan) cells['A' + H.congVanRow] = pl.congVan;
  if (so && !tt) cells['A' + H.titleRow] = 'Phụ lục ' + so;
  if (tt) {
    // KL thẩm quyền Trung tâm: cùng khuôn, đổi tiêu đề, bỏ dòng công văn
    cells['A' + H.titleRow] = 'Biểu ' + so;
    const td = String(cells['A' + H.tieuDeRow] || '').replace(/^DUY TRÌ HỆ THỐNG CHIẾU SÁNG ĐÔ THỊ\s*-\s*/i, '');
    cells['A' + H.tieuDeRow] = 'KHỐI LƯỢNG THUỘC THẨM QUYỀN TRUNG TÂM (không trình Sở) - ' + (td || tenDich(pl.loai).toUpperCase());
    cells['A' + H.congVanRow] = '';
  }
  for (const [a, v] of Object.entries(cells)) {
    const c = ws.getCell(a); c.value = v;
    const r = rowOf(a);
    const isTitle = r === H.titleRow, isTieuDe = r === H.tieuDeRow, isCV = r === H.congVanRow;
    c.font = { name: FONT, size: isTitle ? 15 : isTieuDe ? 14 : 13, bold: isTitle || isTieuDe || (r >= H.hdrRow && !isCV && H.fHdr[2]), italic: isCV };
    c.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
  }
  for (const m of H.merges) { try { ws.mergeCells(m); } catch { /* đã gộp */ } }
  // Đơn giá ở ô tham chiếu như file gốc (K4, I6, Q8, M6, J6, L5…) — ngoài vùng in; tiền từng dòng = ROUNDDOWN(KL × ô đơn giá)
  if (donGia && dgCell) { ws.getCell(dgCell).value = donGia; ws.getCell(dgCell).numFmt = '#,##0'; }
  const tienDong = (v, rr) => {
    if (tt) return null;
    if (v.tienTay !== undefined && v.tienTay !== null) return v.tienTay;
    if (!donGia || !isFinite(+v.kl) || v.kl === null) return null;
    const kq = Math.floor((+v.kl) * donGia);
    return dgRef ? { formula: `ROUNDDOWN(${KL}${rr}*${dgRef},0)`, result: kq } : { formula: `ROUNDDOWN(${KL}${rr}*${donGia},0)`, result: kq };
  };
  let tienTong = 0;

  // Viền phần đầu cột
  for (let r = H.hdrRow; r < H.totRow; r++) for (let c = 0; c <= colIdx(lastCore); c++) ws.getCell(colLetter(c) + r).border = BOX;

  // Dữ liệu: nhóm theo phường đúng thứ tự file
  const vts = st.viTri.filter((v) => v.plId === pl.id);
  if (!vts.length && st.viTri !== undefined && tt) { /* biểu TT rỗng vẫn xuất khung */ }
  const ngoaiKH = ngoaiKHCua(st, pl);
  // Cột cộng thêm ở dòng phường + TỔNG (Hạ ngầm: cáp; HPS→LED / thay trụ: hiện hữu)
  const fieldOf = Object.fromEntries(Object.entries(cols).map(([f, L]) => [L, f]));
  const sumCols = [...new Set([...(tpl.sumCols || []), ...(cols.kl2 ? [cols.kl2] : []), ...(cols.hienHuu && ['PLII', 'PLIII'].includes(pl.loai) ? [cols.hienHuu] : [])])].filter((L) => L !== KL);
  const order = [...pl.nhom];
  for (const v of vts) if (!order.includes(v.nhom)) order.push(v.nhom);
  let r = H.totRow + 1;
  const groupRows = [];
  const dataFont = { name: FONT, size: 13 };
  const styleRow = (row, bold) => {
    for (let c = 0; c <= colIdx(lastCore); c++) {
      const cell = ws.getCell(colLetter(c) + row);
      cell.border = BOX; cell.font = { ...dataFont, bold };
      cell.alignment = { vertical: 'middle', wrapText: true, horizontal: c === 0 ? 'center' : undefined };
    }
  };
  for (const ten of order) {
    const items = vts.filter((v) => v.nhom === ten);
    if (!items.length) continue;
    const gr = r++;
    const first = r, last = r + items.length - 1;
    const sum = items.reduce((a, v) => a + (+v.kl || 0), 0);
    ws.getCell('A' + gr).value = ten || '(Chưa rõ phường)';
    ws.getCell(KL + gr).value = { formula: `SUBTOTAL(9,${KL}${first}:${KL}${last})`, result: sum };
    for (const L of sumCols) {
      const f = fieldOf[L];
      ws.getCell(L + gr).value = { formula: `SUBTOTAL(9,${L}${first}:${L}${last})`, result: items.reduce((a, v) => a + (+v[f] || 0), 0) };
    }
    // Dòng phường mang Gói + CSKV khi mọi vị trí cùng gói / đơn vị (như mẫu 21-09)
    const g1 = items[0].goi, d1 = items[0].donVi;
    if (g1 && items.every((v) => v.goi === g1)) ws.getCell(tpl.extra.goi + gr).value = 'Gói ' + g1.replace(/^G/, '');
    if (d1 && items.every((v) => v.donVi === d1)) ws.getCell(tpl.extra.donVi + gr).value = items[0].donViGoc || d1;
    const q1 = items[0].maQuan;
    if (q1 && tpl.extra.maQuan && items.every((v) => v.maQuan === q1)) ws.getCell(tpl.extra.maQuan + gr).value = q1;
    const tienNhom = tt ? 0 : items.reduce((a, v) => { const x = tienDong(v, 0); return a + (x === null ? 0 : typeof x === 'object' ? x.result : +x || 0); }, 0);
    if (!tt && TIEN && items.some((v) => tienDong(v, 0) !== null)) { ws.getCell(TIEN + gr).value = { formula: `SUBTOTAL(9,${TIEN}${first}:${TIEN}${last})`, result: tienNhom }; ws.getCell(TIEN + gr).numFmt = '#,##0'; }
    tienTong += tienNhom;
    styleRow(gr, true);
    groupRows.push(gr);
    items.forEach((v, i) => {
      const rr = r++;
      for (const [field, L] of Object.entries(cols)) {
        let val = field === 'stt' ? i + 1 : field === 'klNgoaiKH' ? ngoaiKH.get(v.id) || null : v[field];
        if (val === '' || val === undefined) val = null;
        ws.getCell(L + rr).value = val;
      }
      if (v.goi) ws.getCell(tpl.extra.goi + rr).value = 'Gói ' + v.goi.replace(/^G/, '');
      if (v.donVi) ws.getCell(tpl.extra.donVi + rr).value = v.donViGoc || v.donVi;
      if (v.maQuan && tpl.extra.maQuan) ws.getCell(tpl.extra.maQuan + rr).value = v.maQuan;
      const td = TIEN ? tienDong(v, rr) : null;
      if (td !== null) { ws.getCell(TIEN + rr).value = td; ws.getCell(TIEN + rr).numFmt = '#,##0'; }
      styleRow(rr, false);
      ws.getCell(KL + rr).alignment = { horizontal: 'center', vertical: 'middle' };
    });
  }
  const end = Math.max(r - 1, H.totRow + 1);
  // TỔNG CỘNG
  const T = H.totRow;
  const tong = vts.reduce((a, v) => a + (+v.kl || 0), 0);
  ws.getCell(H.totLabelCell).value = pl.loai === 'PLII' ? 'TỔNG CỘNG' : 'TỔNG CỘNG:';
  ws.getCell(KL + T).value = { formula: `SUBTOTAL(9,${KL}${T + 1}:${KL}${end})`, result: tong };
  for (const L of sumCols) {
    const f = fieldOf[L];
    ws.getCell(L + T).value = { formula: `SUBTOTAL(9,${L}${T + 1}:${L}${end})`, result: vts.reduce((a, v) => a + (+v[f] || 0), 0) };
    ws.getCell(L + T).alignment = { horizontal: 'center', vertical: 'middle' };
  }
  if (!tt && TIEN && groupRows.some((g) => ws.getCell(TIEN + g).value)) { ws.getCell(TIEN + T).value = { formula: `SUBTOTAL(9,${TIEN}${T + 1}:${TIEN}${end})`, result: tienTong }; ws.getCell(TIEN + T).numFmt = '#,##0'; }
  styleRow(T, true);
  ws.getCell(KL + T).alignment = { horizontal: 'center', vertical: 'middle' };
  ws.pageSetup.printArea = `A1:${lastCore}${end}`;
  ws.pageSetup.printTitlesRow = `${H.hdrRow}:${T - 1}`;
  return { ws, pl, tpl, first: T + 1, end, tt };
}

function writeTongHop(wb, outs) {
  if (!outs.length) return;
  const ws = wb.addWorksheet('TongHop', { views: [{ showGridLines: false }], pageSetup: { orientation: 'landscape', paperSize: 9, fitToPage: true, fitToWidth: 1, fitToHeight: 0 } });
  [44, 10, 14, 8, 16, 20].forEach((w, i) => (ws.getColumn(i + 1).width = w));
  ws.getCell('A1').value = 'BẢNG TỔNG HỢP KHỐI LƯỢNG DUY TU CHIẾU SÁNG TRÌNH SỞ XÂY DỰNG – THEO ĐỢT';
  ws.mergeCells('A1:F1');
  ws.getCell('A1').font = { name: FONT, size: 14, bold: true };
  ws.getCell('A1').alignment = { horizontal: 'center' };
  ['Nội dung / Đơn vị', 'Gói', 'Khối lượng', 'ĐVT', 'Đơn giá (đ)', 'Thành tiền (đ)'].forEach((t, i) => {
    const c = ws.getCell(3, i + 1); c.value = t; c.font = { name: FONT, size: 12, bold: true }; c.border = BOX; c.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
  });
  let r = 4;
  const heads = [];
  for (const o of outs) {
    const { ws: s, pl, tpl, first, end } = o;
    const sn = `'${s.name}'`;
    const KL = tpl.kl;
    const combos = new Map();
    s.eachRow((row, rn) => {
      if (rn < first || rn > end) return;
      const goi = row.getCell(tpl.extra.goi).value, dv = row.getCell(tpl.extra.donVi).value;
      const kl = row.getCell(KL).value;
      if (typeof kl !== 'number' || (!goi && !dv)) return;
      const k = `${dv || ''}|${goi || ''}`;
      combos.set(k, (combos.get(k) || 0) + kl);
    });
    // Phần còn lại (vị trí chưa có cả gói lẫn đơn vị) = TỔNG CỘNG của phụ lục − các dòng đã tách → tổng luôn khớp phụ lục
    const tongPL = s.getCell(KL + (first - 1)).value;
    const tongV = typeof tongPL === 'object' && tongPL ? tongPL.result ?? 0 : +tongPL || 0;
    const daTach = [...combos.values()].reduce((a, b) => a + b, 0);
    if (Math.abs(tongV - daTach) > 1e-9 || !combos.size) combos.set('|', tongV - daTach);
    const dg = pl.donGia ?? tpl.donGia ?? null;
    // Tiền lấy thẳng từ cột Thành tiền của sheet phụ lục (dòng nhập tay vẫn đúng), không nhân lại KL × giá
    const TI = tpl.tien;
    const tienTot = TI ? s.getCell(TI + (first - 1)).value : null;
    const coTien = !!(tienTot && (typeof tienTot === 'object' ? tienTot.formula : true));
    const tienV = (c) => { const x = c?.value; return typeof x === 'number' ? x : x && typeof x === 'object' ? +x.result || 0 : 0; };
    const tienCombo = new Map();
    if (coTien) s.eachRow((row, rn) => {
      if (rn < first || rn > end) return;
      const goi = row.getCell(tpl.extra.goi).value, dv = row.getCell(tpl.extra.donVi).value;
      if (typeof row.getCell(KL).value !== 'number' || (!goi && !dv)) return;
      const k = `${dv || ''}|${goi || ''}`; tienCombo.set(k, (tienCombo.get(k) || 0) + tienV(row.getCell(TI)));
    });
    const hr = r++;
    heads.push(hr);
    const kids = [];
    const rng = (col) => `${sn}!$${col}$${first}:$${col}$${end}`;
    for (const [k, sum] of combos) {
      const [dv, goi] = k.split('|');
      const rr = r++;
      kids.push(rr);
      ws.getCell('A' + rr).value = '   ' + (dv || (goi ? '(chưa rõ đơn vị)' : '(chưa rõ gói / đơn vị)'));
      ws.getCell('B' + rr).value = goi || null;
      if (k === '|') {
        const khac = kids.slice(0, -1);
        ws.getCell('C' + rr).value = { formula: `${sn}!${KL}${first - 1}${khac.length ? `-SUM(C${khac[0]}:C${khac[khac.length - 1]})` : ''}`, result: sum };
      } else {
        const crit = [`${rng(tpl.extra.goi)},${goi ? tieuChi(goi) : '"="'}`, `${rng(tpl.extra.donVi)},${dv ? tieuChi(dv) : '"="'}`];
        ws.getCell('C' + rr).value = { formula: `SUMIFS(${rng(KL)},${crit.join(',')})`, result: sum };
      }
      ws.getCell('D' + rr).value = tpl.dvt;
      if (coTien) {
        if (pl.donGia) ws.getCell('E' + rr).value = pl.donGia;
        if (k === '|') {
          const khac = kids.slice(0, -1);
          const tot = tienV({ value: tienTot }) - khac.reduce((a, x) => a + (ws.getCell('F' + x).value?.result || 0), 0);
          ws.getCell('F' + rr).value = { formula: `${sn}!${TI}${first - 1}${khac.length ? `-SUM(F${khac[0]}:F${khac[khac.length - 1]})` : ''}`, result: tot };
        } else {
          const crit = [`${rng(tpl.extra.goi)},${goi ? tieuChi(goi) : '"="'}`, `${rng(tpl.extra.donVi)},${dv ? tieuChi(dv) : '"="'}`];
          ws.getCell('F' + rr).value = { formula: `SUMIFS(${rng(TI)},${crit.join(',')})`, result: tienCombo.get(k) || 0 };
        }
      } else if (dg) { ws.getCell('E' + rr).value = dg; ws.getCell('F' + rr).value = { formula: `C${rr}*E${rr}`, result: sum * dg }; }
    }
    const tot = [...combos.values()].reduce((a, b) => a + b, 0);
    ws.getCell('A' + hr).value = `${tenPLX(pl)}${pl.dot ? ' — ' + pl.dot : ''}`;
    ws.getCell('C' + hr).value = kids.length ? { formula: `SUM(C${kids[0]}:C${kids[kids.length - 1]})`, result: tot } : 0;
    ws.getCell('D' + hr).value = tpl.dvt;
    if (coTien || dg) ws.getCell('F' + hr).value = kids.length ? { formula: `SUM(F${kids[0]}:F${kids[kids.length - 1]})`, result: kids.reduce((a, x) => a + (ws.getCell('F' + x).value?.result || 0), 0) } : 0;
    for (const rr of [hr, ...kids]) for (let c = 1; c <= 6; c++) {
      const cell = ws.getCell(rr, c); cell.border = BOX; cell.font = { name: FONT, size: 12, bold: rr === hr };
      if (c >= 3 && c !== 4) cell.numFmt = '#,##0';
    }
  }
  const tr = r;
  ws.getCell('A' + tr).value = 'TỔNG CỘNG';
  ws.getCell('F' + tr).value = { formula: heads.map((h) => 'F' + h).join('+'), result: heads.reduce((a, h) => a + (ws.getCell('F' + h).value?.result || 0), 0) };
  for (let c = 1; c <= 6; c++) { const cell = ws.getCell(tr, c); cell.border = BOX; cell.font = { name: FONT, size: 12, bold: true }; if (c === 6) cell.numFmt = '#,##0'; }
}

function writeDoiChieu(wb, st, pairs) {
  const vts = st.viTri;
  if (!vts.length) return;
  const plMap = new Map(st.phuLuc.map((p) => [p.id, p]));
  // Sheet chi tiết: mỗi dòng = 1 vị trí × 1 mã HM — nguồn cho SUMIFS
  const ct = wb.addWorksheet('ChiTiet_HM', { views: [{ state: 'frozen', ySplit: 1, showGridLines: false }] });
  const head = ['Phụ lục', 'Phường-Xã', 'Trạm đèn', 'Tuyến đường', 'Mã HM', 'KL kế hoạch', 'Gói', 'Năm KH', 'KL thực hiện', 'Trạng thái', 'Tháng NT', 'Kênh'];
  [18, 22, 30, 30, 10, 12, 8, 9, 12, 14, 10, 8].forEach((w, i) => (ct.getColumn(i + 1).width = w));
  ct.addRow(head).font = { name: FONT, bold: true };
  for (const v of vts) {
    const pl = plMap.get(v.plId);
    const th = v.trangThai === 'da' ? (v.thucHien || Object.fromEntries((v.chiTiet || []).map((c) => [c.ma, c.kl]))) : {};
    for (const c of v.chiTiet || []) {
      ct.addRow([pl ? tenPLX(pl) : '', v.phuong || v.nhom, v.tram, v.tuyen, c.ma, c.kl, v.goi, pl?.namKH, th[c.ma] ?? 0,
        v.trangThai === 'da' ? 'Đã thực hiện' : v.trangThai === 'dang' ? 'Đang làm' : 'Chưa làm', v.thangNT || '', kenhPL(pl)]).font = { name: FONT };
    }
  }
  const lastCT = Math.max(ct.rowCount, 2);
  const ps = pairs || [...new Set(vts.map((v) => `${v.goi}|${plMap.get(v.plId)?.namKH}`))].filter((k) => !k.startsWith('null')).map((k) => ({ goi: k.split('|')[0], nam: +k.split('|')[1] }));
  if (!ps.length) return;
  const ws = wb.addWorksheet('DoiChieu_HM', { views: [{ showGridLines: false }], pageSetup: { orientation: 'landscape', paperSize: 9, fitToPage: true, fitToWidth: 1, fitToHeight: 0 } });
  [11, 48, 9, 12, 13, 13, 12, 14, 14, 18].forEach((w, i) => (ws.getColumn(i + 1).width = w));
  let r = 1;
  for (const { goi, nam } of ps) {
    const d = doiChieu(st, goi, nam);
    ws.getCell('A' + r).value = `ĐỐI CHIẾU KHỐI LƯỢNG THEO HẠNG MỤC HỢP ĐỒNG — GÓI ${goi.replace(/^G/, '')} — NĂM ${nam}`;
    ws.getCell('A' + r).font = { name: FONT, size: 13, bold: true };
    r += 1;
    const hr = r++;
    ['Mã HM', 'Hạng mục', 'ĐVT', `KL HĐ ${nam}`, 'Đã đưa vào KH', 'Đã thực hiện', 'KH còn lại', 'HĐ còn lại chưa vào KH', 'Đơn giá HĐ', 'Giá trị KH (đ)'].forEach((t, i) => {
      const c = ws.getCell(hr, i + 1); c.value = t; c.font = { name: FONT, bold: true }; c.border = BOX; c.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    });
    for (const x of d.rows) {
      const rr = r++;
      const rng = (col) => `ChiTiet_HM!$${col}$2:$${col}$${lastCT}`;
      const crit = `${rng('E')},A${rr},${rng('G')},"${goi}",${rng('H')},${nam}`;
      ws.getRow(rr).values = [x.ma, x.ten || '(không có trong danh mục HĐ)', x.dvt, x.hd,
        { formula: `SUMIFS(${rng('F')},${crit})`, result: x.kh },
        { formula: `SUMIFS(${rng('I')},${crit})`, result: x.th },
        { formula: `E${rr}-F${rr}`, result: x.khConLai },
        { formula: `D${rr}-E${rr}`, result: x.hdConLai },
        x.dg || null,
        { formula: `E${rr}*I${rr}`, result: x.tienKH }];
      for (let c = 1; c <= 10; c++) {
        const cell = ws.getCell(rr, c); cell.border = BOX;
        cell.font = { name: FONT, color: (x.vuot && (c === 5 || c === 8)) || x.khongCoTrongHD ? { argb: 'FFC00000' } : undefined, bold: x.vuot && c === 8 };
        if (c >= 4) cell.numFmt = '#,##0.##';
      }
    }
    if (d.rows.length) ws.addConditionalFormatting({ ref: `H${hr + 1}:H${r - 1}`, rules: [{ type: 'cellIs', operator: 'lessThan', formulae: ['0'], style: { font: { color: { argb: 'FFC00000' }, bold: true } } }] });
    r += 1;
  }
}

/**
 * Sheet TongHop_TT: KL thẩm quyền Trung tâm theo gói × mã HM (doc 05 mục 2).
 * KL = SUMIFS ChiTiet_HM (đã quy đổi ĐVT KS → ĐVT mã HM qua chi tiết HM) × đơn giá ký HĐ.
 */
function writeTongHopTT(wb, st) {
  const tt = new Set(st.phuLuc.filter((p) => kenhPL(p) === 'TT').map((p) => p.id));
  if (!tt.size || !wb.getWorksheet('ChiTiet_HM')) return;
  const plMap = new Map(st.phuLuc.map((p) => [p.id, p]));
  const acc = new Map();
  for (const v of st.viTri) {
    if (!tt.has(v.plId)) continue;
    // Chưa rõ gói / nhiều gói → gom 1 dòng "(chưa rõ gói)" để tổng vẫn đủ (kiểm tra trước khi xuất đã cảnh báo)
    const goi = v.goi && v.goi !== 'nhieu' ? v.goi : '?';
    const nam = plMap.get(v.plId)?.namKH;
    for (const c of v.chiTiet || []) { const k = goi + '|' + nam + '|' + c.ma; acc.set(k, (acc.get(k) || 0) + (+c.kl || 0)); }
  }
  if (!acc.size) return;
  const lastCT = Math.max(wb.getWorksheet('ChiTiet_HM').rowCount, 2);
  const ws = wb.addWorksheet('TongHop_TT', { views: [{ showGridLines: false }], pageSetup: { orientation: 'landscape', paperSize: 9, fitToPage: true, fitToWidth: 1, fitToHeight: 0 } });
  [8, 9, 11, 50, 10, 12, 14, 18].forEach((w, i) => (ws.getColumn(i + 1).width = w));
  ws.getCell('A1').value = 'TỔNG HỢP KHỐI LƯỢNG THUỘC THẨM QUYỀN TRUNG TÂM (không trình Sở) — THEO GÓI × HẠNG MỤC HỢP ĐỒNG';
  ws.mergeCells('A1:H1');
  ws.getCell('A1').font = { name: FONT, size: 14, bold: true };
  ws.getCell('A1').alignment = { horizontal: 'center', wrapText: true };
  ['Gói', 'Năm', 'Mã HM', 'Hạng mục', 'ĐVT', 'Khối lượng', 'Đơn giá HĐ (đ)', 'Thành tiền (đ)'].forEach((t, i) => {
    const c = ws.getCell(3, i + 1); c.value = t; c.font = { name: FONT, size: 12, bold: true }; c.border = BOX; c.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
  });
  const rng = (col) => `ChiTiet_HM!$${col}$2:$${col}$${lastCT}`;
  const keys = [...acc.keys()].sort((a, b) => a.localeCompare(b, 'vi', { numeric: true }));
  let r = 4;
  const first = r;
  let tong = 0;
  for (const k of keys) {
    const [goi, nam, ma] = k.split('|');
    const it = st.catalog?.[ma];
    const g = it?.goi?.[goi];
    const dg = g?.dgNam?.[nam] ?? g?.dg ?? it?.dgChuaVat ?? null;
    const kl = Math.round(acc.get(k) * 1e6) / 1e6;
    const ro = goi === '?';
    ws.getRow(r).values = [ro ? '(chưa rõ gói)' : 'Gói ' + goi.replace(/^G/, ''), +nam, ma, it?.ten || '(không có trong danh mục HĐ)', it?.dvt || '',
      ro ? kl : { formula: `SUMIFS(${rng('F')},${rng('E')},C${r},${rng('G')},${tieuChi(goi)},${rng('H')},B${r},${rng('L')},"TT")`, result: kl },
      dg, dg ? { formula: `F${r}*G${r}`, result: kl * dg } : null];
    tong += dg ? kl * dg : 0;
    for (let c = 1; c <= 8; c++) { const cell = ws.getCell(r, c); cell.border = BOX; cell.font = { name: FONT, size: 12 }; if (c >= 6) cell.numFmt = '#,##0.##'; }
    r++;
  }
  ws.getCell('A' + r).value = 'TỔNG CỘNG';
  ws.mergeCells(`A${r}:E${r}`);
  ws.getCell('H' + r).value = { formula: `SUM(H${first}:H${r - 1})`, result: tong };
  for (let c = 1; c <= 8; c++) { const cell = ws.getCell(r, c); cell.border = BOX; cell.font = { name: FONT, size: 12, bold: true }; if (c === 8) cell.numFmt = '#,##0'; }
}
