// tests/ks.test.js — Liên kết app Khảo sát → vị trí đề xuất; tóm tắt HĐ đẩy sang app Khảo sát.
// Tiêu chí: docs/04_LienKet-KhaoSat.md (T1–T6, B3, B5). Chạy: node tests/ks.test.js — dữ liệu giả lập, không gọi mạng.
import * as K from '../js/kl/core.js';
import * as S from '../js/kl/ks.js';

let pass = 0, fail = 0;
const eq = (g, w, m) => { if (JSON.stringify(g) === JSON.stringify(w)) pass++; else { fail++; console.error(`✗ ${m}\n   nhận: ${JSON.stringify(g)}\n   mong: ${JSON.stringify(w)}`); } };
const ok = (c, m) => eq(!!c, true, m);

// ---------- Kho mẫu: 1 phụ lục III thật (nhập từ Excel) + danh mục HĐ ----------
function kho() {
  const st = K.emptyState();
  st.catalog = {
    HM210: { ten: 'Thay trụ thép 9m', dvt: 'trụ', goi: { G1: { kl: { 2026: 120 }, klSap: { 2026: 100 } }, G2: { kl: { 2026: 80 } } } },
    HM214: { ten: 'Móng trụ 9m', dvt: 'cái', goi: { G1: { kl: { 2026: 120 } } } },
    HM101: { ten: 'Thay đèn LED 100W', dvt: 'bộ', goi: { G1: { kl: { 2026: 500 } } } },
    HM300: { ten: 'Thay cáp ngầm', dvt: 'm', goi: { G1: { kl: { 2026: 2000 } } } },
  };
  st.mau.PLIII = [{ ma: 'HM210', heSo: 1 }, { ma: 'HM214', heSo: 1 }];
  st.mau.PLII = [{ ma: 'HM101', heSo: 1 }];
  st.mau['KS:tc_ngam'] = [{ ma: 'HM300', heSo: 1 }];
  st.phuLuc.push({ id: 'pl1', loai: 'PLIII', sheet: 'PL III', file: 'a.xlsx', namKH: 2026, dot: 'Đợt 1', nhom: ['Bàn Cờ'] });
  st.viTri.push({ id: 'v1', plId: 'pl1', stt: 1, tram: 'TĐK LVS-01', phuong: 'Phường Nhiêu Lộc', tuyen: 'Lê Văn Sỹ', nhom: 'Nhiêu Lộc', kl: 3, goi: 'G1', donVi: '',
    chiTiet: [{ ma: 'HM210', kl: 3 }, { ma: 'HM214', kl: 3 }], trangThai: 'chua' });
  st.viTri.push({ id: 'v2', plId: 'pl1', stt: 2, tram: 'TĐK X', phuong: 'Phường Bàn Cờ', tuyen: 'NTMK', nhom: 'Bàn Cờ', kl: 2, goi: 'G1', donVi: '',
    chiTiet: [{ ma: 'HM210', kl: 2 }, { ma: 'HM214', kl: 2 }], trangThai: 'chua' });
  st.viTri.push({ id: 'v3', plId: 'pl1', stt: 3, tram: 'TĐK Y', phuong: 'Phường Xuân Hòa', tuyen: 'VVT', nhom: 'Xuân Hòa', kl: 1, goi: 'G1', donVi: '', chiTiet: [], trangThai: 'chua' });
  st.viTri.push({ id: 'v4', plId: 'pl1', stt: 4, tram: 'TĐK Z', phuong: 'Xuân Hòa', tuyen: 'CMT8', nhom: 'Xuân Hòa', kl: 1, goi: 'G2', donVi: '', chiTiet: [], trangThai: 'chua' });
  return st;
}
const TRU = (o = {}) => ({ _type: 'thay_tru', STT: 'TT-261105-AB12', 'Vị trí': 'Trước số 120', 'Tuyến đường': 'Nguyễn Thị Minh Khai', Quận: 'Quận 3', Phường: 'Bàn Cờ',
  'Tủ điều khiển': 'TĐK NTMK-02', 'Số lượng': 6, 'Quy cách trụ (loại trụ: chiều cao VD: STK 9m; be tông 8,4m; trang trí;...)': 'STK 9m', 'Năm lắp đặt': 2009,
  'Ghi chú (kèm thay cần đèn,...)': '', link: 'https://maps.google.com/?q=1,2', 'Deleted At': '', ...o });
const DEN = (o = {}) => ({ _type: 'thay_den', STT: 'TD-261101-0001', 'Tuyến đường': 'Võ Văn Tần', Quận: 'Quận 3', Phường: 'Xuân Hòa', 'Tủ điều khiển': 'TĐK VVT-01',
  'Đầu tuyến': 'CMT8', 'Cuối tuyến': 'Bà Huyện Thanh Quan', 'Số đèn hiện hữu': 14, 'Công suất đèn hiện hữu': '150W', 'Năm lắp đặt': 2012, 'Ghi chú': '', 'Deleted At': '', ...o });

// ---------- 1. Đọc số ----------
eq(S.docSo(6), 6, 'số');
eq(S.docSo('1,5'), 1.5, 'dấu phẩy thập phân');
eq(S.docSo('30m'), 30, 'số kèm đơn vị m');
eq(S.docSo('14 đèn ( 2TN 3m)'), null, 'chữ tự do → trống, không đoán');
eq(S.docSo(''), null, 'ô trống → trống (không phải 0)');
eq(S.docSo('abc'), null, 'không phải số → trống');
eq(S.docSo('1.234'), 1234, '"1.234" kiểu VN = một nghìn hai trăm ba mươi tư');
eq(S.docSo('1.234.567'), 1234567, 'nhiều nhóm nghìn');
eq(S.docSo('1.234,5'), 1234.5, 'nghìn + thập phân');
eq(S.docSo('1.5'), 1.5, '"1.5" thập phân');

// ---------- 2. Ánh xạ bản ghi (T1) ----------
{
  const t = S.anhXa(TRU());
  eq([t.dich, t.vt.kl, t.vt.tram, t.vt.phuong, t.vt.tuyen, t.vt.lyTrinhDau, t.vt.namLD], ['PLIII', 6, 'TĐK NTMK-02', 'Bàn Cờ', 'Nguyễn Thị Minh Khai', 'Trước số 120', 2009], 'thay_tru → PL III, KL = Số lượng, Vị trí → lý trình đầu');
  ok(/STK 9m/.test(t.vt.ghiChu), 'quy cách trụ → ghi chú');
  eq(t.vt.nguon.ks, 'thay_tru#TT-261105-AB12', 'khoá nguồn');
  eq(S.anhXa(TRU({ 'Quy cách trụ (loại trụ: chiều cao VD: STK 9m; be tông 8,4m; trang trí;...)': 'Trang trí 4m' })).goiYPLIV, true, 'trụ trang trí → gợi ý PL IV (không tự chuyển)');
  eq(S.anhXa(TRU({ 'Quy cách trụ (loại trụ: chiều cao VD: STK 9m; be tông 8,4m; trang trí;...)': 'Trang trí 4m' })).dich, 'PLIII', 'mặc định vẫn PL III');
  const d = S.anhXa(DEN());
  eq([d.dich, d.vt.hienHuu, d.vt.kl, d.vt.namLD, d.vt.lyTrinhDau, d.vt.lyTrinhCuoi], ['PLII', 14, null, 2012, 'CMT8', 'Bà Huyện Thanh Quan'], 'thay_den → PL II: số đèn hiện hữu → cột G, KL (J) để trống');
  eq([d.vt.congSuat, d.vt.tinhHinh, d.vt.ltbQD], [undefined, undefined, undefined], 'PL II: cột I, K, L để trống');
  ok(/150W/.test(d.vt.ghiChu), 'công suất HPS hiện hữu → ghi chú');
  eq(S.anhXa({ _type: 'vo_tu', STT: 'VT-1', 'Tuyến đường': 'A', Phường: 'Bàn Cờ', 'Tủ điều khiển': 'T', 'Số lượng': 1 }).dich, 'KHAC', 'vo_tu → Khác (không phải PL I)');
  eq(S.anhXa({ _type: 'nang_mong', STT: 'NM-1', 'Tuyến đường': 'A', Phường: 'B', 'Tủ điều khiển': 'T', 'Độ cao nâng': 200, 'Số lượng': 2 }).vt.kl, 2, 'nâng móng: KL = Số lượng, không lấy Độ cao nâng');
  eq(S.anhXa({ _type: 'tc_ngam', STT: 'TCG-1', 'Tuyến đường': 'A', Phường: 'B', 'Tủ điều khiển': 'T', 'Số lượng': '39m' }).vt.kl, 39, 'cáp ngầm "39m" → 39');
  eq(Object.keys(S.KS_MAP).length, 17, 'đủ 17 loại khảo sát đều có đích (anh chốt 09/11)');
  const br = S.anhXa({ _type: 'thao_go_bang_ron', STT: 'BR-1', 'Tuyến đường': 'A', Phường: 'Bàn Cờ', 'Vị trí': 'số 10–20', 'Loại quảng cáo': 'Băng rôn', 'Số lượng': 12 });
  eq([br.dich, br.vt.kl, br.vt.lyTrinhDau, br.dvt], ['KHAC', 12, 'số 10–20', 'tấm'], 'băng rôn: không cần cột TĐK, KL = Số lượng (tấm)');
  const sc = S.anhXa({ _type: 'bao_cao_su_co', STT: 'SC-1', 'Tuyến đường': 'A', Phường: 'B', 'Tủ điều khiển': 'T', 'Mã tủ': 'TM118.03', 'Hiện trạng sự cố': 'Gãy trụ' });
  eq([sc.dich, sc.vt.kl], ['KHAC', null], 'sự cố: KL để trống (không có cột số lượng)');
  ok(/TM118\.03/.test(sc.vt.ghiChu) && /Gãy trụ/.test(sc.vt.ghiChu), 'sự cố: mã tủ + hiện trạng → ghi chú');
  eq(S.anhXa({ _type: 'tang_cuong_den', STT: 'TCD-1', 'Tuyến đường': 'A', Phường: 'B', 'Tủ điều khiển': 'T', 'Số đèn dự kiến': 3 }).vt.kl, 3, 'tăng cường đèn: lấy Số đèn dự kiến');
  eq(S.anhXa({ _type: 'ngam_hoa', STT: 'NH-1', 'Tuyến đường': 'A', Phường: 'B', 'Tủ điều khiển': 'T', 'Số đèn dự kiến': 5 }).vt.kl, 5, 'ngầm hóa: lấy Số đèn dự kiến');
  let loi = null; try { S.anhXa({ _type: 'thay_tru', STT: 'x', 'Tuyến đường': 'A' }); } catch (e) { loi = e.message; }
  ok(/Thiếu cột/.test(loi || ''), 'thiếu cột → báo lỗi rõ');
  eq(S.anhXa(TRU({ 'Số lượng': '' })).vt.kl, null, 'KL trống giữ trống');
}

// ---------- 3. Bảng phường → gói (T3) ----------
{
  const st = kho();
  const m = S.phuongGoi(st);
  eq([...m.get(K.norm('Bàn Cờ'))], ['G1'], 'Bàn Cờ → G1');
  eq([...m.get(K.norm('Xuân Hòa'))].sort(), ['G1', 'G2'], 'Xuân Hòa → nhiều gói');
  eq(S.goiTheoPhuong(st, 'Phường Bàn Cờ'), { goi: 'G1', list: ['G1'] }, 'bỏ tiền tố "Phường"');
  eq(S.goiTheoPhuong(st, 'Xuân Hòa'), { goi: 'nhieu', list: ['G1', 'G2'] }, 'nhiều gói → chọn tay');
  eq(S.goiTheoPhuong(st, 'Tân Định'), { goi: null, list: [] }, 'phường lạ → chưa rõ gói');
  eq(S.goiTheoPhuong(st, 'P.Bàn Cờ'), { goi: 'G1', list: ['G1'] }, '"P.Bàn Cờ" không dấu cách');
  eq(S.goiTheoPhuong(st, 'P Bàn Cờ').goi, 'G1', '"P Bàn Cờ"');
}

// ---------- 4. Xem trước + lấy về phụ lục nháp (T2, T4) ----------
{
  const st = kho();
  const before = K.doiChieu(st, 'G1', 2026).rows.map((r) => [r.ma, r.kh]);
  const rows = [TRU(), TRU({ STT: 'TT-261105-0002', 'Tuyến đường': 'Lê Văn Sỹ', Phường: 'Nhiêu Lộc', 'Tủ điều khiển': 'TĐK LVS-01' }),
    TRU({ STT: 'TT-261105-0003', Phường: 'Xuân Hòa', 'Tủ điều khiển': 'TĐK VVT-02' }), TRU({ STT: 'TT-261105-0004', 'Số lượng': '' }),
    TRU({ STT: 'TT-261105-0005', 'Deleted At': '2026-11-01' }), TRU({ STT: 'DUP' }), TRU({ STT: 'DUP', 'Tuyến đường': 'Khác' }), DEN()];
  const xt = S.xemTruoc(st, rows, { namKH: 2026 });
  const by = Object.fromEntries(xt.items.map((i) => [i.stt, i]));
  eq(by['TT-261105-AB12'].trangThai, 'moi', 'bản mới');
  eq(by['TT-261105-AB12'].goi, 'G1', 'gán gói theo phường');
  eq(by['TT-261105-0002'].trangThai, 'trungPL', 'trùng vị trí đã có trong phụ lục Excel (trạm+phường+tuyến)');
  eq(by['TT-261105-0002'].chon, false, 'trùng phụ lục → mặc định không chọn');
  eq([by['TT-261105-0003'].goi, by['TT-261105-0003'].goiList], ['nhieu', ['G1', 'G2']], 'nhiều gói → chọn tay');
  eq(by['TT-261105-0004'].thieuKL, true, 'thiếu KL → cờ');
  eq(by['TT-261105-0005'], undefined, 'bản đã xoá chưa từng lấy → bỏ qua');
  eq(by.DUP.trangThai, 'sttTrung', 'STT trùng trong khảo sát → báo, không gộp');
  eq(by.DUP.chon, false, 'STT trùng không chọn');
  eq(by['TD-261101-0001'].dich, 'PLII', 'thay đèn → PL II');
  eq(xt.dem, { moi: 4, thayDoi: 0, trungPL: 1, thieuKL: 2, xoa: 0, sttTrung: 2 }, 'đếm theo nhóm (thiếu KL gồm PL II cột J)');

  const kq = S.apDung(st, xt.items, { namKH: 2026, chonGoi: { 'thay_tru#TT-261105-0003': 'G2' } });
  eq(kq.them, 4, 'thêm 4 vị trí (moi, đã chọn)');
  const nhap = st.phuLuc.filter((p) => p.nhap);
  eq(nhap.map((p) => p.loai).sort(), ['PLII', 'PLIII'], 'tạo phụ lục nháp theo loại');
  const v = st.viTri.find((x) => x.nguon?.ks === 'thay_tru#TT-261105-AB12');
  eq([v.kl, v.goi, v.donVi, v.chiTiet], [6, 'G1', '', [{ ma: 'HM210', kl: 6 }, { ma: 'HM214', kl: 6 }]], 'vị trí: KL, gói, đơn vị trống, chi tiết theo mẫu PL III');
  eq(st.viTri.find((x) => x.nguon?.ks === 'thay_tru#TT-261105-0003').goi, 'G2', 'gói chọn tay được áp');
  eq(st.viTri.find((x) => x.nguon?.ks === 'thay_tru#TT-261105-0004').chiTiet, [], 'KL trống → chưa có chi tiết HM');
  eq(v.nguon.thuocSo, false, 'cờ chưa xác minh thuộc Sở');
  // T4: "Đã đưa vào KH" không đổi; cột đề xuất KS (nháp) có số
  const after = K.doiChieu(st, 'G1', 2026);
  eq(after.rows.filter((r) => r.kh || before.some((b) => b[0] === r.ma)).map((r) => [r.ma, r.kh]), before, 'T4: tổng Đã vào KH trước/sau khi lấy KS bằng nhau');
  eq(after.rows.find((r) => r.ma === 'HM210').khKS, 6, 'cột Đề xuất KS (nháp) = 6');

  // Lấy lại: không trùng; đổi số → thay đổi
  const xt2 = S.xemTruoc(st, [TRU(), TRU({ STT: 'TT-261105-0004', 'Số lượng': 5 })], { namKH: 2026 });
  eq(xt2.items.map((i) => i.trangThai), ['daCo', 'thayDoi'], 'lấy lại: bản cũ "đã có", bản đổi số "thay đổi"');
  eq(S.apDung(st, xt2.items, { namKH: 2026 }).capNhat, 1, 'cập nhật 1');
  const v4 = st.viTri.find((x) => x.nguon?.ks === 'thay_tru#TT-261105-0004');
  eq([v4.kl, v4.chiTiet], [5, [{ ma: 'HM210', kl: 5 }, { ma: 'HM214', kl: 5 }]], 'cập nhật KL + chi tiết');
  eq(st.viTri.filter((x) => x.nguon?.ks === 'thay_tru#TT-261105-0004').length, 1, 'không sinh vị trí trùng');
  // Vị trí đã thực hiện → không ghi đè KL
  v.trangThai = 'da';
  const xt3 = S.xemTruoc(st, [TRU({ 'Số lượng': 9 })], { namKH: 2026 });
  eq([xt3.items[0].trangThai, xt3.items[0].chon], ['thayDoi', false], 'vị trí đã thực hiện: thay đổi KS không chọn sẵn');
  xt3.items[0].chon = true;
  S.apDung(st, xt3.items, { namKH: 2026 });
  eq(S.xemTruoc(st, [TRU({ 'Số lượng': 9 })], { namKH: 2026 }).items[0].trangThai, 'daCo', 'đã ghi nhận thay đổi → lần sau không hiện lại');
  eq([v.kl, v.nguon.doiSauTH], [6, true], 'đã thực hiện: giữ KL, đánh dấu "khảo sát đổi sau khi thực hiện"');
  // Bản KS bị xoá sau khi lấy → đánh dấu, không xoá vị trí
  const xt4 = S.xemTruoc(st, [TRU({ STT: 'TT-261105-0004', 'Deleted At': '2026-11-09' })], { namKH: 2026 });
  eq(xt4.items[0].trangThai, 'xoa', 'nguồn đã xoá');
  S.apDung(st, xt4.items, { namKH: 2026 });
  eq([v4.nguon.xoa, st.viTri.includes(v4)], [true, true], 'đánh dấu nguồn đã xoá, giữ vị trí');
}

// ---------- 5. Chuyển nháp → đợt phụ lục thật (T4, T5) ----------
{
  const st = kho();
  S.apDung(st, S.xemTruoc(st, [TRU(), TRU({ STT: 'TT-2', 'Số lượng': '' }), TRU({ STT: 'TT-3', Phường: 'Xuân Hòa', 'Tủ điều khiển': 'K' })], { namKH: 2026 }).items, { namKH: 2026 });
  const ids = st.viTri.filter((v) => v.nguon?.ks).map((v) => v.id);
  const r1 = S.chuyenNhap(st, ids, { dot: 'Đợt 3' });
  eq(r1.chuyen, 0, 'chưa xác nhận thuộc Sở → không chuyển');
  eq(r1.boQua.map((b) => b.lyDo).sort(), ['Chưa rõ gói', 'Chưa xác nhận thuộc Sở quản lý', 'Thiếu KL'], 'lý do bỏ qua (KL → gói → thuộc Sở)');
  S.xacNhanThuocSo(st, ids, true);
  const r2 = S.chuyenNhap(st, ids, { dot: 'Đợt 3' });
  eq(r2.chuyen, 1, 'chỉ vị trí đủ điều kiện (có KL, có gói, thuộc Sở) được chuyển');
  eq(r2.boQua.map((b) => b.lyDo).sort(), ['Chưa rõ gói', 'Thiếu KL'], 'còn lại báo lý do');
  const pl = st.phuLuc.find((p) => !p.nhap && p.nguon === 'KS');
  eq([pl.loai, pl.dot, pl.namKH], ['PLIII', 'Đợt 3', 2026], 'tạo đợt phụ lục thật cùng loại, năm');
  eq(K.doiChieu(st, 'G1', 2026).rows.find((r) => r.ma === 'HM210').kh, 3 + 2 + 6, 'sau khi chuyển: Đã vào KH tăng đúng 6');
  eq(S.kiemXuat(st, [pl.id]), [], 'đợt thật đủ điều kiện xuất');
  st.viTri.find((v) => v.plId === pl.id).kl = null;
  eq(S.kiemXuat(st, [pl.id]).length, 1, 'xuất bị chặn khi có vị trí KL trống');
  eq(S.kiemXuat(st, st.phuLuc.filter((p) => p.nhap).map((p) => p.id)).length > 0, true, 'phụ lục nháp không xuất được');
}

// ---------- 5b. Thay đổi sau khi đã vào đợt thật; STT trùng bản xoá; Nhập đã thực hiện bỏ qua nháp ----------
{
  const st = kho();
  S.apDung(st, S.xemTruoc(st, [TRU()], { namKH: 2026 }).items, { namKH: 2026 });
  const v = st.viTri.find((x) => x.nguon?.ks);
  S.xacNhanThuocSo(st, [v.id], true); S.chuyenNhap(st, [v.id], { dot: 'Đợt 3' });
  const it = S.xemTruoc(st, [TRU({ 'Ghi chú (kèm thay cần đèn,...)': 'đổi ghi chú' })], { namKH: 2026 }).items[0];
  eq([it.trangThai, it.daVaoDot, it.chon], ['thayDoi', true, false], 'đã vào đợt thật: thay đổi không chọn sẵn');
  it.chon = true; S.apDung(st, [it], { namKH: 2026 });
  eq(v.nguon.thuocSo, true, 'cập nhật từ KS giữ xác nhận thuộc Sở');
  const pl = st.phuLuc.find((p) => p.id === v.plId);
  eq(S.kiemXuat(st, [pl.id]), [], 'vẫn xuất được sau khi cập nhật');
  const x = S.xemTruoc(st, [TRU({ STT: 'TT-9' }), TRU({ STT: 'TT-9', 'Deleted At': '2026-11-01', 'Tuyến đường': 'Cũ' })], { namKH: 2026 });
  eq(x.items.map((i) => i.trangThai), ['moi'], 'STT trùng giữa bản xoá và bản hiệu lực: chỉ giữ bản hiệu lực');
  // Nhập đã thực hiện: vị trí trùng ở nháp và phụ lục thật → khớp phụ lục thật
  const st2 = kho();
  S.apDung(st2, S.xemTruoc(st2, [TRU({ STT: 'TT-7', 'Tuyến đường': 'NTMK', 'Tủ điều khiển': 'TĐK X', Phường: 'Bàn Cờ' })], { namKH: 2026 }).items.map((i) => ({ ...i, chon: true, trangThai: 'moi' })), { namKH: 2026 });
  const kq = K.khopThucHien(st2, { loai: 'PLIII', viTri: [{ tram: 'TĐK X', phuong: 'Phường Bàn Cờ', tuyen: 'NTMK', kl: 2 }] }, '2026-10');
  eq(st2.viTri.find((x) => x.id === 'v2').trangThai, 'da', 'khớp vào vị trí phụ lục thật');
  eq(st2.viTri.find((x) => x.nguon?.ks === 'thay_tru#TT-7').trangThai, 'chua', 'không khớp vào vị trí nháp');
  void kq;
}

// ---------- 6. Tóm tắt đẩy sang app Khảo sát (T6) ----------
{
  const st = kho();
  S.apDung(st, S.xemTruoc(st, [TRU()], { namKH: 2026 }).items, { namKH: 2026 });
  const p = S.tomTat(st, 2026);
  const g1 = p.tomTat.filter((r) => r[0] === 'G1' && r[3] === 'HM210')[0];
  const dc = K.doiChieu(st, 'G1', 2026, { phan: 'sap' }).rows.find((r) => r.ma === 'HM210');
  eq([g1[6], g1[7], g1[8]], [dc.hd, dc.kh, dc.hdConLai], 'KL HĐ / đã vào KH / còn lại khớp màn Đối chiếu (phần Sapulico)');
  eq(g1[6], 100, 'KL HĐ = phần Sapulico');
  ok(p.tomTat.some((r) => r[0] === 'G1' && r[3] === 'HM300'), 'mã có KL HĐ dù chưa vào KH vẫn có');
  eq(p.tomTat.every((r) => r.length === 10), true, 'đủ 10 cột');
  ok(p.phuongGoi.some((r) => r[0] === 'Bàn Cờ' && r[1] === 'G1'), 'phường → gói');
  eq(p.loaiHM.filter((r) => r[0] === 'thay_tru').map((r) => r[1]), ['HM210', 'HM214'], 'loại KS → mã HM theo mẫu');
  eq(p.loaiHM.filter((r) => r[0] === 'tc_ngam').map((r) => r[1]), ['HM300'], 'loại Khác → mẫu riêng');
  eq(p.lienKet, [['thay_tru', 'TT-261105-AB12', 'G1', 'HM210', 'Nháp', 'Đề xuất (nháp)', '']], 'liên kết: nháp');
  const v = st.viTri.find((x) => x.nguon?.ks);
  S.xacNhanThuocSo(st, [v.id], true); S.chuyenNhap(st, [v.id], { dot: 'Đợt 3' });
  v.trangThai = 'da'; v.thangNT = '2026-10';
  eq(S.tomTat(st, 2026).lienKet[0].slice(4), ['PL III · Đợt 3', 'Đã thực hiện', '10/2026'], 'liên kết: đã thực hiện + tháng');
}

// ---------- 7. Mẫu nhóm Khác ----------
{
  const st = kho();
  S.apDung(st, S.xemTruoc(st, [{ _type: 'tc_ngam', STT: 'TCG-1', 'Tuyến đường': 'A', Phường: 'Bàn Cờ', 'Tủ điều khiển': 'T', 'Số lượng': 40 }], { namKH: 2026 }).items, { namKH: 2026 });
  const v = st.viTri.find((x) => x.nguon?.ks === 'tc_ngam#TCG-1');
  eq(v.chiTiet, [{ ma: 'HM300', kl: 40 }], 'Khác: chi tiết theo mẫu riêng của loại KS');
  st.mau['KS:tc_ngam'] = [{ ma: 'HM300', heSo: 1 }, { ma: 'HM301', heSo: 0.5 }];
  eq(S.apMauKS(st, 'tc_ngam'), 1, 'áp lại mẫu Khác');
  eq(v.chiTiet, [{ ma: 'HM300', kl: 40 }, { ma: 'HM301', kl: 20 }], 'chi tiết mới');
  eq(K.LOAI_TEN.KHAC, 'Khác · ngoài phụ lục', 'tên nhóm Khác');
}

console.log(`\nks.test: ${pass} đạt, ${fail} lỗi`);
if (fail) process.exit(1);
