// tests/hmlq.test.js — Hạng mục con liên quan để chọn nhanh (docs/06_HM-LienQuan.md L1–L6). Chạy: node tests/hmlq.test.js
// Danh mục giả lập theo tên thật; có KL_CAT (TSV mã ⇥ ĐVT ⇥ ⇥ tên — dữ liệu thật, không để trong repo) thì kiểm thêm trên danh mục thật.
import fs from 'node:fs';
import * as L from '../js/kl/hmlienquan.js';
import * as K from '../js/kl/core.js';

let pass = 0, fail = 0;
const eq = (g, w, m) => { if (JSON.stringify(g) === JSON.stringify(w)) pass++; else { fail++; console.error(`✗ ${m}\n   nhận: ${JSON.stringify(g)}\n   mong: ${JSON.stringify(w)}`); } };
const ok = (c, m) => eq(!!c, true, m);

const TEN = {
  HM121: 'Thay thế bộ điều khiển trung tâm tại tủ', HM424: 'Lắp đặt bộ điều khiển trung tâm tại tủ',
  HM123: 'Thay thế biến dòng 50/5A tại tủ', HM425: 'Lắp đặt biến dòng 50/5A', HM124: 'Thay thế biến dòng 100/5A tại tủ', HM426: 'Lắp đặt biến dòng 100/5A',
  HM125: 'Thay thế đồng hồ đa năng', HM427: 'Lắp đặt đồng hồ đa năng giao tiếp', HM126: 'Thay thế bộ giao tiếp đồng hồ đa năng', HM428: 'Lắp đặt bộ giao tiếp đồng hồ đa năng',
  HM127: 'Thay thế modem kết nối trung tâm tại tủ', HM429: 'Lắp đặt modem kết nối trung tâm tại tủ',
  HM129: 'Thay thế bộ giao tiếp của thiết bị đo dòng rò tại tủ', HM431: 'Lắp đặt bộ giao tiếp thiết bị đo dòng rò', HM130: 'Thay thế biến dòng đo dòng rò', HM432: 'Lắp đặt cảm biến dòng rò',
  HM116: 'Thay thế MCB (6A - 40A)', HM117: 'Thay thế MCB (50A - 63A)', HM370: 'Lắp đặt MCB (50A - 63A)', HM371: 'Lắp đặt MCB (6A - 40A)', HM375: 'Lắp đặt MCB 1P các loại (SD Vật tư thu hồi/ vật tư sử dụng lại)',
  HM131: 'Thay thế vỏ tủ điều khiển chiếu sáng', HM364: 'Lắp đặt vỏ tủ điều khiển chiếu sáng',
  HM151: 'Cung cấp gói data 3G/4G kết nối tủ về trung tâm điều khiển', HM162: 'Cung cấp Sim kết nối tủ về trung tâm điều khiển',
  HM021: 'Duy trì trạm đèn < 500m - kết nối về trung tâm',
  HM428_cg: 'Lắp đặt bộ giao tiếp đồng hồ đa năng', HM127_cg: 'Thay thế modem kết nối trung tâm tại tủ',
  HM283: 'Thay thế trụ thép tròn côn cao 8m',
};
const kho = () => {
  const st = K.emptyState();
  for (const [ma, ten] of Object.entries(TEN)) st.catalog[ma] = { ten, dvt: 'cái', goi: { [/_cg$/.test(ma) ? 'G2' : 'G1']: { kl: { 2026: 10 } }, ...(/_cg$/.test(ma) ? {} : { G2: { kl: { 2026: 5 } } }) } };
  st.phuLuc.push({ id: 'p1', loai: 'PLI', sheet: 'Thay sửa tủ', file: 'a', namKH: 2026, nhom: [] }, { id: 'p3', loai: 'PLIII', sheet: 'Thay trụ', file: 'a', namKH: 2026, nhom: [] });
  return st;
};

// L1: loại nhóm theo vị trí
eq([L.loaiNhom({ nguon: { type: 'vo_tu' } }, { loai: 'PLI' }), L.loaiNhom({}, { loai: 'PLI' }), L.loaiNhom({}, { loai: 'KS:hkn' }), L.loaiNhom({}, { loai: 'MYTHUAT' })],
  ['vo_tu', 'thay_sua_tu', 'hkn', null], 'loại nhóm: KS gốc > loại PL > khuôn chung');
// L1: ghép cặp Thay thế ↔ Lắp đặt
{
  const st = kho();
  const cap = L.capDiKem(Object.keys(TEN).filter((m) => !/_cg$/.test(m)), st.catalog);
  eq(['HM121', 'HM123', 'HM124', 'HM125', 'HM126', 'HM127', 'HM129', 'HM130', 'HM116', 'HM117', 'HM131'].map((m) => cap.get(m)),
    ['HM424', 'HM425', 'HM426', 'HM427', 'HM428', 'HM429', 'HM431', 'HM432', 'HM371', 'HM370', 'HM364'], 'cặp thay thế ↔ lắp đặt đúng (MCB theo dải A, đồng hồ ↔ giao tiếp không lẫn)');
  ok(!cap.has('HM375') && !cap.has('HM151'), 'không ghép mã "vật tư thu hồi" và mã cung cấp');
}
// L1 + L3: danh sách cho tủ ngoài Cần Giờ / trong Cần Giờ
{
  const st = kho();
  const v = { id: 'v', plId: 'p1', phuong: 'Phường Bình Trưng', goi: 'G1', kl: 1, chiTiet: [{ ma: 'HM428_cg', kl: 1 }] };
  const r = L.lienQuan(st, v, st.phuLuc[0]);
  const tat = r.nhom.flatMap((n) => n.ma.map((x) => x.ma));
  eq(r.nhom.map((n) => n.nhom), ['Điều khiển · kết nối trung tâm', 'Đo đếm · đồng hồ đa năng', 'Đo dòng rò', 'Đóng cắt · bảo vệ trong tủ', 'Tủ · vỏ tủ · phụ kiện'], 'nhóm Thay sửa tủ');
  ok(!tat.some((m) => /_cg$/.test(m)) && !tat.includes('HM021') && !tat.includes('HM283'), 'ngoài Cần Giờ: không mã _cg, không mã duy trì / trụ');
  const kn = r.nhom[0].ma.map((x) => x.ma);
  eq(kn.slice(kn.indexOf('HM127'), kn.indexOf('HM127') + 2), ['HM127', 'HM429'], 'mã lắp đặt đứng ngay sau mã thay thế đi cặp');
  eq(r.canhBaoCG, [{ ma: 'HM428_cg', thay: 'HM428' }], 'cảnh báo mã Cần Giờ đã gắn + gợi ý mã thường');
  const rcg = L.lienQuan(st, { ...v, phuong: 'Xã Cần Giờ', goi: 'G2', chiTiet: [] }, st.phuLuc[0]);
  const tcg = rcg.nhom.flatMap((n) => n.ma.map((x) => x.ma));
  ok(tcg.includes('HM127_cg') && !tcg.includes('HM127') && tcg.includes('HM428_cg'), 'Cần Giờ: dùng mã _cg thay mã thường khi có');
  eq(rcg.canhBaoCG, [], 'Cần Giờ: không cảnh báo');
  eq([L.laCanGio('Xã Thạnh An'), L.laCanGio('Phường Bàn Cờ'), L.laCanGio('An Thới Đông')], [true, false, true], 'nhận phường Cần Giờ');
}
// L6: chỉ mã có trong HĐ gói của vị trí
{
  const st = kho();
  delete st.catalog.HM429.goi.G1;
  const r = L.lienQuan(st, { id: 'v', plId: 'p1', phuong: 'Bàn Cờ', goi: 'G1', kl: 1 }, st.phuLuc[0]);
  ok(!r.nhom.flatMap((n) => n.ma.map((x) => x.ma)).includes('HM429'), 'mã không có KL HĐ gói G1 → ẩn');
  const r2 = L.lienQuan(st, { id: 'v', plId: 'p1', phuong: 'Bàn Cờ', goi: 'G1', kl: 1 }, st.phuLuc[0], { chiTrongGoi: false });
  ok(r2.nhom.flatMap((n) => n.ma.map((x) => x.ma)).includes('HM429'), 'bật xem cả mã ngoài gói → hiện');
}
// L4: hay dùng (tự học) + KL gợi ý theo 1 đơn vị KL vị trí
{
  const st = kho();
  const vt = (id, kl, ct) => st.viTri.push({ id, plId: 'p1', phuong: 'Bàn Cờ', goi: 'G1', kl, chiTiet: ct });
  vt('a', 1, [{ ma: 'HM127', kl: 1 }, { ma: 'HM123', kl: 3 }]);
  vt('b', 2, [{ ma: 'HM127', kl: 2 }, { ma: 'HM123', kl: 6 }, { ma: 'HM162', kl: 2 }]);
  vt('c', 1, [{ ma: 'HM127', kl: 1 }]);
  st.viTri.push({ id: 't', plId: 'p3', phuong: 'Bàn Cờ', goi: 'G1', kl: 1, chiTiet: [{ ma: 'HM283', kl: 1 }] });
  eq(L.hayDung(st, 'thay_sua_tu'), [{ ma: 'HM127', lan: 3, klGoiY: 1 }, { ma: 'HM123', lan: 2, klGoiY: 3 }, { ma: 'HM162', lan: 1, klGoiY: 1 }], 'hay dùng: đếm theo loại, KL gợi ý / 1 tủ');
  eq(L.hayDung(st, 'thay_sua_tu', { boQua: 'c' }).find((h) => h.ma === 'HM127').lan, 2, 'không đếm chính vị trí đang sửa');
  const r = L.lienQuan(st, { id: 'x', plId: 'p1', phuong: 'Bàn Cờ', goi: 'G1', kl: 1 }, st.phuLuc[0]);
  eq([r.nhom[0].nhom, r.nhom[0].ma[1].klGoiY], ['Hay dùng', 3], 'nhóm Hay dùng lên đầu, mang KL gợi ý');
}
// Sau duyệt nghiệp vụ: cặp thay thế/lắp đặt cùng tick → cảnh báo; gói/tháng → KL = số tháng; hay dùng gộp mã _cg
{
  const st = kho();
  st.catalog.HM151.dvt = 'gói/tháng';
  const r = L.lienQuan(st, { id: 'v', plId: 'p1', phuong: 'Bàn Cờ', goi: 'G1', kl: 1, chiTiet: [{ ma: 'HM127', kl: 1 }, { ma: 'HM429', kl: 1 }] }, { ...st.phuLuc[0], namKH: new Date().getFullYear() + 1 });
  eq(r.trungCap, [['HM127', 'HM429']], 'tick cả thay thế + lắp đặt cùng thiết bị → cảnh báo');
  eq(r.nhom.flatMap((n) => n.ma).find((x) => x.ma === 'HM151').klGoiY, 12, 'gói/tháng: năm KH sau → 12 tháng');
  st.viTri.push({ id: 'a', plId: 'p1', phuong: 'Bàn Cờ', goi: 'G1', kl: 1, chiTiet: [{ ma: 'HM428_cg', kl: 1 }] }, { id: 'b', plId: 'p1', phuong: 'Bàn Cờ', goi: 'G1', kl: 1, chiTiet: [{ ma: 'HM428', kl: 1 }] });
  eq(L.hayDung(st, 'thay_sua_tu'), [{ ma: 'HM428', lan: 2, klGoiY: 1 }], 'hay dùng: gộp HM428_cg với HM428');
  const rcg = L.lienQuan(st, { id: 'x', plId: 'p1', phuong: 'Xã Cần Giờ', goi: 'G2', kl: 1 }, st.phuLuc[0]);
  eq(rcg.nhom[0].ma.map((x) => x.ma), ['HM428_cg'], 'Cần Giờ: hay dùng đổi sang mã _cg');
}
// L5: như vị trí trước — nhân theo KL
eq(L.nhuViTriTruoc({ kl: 1, chiTiet: [{ ma: 'HM127', kl: 1 }, { ma: 'HM123', kl: 3 }] }, { kl: 2 }), [{ ma: 'HM127', kl: 2 }, { ma: 'HM123', kl: 6 }], 'như vị trí trước: nhân theo KL');
eq(L.nhuViTriTruoc({ kl: null, chiTiet: [{ ma: 'HM127', kl: 1 }] }, { kl: 3 }), [{ ma: 'HM127', kl: 1 }], 'thiếu KL → giữ nguyên');

// ---- Chép nguyên bộ HM (docs/07_ChepBoHM.md C1–C6) ----
{
  const st = kho();
  const mau = { id: 'm', plId: 'p1', tram: 'Bình Trường-1', phuong: 'Bình Trưng', goi: 'G1', kl: 1, chiTiet: [{ ma: 'HM127', kl: 1 }, { ma: 'HM123', kl: 3 }, { ma: 'HM151', kl: 1 }] };
  const trong = { id: 'd1', plId: 'p1', phuong: 'Bình Trưng', goi: 'G1', kl: 1, chiTiet: [] };
  const coSan = { id: 'd2', plId: 'p1', phuong: 'Bình Trưng', goi: 'G1', kl: 1, chiTiet: [{ ma: 'HM123', kl: 2 }, { ma: 'HM162', kl: 1 }] };
  const tru = { id: 'd3', plId: 'p3', phuong: 'Bình Trưng', goi: 'G1', kl: 1, chiTiet: [] };
  st.viTri.push(mau, trong, coSan, tru);
  let r = L.chepBoHM(st, mau, trong);
  eq(r.chiTiet, mau.chiTiet, 'C1 vị trí trống: chép nguyên bộ');
  eq([r.khac.them.length, r.chan, r.giongHet], [3, '', false], 'C1 vị trí trống: 3 mã thêm, không chặn');
  r = L.chepBoHM(st, mau, coSan);
  eq([r.khac.them, r.khac.bo, r.khac.doiKL], [['HM127', 'HM151'], ['HM162'], [{ ma: 'HM123', tu: 2, sang: 3 }]], 'C2 cảnh báo khác nhau: thêm / bỏ / đổi KL');
  eq(r.chiTiet.map((c) => c.ma), ['HM127', 'HM123', 'HM151'], 'C2 Thay: bộ đích = bộ nguồn');
  r = L.chepBoHM(st, mau, coSan, { cheDo: 'gop' });
  eq([r.chiTiet, r.khac.bo, r.khac.giu, r.khac.doiKL], [[{ ma: 'HM123', kl: 2 }, { ma: 'HM162', kl: 1 }, { ma: 'HM127', kl: 1 }, { ma: 'HM151', kl: 1 }], [], ['HM162'], []], 'C2 Gộp: giữ nguyên mã + KL của đích, chỉ thêm mã thiếu');
  eq(L.chepBoHM(st, mau, { ...coSan, chiTiet: [...mau.chiTiet, { ma: 'HM162', kl: 1 }] }, { cheDo: 'gop' }).giongHet, true, 'C2 Gộp mà đích đã đủ mã nguồn → giống, bỏ qua');
  eq(L.chepBoHM(st, mau, tru).chan, 'khacLoai', 'C3 khác loại công tác → chặn');
  eq(L.chepBoHM(st, mau, { ...trong, trangThai: 'da' }).chan, 'daTH', 'C3 đã thực hiện → chặn mặc định');
  st.catalog.HM127.dvt = 'm';
  r = L.chepBoHM(st, { ...mau, kl: 2 }, { ...trong, kl: 3 }, { dvtVT: () => 'md' });
  eq([r.chiTiet.find((c) => c.ma === 'HM127').kl, r.chiTiet.find((c) => c.ma === 'HM123').kl], [1.5, 3], 'C4 chỉ nhân tỉ lệ mã cùng ĐVT với KL vị trí (m ↔ md); mã đếm (cái) giữ nguyên');
  st.catalog.HM127.dvt = 'cái';
  r = L.chepBoHM(st, { ...mau, kl: 300 }, { ...trong, kl: 400 }, { dvtVT: () => 'm' });
  ok(r.chiTiet.every((c) => Number.isInteger(c.kl)) && r.canhBao.some((c) => c.loai === 'tiLe'), 'C4 KL vị trí khác nhau mà mã là cái → không ra số lẻ, có lưu ý');
  st.catalog.HM151.dvt = 'tháng';
  st.phuLuc.push({ id: 'p1b', loai: 'PLI', sheet: 'Thay sửa tủ', file: 'b', namKH: 2027, nhom: [] });
  r = L.chepBoHM(st, { ...mau, chiTiet: [{ ma: 'HM151', kl: 2 }] }, { ...trong, plId: 'p1b' }, { now: new Date(2026, 10, 16) });
  eq(r.chiTiet, [{ ma: 'HM151', kl: 12 }], 'C4 mã theo tháng: đặt lại số tháng theo năm KH phụ lục đích (2027 → 12)');
  ok(r.canhBao.some((c) => c.loai === 'khacNam'), 'C8 khác năm KH → lưu ý');
  eq(L.chepBoHM(st, { ...mau, chiTiet: [{ ma: 'HM151', kl: 5 }] }, trong, { now: new Date(2026, 10, 16) }).chiTiet[0].kl, 2, 'C4 năm hiện tại tháng 11 → còn 2 tháng');
  st.catalog.HM151.dvt = 'cái';
  eq(L.chepBoHM(st, mau, { ...trong, trangThai: 'dang' }).chan, 'dangTH', 'C3 đang thực hiện → chặn mặc định');
  r = L.chepBoHM(st, mau, { ...coSan, thucHien: { HM162: 1 } });
  eq([r.khac.bo, r.khac.giu, r.chiTiet.some((c) => c.ma === 'HM162')], [[], ['HM162'], true], 'C3 Thay không bỏ mã đã có KL thực hiện');
  r = L.chepBoHM(st, mau, { ...trong, phuong: 'Xã Cần Giờ', goi: 'G2' });
  ok(r.chiTiet.some((c) => c.ma === 'HM127_cg') && r.canhBao.some((c) => c.loai === 'doiCG'), 'C5 đích ở Cần Giờ → đổi sang mã _cg có trong danh mục');
  r = L.chepBoHM(st, { ...mau, chiTiet: [{ ma: 'HM428_cg', kl: 1 }] }, trong);
  eq(r.chiTiet, [{ ma: 'HM428', kl: 1 }], 'C5 nguồn _cg → đích ngoài Cần Giờ dùng mã thường');
  st.catalog.HM151.goi = { G1: { kl: { 2026: 1 } } };
  r = L.chepBoHM(st, mau, { ...trong, goi: 'G2' });
  ok(r.canhBao.some((c) => c.loai === 'ngoaiGoi' && c.ma === 'HM151'), 'C5 mã không có trong HĐ gói đích → cảnh báo');
  eq(L.chepBoHM(st, mau, { ...trong, chiTiet: mau.chiTiet.map((c) => ({ ...c })) }).giongHet, true, 'C2 giống hệt → báo giống');
  ok(L.chepBoHM(st, mau, { ...trong, goi: 'nhieu' }).canhBao.some((c) => c.loai === 'nhieuGoi'), 'C8 vị trí nhiều gói → lưu ý chưa kiểm HĐ gói');
  ok(L.chepBoHM(st, { ...mau, chiTiet: [{ ma: 'HM123', kl: 1 }] }, { ...trong, phuong: 'Cần Giờ' }).canhBao.some((c) => c.loai === 'thieuCG'), 'C5 Cần Giờ thiếu mã _cg → lưu ý');
  ok(L.chepBoHM(st, { ...mau, chiTiet: [{ ma: 'HM127', kl: 1 }, { ma: 'HM429', kl: 1 }] }, trong).canhBao.some((c) => c.loai === 'trungCap'), 'C8 bộ sau khi chép có cả thay thế và lắp đặt cùng loại → lưu ý');
  ok(L.chepBoHM(st, { ...mau, namLD: 2000 }, { ...trong, namLD: 2015 }).canhBao.some((c) => c.loai === 'khacNamLD'), 'C8 năm lắp đặt lệch ≥ 10 năm → lưu ý');
  st.catalog.HM127.goi = { G1: { kl: { 2026: 2 } } };
  const td = L.tacDongHD(st, [{ d: trong, chiTiet: [{ ma: 'HM127', kl: 1 }] }, { d: { ...trong, id: 'x' }, chiTiet: [{ ma: 'HM127', kl: 1 }] }, { d: { ...trong, id: 'y' }, chiTiet: [{ ma: 'HM127', kl: 1 }] }], K.doiChieu);
  eq(td.map((x) => [x.ma, x.them, x.vuot]), [['HM127', 3, true]], 'C9 tổng KL chép thêm vượt HĐ còn lại → báo vượt');
  const g = L.goiYNguon(st, [trong]);
  eq(g.map((x) => x.v.id), ['m', 'd2'], 'C6 gợi ý nguồn: cùng loại, có HM, nhiều mã lên trước; không gợi ý chính đích / khác loại');
  eq(L.goiYNguon(st, [trong], { q: 'hm162' }).map((x) => x.v.id), ['d2'], 'C6 tìm nguồn theo mã HM');
}

// Danh mục thật (nếu có)
const CAT = process.env.KL_CAT;
if (CAT && fs.existsSync(CAT)) {
  const st = K.emptyState();
  for (const l of fs.readFileSync(CAT, 'utf8').split('\n')) { const [ma, dvt, , ten] = l.split('\t'); if (ma) st.catalog[ma] = { ten, dvt }; }
  st.phuLuc.push({ id: 'p1', loai: 'PLI' });
  const r = L.lienQuan(st, { id: 'v', plId: 'p1', phuong: 'Bình Trưng', goi: null, kl: 1 }, st.phuLuc[0]);
  const m = new Map(r.nhom.flatMap((n) => n.ma.map((x) => [x.ma, x.diKem])));
  eq(['HM121', 'HM123', 'HM124', 'HM125', 'HM126', 'HM127', 'HM128', 'HM129', 'HM130', 'HM131', 'HM120'].map((x) => m.get(x)),
    ['HM424', 'HM425', 'HM426', 'HM427', 'HM428', 'HM429', 'HM430', 'HM431', 'HM432', 'HM364', 'HM365'], 'danh mục thật: cặp thay thế ↔ lắp đặt của Thay sửa tủ');
  ok(['HM127', 'HM123', 'HM130', 'HM431', 'HM151', 'HM162', 'HM428'].every((x) => m.has(x)), 'danh mục thật: đủ 7 mã anh gắn cho tủ Bình Trường-1');
} else console.log('… bỏ qua kiểm danh mục thật (chưa đặt KL_CAT)');

console.log(`\nhmlq.test: ${pass} đạt, ${fail} lỗi`);
process.exit(fail ? 1 : 0);
