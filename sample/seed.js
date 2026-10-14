// sample/seed.js — Dữ liệu mẫu (demo) dùng khi chưa có file trên Drive hoặc bấm "Nạp dữ liệu mẫu".
// Số liệu rút gọn từ hồ sơ thật CSKVTT để minh hoạ; anh thay bằng dữ liệu thật trong app.
export const SEED = {
  version: 1,
  updatedAt: '2026-10-14T00:00:00+07:00',
  contracts: [
    {
      id: 'g1',
      soHD: '—/2026/HĐ-TTHTGT',
      tenGoi: 'Gói 1 — Phi tư vấn CSKVTT',
      benA: 'Trung tâm Quản lý Hạ tầng Giao thông Đường bộ (Sở Xây dựng TP.HCM)',
      loaiHD: 'goi-duy-tu',
      giaTri: 392_698_705_677,
      ngayHieuLuc: '2026-01-01',
      ngayKetThuc: '2029-12-31',
      ghiChu: 'HĐ dịch vụ công ích 4 năm 2026–2029.',
      mocThoiGian: [
        { id: 'g1m1', ten: 'Hồ sơ nghiệm thu T10/2026', han: '2026-11-05', trangThai: 'dang', ghiChu: 'Nộp trước ngày 05 tháng kế tiếp' },
      ],
      kyThanhToan: [
        { id: 'g1k1', ky: '2026-07', mocHoSo: '2026-08-05', giaTriNT: 5_400_000_000, daThanhToan: 5_400_000_000 },
        { id: 'g1k2', ky: '2026-08', mocHoSo: '2026-09-05', giaTriNT: 5_600_000_000, daThanhToan: 5_600_000_000 },
        { id: 'g1k3', ky: '2026-09', mocHoSo: '2026-10-05', giaTriNT: 5_000_000_000, daThanhToan: 1_900_000_000 },
      ],
      phuLuc: [],
      nghiaVu: [
        { id: 'g1n1', ten: 'Điều 16 — Đầu tư/thuê công nghệ mới (CNTT)', canCu: 'Điều 16 HĐ', mucPhat: '1,0% giá trị HĐ', han: '2026-12-31', trangThaiTuanThu: 'ruiro', ghiChu: 'Chưa hoàn tất hồ sơ CNTT' },
      ],
      khoiLuong: {
        duToanDuyet: { tongKL: 0, giaTri: 392_698_705_677 },
        keHoach: [
          { ky: '2026', KL: 0, giaTri: 42_100_000_000, thucHien: 16_000_000_000 },
          { ky: '2027', KL: 0, giaTri: 118_000_000_000, thucHien: 0 },
        ],
        dieuChinh: [
          { noiDung: 'KL bổ sung do dư vốn — đất công', nhom: 2, giaTri: 1_200_000_000, trangThai: 'dexuat' },
        ],
      },
    },
    {
      id: 'g2',
      soHD: '—/2026/HĐ-TTHTGT',
      tenGoi: 'Gói 2 — Phi tư vấn (Q1, 10…)',
      benA: 'Trung tâm Quản lý Hạ tầng Giao thông Đường bộ (Sở Xây dựng TP.HCM)',
      loaiHD: 'goi-duy-tu',
      giaTri: 380_000_000_000,
      ngayHieuLuc: '2026-01-01',
      ngayKetThuc: '2029-12-31',
      ghiChu: 'Dự toán thi công T10/2026 đã lập, chờ ký.',
      mocThoiGian: [
        { id: 'g2m1', ten: 'Ký dự toán nghiệm thu T10/2026', han: '2026-11-05', trangThai: 'dang', ghiChu: 'Giá trị tháng ≈ 374,77 triệu' },
      ],
      kyThanhToan: [
        { id: 'g2k1', ky: '2026-08', mocHoSo: '2026-09-05', giaTriNT: 9_000_000_000, daThanhToan: 9_000_000_000 },
        { id: 'g2k2', ky: '2026-09', mocHoSo: '2026-10-05', giaTriNT: 9_325_230_000, daThanhToan: 7_800_000_000 },
        { id: 'g2k3', ky: '2026-10', mocHoSo: '2026-11-05', giaTriNT: 374_770_000, daThanhToan: 0 },
      ],
      phuLuc: [
        { id: 'g2p1', viTri: 'Nhiều vị trí đất công', noiDung: 'Phụ lục KL phát sinh Nhóm B (đất công ngoài HĐ)', giaTri: 1_900_000_000, nhom: 'B', trangThaiHoSo: 'dangtrinh', ngayTrinh: '', ngayDuyet: '', ngayHan: '2026-10-26', tinhTrangTT: 'chua' },
      ],
      nghiaVu: [
        { id: 'g2n1', ten: 'SLA xử lý sự cố 4 mức', canCu: 'Phụ lục SLA', mucPhat: 'Theo mức', han: '', trangThaiTuanThu: 'dang', ghiChu: '' },
      ],
      khoiLuong: {
        duToanDuyet: { tongKL: 0, giaTri: 380_000_000_000 },
        keHoach: [ { ky: '2026', KL: 0, giaTri: 39_800_000_000, thucHien: 18_700_000_000 } ],
        dieuChinh: [],
      },
    },
    {
      id: 'g3',
      soHD: '—/2026/HĐ-TTHTGT',
      tenGoi: 'Gói 3 — Phi tư vấn',
      benA: 'Trung tâm Quản lý Hạ tầng Giao thông Đường bộ (Sở Xây dựng TP.HCM)',
      loaiHD: 'goi-duy-tu',
      giaTri: 330_000_000_000,
      ngayHieuLuc: '2026-01-01',
      ngayKetThuc: '2029-12-31',
      ghiChu: 'Chậm hồ sơ nghiệm thu tháng 9.',
      mocThoiGian: [
        { id: 'g3m1', ten: 'Hồ sơ nghiệm thu T9/2026', han: '2026-10-05', trangThai: 'dang', ghiChu: 'Chưa trình Trung tâm' },
      ],
      kyThanhToan: [
        { id: 'g3k1', ky: '2026-08', mocHoSo: '2026-09-05', giaTriNT: 6_000_000_000, daThanhToan: 6_000_000_000 },
        { id: 'g3k2', ky: '2026-09', mocHoSo: '2026-10-05', giaTriNT: 5_600_000_000, daThanhToan: 3_200_000_000 },
      ],
      phuLuc: [],
      nghiaVu: [],
      khoiLuong: {
        duToanDuyet: { tongKL: 0, giaTri: 330_000_000_000 },
        keHoach: [ { ky: '2026', KL: 0, giaTri: 35_200_000_000, thucHien: 11_600_000_000 } ],
        dieuChinh: [],
      },
    },
    {
      id: 'g4',
      soHD: '—/2026/HĐ-TTHTGT',
      tenGoi: 'Gói 4 — Phi tư vấn',
      benA: 'Trung tâm Quản lý Hạ tầng Giao thông Đường bộ (Sở Xây dựng TP.HCM)',
      loaiHD: 'goi-duy-tu',
      giaTri: 300_000_000_000,
      ngayHieuLuc: '2026-01-01',
      ngayKetThuc: '2029-12-31',
      ghiChu: '',
      mocThoiGian: [
        { id: 'g4m1', ten: 'Chốt đo đạc độc lập HPS→LED', han: '2026-11-11', trangThai: 'dang', ghiChu: 'Trước quyết toán' },
      ],
      kyThanhToan: [
        { id: 'g4k1', ky: '2026-08', mocHoSo: '2026-09-05', giaTriNT: 7_000_000_000, daThanhToan: 7_000_000_000 },
        { id: 'g4k2', ky: '2026-09', mocHoSo: '2026-10-05', giaTriNT: 7_000_000_000, daThanhToan: 5_500_000_000 },
      ],
      phuLuc: [],
      nghiaVu: [
        { id: 'g4n1', ten: 'Đo đạc độc lập hiệu suất HPS→LED', canCu: 'Điều khoản kỹ thuật', mucPhat: '', han: '2026-11-11', trangThaiTuanThu: 'dang', ghiChu: '' },
      ],
      khoiLuong: {
        duToanDuyet: { tongKL: 0, giaTri: 300_000_000_000 },
        keHoach: [ { ky: '2026', KL: 0, giaTri: 31_050_000_000, thucHien: 14_000_000_000 } ],
        dieuChinh: [],
      },
    },
    {
      id: 'lvt',
      soHD: '—/2026/HĐĐH-LVT',
      tenGoi: 'Đặt hàng phường Lê Văn Tám (Tân Định)',
      benA: 'UBND phường Tân Định',
      loaiHD: 'dat-hang-phuong',
      giaTri: 70_200_000,
      ngayHieuLuc: '2026-03-01',
      ngayKetThuc: '2026-09-30',
      ghiChu: 'Đã hoàn tất.',
      mocThoiGian: [],
      kyThanhToan: [ { id: 'lvtk1', ky: '2026-09', mocHoSo: '2026-10-05', giaTriNT: 70_200_000, daThanhToan: 70_200_000 } ],
      phuLuc: [], nghiaVu: [],
      khoiLuong: { duToanDuyet: { tongKL: 0, giaTri: 70_200_000 }, keHoach: [ { ky: '2026', KL: 0, giaTri: 70_200_000, thucHien: 70_200_000 } ], dieuChinh: [] },
    },
  ],
};
