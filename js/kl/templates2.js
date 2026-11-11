// templates2.js — Mẫu phụ lục trình Sở đợt 21-09 (file "Tổng hợp KL 3 gói đề xuất SXD quý 3-4.2026", anh gửi 11/11/2026)
// + khuôn chung cho loại khảo sát chưa có mẫu riêng (doc 05_TrinhSo-KLTrungTam.md mục 1–2).
// Số La Mã KHÔNG cố định trong mẫu (đổi theo đợt) — export đánh số theo thứ tự khi xuất.
// kl2: cột KL thứ hai (Hạ ngầm: cáp md); sumCols: cột cộng thêm ở dòng phường + TỔNG CỘNG.
export const PL_TEMPLATES_2 = {
 "HANGAM": {
  "ten": "Phụ lục",
  "dvt": "trụ",
  "dvt2": "md",
  "kl": "H",
  "kl2": "G",
  "tien": "K",
  "donGia": 45000000,
  "cols": {
   "stt": "A",
   "tram": "B",
   "phuong": "C",
   "tuyen": "D",
   "lyTrinhDau": "E",
   "lyTrinhCuoi": "F",
   "kl2": "G",
   "kl": "H",
   "klNgoaiKH": "I",
   "ghiChu": "J"
  },
  "extra": {
   "goi": "L",
   "donVi": "M",
   "maQuan": "N"
  },
  "donGiaCell": "K4",
  "sumCols": [
   "G"
  ],
  "header": {
   "hdrRow": 4,
   "totRow": 8,
   "titleRow": 1,
   "tieuDeRow": 2,
   "congVanRow": 3,
   "totLabelCell": "A8",
   "cells": {
    "A1": "Phụ lục I",
    "A2": "DUY TRÌ HỆ THỐNG CHIẾU SÁNG ĐÔ THỊ - HẠ NGẦM CÁP NGẦM CHIẾU SÁNG.",
    "A3": " (Đính kèm Công văn số                /TTGTHTKT-CXCS1, ngày       tháng       năm 2026 của Trung tâm Quản lý Giao thông và Hạ tầng kỹ thuật thành phố Hồ Chí Minh)",
    "A4": "Stt",
    "B4": "Trạm đèn",
    "C4": "Phường-Xã",
    "D4": "Tuyến Đường",
    "E4": "Lý Trình",
    "G4": "Khối lượng thưc hiện Duy trì hệ thống chiếu sáng đô thị - Hạ ngầm dây cáp điện chiếu sáng.",
    "I4": "Khối lượng đề xuất không có trong kế hoạch bảo trì ",
    "J4": "Ghi Chú",
    "E5": "Điểm đầu",
    "F5": "Điểm cuối",
    "G5": "Cáp",
    "H5": "Trụ",
    "B7": "Đơn vị tính:",
    "G7": "(md)",
    "H7": "(trụ)"
   },
   "merges": [
    "D4:D6",
    "E5:E6",
    "A8:D8",
    "F5:F6",
    "E4:F4",
    "A4:A6",
    "B4:B6",
    "G5:G6",
    "A1:J1",
    "J4:J7",
    "C4:C6",
    "G4:H4",
    "H5:H6",
    "I4:I7",
    "A2:J2",
    "A3:J3"
   ],
   "widths": {
    "A": 5.6,
    "B": 24,
    "C": 14.3,
    "D": 23.7,
    "E": 27.9,
    "F": 23.6,
    "G": 15.9,
    "H": 18,
    "I": 14.7,
    "J": 16.3,
    "K": 18.4,
    "L": 12.9,
    "N": 11.3,
    "O": 16.3,
    "P": 9,
    "HU": 4.6,
    "HV": 29.3,
    "HW": 16.6
   },
   "heights": {
    "1": 21,
    "2": 30,
    "3": 45,
    "4": 75,
    "5": 24.75,
    "6": 11.25,
    "7": 18,
    "8": 18
   },
   "fTitle": [
    "Times New Roman",
    15,
    true,
    false
   ],
   "fHdr": [
    "Times New Roman",
    13,
    true,
    false
   ],
   "fData": [
    "Times New Roman",
    13,
    false,
    false
   ]
  }
 },
 "HPS_AN": {
  "ten": "Phụ lục",
  "dvt": "bộ",
  "kl": "G",
  "tien": "M",
  "donGia": 1900000,
  "cols": {
   "stt": "A",
   "tram": "B",
   "phuong": "C",
   "tuyen": "D",
   "lyTrinhDau": "E",
   "lyTrinhCuoi": "F",
   "kl": "G",
   "congSuat": "H",
   "ltbTT": "I",
   "etb": "J",
   "klNgoaiKH": "K",
   "ghiChu": "L"
  },
  "extra": {
   "goi": "N",
   "donVi": "O",
   "maQuan": "P"
  },
  "donGiaCell": "M6",
  "sumCols": [],
  "header": {
   "hdrRow": 5,
   "totRow": 8,
   "titleRow": 1,
   "tieuDeRow": 2,
   "congVanRow": 3,
   "totLabelCell": "A8",
   "cells": {
    "A1": "Phụ lục V",
    "A2": "DUY TRÌ HỆ THỐNG CHIẾU SÁNG ĐÔ THỊ - SỬ DỤNG ĐÈN HPS (VẬT TƯ THU HỒI) TĂNG CƯỜNG ÁNH SÁNG ĐẢM BẢO AN NINH CHO KHU VỰC.",
    "A3": " (Đính kèm Công văn số            /TTGTHTKT-CXCS1, ngày       tháng       năm 2026 của Trung tâm Quản lý Giao thông và Hạ tầng kỹ thuật thành phố Hồ Chí Minh)",
    "A4": "ĐÈN HPS:",
    "A5": "Stt",
    "B5": "Trạm đèn dự kiến đấu nối",
    "C5": "Phường-Xã",
    "D5": "Tuyến Đường",
    "E5": "Lý Trình",
    "G5": "Khối lượng Duy trì hệ thống chiếu sáng đô thị - sử dụng đèn HPS (vật tư thu hồi) tăng cường ánh sáng đảm bảo anh ninh cho khu vực.",
    "K5": "Khối lượng đề xuất không có trong kế hoạch bảo trì ",
    "L5": "Ghi chú",
    "E6": "Điểm đầu",
    "F6": "Điểm cuối",
    "G6": "Đèn HPS",
    "H6": "Công suất dự kiến",
    "I6": "Ltb tính toán",
    "J6": "Etb tính toán",
    "B7": "Đơn vị tính:",
    "G7": "(bộ)",
    "H7": "(W)",
    "I7": "(cd/m2)",
    "J7": "(lx)"
   },
   "merges": [
    "A5:A6",
    "A2:L2",
    "B5:B6",
    "A8:C8",
    "A1:L1",
    "E5:F5",
    "C5:C6",
    "A3:L3",
    "D5:D6",
    "G5:J5",
    "K5:K6",
    "A4:L4",
    "L5:L6"
   ],
   "widths": {
    "A": 5.1,
    "B": 25.3,
    "C": 12.9,
    "D": 27.7,
    "E": 14.9,
    "F": 12.1,
    "G": 11,
    "H": 9.3,
    "I": 10.3,
    "J": 9.9,
    "K": 11.3,
    "L": 16.7,
    "M": 15.7,
    "N": 9,
    "Q": 9
   },
   "heights": {
    "1": 24,
    "2": 45.75,
    "3": 34.5,
    "4": 28.5,
    "5": 72,
    "6": 57,
    "7": 21,
    "8": 18
   },
   "fTitle": [
    "Times New Roman",
    15,
    true,
    false
   ],
   "fHdr": [
    "Times New Roman",
    13,
    true,
    false
   ],
   "fData": [
    "Times New Roman",
    13,
    false,
    false
   ]
  }
 },
 "MYTHUAT": {
  "ten": "Phụ lục",
  "dvt": "bộ",
  "kl": "G",
  "tien": "J",
  "donGia": 40000000,
  "cols": {
   "stt": "A",
   "tram": "B",
   "phuong": "C",
   "tuyen": "D",
   "lyTrinhDau": "E",
   "lyTrinhCuoi": "F",
   "kl": "G",
   "klNgoaiKH": "H",
   "ghiChu": "I"
  },
  "extra": {
   "goi": "K",
   "donVi": "L",
   "maQuan": "M"
  },
  "donGiaCell": "J6",
  "sumCols": [],
  "header": {
   "hdrRow": 5,
   "totRow": 8,
   "titleRow": 1,
   "tieuDeRow": 2,
   "congVanRow": 3,
   "totLabelCell": "A8",
   "cells": {
    "A1": "Phụ lục VI",
    "A2": "DUY TRÌ HỆ THỐNG CHIẾU SÁNG ĐÔ THỊ - BỔ SUNG TĂNG CƯỜNG ĐÈN CHIẾU SÁNG MỸ THUẬT",
    "A3": " (Đính kèm Công văn số            /TTGTHTKT-CXCS1, ngày       tháng       năm 2026 của Trung tâm Quản lý Giao thông và Hạ tầng kỹ thuật thành phố Hồ Chí Minh)",
    "A4": "ĐÈN HPS:",
    "A5": "Stt",
    "B5": "Trạm đèn dự kiến đấu nối",
    "C5": "Phường-Xã",
    "D5": "Tuyến Đường",
    "E5": "Lý Trình",
    "G5": "Khối lượng Duy trì hệ thống chiếu sáng đô thị - Bổ sung tăng cường đèn chiếu sáng Mỹ Thuật",
    "H5": "Khối lượng đề xuất không có trong kế hoạch bảo trì ",
    "I5": "Ghi chú",
    "E6": "Điểm đầu",
    "F6": "Điểm cuối",
    "G6": "Lắp đặt bộ đèn pha hẹp RGB",
    "B7": "Đơn vị tính:",
    "G7": "(bộ)"
   },
   "merges": [
    "A5:A6",
    "H5:H6",
    "A2:I2",
    "A8:C8",
    "A1:I1",
    "E5:F5",
    "C5:C6",
    "A3:I3",
    "A4:I4",
    "B5:B6",
    "I5:I6",
    "D5:D6"
   ],
   "widths": {
    "A": 5.1,
    "B": 23.3,
    "C": 11.9,
    "D": 27.7,
    "E": 18.9,
    "F": 15.9,
    "G": 16.9,
    "H": 11.3,
    "I": 11.4,
    "J": 15.7,
    "K": 9,
    "N": 9
   },
   "heights": {
    "1": 24,
    "2": 45.75,
    "3": 34.5,
    "4": 28.5,
    "5": 120,
    "6": 57,
    "7": 21,
    "8": 18
   },
   "fTitle": [
    "Times New Roman",
    15,
    true,
    false
   ],
   "fHdr": [
    "Times New Roman",
    13,
    true,
    false
   ],
   "fData": [
    "Times New Roman",
    13,
    false,
    false
   ]
  }
 },
 "TANGCUONG": {
  "ten": "Phụ lục",
  "dvt": "bộ",
  "kl": "G",
  "tien": "M",
  "donGia": null,
  "cols": {
   "stt": "A",
   "tram": "B",
   "phuong": "C",
   "tuyen": "D",
   "lyTrinhDau": "E",
   "lyTrinhCuoi": "F",
   "kl": "G",
   "congSuat": "H",
   "ltbTT": "I",
   "etb": "J",
   "klNgoaiKH": "K",
   "ghiChu": "L"
  },
  "extra": {
   "goi": "N",
   "donVi": "O",
   "maQuan": "P"
  },
  "sumCols": [],
  "header": {
   "hdrRow": 5,
   "totRow": 8,
   "titleRow": 1,
   "tieuDeRow": 2,
   "congVanRow": 3,
   "totLabelCell": "A8",
   "cells": {
    "A1": "Phụ lục",
    "A2": "DUY TRÌ HỆ THỐNG CHIẾU SÁNG ĐÔ THỊ - TĂNG CƯỜNG HỆ THỐNG CHIẾU SÁNG BẰNG ĐÈN LED",
    "A3": " (Đính kèm Công văn số            /TTGTHTKT-CXCS1, ngày       tháng       năm 2026 của Trung tâm Quản lý Giao thông và Hạ tầng kỹ thuật thành phố Hồ Chí Minh)",
    "A4": "ĐÈN LED:",
    "A5": "Stt",
    "B5": "Trạm đèn dự kiến đấu nối",
    "C5": "Phường-Xã",
    "D5": "Tuyến Đường",
    "E5": "Lý Trình",
    "G5": "Khối lượng Duy trì hệ thống chiếu sáng đô thị - tăng cường hệ thống chiếu sáng bằng đèn LED",
    "K5": "Khối lượng đề xuất không có trong kế hoạch bảo trì ",
    "L5": "Ghi chú",
    "E6": "Điểm đầu",
    "F6": "Điểm cuối",
    "G6": "Đèn LED",
    "H6": "Công suất dự kiến",
    "I6": "Ltb tính toán",
    "J6": "Etb tính toán",
    "B7": "Đơn vị tính:",
    "G7": "(bộ)",
    "H7": "(W)",
    "I7": "(cd/m2)",
    "J7": "(lx)"
   },
   "merges": [
    "A5:A6",
    "A2:L2",
    "B5:B6",
    "A8:C8",
    "A1:L1",
    "E5:F5",
    "C5:C6",
    "A3:L3",
    "D5:D6",
    "G5:J5",
    "K5:K6",
    "A4:L4",
    "L5:L6"
   ],
   "widths": {
    "A": 5.1,
    "B": 25.3,
    "C": 12.9,
    "D": 27.7,
    "E": 14.9,
    "F": 12.1,
    "G": 11,
    "H": 9.3,
    "I": 10.3,
    "J": 9.9,
    "K": 11.3,
    "L": 16.7,
    "M": 15.7,
    "N": 9,
    "Q": 9
   },
   "heights": {
    "1": 24,
    "2": 45.75,
    "3": 34.5,
    "4": 28.5,
    "5": 72,
    "6": 57,
    "7": 21,
    "8": 18
   },
   "fTitle": [
    "Times New Roman",
    15,
    true,
    false
   ],
   "fHdr": [
    "Times New Roman",
    13,
    true,
    false
   ],
   "fData": [
    "Times New Roman",
    13,
    false,
    false
   ]
  }
 }
};

const DAU = { hdrRow: 4, totRow: 8, titleRow: 1, tieuDeRow: 2, congVanRow: 3, totLabelCell: 'A8',
  fTitle: ['Times New Roman', 15, true, false], fHdr: ['Times New Roman', 13, true, false], fData: ['Times New Roman', 13, false, false] };
const CONG_VAN = ' (Đính kèm Công văn số                /TTGTHTKT-CXCS1, ngày       tháng       năm 2026 của Trung tâm Quản lý Giao thông và Hạ tầng kỹ thuật thành phố Hồ Chí Minh)';

/** Khuôn chung theo khuôn 21-09: Stt · Trạm · Phường · Tuyến · Lý trình · KL · KL ngoài KH · Ghi chú (+ Gói/CSKV). */
export function khuonChung(tenHM, dvt, { hienHuu = null } = {}) {
  const coHH = !!hienHuu;
  const c = (a, b) => (coHH ? b : a);
  const cells = {
    A1: 'Phụ lục', A2: 'DUY TRÌ HỆ THỐNG CHIẾU SÁNG ĐÔ THỊ - ' + String(tenHM).toUpperCase(), A3: CONG_VAN,
    A4: 'Stt', B4: 'Trạm đèn', C4: 'Phường-Xã', D4: 'Tuyến Đường', E4: 'Lý Trình', E5: 'Điểm đầu', F5: 'Điểm cuối',
    [c('G4', 'I4')]: 'Khối lượng đề xuất Duy trì hệ thống chiếu sáng đô thị - ' + tenHM,
    [c('H4', 'J4')]: 'Khối lượng đề xuất không có trong kế hoạch bảo trì ', [c('I4', 'K4')]: 'Ghi Chú',
    B7: 'Đơn vị tính:', [c('G7', 'I7')]: '(' + dvt + ')',
  };
  if (coHH) { cells.G4 = hienHuu; cells.G5 = 'Hiện hữu'; cells.H5 = 'Năm lắp đặt'; cells.G7 = '(' + dvt + ')'; }
  const last = c('I', 'K');
  const merges = ['A1:' + last + '1', 'A2:' + last + '2', 'A3:' + last + '3', 'A4:A6', 'B4:B6', 'C4:C6', 'D4:D6', 'E4:F4', 'E5:E6', 'F5:F6',
    c('G4:G6', 'I4:I6'), c('H4:H7', 'J4:J7'), c('I4:I7', 'K4:K7'), 'A8:D8'].concat(coHH ? ['G4:H4', 'G5:G6', 'H5:H6'] : []);
  const widths = { A: 5.4, B: 30, C: 18, D: 32, E: 22, F: 22, G: 18, H: 18, I: coHH ? 18 : 16, J: 16, K: 16, L: 9, M: 9, N: 6 };
  const cols = { stt: 'A', tram: 'B', phuong: 'C', tuyen: 'D', lyTrinhDau: 'E', lyTrinhCuoi: 'F' };
  if (coHH) Object.assign(cols, { hienHuu: 'G', namLD: 'H', kl: 'I', klNgoaiKH: 'J', ghiChu: 'K' });
  else Object.assign(cols, { kl: 'G', klNgoaiKH: 'H', ghiChu: 'I' });
  return { ten: 'Phụ lục', dvt, kl: cols.kl, tien: c('J', 'L'), donGia: null, cols,
    extra: { goi: c('K', 'M'), donVi: c('L', 'N') }, sumCols: coHH ? ['G'] : [],
    header: { ...DAU, cells, merges, widths, heights: { 1: 21, 2: 45, 3: 30, 4: 30, 5: 30, 6: 30, 7: 16.5, 8: 18.75 } } };
}

/** Thay cáp nguồn ngầm (khuôn 21-09, chữ theo mẫu ẩn "THAY THẾ CÁP NGUỒN NGẦM"). */
export const TPL_CAPNGAM = khuonChung('thay thế cáp nguồn ngầm', 'md', { hienHuu: 'Cáp nguồn ngầm hiện hữu trên tuyến' });

/** Mẫu theo mã loại phụ lục. ksMap: KS_MAP (cho khuôn chung `KS:<loại khảo sát>`). */
import { PL_TEMPLATES } from './templates.js';
const _cache = new Map();
export function tplCua(loai, ksMap = {}) {
  if (PL_TEMPLATES[loai]) return PL_TEMPLATES[loai];
  if (PL_TEMPLATES_2[loai]) return PL_TEMPLATES_2[loai];
  if (loai === 'CAPNGAM') return TPL_CAPNGAM;
  if (/^KS:/.test(String(loai))) {
    const M = ksMap[loai.slice(3)];
    const k = loai + '|' + (M?.ten || '') + '|' + (M?.dvt || '');
    if (!_cache.has(k)) _cache.set(k, khuonChung(M?.tenHM || M?.ten || loai.slice(3), M?.dvt || ''));
    return _cache.get(k);
  }
  return null;
}
