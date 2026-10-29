// worker.js — Luồng nền đọc file Excel (file bảng giá 10 MB mất ~20–30 giây, không được làm treo giao diện).
import { parsePLWorkbook, parseHMCatalog, boSungTuSheetCon, findSubsetSheets } from './parse.js';

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
    if (kind === 'hm') {
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
