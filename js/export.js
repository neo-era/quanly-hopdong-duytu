// export.js — Xuất toàn bộ dữ liệu ra file Excel (.xlsx) và nhập lại từ Excel/JSON.
// Dùng SheetJS tải từ CDN khi cần (chỉ khi bấm xuất/nhập).
import * as C from './calc.js';

let XLSXP = null;
function loadXLSX() {
  if (window.XLSX) return Promise.resolve(window.XLSX);
  if (XLSXP) return XLSXP;
  XLSXP = new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = './vendor/xlsx.full.min.js'; // đóng gói sẵn — xuất Excel được cả khi offline
    s.onload = () => resolve(window.XLSX);
    s.onerror = () => reject(new Error('Không tải được thư viện Excel.'));
    document.head.appendChild(s);
  });
  return XLSXP;
}

const LOAI = { 'goi-duy-tu': 'Gói duy tu', 'dat-hang-phuong': 'Đặt hàng phường', 'phu-luc': 'Phụ lục' };

export async function xuatExcel(data, today) {
  const XLSX = await loadXLSX();
  const wb = XLSX.utils.book_new();

  // 1) Tổng quan HĐ
  const s1 = [['Số HĐ', 'Tên gói/HĐ', 'Loại', 'Bên A', 'Giá trị HĐ', 'Hiệu lực', 'Kết thúc',
               'Trần 2026', 'NT luỹ kế', 'Đã TT luỹ kế', 'Công nợ', '% giải ngân']];
  for (const hd of data.contracts) {
    const tran2026 = (hd.khoiLuong?.keHoach || []).filter(k => String(k.ky).includes('2026')).reduce((s, k) => s + C.num(k.giaTri), 0);
    s1.push([hd.soHD, hd.tenGoi, LOAI[hd.loaiHD] || hd.loaiHD, hd.benA, C.num(hd.giaTri),
             hd.ngayHieuLuc, hd.ngayKetThuc, tran2026, C.tongNghiemThu(hd), C.tongDaThanhToan(hd),
             C.congNo(hd), C.phanTramGiaiNgan(hd)]);
  }
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(s1), 'Tổng quan HĐ');

  // 2) Kỳ nghiệm thu & thanh toán
  const s2 = [['Gói/HĐ', 'Kỳ', 'Mốc hồ sơ', 'Giá trị nghiệm thu', 'Đã thanh toán', 'Còn lại']];
  for (const hd of data.contracts)
    for (const k of hd.kyThanhToan || [])
      s2.push([hd.tenGoi, k.ky, k.mocHoSo, C.num(k.giaTriNT), C.num(k.daThanhToan), C.num(k.giaTriNT) - C.num(k.daThanhToan)]);
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(s2), 'Nghiem thu-Thanh toan');

  // 3) Phụ lục & KL phát sinh
  const s3 = [['Gói/HĐ', 'Vị trí', 'Nội dung', 'Nhóm (A/B/C)', 'Giá trị', 'Trạng thái HS', 'Ngày trình', 'Ngày duyệt', 'Hạn', 'Thanh toán']];
  for (const hd of data.contracts)
    for (const p of hd.phuLuc || [])
      s3.push([hd.tenGoi, p.viTri, p.noiDung, p.nhom, C.num(p.giaTri), p.trangThaiHoSo, p.ngayTrinh, p.ngayDuyet, p.ngayHan, p.tinhTrangTT]);
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(s3), 'Phu luc-KL phat sinh');

  // 4) Nghĩa vụ & rủi ro phạt
  const s4 = [['Gói/HĐ', 'Nghĩa vụ', 'Căn cứ', 'Mức phạt', 'Hạn', 'Trạng thái']];
  for (const hd of data.contracts)
    for (const n of hd.nghiaVu || [])
      s4.push([hd.tenGoi, n.ten, n.canCu, n.mucPhat, n.han, n.trangThaiTuanThu]);
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(s4), 'Nghia vu-Rui ro');

  // 5) Khối lượng 3 tầng
  const s5 = [['Gói/HĐ', 'Tầng', 'Kỳ/Nội dung', 'Nhóm', 'KL', 'Giá trị', 'Thực hiện']];
  for (const hd of data.contracts) {
    const dt = hd.khoiLuong?.duToanDuyet;
    if (dt) s5.push([hd.tenGoi, 'Dự toán duyệt (trần)', '', '', C.num(dt.tongKL), C.num(dt.giaTri), '']);
    for (const kh of hd.khoiLuong?.keHoach || [])
      s5.push([hd.tenGoi, 'Kế hoạch', kh.ky, '', C.num(kh.KL), C.num(kh.giaTri), C.num(kh.thucHien)]);
    for (const dc of hd.khoiLuong?.dieuChinh || [])
      s5.push([hd.tenGoi, 'Điều chỉnh bổ sung', dc.noiDung, 'Nhóm ' + dc.nhom, '', C.num(dc.giaTri), dc.trangThai]);
  }
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(s5), 'Khoi luong 3 tang');

  const stamp = (today || new Date().toISOString().slice(0, 10)).replace(/-/g, '');
  XLSX.writeFile(wb, `HopDongDuytu_${stamp}.xlsx`);
}

/** Xuất bản sao JSON (sao lưu/di chuyển). */
export function xuatJSON(data) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'hdduytu-data.json';
  a.click();
  URL.revokeObjectURL(a.href);
}

/** Nhập từ file JSON. Trả data đã kiểm tra; ném lỗi nếu sai định dạng. */
export async function nhapJSON(file) {
  const txt = await file.text();
  let obj;
  try { obj = JSON.parse(txt); } catch { throw new Error('File không phải JSON hợp lệ.'); }
  if (!obj || !Array.isArray(obj.contracts)) throw new Error('Thiếu mảng "contracts" — không đúng định dạng dữ liệu app.');
  return obj;
}
