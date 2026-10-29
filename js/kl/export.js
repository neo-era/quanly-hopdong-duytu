// export.js — Xuất bộ phụ lục trình Sở đúng form gốc + TongHop + Đối chiếu HM, công thức sống. Dùng ExcelJS (truyền vào).
import { doiChieu, LOAI_TEN } from './core.js';
import { colIdx, colLetter } from './parse.js';

const FONT = 'Times New Roman';
const thin = { style: 'thin', color: { argb: 'FF000000' } };
const BOX = { top: thin, left: thin, bottom: thin, right: thin };
const SHEET_TEN = { PLI: 'PLI_ThaySuaTu', PLII: 'PLII_LED', PLIII: 'PLIII_Tru', PLIV: 'PLIV_TruTrangTri' };
const rowOf = (a) => +a.replace(/^[A-Z]+/, '');
const colOf = (a) => a.replace(/\d+$/, '');

function uniqueName(wb, base) {
  let n = base.replace(/[\\/?*[\]:]/g, '').slice(0, 31) || 'Sheet', i = 2;
  while (wb.getWorksheet(n)) n = `${base.slice(0, 28)}_${i++}`;
  return n;
}

/**
 * opts: { templates, phuLucIds: [...], doiChieu: [{goi, nam}] (mặc định: mọi cặp có trong dữ liệu) }
 */
export function buildWorkbook(ExcelJS, st, opts) {
  const T = opts.templates;
  const wb = new ExcelJS.Workbook();
  wb.creator = 'App Quản lý HĐ Duy tu — CSKVTT';
  wb.created = new Date();
  const pls = (opts.phuLucIds || st.phuLuc.map((p) => p.id)).map((id) => st.phuLuc.find((p) => p.id === id)).filter(Boolean);
  const outSheets = [];
  for (const pl of pls) outSheets.push(writePL(wb, st, pl, T[pl.loai]));
  writeTongHop(wb, outSheets);
  writeDoiChieu(wb, st, opts.doiChieu);
  // Đưa TongHop lên đầu như file gốc
  const th = wb.getWorksheet('TongHop'); if (th) th.orderNo = -1;
  return wb;
}

function writePL(wb, st, pl, tpl) {
  const ws = wb.addWorksheet(uniqueName(wb, pl.sheet || SHEET_TEN[pl.loai]), {
    pageSetup: { orientation: 'landscape', paperSize: 9, fitToPage: true, fitToWidth: 1, fitToHeight: 0, horizontalCentered: true,
      margins: { left: 0.4, right: 0.3, top: 0.5, bottom: 0.5, header: 0.2, footer: 0.2 } },
    views: [{ showGridLines: false }],
  });
  const H = tpl.header;
  const cols = tpl.cols;
  const KL = tpl.kl, TIEN = tpl.tien;
  const lastCore = colLetter(Math.max(...Object.values(cols).map(colIdx)));
  const donGia = pl.donGia ?? tpl.donGia ?? null;

  // Độ rộng cột + chiều cao dòng phần đầu (theo file gốc)
  for (const [c, w] of Object.entries({ ...H.widths, ...(pl.header?.widths || {}) })) ws.getColumn(c).width = w;
  for (const [r, h] of Object.entries(H.heights)) if (+r < H.totRow) ws.getRow(+r).height = h;
  // Ô chữ phần đầu: mẫu, rồi đè bằng chữ của chính file đã nhập (giữ nguyên văn)
  const cells = { ...H.cells };
  if (pl.header?.cells) for (const [a, v] of Object.entries(pl.header.cells)) if (rowOf(a) < H.totRow) cells[a] = v;
  if (pl.tieuDe) cells['A' + H.tieuDeRow] = pl.tieuDe;
  if (pl.congVan) cells['A' + H.congVanRow] = pl.congVan;
  for (const [a, v] of Object.entries(cells)) {
    const c = ws.getCell(a); c.value = v;
    const r = rowOf(a);
    const isTitle = r === H.titleRow, isTieuDe = r === H.tieuDeRow, isCV = r === H.congVanRow;
    c.font = { name: FONT, size: isTitle ? 15 : isTieuDe ? 14 : 13, bold: isTitle || isTieuDe || (r >= H.hdrRow && !isCV && H.fHdr[2]), italic: isCV };
    c.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
  }
  for (const m of H.merges) { try { ws.mergeCells(m); } catch { /* đã gộp */ } }
  // Đơn giá ở ô tham chiếu như file gốc (PL II: Q8, PL III: L5…) — để ngoài vùng in
  if (donGia && pl.loai === 'PLII') ws.getCell('Q8').value = donGia;
  if (donGia && pl.loai === 'PLIII') ws.getCell('L5').value = donGia;

  // Viền phần đầu cột
  for (let r = H.hdrRow; r < H.totRow; r++) for (let c = 0; c <= colIdx(lastCore); c++) ws.getCell(colLetter(c) + r).border = BOX;

  // Dữ liệu: nhóm theo phường đúng thứ tự file
  const vts = st.viTri.filter((v) => v.plId === pl.id);
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
    if (donGia) ws.getCell(TIEN + gr).value = { formula: `${KL}${gr}*${donGia}`, result: sum * donGia };
    styleRow(gr, true);
    groupRows.push(gr);
    items.forEach((v, i) => {
      const rr = r++;
      for (const [field, L] of Object.entries(cols)) {
        let val = field === 'stt' ? i + 1 : v[field];
        if (val === '' || val === undefined) val = null;
        ws.getCell(L + rr).value = val;
      }
      if (v.goi) ws.getCell(tpl.extra.goi + rr).value = 'Gói ' + v.goi.replace(/^G/, '');
      if (v.donVi) ws.getCell(tpl.extra.donVi + rr).value = v.donVi;
      if (pl.loai === 'PLI' && (v.donGia || donGia)) ws.getCell(TIEN + rr).value = v.donGia || donGia;
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
  if (donGia && groupRows.length) ws.getCell(TIEN + T).value = { formula: groupRows.map((g) => TIEN + g).join('+'), result: tong * donGia };
  styleRow(T, true);
  ws.getCell(KL + T).alignment = { horizontal: 'center', vertical: 'middle' };
  ws.pageSetup.printArea = `A1:${lastCore}${end}`;
  ws.pageSetup.printTitlesRow = `${H.hdrRow}:${T - 1}`;
  return { ws, pl, tpl, first: T + 1, end };
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
        const crit = [`${rng(tpl.extra.goi)},"${goi || '='}"`, `${rng(tpl.extra.donVi)},"${dv || '='}"`];
        ws.getCell('C' + rr).value = { formula: `SUMIFS(${rng(KL)},${crit.join(',')})`, result: sum };
      }
      ws.getCell('D' + rr).value = tpl.dvt;
      if (dg) { ws.getCell('E' + rr).value = dg; ws.getCell('F' + rr).value = { formula: `C${rr}*E${rr}`, result: sum * dg }; }
    }
    const tot = [...combos.values()].reduce((a, b) => a + b, 0);
    ws.getCell('A' + hr).value = `${LOAI_TEN[pl.loai]}${pl.dot ? ' — ' + pl.dot : ''}`;
    ws.getCell('C' + hr).value = kids.length ? { formula: `SUM(C${kids[0]}:C${kids[kids.length - 1]})`, result: tot } : 0;
    ws.getCell('D' + hr).value = tpl.dvt;
    if (dg) ws.getCell('F' + hr).value = kids.length ? { formula: `SUM(F${kids[0]}:F${kids[kids.length - 1]})`, result: tot * dg } : 0;
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
  const head = ['Phụ lục', 'Phường-Xã', 'Trạm đèn', 'Tuyến đường', 'Mã HM', 'KL kế hoạch', 'Gói', 'Năm KH', 'KL thực hiện', 'Trạng thái', 'Tháng NT'];
  [18, 22, 30, 30, 10, 12, 8, 9, 12, 14, 10].forEach((w, i) => (ct.getColumn(i + 1).width = w));
  ct.addRow(head).font = { name: FONT, bold: true };
  for (const v of vts) {
    const pl = plMap.get(v.plId);
    const th = v.trangThai === 'da' ? (v.thucHien || Object.fromEntries((v.chiTiet || []).map((c) => [c.ma, c.kl]))) : {};
    for (const c of v.chiTiet || []) {
      ct.addRow([LOAI_TEN[pl?.loai] || '', v.phuong || v.nhom, v.tram, v.tuyen, c.ma, c.kl, v.goi, pl?.namKH, th[c.ma] ?? 0,
        v.trangThai === 'da' ? 'Đã thực hiện' : v.trangThai === 'dang' ? 'Đang làm' : 'Chưa làm', v.thangNT || '']).font = { name: FONT };
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
