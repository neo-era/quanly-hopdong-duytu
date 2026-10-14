// calc.js — Module tính toán thuần, không phụ thuộc DOM/mạng. Test độc lập được.
// Mọi tiền tệ: đơn vị đồng (VND). Mọi ngày: chuỗi ISO 'YYYY-MM-DD'.

/** Chuẩn hoá về số; chuỗi rỗng/null/NaN -> 0 */
export function num(v) {
  if (v === null || v === undefined || v === '') return 0;
  const n = typeof v === 'number' ? v : parseFloat(String(v).replace(/[^0-9.-]/g, ''));
  return Number.isFinite(n) ? n : 0;
}

/** Parse ngày ISO -> Date lúc 00:00 (local). Trả null nếu không hợp lệ. */
export function parseDate(iso) {
  if (!iso || typeof iso !== 'string') return null;
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return null;
  const d = new Date(+m[1], +m[2] - 1, +m[3]);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Số ngày từ today đến han (âm = đã quá hạn). today, han là ISO. */
export function soNgayConLai(han, today) {
  const a = parseDate(han), b = parseDate(today);
  if (!a || !b) return null;
  return Math.round((a - b) / 86400000);
}

/**
 * Phân loại cảnh báo theo mốc hạn.
 * Trả { loai, soNgay } với loai ∈ 'quahan'|'le7'|'le15'|'le30'|'xa'|'khonghan'
 * Mốc đã ở trạng thái hoàn tất (done=true) -> 'xong'.
 */
export function phanLoaiCanhBao(han, today, done = false) {
  if (done) return { loai: 'xong', soNgay: null };
  const n = soNgayConLai(han, today);
  if (n === null) return { loai: 'khonghan', soNgay: null };
  if (n < 0) return { loai: 'quahan', soNgay: n };
  if (n <= 7) return { loai: 'le7', soNgay: n };
  if (n <= 15) return { loai: 'le15', soNgay: n };
  if (n <= 30) return { loai: 'le30', soNgay: n };
  return { loai: 'xa', soNgay: n };
}

const TRANG_THAI_XONG = new Set(['xong', 'hoanthanh', 'daduyet', 'done']);
/** Một mốc coi là đã xong khi trangThai thuộc nhóm hoàn tất. */
export function mocDaXong(moc) {
  return TRANG_THAI_XONG.has(String(moc?.trangThai || '').toLowerCase());
}

/** Tổng đã thanh toán luỹ kế của 1 HĐ (cộng các kỳ). */
export function tongDaThanhToan(hd) {
  return (hd?.kyThanhToan || []).reduce((s, k) => s + num(k.daThanhToan), 0);
}

/** Tổng giá trị nghiệm thu luỹ kế (cộng các kỳ). */
export function tongNghiemThu(hd) {
  return (hd?.kyThanhToan || []).reduce((s, k) => s + num(k.giaTriNT), 0);
}

/** % giải ngân = đã thanh toán luỹ kế / giá trị HĐ. Trả null nếu giá trị HĐ = 0. */
export function phanTramGiaiNgan(hd) {
  const gt = num(hd?.giaTri);
  if (gt <= 0) return null;
  return (tongDaThanhToan(hd) / gt) * 100;
}

/** Công nợ = nghiệm thu luỹ kế − đã thanh toán luỹ kế (>=0, không âm). */
export function congNo(hd) {
  return Math.max(0, tongNghiemThu(hd) - tongDaThanhToan(hd));
}

/**
 * "Room" còn lại của trần (tầng 1) = trần dự toán duyệt − đã thực hiện luỹ kế.
 * Đã thực hiện = tổng nghiệm thu luỹ kế. Trả null nếu chưa có trần.
 */
export function roomTran(hd) {
  const tran = num(hd?.khoiLuong?.duToanDuyet?.giaTri);
  if (tran <= 0) return null;
  return tran - tongNghiemThu(hd);
}

/** Kiểm tra ngày: kết thúc < hiệu lực -> true (sai). */
export function ngaySai(hd) {
  const a = parseDate(hd?.ngayHieuLuc), b = parseDate(hd?.ngayKetThuc);
  if (!a || !b) return false;
  return b < a;
}

/**
 * Gom tất cả mốc cảnh báo của toàn bộ HĐ, kèm nguồn.
 * Nguồn gồm: mốc thời gian (mocThoiGian), nghĩa vụ (nghiaVu),
 * kỳ nghiệm thu chưa làm (mocHoSo), phụ lục đang trình (ngayTrinh/trạng thái).
 * Trả mảng { hdId, soHD, tenGoi, nhom, ten, mo, han, loai, soNgay }.
 */
export function gomCanhBao(data, today) {
  const out = [];
  for (const hd of data?.contracts || []) {
    const base = { hdId: hd.id, soHD: hd.soHD, tenGoi: hd.tenGoi };
    for (const m of hd.mocThoiGian || []) {
      const c = phanLoaiCanhBao(m.han, today, mocDaXong(m));
      if (c.loai !== 'xong' && c.loai !== 'khonghan' && c.loai !== 'xa')
        out.push({ ...base, nhom: 'Mốc thời gian', ten: m.ten, mo: m.ghiChu || '', han: m.han, ...c });
    }
    for (const nv of hd.nghiaVu || []) {
      const xong = TRANG_THAI_XONG.has(String(nv.trangThaiTuanThu || '').toLowerCase());
      const c = phanLoaiCanhBao(nv.han, today, xong);
      if (c.loai !== 'xong' && c.loai !== 'khonghan' && c.loai !== 'xa')
        out.push({ ...base, nhom: 'Nghĩa vụ', ten: nv.ten, mo: (nv.mucPhat ? 'Phạt: ' + nv.mucPhat : nv.canCu || ''), han: nv.han, ...c });
    }
    for (const pl of hd.phuLuc || []) {
      const chuaxong = !TRANG_THAI_XONG.has(String(pl.trangThaiHoSo || '').toLowerCase());
      if (pl.ngayHan && chuaxong) {
        const c = phanLoaiCanhBao(pl.ngayHan, today, false);
        if (c.loai !== 'xong' && c.loai !== 'khonghan' && c.loai !== 'xa')
          out.push({ ...base, nhom: 'Phụ lục', ten: pl.noiDung || pl.viTri, mo: pl.trangThaiHoSo || '', han: pl.ngayHan, ...c });
      }
    }
  }
  // Sắp xếp: gấp nhất trước (soNgay tăng dần, quá hạn âm lên đầu)
  const rank = { quahan: 0, le7: 1, le15: 2, le30: 3 };
  out.sort((a, b) => (rank[a.loai] - rank[b.loai]) || (num(a.soNgay) - num(b.soNgay)));
  return out;
}

/** Tổng hợp số liệu dashboard cho toàn bộ HĐ. */
export function tongHopDashboard(data, today, namLoc) {
  const nam = namLoc || (parseDate(today)?.getFullYear());
  const canhBao = gomCanhBao(data, today);
  let quaHan = 0, le30 = 0, tongCongNo = 0;
  let tranNam = 0, ntNam = 0;
  for (const c of canhBao) {
    if (c.loai === 'quahan') quaHan++;
    else le30++; // le7, le15, le30 đều tính là "sắp đến hạn"
  }
  for (const hd of data?.contracts || []) {
    tongCongNo += congNo(hd);
    // Trần & nghiệm thu theo năm lọc
    for (const kh of hd.khoiLuong?.keHoach || []) {
      if (String(kh.ky || '').includes(String(nam))) tranNam += num(kh.giaTri);
    }
    for (const k of hd.kyThanhToan || []) {
      if (String(k.ky || '').includes(String(nam))) ntNam += num(k.giaTriNT);
    }
  }
  const pctNam = tranNam > 0 ? (ntNam / tranNam) * 100 : null;
  return {
    soHD: (data?.contracts || []).length,
    quaHan, sapDenHan: le30, tongCongNo,
    tranNam, ntNam, pctGiaiNganNam: pctNam,
    canhBao,
  };
}

/** Định dạng tiền VN gọn: tỷ / triệu. */
export function dinhDangTien(v) {
  const n = num(v);
  if (n === 0) return '0';
  const abs = Math.abs(n);
  if (abs >= 1e9) return (n / 1e9).toLocaleString('vi-VN', { maximumFractionDigits: 2 }) + ' tỷ';
  if (abs >= 1e6) return (n / 1e6).toLocaleString('vi-VN', { maximumFractionDigits: 1 }) + ' tr';
  return n.toLocaleString('vi-VN');
}

/** Định dạng ngày ISO -> dd/mm/yyyy. */
export function dinhDangNgay(iso) {
  const d = parseDate(iso);
  if (!d) return '—';
  const p = (x) => String(x).padStart(2, '0');
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()}`;
}
