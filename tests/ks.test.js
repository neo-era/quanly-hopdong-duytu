// tests/ks.test.js — Liên kết app Khảo sát → vị trí đề xuất; tóm tắt HĐ đẩy sang app Khảo sát.
// Tiêu chí: docs/04_LienKet-KhaoSat.md (T1–T6, B3, B5). Chạy: node tests/ks.test.js — dữ liệu giả lập, không gọi mạng.
import * as K from '../js/kl/core.js';
import * as S from '../js/kl/ks.js';
import * as MA from '../js/kl/ksma.js';
import * as N from '../js/kl/ksnhom.js';

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
  st.mau.CAPNGAM = [{ ma: 'HM300', heSo: 1 }];
  st.phuLuc.push({ id: 'pl1', loai: 'PLIII', sheet: 'PL III', file: 'a.xlsx', namKH: 2026, dot: 'Đợt 1', nhom: ['Bàn Cờ'] });
  st.viTri.push({ id: 'v1', plId: 'pl1', stt: 1, tram: 'TĐK LVS-01', phuong: 'Phường Nhiêu Lộc', tuyen: 'Lê Văn Sỹ', nhom: 'Nhiêu Lộc', kl: 3, goi: 'G1', donVi: '',
    chiTiet: [{ ma: 'HM210', kl: 3 }, { ma: 'HM214', kl: 3 }], trangThai: 'chua' });
  st.viTri.push({ id: 'v2', plId: 'pl1', stt: 2, tram: 'TĐK X', phuong: 'Phường Bàn Cờ', tuyen: 'NTMK', nhom: 'Bàn Cờ', kl: 2, goi: 'G1', donVi: '',
    chiTiet: [{ ma: 'HM210', kl: 2 }, { ma: 'HM214', kl: 2 }], trangThai: 'chua' });
  st.viTri.push({ id: 'v3', plId: 'pl1', stt: 3, tram: 'TĐK Y', phuong: 'Phường Xuân Hòa', tuyen: 'VVT', nhom: 'Xuân Hòa', kl: 1, goi: 'G1', donVi: '', chiTiet: [], trangThai: 'chua' });
  st.viTri.push({ id: 'v4', plId: 'pl1', stt: 4, tram: 'TĐK Z', phuong: 'Xuân Hòa', tuyen: 'CMT8', nhom: 'Xuân Hòa', kl: 1, goi: 'G2', donVi: '', chiTiet: [], trangThai: 'chua' });
  return st;
}
const TRU = (o = {}) => ({ _type: 'thay_tru', 'Trình Sở': 'Trình Sở', STT: 'TT-261105-AB12', 'Vị trí': 'Trước số 120', 'Tuyến đường': 'Nguyễn Thị Minh Khai', Quận: 'Quận 3', Phường: 'Bàn Cờ',
  'Tủ điều khiển': 'TĐK NTMK-02', 'Số lượng': 6, 'Quy cách trụ (loại trụ: chiều cao VD: STK 9m; be tông 8,4m; trang trí;...)': 'STK 9m', 'Năm lắp đặt': 2009,
  'Ghi chú (kèm thay cần đèn,...)': '', link: 'https://maps.google.com/?q=1,2', 'Deleted At': '', 'Trình Sở': 'Trình Sở', ...o });
const DEN = (o = {}) => ({ _type: 'thay_den', 'Trình Sở': 'Trình Sở', STT: 'TD-261101-0001', 'Tuyến đường': 'Võ Văn Tần', Quận: 'Quận 3', Phường: 'Xuân Hòa', 'Tủ điều khiển': 'TĐK VVT-01',
  'Đầu tuyến': 'CMT8', 'Cuối tuyến': 'Bà Huyện Thanh Quan', 'Số đèn hiện hữu': 14, 'Công suất đèn hiện hữu': '150W', 'Năm lắp đặt': 2012, 'Ghi chú': '', 'Deleted At': '', 'Trình Sở': 'Trình Sở', ...o });

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
  { const tt = S.anhXa(TRU({ 'Quy cách trụ (loại trụ: chiều cao VD: STK 9m; be tông 8,4m; trang trí;...)': 'Trang trí 4m' }));
    eq([tt.goiYPLIV, /trang trí/i.test(tt.vt.ghiChu)], [false, true], 'trụ trang trí ở chung PL Thay trụ, ghi chú "Trụ trang trí" (doc 05, bỏ gợi ý PL IV)'); }
  eq(S.anhXa(TRU({ 'Quy cách trụ (loại trụ: chiều cao VD: STK 9m; be tông 8,4m; trang trí;...)': 'Trang trí 4m' })).dich, 'PLIII', 'mặc định vẫn PL III');
  const d = S.anhXa(DEN());
  eq([d.dich, d.vt.hienHuu, d.vt.kl, d.vt.namLD, d.vt.lyTrinhDau, d.vt.lyTrinhCuoi], ['PLII', 14, 14, 2012, 'CMT8', 'Bà Huyện Thanh Quan'], 'thay_den → PL II: số đèn hiện hữu → cột G, LED (J) mặc định = G (doc 05)');
  eq([d.vt.congSuat, d.vt.tinhHinh, d.vt.ltbQD], [undefined, undefined, undefined], 'PL II: cột I, K, L để trống');
  ok(/150W/.test(d.vt.ghiChu), 'công suất HPS hiện hữu → ghi chú');
  { const vt = S.anhXa({ _type: 'vo_tu', STT: 'VT-1', 'Tuyến đường': 'A', Phường: 'Bàn Cờ', 'Tủ điều khiển': 'T', 'Số lượng': 1 });
    eq([vt.dich, vt.kenh], ['KS:vo_tu', 'TT'], 'vo_tu → khuôn chung, luôn KL Trung tâm (kể cả bản cũ trống cột Trình Sở)'); }
  eq(S.anhXa({ _type: 'nang_mong', 'Trình Sở': 'Trình Sở', STT: 'NM-1', 'Tuyến đường': 'A', Phường: 'B', 'Tủ điều khiển': 'T', 'Độ cao nâng': 200, 'Số lượng': 2 }).vt.kl, 2, 'nâng móng: KL = Số lượng, không lấy Độ cao nâng');
  eq(S.anhXa({ _type: 'tc_ngam', 'Trình Sở': 'Trình Sở', STT: 'TCG-1', 'Tuyến đường': 'A', Phường: 'B', 'Tủ điều khiển': 'T', 'Số lượng': '39m' }).vt.kl, 39, 'cáp ngầm "39m" → 39');
  eq(Object.keys(S.KS_MAP).length, 18, 'đủ 18 loại khảo sát (thêm Thay sửa tủ 11/11) đều có đích');
  const br = S.anhXa({ _type: 'thao_go_bang_ron', 'Trình Sở': 'Trình Sở', STT: 'BR-1', 'Tuyến đường': 'A', Phường: 'Bàn Cờ', 'Vị trí': 'số 10–20', 'Loại quảng cáo': 'Băng rôn', 'Số lượng': 12 });
  eq([br.dich, br.vt.kl, br.vt.lyTrinhDau, br.dvt], ['KS:thao_go_bang_ron', 12, 'số 10–20', 'tấm'], 'băng rôn: không cần cột TĐK, KL = Số lượng (tấm)');
  const sc = S.anhXa({ _type: 'bao_cao_su_co', 'Trình Sở': 'Trình Sở', STT: 'SC-1', 'Tuyến đường': 'A', Phường: 'B', 'Tủ điều khiển': 'T', 'Mã tủ': 'TM118.03', 'Hiện trạng sự cố': 'Gãy trụ' });
  eq([sc.dich, sc.vt.kl], ['KS:bao_cao_su_co', null], 'sự cố: KL để trống (không có cột số lượng)');
  ok(/TM118\.03/.test(sc.vt.ghiChu) && /Gãy trụ/.test(sc.vt.ghiChu), 'sự cố: mã tủ + hiện trạng → ghi chú');
  eq(S.anhXa({ _type: 'tang_cuong_den', 'Trình Sở': 'Trình Sở', STT: 'TCD-1', 'Tuyến đường': 'A', Phường: 'B', 'Tủ điều khiển': 'T', 'Số đèn dự kiến': 3 }).vt.kl, 3, 'tăng cường đèn: lấy Số đèn dự kiến');
  { const nh = S.anhXa({ _type: 'ngam_hoa', 'Trình Sở': 'Trình Sở', STT: 'NH-1', 'Tuyến đường': 'A', Phường: 'B', 'Tủ điều khiển': 'T', 'Số đèn dự kiến': 5, 'Số trụ': 7, 'Chiều dài cáp ngầm (md)': '120,5' });
    eq([nh.dich, nh.vt.kl, nh.vt.kl2], ['HANGAM', 7, 120.5], 'ngầm hóa → Hạ ngầm: KL = Số trụ, kl2 = cáp (md)');
    const nhCu = S.anhXa({ _type: 'ngam_hoa', 'Trình Sở': 'Trình Sở', STT: 'NH-2', 'Tuyến đường': 'A', Phường: 'B', 'Tủ điều khiển': 'T', 'Số đèn dự kiến': 5 });
    eq([nhCu.vt.kl, 'kl2' in nhCu.vt], [null, false], 'ngầm hóa bản cũ (thiếu 2 cột mới) → Thiếu KL, không lấy Số đèn dự kiến, không ném lỗi'); }
  let loi = null; try { S.anhXa({ _type: 'thay_tru', 'Trình Sở': 'Trình Sở', STT: 'x', 'Tuyến đường': 'A' }); } catch (e) { loi = e.message; }
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
  eq(xt.dem, { moi: 4, thayDoi: 0, trungPL: 1, thieuKL: 1, xoa: 0, sttTrung: 2, chuaPL: 0, TS: 4, TT: 0 }, 'đếm theo nhóm + kênh');

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
  eq(p.loaiHM.filter((r) => r[0] === 'tc_ngam').map((r) => r[1]), ['HM300'], 'thay cáp ngầm → mẫu PL Thay cáp nguồn ngầm');
  eq(p.lienKet, [['thay_tru', 'TT-261105-AB12', 'G1', 'HM210', 'Nháp', 'Đề xuất (nháp)', '']], 'liên kết: nháp');
  const v = st.viTri.find((x) => x.nguon?.ks);
  S.xacNhanThuocSo(st, [v.id], true); S.chuyenNhap(st, [v.id], { dot: 'Đợt 3' });
  v.trangThai = 'da'; v.thangNT = '2026-10';
  eq(S.tomTat(st, 2026).lienKet[0].slice(4), ['PL III · Đợt 3', 'Đã thực hiện', '10/2026'], 'liên kết: đã thực hiện + tháng');
}

// ---------- 7. Mẫu nhóm Khác ----------
{
  const st = kho();
  st.mau['KS:tc_noi'] = [{ ma: 'HM300', heSo: 1 }];
  S.apDung(st, S.xemTruoc(st, [{ _type: 'tc_noi', STT: 'TCN-1', 'Tuyến đường': 'A', Phường: 'Bàn Cờ', 'Tủ điều khiển': 'T', 'Số lượng': 40, 'Trình Sở': 'Không trình Sở' }], { namKH: 2026 }).items, { namKH: 2026 });
  const v = st.viTri.find((x) => x.nguon?.ks === 'tc_noi#TCN-1');
  eq(v.chiTiet, [{ ma: 'HM300', kl: 40 }], 'Khuôn chung: chi tiết theo mẫu riêng của loại KS');
  eq(K.kenhPL(st.phuLuc.find((p) => p.id === v.plId)), 'TT', 'Không trình Sở → phụ lục nháp kênh TT');
  st.mau['KS:tc_noi'] = [{ ma: 'HM300', heSo: 1 }, { ma: 'HM301', heSo: 0.5 }];
  eq(S.apMauKS(st, 'tc_noi'), 1, 'áp lại mẫu khuôn chung');
  eq(v.chiTiet, [{ ma: 'HM300', kl: 40 }, { ma: 'HM301', kl: 20 }], 'chi tiết mới');
  eq(K.LOAI_TEN.KHAC, 'Khác · ngoài phụ lục', 'tên nhóm Khác');
}

// ---------- 8. Mặc định mã HM theo danh mục HĐ (tên hạng mục thật của bảng giá ký 2026–2029) ----------
{
  const CAT = { HM283: { dvt: '1 Trụ' }, HM286: { dvt: '1 Trụ' }, HM280: { dvt: '1 Trụ' }, HM278: { dvt: 'cột' }, HM290: { dvt: '1 Trụ' }, HM287: { dvt: '1 Trụ' },
    HM131: { dvt: '1 tủ' }, HM347: { dvt: '40m' }, HM346: { dvt: '100m' }, HM346m: { dvt: 'm' }, HM330: { dvt: '100m' }, HM331: { dvt: '100m' }, HM099: { dvt: 'hộp' },
    HM305: { dvt: 'cần đèn' }, HM311: { dvt: 'cần đèn' }, HM310: { dvt: 'cần đèn' }, HM091: { dvt: 'bộ' }, HM103: { dvt: 'bộ' }, HM093: { dvt: 'bộ' },
    HM254: { dvt: 'bộ' }, HM423: { dvt: 'bộ' }, HM246: { dvt: '1 cái' }, HM244: { dvt: 'móng' }, HM433: { dvt: 'bộ' }, HM189: { dvt: 'bộ' } };
  const g = (t, qc, kl = 1, cat = CAT) => MA.goiYMa(t, { qc }, kl, cat);
  eq([g('thay_tru', 'STK 9m').ma, g('thay_tru', 'Thép 6m').ma, g('thay_tru', 'STK 12m').ma], ['HM286', 'HM283', 'HM280'], 'trụ thép theo chiều cao');
  eq([g('thay_tru', 'Bê tông 8,4m').ma, g('thay_tru', 'trang trí đế gang').ma, g('thay_tru', 'trang trí').chac], ['HM278', 'HM287', false], 'trụ BTLT / trang trí; trang trí chung → chưa chắc');
  eq(g('thay_tru', ''), null, 'không có quy cách → không đoán');
  eq([g('thay_tru', 'Côn tròn 8m', 1, { ...CAT, HM285: { dvt: '1 Trụ' } }).ma, g('thay_tru', 'Côn tròn 8m', 1, { ...CAT, HM285: { dvt: '1 Trụ' } }).chac], ['HM285', true], 'danh mục app KS "Côn tròn 8m" → HM285');
  eq(g('thay_can', '2,5m').ma, 'HM310', 'danh mục app KS "2,5m" → HM310');
  eq(g('choa_den', 'Đèn LED'), null, 'chóa "Đèn LED" → không đoán');
  eq([g('vo_tu').ma, g('decal_so_tru').ma, g('nang_mong').ma, g('thao_go_bang_ron').ma], ['HM131', 'HM246', 'HM244', 'HM433'], 'vỏ tủ / decal / nâng móng / băng rôn');
  eq(g('tc_noi', '', 80).chiTiet, [{ ma: 'HM347', kl: 2 }], 'cáp nổi 80m → HM347 (ĐVT 40m) = 2');
  eq(g('tc_ngam', '', 30).chiTiet, [{ ma: 'HM346m', kl: 30 }], 'cáp ngầm → HM346m (m)');
  eq(MA.goiYMa('tc_ngam', {}, 250, { HM346: { dvt: '100m' } }).chiTiet, [{ ma: 'HM346', kl: 2.5 }], 'không có HM346m → HM346 (100m)');
  eq([g('cap_luon_can', '5x2,5').ma, g('cap_luon_can', '').ma, g('cap_luon_can', '').chac], ['HM331', 'HM330', false], 'cáp luồn cần = dây lên đèn');
  eq([g('hkn', '6A').ma, g('hkn', '6A').chac], ['HM099', false], 'hộp kín nước: mặc định rẽ nhánh, cần xem lại');
  eq([g('thay_can', 'cần đôi').ma, g('thay_can', '3,8m').ma, g('thay_can', '3m').ma], ['HM305', 'HM311', 'HM310'], 'cần đèn theo kiểu/chiều dài');
  eq([g('choa_den', 'Onyx').ma, g('choa_den', 'Trang trí Bông huệ').ma, g('choa_den', 'pha').ma], ['HM091', 'HM103', 'HM093'], 'chóa đèn theo loại');
  eq([g('nap_tru', '35x25').ma, g('nap_tru', 'composite').ma], ['HM254', 'HM423'], 'nắp trụ thép / composite');
  eq(g('tc_den_kc_xa', 'LED 120W').ma, 'HM189', 'đèn LED 120W → HM189 (120–<130W)');
  eq([g('bao_cao_su_co'), g('ngam_hoa')], [null, null], 'sự cố / ngầm hóa: không có mã mặc định');
  eq(MA.goiYMa('vo_tu', {}, 1, {}), null, 'mã không có trong danh mục HĐ → không gán');
  // tích hợp: kho chưa khai mẫu Khác → gán theo mã danh mục; có mẫu → theo mẫu
  const st = kho(); Object.assign(st.catalog, CAT); st.mau.PLIII = [];
  const xt = S.xemTruoc(st, [TRU(), { _type: 'tc_noi', 'Trình Sở': 'Trình Sở', STT: 'TCN-1', 'Tuyến đường': 'A', Phường: 'Bàn Cờ', 'Tủ điều khiển': 'T', 'Số lượng': 120, 'Loại cáp hiện hữu': '5x10' }], { namKH: 2026 });
  eq(xt.items.map((i) => i.goiY?.ma), ['HM286', 'HM347'], 'xem trước hiện mã gợi ý');
  S.apDung(st, xt.items, { namKH: 2026 });
  eq(st.viTri.find((v) => v.nguon?.ks === 'thay_tru#TT-261105-AB12').chiTiet, [{ ma: 'HM286', kl: 6 }], 'trụ STK 9m × 6 → HM286 × 6');
  eq(st.viTri.find((v) => v.nguon?.ks === 'tc_noi#TCN-1').chiTiet, [{ ma: 'HM347', kl: 3 }], 'cáp nổi 120m → HM347 × 3');
  st.mau['KS:tc_noi'] = [{ ma: 'HM347', heSo: 0.025 }, { ma: 'HM099', heSo: 0 }];
  S.apMauKS(st, 'tc_noi');
  eq(st.viTri.find((v) => v.nguon?.ks === 'tc_noi#TCN-1').chiTiet, [{ ma: 'HM347', kl: 3 }, { ma: 'HM099', kl: 0 }], 'Áp mẫu → theo mẫu người dùng khai');
  eq(S.tomTat(st, 2026).loaiHM.filter((r) => r[0] === 'vo_tu').map((r) => r[1]), ['HM131'], 'đẩy sang KS: loại chưa có mẫu → mã mặc định có trong danh mục');
  const st2 = kho(); Object.assign(st2.catalog, CAT);
  S.apDung(st2, S.xemTruoc(st2, [TRU()], { namKH: 2026 }).items, { namKH: 2026 });
  eq(st2.viTri.find((v) => v.nguon?.ks).chiTiet, [{ ma: 'HM210', kl: 6 }, { ma: 'HM214', kl: 6 }], 'đã có mẫu PL III → theo mẫu, không đè');
}

// ---------- 9. GĐ2: nhóm HM theo loại KS + mã người khảo sát chọn (docs/04 mục 6) ----------
{
  // Tên mẫu theo bảng giá ký 2026–2029 (chỉ tên, không số liệu)
  const CAT = {
    HM074: { ten: 'Thay thế bóng, chấn lưu, kích đèn HPS 70W', dvt: 'bộ', goi: { G1: {}, G2: {} } },
    HM091: { ten: 'Thay thế chóa đèn HPS 70W-400W', dvt: 'bộ', goi: { G1: {} } },
    HM186: { ten: 'Thay thế bộ đèn Led chiếu sáng đường phố', dvt: 'bộ', goi: { G1: {}, G2: {} } },
    HM186_cg: { ten: 'Thay thế bộ đèn Led chiếu sáng đường phố', dvt: 'Bộ', goi: { G2: {} } },
    HM187: { ten: 'Lắp đặt bộ đèn đường LED 100W-<110W', dvt: 'bộ', goi: { G1: {} } },
    HM207: { ten: 'Tháo dỡ bộ đèn', dvt: 'bộ', goi: { G1: {} } },
    HM240: { ten: 'Lắp đặt đế cố định trụ/cần/bộ đèn chiếu sáng bồn hoa/thảm cỏ', dvt: '1 cái', goi: { G1: {} } },
    HM257: { ten: 'Lắp đặt trụ BTLT (không bao gồm móng trụ)', dvt: 'cột', goi: { G1: {} } },
    HM286: { ten: 'Thay thế trụ đèn thép nhúng kẽm nóng cao ≤9m, dày 4mm', dvt: '1 Trụ', goi: { G1: {} } },
    HM309: { ten: 'Thay thế cần đèn đơn Ø60mm', dvt: 'cần đèn', goi: { G1: {} } },
    HM330: { ten: 'Thay thế dây lên đèn bằng cáp 3x2,5mm²', dvt: '100m', goi: { G1: {} } },
    HM346: { ten: 'Thay thế cáp ngầm', dvt: '100m', goi: { G1: {}, G2: {}, G3: {} } },
    HM346m: { ten: 'Thay thế cáp ngầm_', dvt: 'm', goi: { G4: {} } },
    HM347: { ten: 'Thay thế cáp nguồn nổi', dvt: '40m', goi: { G1: {} } },
    HM157: { ten: 'Cung cấp nối ống HDPE', dvt: 'cái', goi: { G1: {} } },
    HM449: { ten: 'Thay thế MCCB 3P 50A có module đóng cắt điều khiển từ xa bằng mô tơ', dvt: 'cái', goi: { G1: {} } },
    HM483: { ten: 'Thay thế driver led 100W', dvt: 'cái', goi: { G1: {} } },
    HM506: { ten: 'Đào mương cáp đường nhựa', dvt: 'm3', goi: { G1: {} } },
    HM515: { ten: 'Trồng cỏ mương cáp (không bao gồm cỏ)', dvt: '100m2', goi: { G1: {} } },
    HM040_cg: { ten: 'Kiểm tra tủ điện', dvt: '1 lần', goi: {} },
  };
  const tat = (t) => N.nhomCua(t, CAT).flatMap((n) => n.ma);
  // C1: Thay đèn ra nhóm đèn; không lẫn trụ/cần/chóa/đế; _cg bị ẩn
  const td = tat('thay_den');
  eq(['HM074', 'HM186', 'HM187', 'HM207', 'HM483'].every((m) => td.includes(m)), true, 'thay đèn: bộ đèn, lắp LED, tháo dỡ, bóng/chấn lưu, driver');
  eq(['HM091', 'HM240', 'HM257', 'HM286', 'HM309', 'HM330', 'HM449', 'HM186_cg'].filter((m) => td.includes(m)), [], 'thay đèn: không lẫn chóa/đế/trụ/cần/dây/MCCB/_cg');
  eq(N.nhomCua('thay_den', CAT).map((n) => n.nhom), ['Thay bộ đèn', 'Lắp đặt bộ đèn', 'Tháo dỡ · di dời đèn', 'Bóng · chấn lưu · kích', 'Linh kiện đèn LED'], 'thay đèn: 5 nhóm');
  eq(tat('tc_noi'), ['HM347'], 'cáp nổi: không lẫn "nối ống" (nổi/nối cùng chữ khi bỏ dấu)');
  eq(tat('choa_den'), ['HM091'], 'chóa: chỉ chóa');
  ok(tat('tc_ngam').includes('HM506') && tat('tc_ngam').includes('HM346') && !tat('tc_ngam').includes('HM449'), 'cáp ngầm: cáp + đào mương, không lẫn MCCB "từ xa bằng"');
  eq(tat('nang_mong').includes('HM257'), false, 'nâng móng: "không bao gồm móng trụ" không vào nhóm móng');
  eq(N.LOAI_CO_NHOM.length, 18, 'đủ 18 loại khảo sát có nhóm');
  eq(Object.keys(S.KS_MAP).every((t) => N.LOAI_CO_NHOM.includes(t)), true, 'mọi loại trong KS_MAP đều có nhóm');

  // ĐVT 8 dạng
  eq(['100m', '40m', '1m', '1 m', '100m2', '10m2', '100m3', '1m2', 'bộ', 'cái'].map(MA.heSoDVT), [0.01, 0.025, 1, 1, 0.01, 0.1, 0.01, 1, 1, 1], 'quy đổi ĐVT đủ dạng');
  // Mã đúng gói: cáp ngầm G1 → HM346 (100m), G4 → HM346m (m)
  eq(MA.goiYMa('tc_ngam', {}, 250, CAT, 'G1').chiTiet, [{ ma: 'HM346', kl: 2.5 }], 'cáp ngầm gói 1 → HM346');
  eq(MA.goiYMa('tc_ngam', {}, 30, CAT, 'G4').chiTiet, [{ ma: 'HM346m', kl: 30 }], 'cáp ngầm gói 4 → HM346m');
  eq(MA.goiYMa('tc_noi', {}, 80, CAT, 'G2'), null, 'mã không có trong gói → không gán');

  // anhXa đọc lựa chọn của người khảo sát (_hd); hash chỉ đổi khi có
  const rowTD = (hd) => ({ _type: 'thay_den', 'Trình Sở': 'Trình Sở', STT: 'TD-1', 'Tuyến đường': 'Châu Văn Liêm', Phường: 'Chợ Lớn', 'Tủ điều khiển': 'CVL-3', 'Số đèn hiện hữu': 4, 'Công suất đèn hiện hữu': '150W', ...(hd ? { _hd: hd } : {}) });
  const a0 = S.anhXa({ ...rowTD(), 'Trình Sở': '' });   // bản cũ chưa có cột Trình Sở
  const a1 = S.anhXa(rowTD({ nam: 2026, goi: 'G1', goiTay: true, ds: [{ ma: 'HM207', heSo: 1 }, { ma: 'HM187', heSo: 1 }] }));
  eq(a1.vt.ksChon, { nam: 2026, goi: 'G1', goiTay: true, ds: [{ ma: 'HM207', heSo: 1 }, { ma: 'HM187', heSo: 1 }] }, 'đọc lựa chọn KS');
  eq(a0.vt.ksChon, undefined, 'không chọn → không có ksChon');
  const hashCu = S.bam(JSON.stringify([a0.vt.tram, a0.vt.phuong, a0.vt.tuyen, a0.vt.kl, a0.vt.hienHuu, a0.vt.lyTrinhDau, a0.vt.lyTrinhCuoi, a0.vt.namLD, a0.vt.ghiChu, undefined]));
  eq(a0.vt.nguon.hash, hashCu, 'bản không chọn: hash giữ như cũ');
  ok(a1.vt.nguon.hash !== a0.vt.nguon.hash, 'có chọn mã → hash khác (app HĐ thấy thay đổi)');
  eq(S.anhXa(rowTD({ goi: 'G1', ds: [{ ma: 'HM1', heSo: 1 }, { ma: 'HM2', heSo: 2 }, { ma: 'HM3', heSo: 1 }, { ma: 'HM4', heSo: 1 }, { ma: 5 }] })).vt.ksChon.ds.length, 3, 'tối đa 3 mã');

  // Ưu tiên: mã KS chọn > mẫu > ksma; gói chọn tay khi phường chưa có
  const st = kho(); Object.assign(st.catalog, CAT); st.catalog.HM187.goi.G1 = { kl: { 2026: 50 } }; st.catalog.HM207.goi.G1 = { kl: { 2026: 50 } };
  st.mau.PLII = [{ ma: 'HM101', heSo: 1 }];
  const row = { ...rowTD({ nam: 2026, goi: 'G1', goiTay: true, ds: [{ ma: 'HM207', heSo: 1 }, { ma: 'HM187', heSo: 1 }] }), 'Số đèn hiện hữu': 4, 'Trình Sở': 'Trình Sở' };
  const xt = S.xemTruoc(st, [row], { namKH: 2026 });
  const it = xt.items[0];
  eq([it.goi, it.goiKS], ['G1', true], 'phường chưa có trong HĐ → dùng gói người KS chọn, có cờ');
  eq(it.goiY, { ma: 'HM207', chac: true, ly: 'người khảo sát chọn (+1 mã)' }, 'gợi ý hiện mã KS chọn');
  it.vt.kl = 4;
  S.apDung(st, xt.items, { namKH: 2026 });
  const v = st.viTri.find((x) => x.nguon?.ks === 'thay_den#TD-1');
  eq(v.chiTiet, [{ ma: 'HM207', kl: 4 }, { ma: 'HM187', kl: 4 }], 'chi tiết = mã KS chọn (thắng mẫu PL II)');
  eq(v.goiKS, true, 'vị trí ghi cờ gói do KS chọn');
  // Lệch gói: phường đã có gói thật khác gói KS chọn
  const row2 = { ...rowTD({ nam: 2026, goi: 'G2', goiTay: true, ds: [{ ma: 'HM186', heSo: 1 }] }), STT: 'TD-2', Phường: 'Bàn Cờ', 'Trình Sở': 'Trình Sở' };
  const it2 = S.xemTruoc(st, [row2], { namKH: 2026 }).items[0];
  eq([it2.goi, it2.lechGoi], ['G1', true], 'phường có gói thật G1 ≠ KS chọn G2 → giữ G1, nhãn lệch gói');
  const st5 = kho(); Object.assign(st5.catalog, CAT);
  S.apDung(st5, S.xemTruoc(st5, [row2], { namKH: 2026 }).items.map((x) => ({ ...x, vt: { ...x.vt, kl: 1 } })), { namKH: 2026 });
  const v5 = st5.viTri.find((x) => x.nguon?.ks === 'thay_den#TD-2');
  eq(S.lyDoChan(st5, v5), 'Lệch gói (KS chọn khác phụ lục) — gán lại gói', 'lệch gói → chặn chuyển đợt');
  S.ganGoi(st5, [v5.id], 'G1');
  eq([v5.lechGoi, S.lyDoChan(st5, v5) === 'Lệch gói (KS chọn khác phụ lục) — gán lại gói'], [undefined, false], 'gán lại gói → hết chặn');
  const dongBo5 = (r) => S.apDung(st5, S.xemTruoc(st5, [r], { namKH: 2026 }).items.map((x) => ({ ...x, vt: { ...x.vt, kl: 2 } })), { namKH: 2026 });
  dongBo5({ ...row2, 'Số đèn hiện hữu': 7 });
  eq(st5.viTri.find((x) => x.id === v5.id).lechGoi, undefined, 'đã gán gói, KS sửa số khác nhưng giữ gói → không chặn lại');
  dongBo5({ ...rowTD({ nam: 2026, goi: 'G3', goiTay: true, ds: [{ ma: 'HM186', heSo: 1 }] }), STT: 'TD-2', Phường: 'Bàn Cờ', 'Số đèn hiện hữu': 7 });
  eq(st5.viTri.find((x) => x.id === v5.id).lechGoi, true, 'KS đổi sang gói khác → lệch gói lại');
  // Sửa tay thắng; KS đổi mã sau sửa tay → nhãn, không ghi đè
  v.chiTiet = [{ ma: 'HM186', kl: 4 }]; v.chiTietSua = true;
  const row3 = { ...rowTD({ nam: 2026, goi: 'G1', goiTay: true, ds: [{ ma: 'HM186', heSo: 1 }, { ma: 'HM207', heSo: 1 }] }), 'Số đèn hiện hữu': 4, 'Trình Sở': 'Trình Sở' };
  const xt3 = S.xemTruoc(st, [row3], { namKH: 2026 });
  eq(xt3.items[0].trangThai, 'thayDoi', 'KS đổi mã → thay đổi');
  S.apDung(st, xt3.items, { namKH: 2026 });
  eq([v.chiTiet, v.nguon.doiMa], [[{ ma: 'HM186', kl: 4 }], true], 'chi tiết sửa tay giữ nguyên, nhãn "KS đổi mã"');
  // Mã KS chọn không có trong gói / danh mục → bỏ qua, về mặc định
  const st3 = kho(); Object.assign(st3.catalog, CAT); st3.mau.PLII = [];
  const xt4 = S.xemTruoc(st3, [{ ...rowTD({ nam: 2026, goi: 'G1', ds: [{ ma: 'HM999', heSo: 1 }] }), STT: 'TD-9' }], { namKH: 2026 });
  xt4.items[0].vt.kl = 2;
  S.apDung(st3, xt4.items, { namKH: 2026 });
  eq(st3.viTri.find((x) => x.nguon?.ks === 'thay_den#TD-9').chiTiet, [], 'mã KS chọn không có trong danh mục → không gán (thay đèn chưa có quy tắc mặc định)');

  // Đẩy sang KS: loaiHM 3 cột, có nhóm, ẩn _cg, ≤ 5000 dòng
  const st4 = kho(); Object.assign(st4.catalog, CAT);
  const lh = S.tomTat(st4, 2026).loaiHM;
  eq(lh.every((r) => r.length === 3), true, 'loaiHM đủ 3 cột');
  ok(lh.some((r) => r[0] === 'thay_den' && r[1] === 'HM186' && r[2] === 'Thay bộ đèn'), 'loaiHM có nhóm');
  eq(lh.filter((r) => /_cg$/.test(r[1])).length, 0, 'không đẩy mã _cg');
  eq(lh.filter((r) => r[0] === 'thay_tru' && r[2] === 'Theo mẫu đã khai').map((r) => r[1]), ['HM210', 'HM214'], 'mã theo mẫu vẫn có, nhóm riêng');
}

// ---------- 12. Trình Sở / KL Trung tâm (doc 05 H1, H2, H6, H8) ----------
{
  eq([S.docKenh('Trình Sở'), S.docKenh('trinh so'), S.docKenh('TRÌNH SỞ'.normalize('NFD')), S.docKenh(' Không trình Sở '), S.docKenh('1'), S.docKenh('')],
    ['TS', 'TS', 'TS', 'TT', null, null], 'H1: đọc cột Trình Sở bỏ dấu/hoa thường; giá trị lạ / trống = chưa phân loại');
  const st = kho();
  // H1: 3 nhóm; chưa phân loại không tự vào đâu
  const rows = [TRU({ STT: 'A1' }), TRU({ STT: 'A2', 'Tuyến đường': 'Hai Bà Trưng', 'Trình Sở': 'Không trình Sở' }), TRU({ STT: 'A3', 'Tuyến đường': 'Pasteur', 'Trình Sở': '' })];
  const xt = S.xemTruoc(st, rows, { namKH: 2026 });
  const by = Object.fromEntries(xt.items.map((i) => [i.stt, i]));
  eq([by.A1.kenh, by.A2.kenh, by.A3.kenh], ['TS', 'TT', null], 'H1: kênh từng bản');
  eq([by.A1.chon, by.A2.chon, by.A3.chon], [true, true, false], 'chưa phân loại: mặc định không chọn');
  eq([xt.dem.TS, xt.dem.TT, xt.dem.chuaPL], [1, 1, 1], 'đếm theo kênh');
  by.A3.chon = true;
  const kq = S.apDung(st, xt.items, { namKH: 2026 });
  eq([kq.them, kq.chuaPL], [2, 1], 'chưa phân loại chọn mà chưa đặt kênh → bỏ qua, báo số');
  const plTS = st.phuLuc.find((p) => p.nhap && p.loai === 'PLIII' && K.kenhPL(p) === 'TS'), plTT = st.phuLuc.find((p) => p.nhap && p.loai === 'PLIII' && K.kenhPL(p) === 'TT');
  ok(plTS && plTT && plTS.id !== plTT.id, 'H2: 2 phụ lục nháp tách theo kênh');
  eq(plTS.kenh, undefined, 'phụ lục TS không ghi trường kenh (dữ liệu cũ đọc là TS)');
  // Văn phòng đặt kênh cho bản chưa phân loại
  const xt3 = S.xemTruoc(st, [rows[2]], { namKH: 2026 });
  xt3.items[0].chon = true;
  S.apDung(st, xt3.items, { namKH: 2026, chonKenh: { [xt3.items[0].key]: 'TT' } });
  const v3 = st.viTri.find((v) => v.nguon?.ks === 'thay_tru#A3');
  eq([v3.plId, v3.kenhTay], [plTT.id, 'TT'], 'Đặt TT → vào nháp TT, lưu kenhTay');
  // Đổi TS → TT khi đang nháp → chuyển phụ lục, đánh lại stt
  const v1 = st.viTri.find((v) => v.nguon?.ks === 'thay_tru#A1');
  S.apDung(st, S.xemTruoc(st, [TRU({ STT: 'A1', 'Trình Sở': 'Không trình Sở' })], { namKH: 2026 }).items, { namKH: 2026 });
  eq(v1.plId, plTT.id, 'H2: KS đổi TS→TT, vị trí nháp chưa thực hiện → sang nháp TT');
  eq(st.viTri.filter((v) => v.plId === plTT.id).map((v) => v.stt), [1, 2, 3], 'stt nháp TT đánh lại liền');
  eq(st.viTri.filter((v) => v.plId === plTS.id).length, 0, 'nháp TS không còn vị trí');
  // kenhTay thắng: KS đổi A3 sang TS → chỉ gắn nhãn
  S.apDung(st, S.xemTruoc(st, [TRU({ STT: 'A3', 'Tuyến đường': 'Pasteur', 'Trình Sở': 'Trình Sở' })], { namKH: 2026 }).items, { namKH: 2026 });
  eq([v3.plId, v3.nguon.doiTrinhSo], [plTT.id, { tu: 'TT', sang: 'TS' }], 'văn phòng đã đặt kênh → KS đổi chỉ gắn nhãn');
  ok(/KS đổi/.test(S.lyDoChan(st, v3)), 'nhãn đổi kênh chặn chuyển đợt cho tới khi xem lại');
  S.datKenh(st, [v3.id], 'TT');
  eq(v3.nguon.doiTrinhSo, undefined, 'đặt lại kênh tay → bỏ nhãn');
  // Đã vào đợt thật: đổi kênh chỉ gắn nhãn
  const v2 = st.viTri.find((v) => v.nguon?.ks === 'thay_tru#A2');
  S.chuyenNhap(st, [v2.id], { dot: 'Đợt 9' });
  const plDot = st.phuLuc.find((p) => p.id === v2.plId);
  eq([plDot.nhap, K.kenhPL(plDot), /KL TT/.test(plDot.sheet)], [false, 'TT', true], 'chuyển đợt giữ kênh TT, không cần xác nhận thuộc Sở');
  S.apDung(st, S.xemTruoc(st, [TRU({ STT: 'A2', 'Tuyến đường': 'Hai Bà Trưng', 'Trình Sở': 'Trình Sở' })], { namKH: 2026 }).items.map((i) => ({ ...i, chon: true })), { namKH: 2026 });
  eq([v2.plId, v2.nguon.doiTrinhSo], [plDot.id, { tu: 'TT', sang: 'TS' }], 'đã vào đợt → chỉ gắn nhãn');
  // Đã thực hiện: gắn nhãn, giữ KL
  v1.trangThai = 'da';
  S.apDung(st, S.xemTruoc(st, [TRU({ STT: 'A1', 'Trình Sở': 'Trình Sở', 'Số lượng': 9 })], { namKH: 2026 }).items.map((i) => ({ ...i, chon: true })), { namKH: 2026 });
  eq([v1.plId, v1.kl, v1.nguon.doiTrinhSo, v1.nguon.doiSauTH], [plTT.id, 6, { tu: 'TT', sang: 'TS' }, true], 'đã thực hiện → giữ KL, gắn nhãn');
  // Vỏ tủ: luôn TT, không đặt TS được
  const xv = S.xemTruoc(st, [{ _type: 'vo_tu', STT: 'VT-9', 'Tuyến đường': 'A', Phường: 'Bàn Cờ', 'Tủ điều khiển': 'T', 'Số lượng': 1 }], { namKH: 2026 });
  eq([xv.items[0].kenh, xv.items[0].chon], ['TT', true], 'vỏ tủ bản cũ trống → TT, không rơi vào chưa phân loại');
  S.apDung(st, xv.items, { namKH: 2026 });
  const vv = st.viTri.find((v) => v.nguon?.ks === 'vo_tu#VT-9');
  eq(S.datKenh(st, [vv.id], 'TS').boQua.length, 1, 'vỏ tủ không đặt TS được');
  // HPS + Trình Sở ở tăng cường KC xa → chưa phân loại kèm lý do
  const hp = S.anhXa({ _type: 'tc_den_kc_xa', 'Trình Sở': 'Trình Sở', STT: 'TDX-1', 'Tuyến đường': 'A', Phường: 'B', 'Tủ điều khiển': 'T', 'Chủng loại đèn': 'HPS 150W', 'Số lượng': 2 });
  eq([hp.dich, hp.kenh, /LED/.test(hp.kenhLoi)], ['TANGCUONG', null, true], 'HPS trình Sở → không vào PL tăng cường LED');
  eq(S.anhXa({ _type: 'tc_den_kc_xa', 'Trình Sở': 'Trình Sở', STT: 'TDX-2', 'Tuyến đường': 'A', Phường: 'B', 'Tủ điều khiển': 'T', 'Chủng loại đèn': 'LED 120W', 'Số lượng': 2 }).kenh, 'TS', 'LED trình Sở → TS');
}
// TS và TT trùng vị trí: không báo trùng, không khớp chéo; khTS + khTT = kh
{
  const st = kho();
  st.phuLuc.push({ id: 'plTT', loai: 'PLIII', kenh: 'TT', sheet: 'Biểu TT', file: 'b.xlsx', namKH: 2026, dot: 'Đợt 1', nhom: ['Nhiêu Lộc'] });
  st.viTri.push({ id: 'w1', plId: 'plTT', stt: 1, tram: 'TĐK LVS-01', phuong: 'Phường Nhiêu Lộc', tuyen: 'Lê Văn Sỹ', nhom: 'Nhiêu Lộc', kl: 4, goi: 'G1', donVi: '',
    chiTiet: [{ ma: 'HM210', kl: 4 }], trangThai: 'chua' });
  const r = (kenh) => TRU({ STT: 'B-' + kenh, 'Tuyến đường': 'Lê Văn Sỹ', Phường: 'Nhiêu Lộc', 'Tủ điều khiển': 'TĐK LVS-01', 'Trình Sở': kenh });
  const xt = S.xemTruoc(st, [r('Trình Sở'), r('Không trình Sở')], { namKH: 2026 });
  eq(xt.items.map((i) => i.trangThai), ['trungPL', 'trungPL'], 'cùng kênh trùng vị trí → báo trùng (TS: v1, TT: w1)');
  const st2 = kho();
  const xt2 = S.xemTruoc(st2, [r('Không trình Sở')], { namKH: 2026 });
  eq(xt2.items[0].trangThai, 'moi', 'TT trùng vị trí phụ lục TS → không báo trùng');
  const kh = K.khopThucHien(st, { loai: 'PLIII', viTri: [{ tram: 'TĐK LVS-01', phuong: 'Phường Nhiêu Lộc', tuyen: 'Lê Văn Sỹ', kl: 3 }] }, '2026-10', { apply: false });
  eq(kh.khop.map((k) => k.id), ['v1'], 'BBNT (TS) chỉ khớp phụ lục TS');
  const khT = K.khopThucHien(st, { loai: 'PLIII', kenh: 'TT', viTri: [{ tram: 'TĐK LVS-01', phuong: 'Phường Nhiêu Lộc', tuyen: 'Lê Văn Sỹ', kl: 3 }] }, '2026-10', { apply: false });
  eq(khT.khop.map((k) => k.id), ['w1'], 'kênh TT chỉ khớp phụ lục TT');
  const d = K.doiChieu(st, 'G1', 2026).rows.find((x) => x.ma === 'HM210');
  eq([d.kh, d.khTS, d.khTT, d.khTS + d.khTT === d.kh], [9, 5, 4, true], 'H8: khTS + khTT = tổng Đã vào KH');
}
// H6: cột "không có trong KH" tự đánh cho vị trí từ KS; file giữ nguyên; văn phòng bật/tắt
{
  const st = kho();
  st.catalog.HM210.goi.G1.kl[2026] = 10;   // HĐ còn lại = 10 − 5 (v1, v2) = 5
  const rows = [TRU({ STT: 'C1', 'Số lượng': 3 }), TRU({ STT: 'C2', 'Tuyến đường': 'Hai Bà Trưng', 'Số lượng': 3 })];
  S.apDung(st, S.xemTruoc(st, rows, { namKH: 2026 }).items, { namKH: 2026 });
  const pl = st.phuLuc.find((p) => p.nhap);
  const ids = st.viTri.filter((v) => v.plId === pl.id).map((v) => v.id);
  const m = K.ngoaiKHCua(st, pl);
  eq(ids.map((id) => m.get(id)), ['', 'X'], 'cộng dồn 3 rồi 6 > còn lại 5 → dòng thứ 2 đánh X');
  K.datNgoaiKH(st, ids[1], false);
  eq(K.ngoaiKHCua(st, pl).get(ids[1]), '', 'văn phòng tắt X');
  K.datNgoaiKH(st, ids[1], null);
  eq(K.ngoaiKHCua(st, pl).get(ids[1]), 'X', 'về tự động');
  st.viTri.find((v) => v.id === 'v1').klNgoaiKH = 'X'; st.viTri.find((v) => v.id === 'v1').ngoaiKH = 'file';
  eq(K.ngoaiKHCua(st, st.phuLuc.find((p) => p.id === 'pl1')).get('v1'), 'X', 'vị trí từ file giữ đúng X của file');
}

console.log(`\nks.test: ${pass} đạt, ${fail} lỗi`);
if (fail) process.exit(1);
