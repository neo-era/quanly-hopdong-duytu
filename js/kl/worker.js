// worker.js — Luồng nền đọc file Excel (file bảng giá 10 MB mất ~20–30 giây, không được làm treo giao diện).
import { parsePLWorkbook, parseHMCatalog, boSungTuSheetCon, findSubsetSheets, chonSheetBangGia, parseBangGiaKy, parseBieuMaGoi } from './parse.js';

let XLSX = null;
async function lib() {
  if (XLSX) return XLSX;
  const src = await (await fetch(new URL('../../vendor/xlsx.full.min.js', import.meta.url))).text();
  (0, eval)(src); // chạy như script toàn cục → định nghĩa self.XLSX
  XLSX = self.XLSX;
  return XLSX;
}

self.onmessage = async (e) => {
  const { id, kind, name, buf } = e.data;
  const say = (p, t) => self.postMessage({ id, progress: p, text: t });
  try {
    say(5, 'Đang nạp thư viện Excel…');
    const X = await lib();
    say(15, `Đang đọc ${name}…`);
    if (kind === 'dv') {
      const wb = X.read(buf, { type: 'array' });
      say(70, 'Đang đọc mã gói thầu, mã hạng mục…');
      self.postMessage({ id, done: true, result: parseBieuMaGoi(X, wb) });
    } else if (kind === 'bg') {
      // Bảng giá HĐ: đọc danh sách sheet trước, rồi chỉ đọc bản chốt + Gx_11C + Tong hop HM (file 10 MB)
      const names = X.read(buf, { type: 'array', bookSheets: true }).SheetNames;
      const chon = chonSheetBangGia(names, name);
      const need = names.filter((n) => n === chon.sheet || /^G\d+_11C$/i.test(n) || n === 'Tong hop HM');
      say(30, 'Đang đọc bảng giá hợp đồng…');
      const wb = X.read(buf, { type: 'array', sheets: need });
      say(75, 'Đang ghép mã hạng mục…');
      const res = parseBangGiaKy(X, wb, name);
      let cat = null;
      if (wb.Sheets['Tong hop HM']) { try { cat = parseHMCatalog(X, wb); } catch { cat = null; } }
      self.postMessage({ id, done: true, result: { bg: res, cat } });
    } else if (kind === 'hm') {
      const wb = X.read(buf, { type: 'array', sheets: ['Tong hop HM', 'G1_11C', 'G2_11C', 'G3_11C', 'G4_11C', 'G5_11C', 'G6_11C'] });
      say(80, 'Đang lập danh mục hạng mục…');
      const cat = parseHMCatalog(X, wb);
      self.postMessage({ id, done: true, result: cat });
    } else {
      const wb = X.read(buf, { type: 'array', cellFormula: true, cellStyles: true });
      say(70, 'Đang đối chiếu tổng cộng từng phụ lục…');
      const res = parsePLWorkbook(X, wb);
      const sub = findSubsetSheets(res);
      const boSung = boSungTuSheetCon(res);
      self.postMessage({ id, done: true, result: { sheets: res, sub, boSung } });
    }
  } catch (err) {
    self.postMessage({ id, error: err.message || String(err) });
  }
};
