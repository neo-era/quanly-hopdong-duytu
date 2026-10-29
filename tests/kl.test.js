// tests/kl.test.js — Test KL theo vị trí ↔ hạng mục HĐ.
// Chạy: node tests/kl.test.js
// File thật (KHÔNG đưa vào repo public) đặt qua biến môi trường:
//   KL_FIX=<thư mục chứa 3 file trình Sở>   KL_HM=<file bảng giá HĐ .xlsb>
// Thiếu biến thì phần test file thật được bỏ qua, phần test dữ liệu giả lập vẫn chạy.
import fs from 'fs';
import vm from 'vm';
import path from 'path';
import { fileURLToPath } from 'url';
import * as P from '../js/kl/parse.js';
import * as K from '../js/kl/core.js';
import { buildWorkbook } from '../js/kl/export.js';
import { PL_TEMPLATES } from '../js/kl/templates.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const ctx = {}; vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(here, '../vendor/xlsx.full.min.js'), 'utf8'), ctx);
const XLSX = ctx.XLSX;
let ExcelJS = null;
try { ExcelJS = (await import(process.env.EXCELJS || 'exceljs')).default; } catch { /* bỏ qua test xuất nếu thiếu */ }

let pass = 0, fail = 0, skip = 0;
const eq = (g, w, m) => { if (JSON.stringify(g) === JSON.stringify(w)) pass++; else { fail++; console.error(`✗ ${m}\n   nhận: ${JSON.stringify(g)}\n   mong: ${JSON.stringify(w)}`); } };
const ok = (c, m) => eq(!!c, true, m);
const readWb = (f, opt = {}) => XLSX.read(fs.readFileSync(f), { type: 'buffer', cellFormula: true, ...opt });

// ---------- 1. Chuẩn hoá khoá so khớp ----------
eq(K.norm('  Lê Văn  Qưới-3 '), K.norm('le van quoi-3'), 'norm bỏ dấu, gộp khoảng trắng, không phân biệt hoa thường');
eq(K.maGoi('Gói 2'), 'G2', 'maGoi "Gói 2" -> G2');
eq(K.maGoi('G3'), 'G3', 'maGoi G3');
eq(K.maGoi(''), null, 'maGoi rỗng -> null');

// ---------- 2. Đọc vùng công thức ----------
eq(P.rowsInFormula('SUM(E13:E21)', 'E'), [13, 14, 15, 16, 17, 18, 19, 20, 21], 'SUM dải liên tục');
eq(P.rowsInFormula('SUBTOTAL(9,J13:J14,J16,J18:J19)', 'J'), [13, 14, 16, 18, 19], 'SUBTOTAL nhiều mảnh');
eq(P.rowsInFormula('E12+E37', 'E'), [12, 37], 'cộng từng ô');
eq(P.rowsInFormula('29+40', 'I'), null, 'hằng số -> null (không có vùng)');

// ---------- 3. Giả lập phụ lục nhỏ (luôn chạy) ----------
function fakePL() {
  const aoa = [
    ['Phụ lục I'], ['DUY TRÌ HỆ THỐNG CHIẾU SÁNG ĐÔ THỊ - THAY THẾ, SỬA CHỮA TỦ ĐIỀU KHIỂN'], ['(Đính kèm Công văn số …/TTGTHTKT-CXCS1)'],
    [], [], ['Stt', 'Trạm đèn', 'Phường-Xã', 'Tuyến Đường', 'Khối lượng thưc hiện Duy trì hệ thống chiếu sáng đô thị - thay thế', 'Năm Lắp đặt', 'Khối lượng đề xuất không có', 'Ghi Chú'],
    [], [], [null, 'Đơn vị tính:', null, null, '(Tủ)'],
    ['TỔNG CỘNG:', null, null, null, 3],
    ['XÃ A', null, null, null, 2, null, null, null, null, 'Gói 2', 'CS Tây'],
    [1, 'Trạm 1', 'A', 'Đường 1', 1, 2015, null, null, 67033279, 'Gói 2', 'CS Tây'],
    [2, 'Trạm 2', 'A', 'Đường 1', 1, 2016, null, null, 67033279, 'Gói 2', 'CS Tây'],
    [3, 'Trạm 3', 'A', 'Đường 2', 1, 2016, null, 'Đợt 2', 67033279, 'Gói 2', 'CS Tây'], // ngoài vùng cộng
    ['XÃ B', null, null, null, 1],
    [1, 'Trạm 9', 'B', 'Đường 9', 1, 2010, null, null, 67033279, 'Gói 3', 'CS Bắc'],
  ];
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  ws['E10'].f = 'E11+E15'; ws['E11'].f = 'SUM(E12:E13)'; ws['E15'].f = 'SUM(E16:E16)';
  return ws;
}
{
  const r = P.parsePLSheet(XLSX, fakePL(), 'PLI_Fake');
  eq(r.loai, 'PLI', 'giả lập: nhận loại PL I');
  eq(r.tongFile, 3, 'giả lập: TỔNG CỘNG file = 3');
  eq(r.viTri.length, 3, 'giả lập: 3 vị trí được tính');
  eq(r.ngoai.length, 1, 'giả lập: 1 dòng ngoài vùng cộng');
  eq(r.ngoai[0].tram, 'Trạm 3', 'giả lập: đúng dòng ngoài vùng cộng');
  eq(r.groups.map(g => [g.ten, g.klFile, g.klDoc]), [['XÃ A', 2, 2], ['XÃ B', 1, 1]], 'giả lập: cộng theo phường khớp file');
  ok(r.checks.khop, 'giả lập: tổng đọc = TỔNG CỘNG');
  eq([r.viTri[0].goi, r.viTri[0].donVi, r.viTri[2].goi, r.viTri[2].donVi], ['G2', 'CS Tây', 'G3', 'CS Bắc'], 'giả lập: nhận gói/đơn vị ở cột phụ');
  eq(r.viTri[0].donGia, 67033279, 'giả lập: nhận đơn giá ở cột phụ');
}

// ---------- 4. Mẫu HM, đối chiếu, đánh dấu thực hiện ----------
{
  const st = K.emptyState();
  const catalog = { HM121: { ten: 'Thay thế bộ điều khiển trung tâm tại tủ', dvt: '1 cái', goi: { G2: { kl: { 2026: 13 }, dg: 29727783 } } },
                    HM131: { ten: 'Thay thế vỏ tủ', dvt: '1 tủ', goi: { G2: { kl: { 2026: 73 }, dg: 3705132 } } },
                    HM120: { ten: 'RCBO', dvt: 'cái', goi: { G2: { kl: { 2026: 4 }, dg: 1247601 } } } };
  st.catalog = catalog;
  st.mau.PLI = [{ ma: 'HM121', heSo: 1 }, { ma: 'HM131', heSo: 1 }, { ma: 'HM120', heSo: 2 }];
  const r = P.parsePLSheet(XLSX, fakePL(), 'PLI_Fake');
  const res = K.importPL(st, r, { dot: 'Đợt 1', nhomVon: 'Nhóm 5', namKH: 2026, file: 'fake.xlsx' });
  eq(res.them, 3, 'nhập: thêm 3 vị trí');
  eq(st.viTri.filter(v => v.goi === 'G2').length, 2, 'nhập: 2 vị trí gói 2');
  eq(st.viTri[0].chiTiet, [{ ma: 'HM121', kl: 1 }, { ma: 'HM131', kl: 1 }, { ma: 'HM120', kl: 2 }], 'mẫu HM điền sẵn chi tiết theo KL × hệ số');
  const res2 = K.importPL(st, r, { dot: 'Đợt 1', nhomVon: 'Nhóm 5', namKH: 2026, file: 'fake.xlsx', mode: 'skip' });
  eq([res2.them, st.viTri.length], [0, 3], 'nhập lại cùng phụ lục (bỏ qua) không nhân đôi');
  const res3 = K.importPL(st, r, { dot: 'Đợt 1', nhomVon: 'Nhóm 5', namKH: 2026, file: 'fake.xlsx', mode: 'replace' });
  eq([res3.them, st.viTri.length, st.phuLuc.length], [3, 3, 1], 'nhập lại (thay thế) vẫn 3 vị trí, 1 phụ lục');

  K.danhDauThucHien(st, [st.viTri[0].id], '2026-10');
  let d = K.doiChieu(st, 'G2', 2026);
  const row = m => d.rows.find(x => x.ma === m);
  eq([row('HM121').hd, row('HM121').kh, row('HM121').th, row('HM121').khConLai, row('HM121').hdConLai, row('HM121').vuot], [13, 2, 1, 1, 11, false], 'đối chiếu HM121');
  eq([row('HM120').kh, row('HM120').th, row('HM120').hdConLai, row('HM120').vuot], [4, 2, 0, false], 'đối chiếu HM120 (đúng bằng HĐ, chưa vượt)');
  eq(Math.round(row('HM121').tienKH), 2 * 29727783, 'thành tiền KH theo đơn giá HĐ');
  // KL thực hiện khác KL kế hoạch
  K.suaThucHien(st, st.viTri[1].id, { HM120: 1 }, '2026-10');
  d = K.doiChieu(st, 'G2', 2026);
  eq(d.rows.find(x => x.ma === 'HM120').th, 3, 'KL thực hiện sửa tay (2 + 1)');
  // vượt
  st.catalog.HM120.goi.G2.kl[2026] = 3;
  d = K.doiChieu(st, 'G2', 2026);
  eq([d.rows.find(x => x.ma === 'HM120').vuot, d.soVuot], [true, 1], 'vượt KL HĐ được đánh dấu');
  // vị trí chưa gắn HM
  st.viTri[2].chiTiet = [];
  eq(K.doiChieu(st, 'G3', 2026).chuaGanHM, 1, 'đếm vị trí chưa gắn HM');
  // mã HM không có trong danh mục
  st.viTri[0].chiTiet.push({ ma: 'HM999', kl: 1 });
  eq(K.doiChieu(st, 'G2', 2026).rows.find(x => x.ma === 'HM999').khongCoTrongHD, true, 'mã HM không có trong danh mục bị báo');
  // vị trí cấu thành
  eq(K.viTriCuaHM(st, 'HM121', 'G2', 2026).length, 2, 'vị trí cấu thành HM121');

  // nhập "đã thực hiện" từ file đúng form: khớp trạm+phường+tuyến
  const th = K.khopThucHien(st, r, '2026-11');
  eq([th.khop.length, th.khongKhop.length], [3, 0], 'khớp đã thực hiện từ file');
  const r2 = { ...r, viTri: [...r.viTri, { ...r.viTri[0], tram: 'Trạm lạ', kl: 1 }] };
  eq(K.khopThucHien(st, r2, '2026-11').khongKhop.map(x => x.tram), ['Trạm lạ'], 'dòng không khớp được liệt kê, không ghi');
}

// ---------- 5. Phát hiện sheet trùng (tập con) ----------
{
  const a = { sheet: 'PLI_All', loai: 'PLI', viTri: [{ tram: 'X', phuong: 'P', tuyen: 'T' }, { tram: 'Y', phuong: 'P', tuyen: 'T' }] };
  const b = { sheet: 'PLI_Goi2', loai: 'PLI', viTri: [{ tram: 'X', phuong: 'P', tuyen: 'T' }] };
  eq(P.findSubsetSheets([a, b]), { PLI_Goi2: 'PLI_All' }, 'sheet con được nhận ra');
}

// ---------- 6. Xuất Excel đúng form + vòng tròn xuất → nhập ----------
if (ExcelJS) {
  const st = K.emptyState();
  const r = P.parsePLSheet(XLSX, fakePL(), 'PLI_Fake');
  K.importPL(st, r, { dot: 'Đợt 1', nhomVon: 'Nhóm 5', namKH: 2026, file: 'fake.xlsx' });
  const wb = buildWorkbook(ExcelJS, st, { templates: PL_TEMPLATES, phuLucIds: st.phuLuc.map(p => p.id) });
  const buf = Buffer.from(await wb.xlsx.writeBuffer());
  const wb2 = XLSX.read(buf, { type: 'buffer', cellFormula: true });
  const sh = wb2.SheetNames.find(n => /^PLI/.test(n));
  ok(sh, 'xuất: có sheet phụ lục I');
  const r2 = P.parsePLSheet(XLSX, wb2.Sheets[sh], sh);
  eq([r2.loai, r2.tongFile, r2.viTri.length, r2.checks.khop], ['PLI', 3, 3, true], 'vòng tròn: nhập lại file vừa xuất ra đúng số');
  eq(r2.viTri.map(v => [v.tram, v.phuong, v.tuyen, v.kl, v.goi, v.donVi]), r.viTri.map(v => [v.tram, v.phuong, v.tuyen, v.kl, v.goi, v.donVi]), 'vòng tròn: dữ liệu từng vị trí giữ nguyên');
  const ws = wb.getWorksheet(sh);
  eq(ws.getCell('A1').value, 'Phụ lục I', 'xuất: giữ dòng "Phụ lục I"');
  ok(String(ws.getCell('A2').value).startsWith('DUY TRÌ HỆ THỐNG CHIẾU SÁNG ĐÔ THỊ'), 'xuất: giữ dòng tiêu đề DUY TRÌ…');
  ok(/SUBTOTAL\(9,E/.test(ws.getCell('E10').formula || ''), 'xuất: TỔNG CỘNG là công thức sống SUBTOTAL');
  eq(ws.getCell('A1').font.name, 'Times New Roman', 'xuất: font Times New Roman');
  eq(ws.pageSetup.orientation, 'landscape', 'xuất: trang ngang');
  ok(wb.getWorksheet('TongHop'), 'xuất: có sheet TongHop');
  ok(/SUMIFS/.test(wb.getWorksheet('TongHop').getCell('C5').formula || ''), 'xuất: TongHop dùng SUMIFS tham chiếu sheet phụ lục');
} else { skip++; console.log('… bỏ qua test xuất (chưa có exceljs)'); }

// ---------- 7. File thật ----------
const FIX = process.env.KL_FIX;
if (FIX && fs.existsSync(FIX)) {
  const want = {
    '3._TongHoptrinh_SXD-dot_4__5.xlsx': { PLI_ThaySuaTu: [188, 23], PLII_LED: [774, 7], PLIII_Tru: [69, 2] },
    'TH SXD-(D5).xlsx': { PLI_ThaySuaTu: [450, 19], PLII_LED: [947, 8], PLIII_Tru: [69, 2], PLIV_TruTrangTri_LuGia: [40, 1] },
    'TongHoptrinh_SXD_Dot2-20.10.2026.xlsx': { PLI_ThaySuaTu: [450, 18], PLI_Goi2: [217, 10], PLI_Goi3: [233, 8] },
  };
  for (const [f, sheets] of Object.entries(want)) {
    const wb = readWb(path.join(FIX, f));
    const res = P.parsePLWorkbook(XLSX, wb);
    for (const [sn, [tong, nGroups]] of Object.entries(sheets)) {
      const r = res.find(x => x.sheet === sn);
      ok(r, `${f} › ${sn}: đọc được`);
      if (!r) continue;
      eq([r.tongFile, r.checks.tongDoc, r.groups.length, r.checks.khop], [tong, tong, nGroups, true], `${f} › ${sn}: TỔNG ${tong}, ${nGroups} phường, khớp`);
      eq(r.groups.filter(g => g.klFile !== g.klDoc).map(g => g.ten), [], `${f} › ${sn}: từng phường khớp dòng cộng của file`);
    }
    ok(!res.find(x => x.sheet === 'TongHop'), `${f}: sheet TongHop không bị coi là phụ lục`);
  }
  const d45 = P.parsePLWorkbook(XLSX, readWb(path.join(FIX, '3._TongHoptrinh_SXD-dot_4__5.xlsx'))).find(x => x.sheet === 'PLI_ThaySuaTu');
  eq([d45.viTri.length, d45.ngoai.length], [188, 649], 'dot_4__5 PL I: 188 vị trí tính, 649 dòng ngoài vùng cộng (Đợt 2 ẩn)');
  const d5 = P.parsePLWorkbook(XLSX, readWb(path.join(FIX, 'TH SXD-(D5).xlsx'))).find(x => x.sheet === 'PLI_ThaySuaTu');
  eq([d5.viTri.length, d5.klTrong.length], [450, 199], 'D5 PL I: 450 vị trí có KL, 199 dòng KL trống không tính');
  const d2 = P.parsePLWorkbook(XLSX, readWb(path.join(FIX, 'TongHoptrinh_SXD_Dot2-20.10.2026.xlsx')));
  eq(P.findSubsetSheets(d2), { PLI_Goi2: 'PLI_ThaySuaTu', PLI_Goi3: 'PLI_ThaySuaTu' }, 'Dot2: sheet Gói 2, Gói 3 là tập con của sheet tổng');
  const d2all = d2.find(x => x.sheet === 'PLI_ThaySuaTu');
  const demGoi = () => [d2all.viTri.filter(v => v.goi === 'G2').length, d2all.viTri.filter(v => v.goi === 'G3').length, d2all.viTri.filter(v => !v.goi).length];
  eq(demGoi(), [159, 100, 191], 'Dot2 sheet tổng: file thật để trống cột Gói ở 191 vị trí (không tự đoán)');
  const bs = P.boSungTuSheetCon(d2);
  eq([bs.PLI_ThaySuaTu, demGoi()], [191, [217, 233, 0]], 'Dot2: bổ sung gói từ sheet tách Gói 2/Gói 3 → khớp 217/233');
  // vòng tròn trên file thật
  if (ExcelJS) {
    const st = K.emptyState();
    K.importPL(st, d2all, { dot: 'Đợt 2', nhomVon: 'BSV (Đợt 3)-Nhóm 6', namKH: 2026, file: 'Dot2.xlsx' });
    const wb = buildWorkbook(ExcelJS, st, { templates: PL_TEMPLATES, phuLucIds: st.phuLuc.map(p => p.id) });
    const wb2 = XLSX.read(Buffer.from(await wb.xlsx.writeBuffer()), { type: 'buffer', cellFormula: true });
    const r2 = P.parsePLWorkbook(XLSX, wb2).find(x => x.loai === 'PLI');
    eq([r2.tongFile, r2.viTri.length, r2.groups.length, r2.checks.khop], [450, 450, 18, true], 'file thật Dot2: xuất rồi nhập lại vẫn 450 tủ / 18 phường');
    // TongHop phải bằng TỔNG CỘNG phụ lục kể cả khi có vị trí chưa rõ gói/đơn vị (file gốc trống 191 vị trí)
    const tho = P.parsePLWorkbook(XLSX, readWb(path.join(FIX, 'TongHoptrinh_SXD_Dot2-20.10.2026.xlsx'))).find(x => x.sheet === 'PLI_ThaySuaTu');
    const st3 = K.emptyState(); K.importPL(st3, tho, { file: 'Dot2.xlsx' });
    const th = buildWorkbook(ExcelJS, st3, { templates: PL_TEMPLATES, phuLucIds: st3.phuLuc.map(p => p.id) }).getWorksheet('TongHop');
    const rows = []; th.eachRow((row, rn) => rn >= 4 && rows.push([row.getCell(1).value, row.getCell(3).value]));
    eq(rows[0][1].result, 450, 'TongHop: dòng phụ lục = 450 = TỔNG CỘNG file (không rơi vị trí chưa rõ gói)');
    const du = rows.find(r => /chưa rõ gói/.test(r[0]));
    eq([du && du[1].result, /PLI_ThaySuaTu'!E\d+-SUM/.test(du && du[1].formula)], [191, true], 'TongHop: 191 vị trí chưa rõ gói/đơn vị = TỔNG − các dòng đã tách (công thức sống)');
  }
} else { skip++; console.log('… bỏ qua test file phụ lục thật (chưa đặt KL_FIX)'); }

const HMF = process.env.KL_HM;
if (HMF && fs.existsSync(HMF)) {
  const wb = XLSX.read(fs.readFileSync(HMF), { type: 'buffer', sheets: ['Tong hop HM', 'G1_11C', 'G2_11C', 'G3_11C', 'G4_11C'] });
  const cat = P.parseHMCatalog(XLSX, wb);
  ok(Object.keys(cat.hm).length > 1000, 'bảng giá HĐ: > 1.000 mã HM');
  eq(cat.hm.HM021.goi.G1.kl[2026], 160769, 'HM021 G1-2026 = 160.769');
  eq([cat.hm.HM121.goi.G2.kl[2026], cat.hm.HM131.goi.G2.kl[2026]], [13, 73], 'HM121, HM131 G2-2026 = 13, 73');
  eq(cat.hm.HM121.ten, 'Thay thế bộ điều khiển trung tâm tại tủ', 'tên HM121');
  ok(cat.hm.HM121.goi.G2.dg > 0, 'HM121 có đơn giá gói 2 từ G2_11C');
  eq(cat.nam, [2026, 2027, 2028, 2029], 'các năm HĐ');
} else { skip++; console.log('… bỏ qua test bảng giá HĐ thật (chưa đặt KL_HM)'); }

console.log(`\n${fail === 0 ? '✓ TẤT CẢ' : '✗'} ${pass} pass, ${fail} fail${skip ? `, ${skip} nhóm bỏ qua` : ''}`);
process.exit(fail ? 1 : 0);
