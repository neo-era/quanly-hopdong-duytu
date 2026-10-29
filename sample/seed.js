// sample/seed.js — Dữ liệu khởi tạo: 04 hợp đồng duy tu chiếu sáng 2026–2029 THẬT (Sapulico là Bên B).
// Nguồn số liệu: bảng giá ký hợp đồng (bản chốt) từng gói + HĐ Gói 1 (HD va BG G1 2026_2029, Điều 3, 4, 15.7).
// Số HĐ Gói 2, 3, Thủ Đức lấy theo tên file HĐ đã ký trong thư mục "HD cac goi duy tu CS 2026-2029".
// Nghiệm thu – thanh toán – mốc: để trống, anh nhập theo hồ sơ thật.
// Với gói liên danh: Giá trị HĐ = toàn liên danh; trần dự toán + kế hoạch năm = PHẦN SAPULICO.
const BEN_A = 'Trung tâm Quản lý Giao thông và Hạ tầng kỹ thuật TP.HCM';
const kh = (nam) => ({
  duToanDuyet: { tongKL: 0, giaTri: Object.values(nam).reduce((a, b) => a + b, 0) },
  keHoach: Object.entries(nam).map(([ky, giaTri]) => ({ ky, KL: 0, giaTri, thucHien: 0 })),
  dieuChinh: [],
});
export const SEED = {
  version: 2,
  nguonDuLieu: 'hd-that-2026-10-29',
  updatedAt: '2026-10-29T18:00:00+07:00',
  contracts: [
    {
      id: 'hd-g1', soHD: 'HD2600158409_2607011503',
      tenGoi: 'Gói 1 — Khu vực Trung tâm (P. Sài Gòn, Tân Định, Bến Thành… Phú Thạnh)',
      benA: BEN_A, loaiHD: 'goi-duy-tu', giaTri: 373_085_620_257,
      ngayHieuLuc: '2026-07-01', ngayKetThuc: '2029-06-30',
      ghiChu: 'Mã gói thầu G101TT. Ký 01/7/2026; thực hiện 1096 ngày (01/7/2026–30/6/2029). HĐ theo đơn giá điều chỉnh. Sapulico thực hiện toàn bộ.',
      mocThoiGian: [], kyThanhToan: [], phuLuc: [],
      nghiaVu: [
        { id: 'hd-g1-nv1', ten: 'Trang bị máy móc công nghệ mới, số hoá đầy đủ (khoản 10.2 Điều 10 và Điều 16) trong 06 tháng kể từ HĐ có hiệu lực', canCu: 'Khoản 15.7 Điều 15', mucPhat: '1,0% giá trị HĐ', han: '2026-12-31', trangThaiTuanThu: 'dang', ghiChu: 'Anh cập nhật trạng thái thực tế.' },
      ],
      khoiLuong: kh({ 2026: 73_969_495_062, 2027: 113_311_831_891, 2028: 120_979_781_620, 2029: 64_824_511_684 }),
    },
    {
      id: 'hd-g2', soHD: 'HD2600157625',
      tenGoi: 'Gói 2 — P. Xóm Chiếu, Khánh Hội… và xã Bình Khánh, An Thới Đông, Cần Giờ, Thạnh An',
      benA: BEN_A, loaiHD: 'goi-duy-tu', giaTri: 498_533_365_649,
      ngayHieuLuc: '2026-07-01', ngayKetThuc: '',
      ghiChu: 'Mã gói thầu G201NA. Ký 01/7/2026. Liên danh Sapulico – CTCP Kỹ thuật điện Phú Thọ; phần Sapulico 488.346.802.785 đ (trần, kế hoạch năm theo phần Sapulico). Ngày kết thúc: chưa đối chiếu HĐ (bản scan).',
      mocThoiGian: [], kyThanhToan: [], phuLuc: [], nghiaVu: [],
      khoiLuong: kh({ 2026: 94_797_595_537, 2027: 148_938_304_203, 2028: 159_476_753_086, 2029: 85_134_149_959 }),
    },
    {
      id: 'hd-g3', soHD: 'HD2600158486',
      tenGoi: 'Gói 3 — P. Đông Hưng Thuận, Trung Mỹ Tây, Tân Thới Hiệp…',
      benA: BEN_A, loaiHD: 'goi-duy-tu', giaTri: 587_595_519_824,
      ngayHieuLuc: '2026-07-01', ngayKetThuc: '',
      ghiChu: 'Mã gói thầu G301TB. Ký 01/7/2026. Liên danh Sapulico – CTCP Cơ khí điện Lữ Gia; phần Sapulico 528.412.962.657 đ (trần, kế hoạch năm theo phần Sapulico). Ngày kết thúc: chưa đối chiếu HĐ (bản scan).',
      mocThoiGian: [], kyThanhToan: [], phuLuc: [], nghiaVu: [],
      khoiLuong: kh({ 2026: 115_355_397_647, 2027: 155_073_872_021, 2028: 167_347_066_890, 2029: 90_636_626_099 }),
    },
    {
      id: 'hd-g4', soHD: 'HD2600158596',
      tenGoi: 'Gói Thủ Đức — khu vực Thủ Đức trước sáp nhập',
      benA: BEN_A, loaiHD: 'goi-duy-tu', giaTri: 256_905_404_980,
      ngayHieuLuc: '2026-07-01', ngayKetThuc: '',
      ghiChu: 'Mã gói thầu: chưa có. Ký 01/7/2026. Liên danh Sapulico – CTCP Cơ khí điện Lữ Gia; phần Sapulico 128.300.705.356 đ (trần, kế hoạch năm theo phần Sapulico). Ngày kết thúc: chưa đối chiếu HĐ (bản scan).',
      mocThoiGian: [], kyThanhToan: [], phuLuc: [], nghiaVu: [],
      khoiLuong: kh({ 2026: 23_762_994_302, 2027: 38_965_273_533, 2028: 42_168_183_726, 2029: 23_404_253_795 }),
    },
  ],
};

/** Dữ liệu là bản DEMO cũ (version 1, 5 HĐ g1–g4 + lvt với giá trị giả 380/330/300 tỷ)? */
export function laDemoCu(d) {
  const by = Object.fromEntries((d?.contracts || []).map((c) => [c.id, c]));
  return !d?.nguonDuLieu && by.g2?.giaTri === 380_000_000_000 && by.g3?.giaTri === 330_000_000_000 && by.g4?.giaTri === 300_000_000_000;
}
