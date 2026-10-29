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

// ---- Sửa sau review độc lập ----
{
  eq(K.gopMa([{ ma: 'hm121', kl: 1 }, { ma: 'HM121 ', kl: 2 }, { ma: 'HM021', kl: 1 }, { ma: '', kl: 5 }]), [{ ma: 'HM121', kl: 3 }, { ma: 'HM021', kl: 1 }], 'gopMa: gộp mã trùng, bỏ mã trống');
  const st = K.emptyState();
  st.phuLuc.push({ id: 'a', loai: 'PLI', namKH: 2025 }, { id: 'b', loai: 'PLI', namKH: 2026 });
  st.viTri.push({ id: 'v1', plId: 'a', tram: 'T1', phuong: 'P', tuyen: 'D', kl: 1, trangThai: 'da', thangNT: '2025-05', chiTiet: [] },
    { id: 'v2', plId: 'b', tram: 'T1', phuong: 'P', tuyen: 'D', kl: 1, trangThai: 'chua', chiTiet: [] });
  const r = K.khopThucHien(st, { loai: 'PLI', viTri: [{ tram: 'T1', phuong: 'P', tuyen: 'D', kl: 1 }] }, '2026-10');
  eq([r.khop[0].id, st.viTri[0].thangNT, st.viTri[1].trangThai], ['v2', '2025-05', 'da'], 'khopThucHien: ưu tiên vị trí chưa thực hiện, không ghi đè tháng NT cũ');
  const { tieuChi } = await import('../js/kl/export.js');
  eq(tieuChi('A*"B'), '"=A~*""B"', 'tieuChi: thoát ký tự đại diện và nháy kép');
  if (ExcelJS) {
    const s2 = K.emptyState();
    s2.phuLuc.push({ id: 'p1', loai: 'PLIII', sheet: 'TongHop', namKH: 2026, nhom: [] }, { id: 'p2', loai: 'PLIII', sheet: 'X', namKH: 2026, nhom: [] });
    s2.viTri.push({ id: 'a1', plId: 'p1', nhom: 'P1', tram: 'A', kl: 2, goi: 'G2', chiTiet: [{ ma: 'HM1', kl: 2 }], trangThai: 'chua' },
      { id: 'a2', plId: 'p2', nhom: 'P1', tram: 'B', kl: 3, goi: 'G2', chiTiet: [{ ma: 'HM1', kl: 3 }], trangThai: 'chua' });
    const wb = buildWorkbook(ExcelJS, s2, { templates: PL_TEMPLATES, phuLucIds: ['p1'] });
    eq(wb.getWorksheet('ChiTiet_HM').rowCount, 2, 'xuất: ChiTiet_HM chỉ gồm phụ lục được chọn');
    ok(wb.getWorksheet('TongHop_2') && wb.getWorksheet('TongHop'), 'xuất: sheet phụ lục tên "TongHop" không đụng sheet tổng hợp');
  }
}


// ---- Bảng giá ký hợp đồng (file thật, đặt KL_BG = thư mục chứa 5 file) ----
const BG = process.env.KL_BG;
if (BG && fs.existsSync(BG)) {
  const files = fs.readdirSync(BG);
  const tim = (re) => path.join(BG, files.find((f) => re.test(f)));
  const docBG = (fp) => {
    const buf = fs.readFileSync(fp); const name = path.basename(fp).replace(/^[0-9a-f]{8}-/, '');
    const names = XLSX.read(buf, { type: 'buffer', bookSheets: true }).SheetNames;
    const chon = P.chonSheetBangGia(names, name);
    const wb = XLSX.read(buf, { type: 'buffer', sheets: names.filter((n) => n === chon.sheet || /^G\d+_11C$/i.test(n) || n === 'Tong hop HM') });
    return { res: P.parseBangGiaKy(XLSX, wb, name), wb };
  };
  const sum = (o) => Object.values(o).reduce((a, b) => a + b, 0);
  const g1 = docBG(tim(/^.{9}G1_Bieu/)).res, g2 = docBG(tim(/^.{9}G2_Bieu/)).res, g3 = docBG(tim(/^.{9}G3_BANG/)).res;
  const d4 = docBG(tim(/^.{9}G4_Bieu/)); const g4 = d4.res;
  eq([g1.goi, g1.sheet, g1.rows.length, Math.round(sum(g1.tong)), g1.lienDanh], ['G1', 'BGHD', 1648, 373085620257, false], 'BG G1: bản chốt "BGHD", 1.648 dòng, tổng 373.085.620.257 (= giá trị HĐ đã ký)');
  eq([g2.goi, g2.sheet, g2.rows.length, Math.round(sum(g2.tong)), Math.round(sum(g2.tongSap))], ['G2', 'BGHD G2', 4288, 498533365649, 488346802785], 'BG G2: chọn "BGHD G2" theo tên file; phần Sapulico 488.346.802.785');
  eq(g2.checks.namLech.map((x) => [x.y, x.dongNam - x.congDong]), [[2029, -217]], 'BG G2: phát hiện dòng NĂM 2029 (Cần Giờ) lệch −217 đ so với cộng dòng');
  eq([g3.goi, g3.sheet, g3.rows.length, Math.round(sum(g3.tong)), Math.round(sum(g3.tongSap)), g3.doiTac], ['G3', 'BGHD', 1900, 587595519824, 528412962657, 'CTCP Cơ khí điện Lữ Gia'], 'BG G3: sheet "BGHD" nhận gói theo tên file, liên danh Lữ Gia');
  eq([g4.goi, g4.rows.length, Math.round(sum(g4.tong)), Math.round(sum(g4.tongSap))], ['G4', 1942, 256905404980, 128300705356], 'BG G4: tổng 256.905.404.980, Sapulico 128.300.705.356');
  eq([g1, g2, g3, g4].map((r) => [r.checks.ttSai, r.checks.tachSai]), [[0, 0], [0, 0], [0, 0], [0, 0]], 'BG: thành tiền = KL × ĐG, KL Sapulico + đối tác = tổng ở cả 4 gói');
  // gói 3 không có số gói trong tên file → dò theo ghép mã
  { const buf = fs.readFileSync(tim(/^.{9}G3_BANG/)); const names = XLSX.read(buf, { type: 'buffer', bookSheets: true }).SheetNames;
    const wb = XLSX.read(buf, { type: 'buffer', sheets: names.filter((n) => n === 'BGHD' || /_11C$/.test(n)) });
    eq(P.parseBangGiaKy(XLSX, wb, 'bang gia.xlsb').goi, 'G3', 'BG: tên file không có số gói → nhận G3 nhờ ghép khớp G3_11C'); }
  // áp vào kho
  const st = K.emptyState();
  const cat = P.parseHMCatalog(XLSX, d4.wb); st.catalog = cat.hm;
  K.apBangGiaKy(st, g1); K.apBangGiaKy(st, g4);
  eq([st.catalog.HM021.goi.G1.kl[2026], st.catalog.HM005.goi.G4.dgNam[2027], st.catalog.HM005.goi.G4.dgNam[2028]], [160769, 79944, 79818], 'Áp BG: KL G1 HM021-2026; đơn giá ký HĐ theo năm (G4 HM005 2027 ≠ 2028)');
  eq(st.catalog.HM001.goi.G4.klSap[2026], 41, 'Áp BG: KL phần Sapulico G4 HM001-2026 = 41 (tổng 162)');
  // file ký HĐ Thủ Đức (không mã HM) → ghép theo bảng giá G4 đã nhập
  const td = docBG(tim(/Copy\.xlsx$/)).res;
  eq([td.loai, td.rows.length], ['kyHD', 1942], 'Ký HĐ Thủ Đức: nhận dạng file 1 sheet không mã HM');
  const gh = K.ghepKyHD(st, td, 'G4');
  eq([gh.ok, gh.khop, gh.khac], [true, 1942, { kl: 0, klSap: 0, dg: 0, tt: 0 }], 'Ký HĐ Thủ Đức ghép 1.942/1.942 dòng với BGHD G4, không lệch KL/ĐG/thành tiền');
  // đối chiếu phần Sapulico
  st.phuLuc.push({ id: 'p', loai: 'PLI', namKH: 2026 });
  st.viTri.push({ id: 'x1', plId: 'p', goi: 'G4', donVi: 'CS Thủ Đức', kl: 1, chiTiet: [{ ma: 'HM001', kl: 30 }], trangThai: 'chua' },
    { id: 'x2', plId: 'p', goi: 'G4', donVi: 'Lữ Gia', kl: 1, chiTiet: [{ ma: 'HM001', kl: 100 }], trangThai: 'chua' });
  const ld = K.doiChieu(st, 'G4', 2026).rows[0], sp = K.doiChieu(st, 'G4', 2026, { phan: 'sap' }).rows[0];
  eq([ld.hd, ld.kh, ld.dg, sp.hd, sp.kh], [162, 130, 48979, 41, 30], 'Đối chiếu: cả liên danh (HĐ 162, KH 130) / phần Sapulico (HĐ 41, KH 30 — bỏ vị trí Lữ Gia), đơn giá ký HĐ');
} else { skip++; console.log('… bỏ qua test bảng giá ký HĐ thật (chưa đặt KL_BG)'); }

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
