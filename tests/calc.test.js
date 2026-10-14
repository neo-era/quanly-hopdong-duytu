// tests/calc.test.js — test runner tối giản, chạy bằng: node tests/calc.test.js
import * as C from '../js/calc.js';

let pass = 0, fail = 0;
function eq(got, want, msg) {
  const g = JSON.stringify(got), w = JSON.stringify(want);
  if (g === w) { pass++; }
  else { fail++; console.error(`✗ ${msg}\n    nhận: ${g}\n    mong: ${w}`); }
}
function approx(got, want, msg, eps = 0.01) {
  if (got !== null && Math.abs(got - want) < eps) { pass++; }
  else { fail++; console.error(`✗ ${msg}\n    nhận: ${got}\n    mong: ${want}`); }
}

const TODAY = '2026-10-14';

// --- num ---
eq(C.num(''), 0, 'num rỗng = 0');
eq(C.num(null), 0, 'num null = 0');
eq(C.num('1234567'), 1234567, 'num chuỗi số sạch'); // dữ liệu lưu luôn là số, không phân cách
eq(C.num(-5), -5, 'num số âm');
eq(C.num('abc'), 0, 'num chữ = 0');

// --- soNgayConLai / phân loại cảnh báo ---
eq(C.soNgayConLai('2026-10-14', TODAY), 0, 'cùng ngày = 0');
eq(C.soNgayConLai('2026-10-05', TODAY), -9, 'quá 9 ngày');
eq(C.soNgayConLai('2026-12-31', TODAY), 78, 'còn 78 ngày');
eq(C.phanLoaiCanhBao('2026-10-05', TODAY).loai, 'quahan', 'mốc 05/10 là quá hạn');
eq(C.phanLoaiCanhBao('2026-10-20', TODAY).loai, 'le7', 'còn 6 ngày -> le7');
eq(C.phanLoaiCanhBao('2026-10-24', TODAY).loai, 'le15', 'còn 10 ngày -> le15');
eq(C.phanLoaiCanhBao('2026-11-05', TODAY).loai, 'le30', 'còn 22 ngày -> le30');
eq(C.phanLoaiCanhBao('2026-12-31', TODAY).loai, 'xa', 'còn 78 ngày -> xa');
eq(C.phanLoaiCanhBao('2026-10-01', TODAY, true).loai, 'xong', 'done -> xong dù quá hạn');
eq(C.phanLoaiCanhBao('', TODAY).loai, 'khonghan', 'không hạn');

// --- HĐ mẫu đối chiếu (số từ hồ sơ thật, rút gọn) ---
// Gói 2: trần 2026 = 39,8 tỷ; NT luỹ kế 18,7 tỷ; đã TT 16,8 tỷ -> công nợ 1,9 tỷ
const g2 = {
  id: 'G2', soHD: 'G2', giaTri: 39_800_000_000,
  kyThanhToan: [
    { ky: '2026-08', giaTriNT: 9_000_000_000, daThanhToan: 9_000_000_000 },
    { ky: '2026-09', giaTriNT: 9_325_230_000, daThanhToan: 7_800_000_000 },
    { ky: '2026-10', giaTriNT: 374_770_000, daThanhToan: 0 },
  ],
  khoiLuong: {
    duToanDuyet: { giaTri: 39_800_000_000 },
    keHoach: [ { ky: '2026', giaTri: 39_800_000_000 } ],
  },
};
approx(C.tongNghiemThu(g2), 18_700_000_000, 'G2 nghiệm thu luỹ kế = 18,7 tỷ');
approx(C.tongDaThanhToan(g2), 16_800_000_000, 'G2 đã TT = 16,8 tỷ');
approx(C.congNo(g2), 1_900_000_000, 'G2 công nợ = 1,9 tỷ');
approx(C.phanTramGiaiNgan(g2), 42.21, 'G2 % giải ngân ≈ 42,2%', 0.1);
approx(C.roomTran(g2), 21_100_000_000, 'G2 room trần = 21,1 tỷ');

// Ca xấu: giá trị HĐ = 0 -> % giải ngân null, không vỡ
eq(C.phanTramGiaiNgan({ giaTri: 0, kyThanhToan: [] }), null, 'giá trị 0 -> % null');
eq(C.roomTran({ khoiLuong: {} }), null, 'chưa có trần -> room null');
eq(C.congNo({}), 0, 'HĐ rỗng -> công nợ 0');

// Ca xấu: đã TT > nghiệm thu (tạm ứng vượt) -> công nợ không âm
eq(C.congNo({ kyThanhToan: [{ giaTriNT: 100, daThanhToan: 150 }] }), 0, 'TT vượt NT -> công nợ 0');

// --- ngày sai ---
eq(C.ngaySai({ ngayHieuLuc: '2026-01-01', ngayKetThuc: '2025-12-31' }), true, 'kết thúc < hiệu lực -> sai');
eq(C.ngaySai({ ngayHieuLuc: '2026-01-01', ngayKetThuc: '2029-12-31' }), false, 'ngày hợp lệ');

// --- gom cảnh báo + dashboard ---
const data = {
  contracts: [
    {
      ...g2,
      tenGoi: 'Gói 2',
      mocThoiGian: [
        { ten: 'NT T10', han: '2026-11-05', trangThai: 'dang' },     // le30
        { ten: 'Mốc cũ xong', han: '2026-01-01', trangThai: 'xong' }, // bỏ qua
      ],
      nghiaVu: [
        { ten: 'Điều 16', han: '2026-12-31', mucPhat: '1% HĐ', trangThaiTuanThu: 'dang' }, // xa -> bỏ
      ],
      phuLuc: [
        { noiDung: 'PL Nhóm B', ngayHan: '2026-10-26', trangThaiHoSo: 'dangtrinh' }, // le15
      ],
    },
    {
      id: 'G3', soHD: 'G3', tenGoi: 'Gói 3', giaTri: 35_200_000_000,
      kyThanhToan: [{ ky: '2026-09', giaTriNT: 11_600_000_000, daThanhToan: 9_200_000_000 }],
      mocThoiGian: [{ ten: 'HS NT T9', han: '2026-10-05', trangThai: 'dang' }], // quahan
      khoiLuong: { duToanDuyet: { giaTri: 35_200_000_000 }, keHoach: [{ ky: '2026', giaTri: 35_200_000_000 }] },
    },
  ],
};
const cb = C.gomCanhBao(data, TODAY);
eq(cb.length, 3, 'gom đúng 3 cảnh báo (2 mốc + 1 phụ lục; nghĩa vụ xa & mốc xong bị loại)');
eq(cb[0].loai, 'quahan', 'cảnh báo gấp nhất xếp đầu = quá hạn (HS NT T9)');
eq(cb[0].ten, 'HS NT T9', 'đầu danh sách đúng mốc quá hạn');

const db = C.tongHopDashboard(data, TODAY, 2026);
eq(db.soHD, 2, 'dashboard: 2 HĐ');
eq(db.quaHan, 1, 'dashboard: 1 quá hạn');
eq(db.sapDenHan, 2, 'dashboard: 2 sắp đến hạn');
approx(db.tongCongNo, 1_900_000_000 + 2_400_000_000, 'dashboard: tổng công nợ = 4,3 tỷ');
approx(db.tranNam, 75_000_000_000, 'dashboard: trần 2026 = 75 tỷ');
approx(db.ntNam, 30_300_000_000, 'dashboard: NT 2026 = 30,3 tỷ');

// --- định dạng ---
eq(C.dinhDangTien(39_800_000_000), '39,8 tỷ', 'định dạng tỷ');
eq(C.dinhDangTien(374_770_000), '374,8 tr', 'định dạng triệu');
eq(C.dinhDangNgay('2026-12-31'), '31/12/2026', 'định dạng ngày');
eq(C.dinhDangNgay(''), '—', 'ngày rỗng -> gạch');

console.log(`\n${fail === 0 ? '✓ TẤT CẢ' : '✗'} ${pass} pass, ${fail} fail`);
process.exit(fail === 0 ? 0 : 1);
