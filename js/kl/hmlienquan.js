// hmlienquan.js — Hạng mục con liên quan để chọn nhanh trong hộp Chi tiết vị trí (docs/06_HM-LienQuan.md).
// Hàm thuần, không DOM: nhóm theo loại, ghép cặp "Thay thế X" ↔ "Lắp đặt X", ẩn mã Cần Giờ, hay dùng (tự học), như vị trí trước.
import { fold, nhomCua, soSanhMa } from './ksnhom.js';

/** Loại phụ lục → loại khảo sát có bộ nhóm hạng mục. */
export const LOAI_PL_KS = { PLI: 'thay_sua_tu', PLII: 'thay_den', HPS_AN: 'thay_den', PLIII: 'thay_tru', PLIV: 'thay_tru',
  HANGAM: 'ngam_hoa', TANGCUONG: 'tang_cuong_den', CAPNGAM: 'tc_ngam' };
/** Loại khảo sát dùng để lấy nhóm cho 1 vị trí: KS gốc > loại phụ lục > khuôn chung KS:<loại>. */
export function loaiNhom(v, pl) {
  if (v?.nguon?.type) return v.nguon.type;
  const l = pl?.loai || '';
  if (/^KS:/.test(l)) return l.slice(3);
  return LOAI_PL_KS[l] || null;
}

// Phường/xã Cần Giờ sau sắp xếp 2025 — mã `_cg` chỉ dùng ở đây
const CAN_GIO = ['can gio', 'binh khanh', 'an thoi dong', 'thanh an'];
export const laCanGio = (phuong) => { const p = fold(phuong).replace(/^(phuong|xa|thi tran)\s+/, ''); return CAN_GIO.includes(p); };
export const laMaCG = (ma) => /_cg$/i.test(ma);
/** Mã thường tương ứng của mã Cần Giờ (HM428_CG → HM428) nếu có trong danh mục. */
export const maThuong = (ma, catalog) => { const m = String(ma).replace(/_cg$/i, ''); return m !== ma && catalog?.[m] ? m : null; };

// ---- Ghép cặp Thay thế ↔ Lắp đặt theo tên ----
const BO_TU = new Set(['tai', 'tu', 'cua', 'trong', 'cac', 'loai', 'dieu', 'khien', 'chieu', 'sang', 'thiet', 'bi', 'plc', '10', 'i/o']);
// Giữ số trong ngoặc (6A - 40A) để MCB 6–40A không ghép nhầm 50–63A; bỏ ghi chú "(SD vật tư thu hồi…)"
const tuKhoa = (ten) => new Set(fold(ten).replace(/\((sd|su dung)[^)]*\)/g, ' ').replace(/^(thay the|lap dat|cc, lap dat|cung cap)\s+/, '').split(/[\s,;()\-]+/).filter((t) => t && !BO_TU.has(t)));
const loaiTen = (ten) => { const t = fold(ten); return /^thay the /.test(t) ? 'thay' : /^(lap dat|cc, lap dat) /.test(t) ? 'lap' : null; };
const jac = (a, b) => { let n = 0; for (const x of a) if (b.has(x)) n++; return n / (a.size + b.size - n || 1); };
/**
 * Cặp Thay thế ↔ Lắp đặt trong 1 danh sách mã (mỗi mã tối đa 1 cặp, ghép điểm cao trước, ngưỡng 0,6; bỏ "SD vật tư thu hồi").
 * @returns Map(ma → maDiKem)
 */
export function capDiKem(ds, catalog) {
  const thay = ds.filter((m) => loaiTen(catalog[m]?.ten) === 'thay');
  const lap = ds.filter((m) => loaiTen(catalog[m]?.ten) === 'lap' && !/thu hoi|su dung lai/.test(fold(catalog[m]?.ten)));
  const ung = [];
  for (const a of thay) for (const b of lap) { const s = jac(tuKhoa(catalog[a].ten), tuKhoa(catalog[b].ten)); if (s >= 0.6) ung.push([s, a, b]); }
  ung.sort((x, y) => y[0] - x[0] || soSanhMa(x[1], y[1]));
  const out = new Map();
  for (const [, a, b] of ung) if (!out.has(a) && !out.has(b)) { out.set(a, b); out.set(b, a); }
  return out;
}

/** Thứ tự hiển thị trong nhóm: mỗi "Thay thế" kèm ngay "Lắp đặt" đi cặp. */
function xepCap(ds, cap) {
  const out = [], da = new Set();
  for (const m of ds) {
    if (da.has(m)) continue;
    const k = cap.get(m);
    out.push(m); da.add(m);
    if (k && ds.includes(k) && !da.has(k)) { out.push(k); da.add(k); }
  }
  return out;
}

/**
 * Hay dùng cho 1 loại (tự học từ dữ liệu đang có): đếm mã trong chi tiết các vị trí cùng loại nhóm.
 * KL gợi ý = KL / 1 đơn vị KL vị trí hay gặp nhất (làm tròn 3 số lẻ).
 * @returns [{ ma, lan, klGoiY }] giảm dần theo số lần (tối đa `toiDa`)
 */
export function hayDung(st, loai, { boQua = null, toiDa = 12 } = {}) {
  if (!loai) return [];
  const plMap = new Map(st.phuLuc.map((p) => [p.id, p]));
  const dem = new Map();
  for (const v of st.viTri) {
    if (v.id === boQua || loaiNhom(v, plMap.get(v.plId)) !== loai) continue;
    const kl = +v.kl > 0 ? +v.kl : 1;
    for (const c of v.chiTiet || []) {
      if (!c.ma) continue;
      const ma = String(c.ma).replace(/_cg$/i, '');   // gộp mã Cần Giờ với mã thường khi đếm
      const o = dem.get(ma) || { ma, lan: 0, heSo: new Map() };
      o.lan++;
      const h = Math.round(((+c.kl || 0) / kl) * 1000) / 1000;
      o.heSo.set(h, (o.heSo.get(h) || 0) + 1);
      dem.set(ma, o);
    }
  }
  return [...dem.values()].sort((a, b) => b.lan - a.lan || soSanhMa(a.ma, b.ma)).slice(0, toiDa)
    .map((o) => ({ ma: o.ma, lan: o.lan, klGoiY: [...o.heSo.entries()].sort((a, b) => b[1] - a[1] || b[0] - a[0])[0]?.[0] || 1 }));
}

/**
 * Danh sách hạng mục liên quan cho 1 vị trí.
 * @param opts.chiTrongGoi chỉ mã có KL HĐ ở gói của vị trí (mặc định true khi vị trí có gói)
 * @returns { loai, nhom: [{ nhom, ma: [{ ma, ten, dvt, diKem, cg }] }], canhBaoCG: [{ ma, thay }] }
 */
export function lienQuan(st, v, pl, { chiTrongGoi = true } = {}) {
  const catalog = st.catalog || {};
  const loai = loaiNhom(v, pl);
  const cg = laCanGio(v?.phuong);
  const trongGoi = (m) => !chiTrongGoi || !v?.goi || v.goi === 'nhieu' || !!Object.keys(catalog[m]?.goi?.[v.goi]?.kl || {}).length;
  // Ở Cần Giờ: thay mã thường bằng mã _cg tương ứng nếu có
  const doiCG = (m) => (cg && catalog[m + '_cg'] ? m + '_cg' : cg && catalog[m + '_CG'] ? m + '_CG' : m);
  const mo = (m, cap) => ({ ma: m, ten: catalog[m]?.ten || '', dvt: catalog[m]?.dvt || '', diKem: cap.get(m.replace(/_cg$/i, '')) ? doiCG(cap.get(m.replace(/_cg$/i, ''))) : null, cg: laMaCG(m), klGoiY: klMacDinh(m) });
  const nhom = [];
  const hd = hayDung(st, loai, { boQua: v?.id }).map((h) => ({ ...h, ma: doiCG(h.ma) })).filter((h) => catalog[h.ma] && (cg || !laMaCG(h.ma)) && trongGoi(h.ma));
  // ĐVT theo tháng (gói data): KL gợi ý = số tháng còn lại tới hết năm kế hoạch (năm sau → 12)
  const thang = (() => { const d = new Date(), nam = +pl?.namKH || d.getFullYear(); return nam > d.getFullYear() ? 12 : nam < d.getFullYear() ? 1 : 12 - d.getMonth(); })();
  const klMacDinh = (m) => (/thang/.test(fold(catalog[m]?.dvt)) ? thang : 1);
  const tatCa = nhomCua(loai, catalog);
  const cap = capDiKem(tatCa.flatMap((n) => n.ma), catalog);
  // Mã theo tháng: luôn lấy số tháng còn lại (KL học từ tháng khác sẽ lệch — chuyên gia nghiệp vụ vòng 2)
  if (hd.length) nhom.push({ nhom: 'Hay dùng', hayDung: true, ma: hd.map((h) => ({ ...mo(h.ma, cap), lan: h.lan, klGoiY: /thang/.test(fold(catalog[h.ma]?.dvt)) ? thang : h.klGoiY })) });
  for (const n of tatCa) {
    const ds = xepCap(n.ma, cap).filter(trongGoi).map(doiCG);
    if (ds.length) nhom.push({ nhom: n.nhom, ma: ds.map((m) => mo(m, cap)) });
  }
  // Tick cả "Thay thế" và "Lắp đặt" của 1 cặp → có thể tính trùng nhân công lắp
  const coMa = new Set((v?.chiTiet || []).map((c) => String(c.ma).replace(/_cg$/i, '')));
  const trungCap = [...coMa].filter((m) => cap.get(m) && coMa.has(cap.get(m)) && loaiTen(catalog[m]?.ten) === 'thay').map((m) => [m, cap.get(m)]);
  const canhBaoCG = cg ? [] : (v?.chiTiet || []).filter((c) => laMaCG(c.ma)).map((c) => ({ ma: c.ma, thay: maThuong(c.ma, catalog) }));
  return { loai, nhom, canhBaoCG, trungCap };
}

/**
 * "Như vị trí trước": chép chi tiết HM của vị trí mẫu sang vị trí đích, nhân theo tỉ lệ KL (KL đích / KL mẫu; thiếu KL → giữ nguyên).
 */
export function nhuViTriTruoc(mau, dich) {
  if (!mau?.chiTiet?.length) return [];
  const r = +mau.kl > 0 && +dich?.kl > 0 ? +dich.kl / +mau.kl : 1;
  return mau.chiTiet.map((c) => ({ ma: c.ma, kl: Math.round((+c.kl || 0) * r * 1000) / 1000 }));
}

// ---- Chép nguyên bộ HM từ 1 vị trí hoàn chỉnh sang các vị trí cùng loại (docs/07_ChepBoHM.md) ----
const coTrongGoi = (catalog, ma, goi) => !goi || goi === 'nhieu' || !!Object.keys(catalog?.[ma]?.goi?.[goi]?.kl || {}).length;
/** Đổi mã cho hợp phường đích: Cần Giờ → mã _cg nếu có; ngoài Cần Giờ → mã thường nếu có. */
function maTheoPhuong(ma, phuong, catalog) {
  const goc = String(ma).replace(/_cg$/i, '');
  if (laCanGio(phuong)) return catalog?.[goc + '_cg'] ? goc + '_cg' : catalog?.[goc + '_CG'] ? goc + '_CG' : ma;
  return laMaCG(ma) && catalog?.[goc] ? goc : ma;
}
const r3 = (x) => Math.round(x * 1000) / 1000;

/**
 * Bộ HM chép sang 1 vị trí đích + so sánh với bộ HM đích đang có.
 * KL nhân theo tỉ lệ KL vị trí (đích/nguồn; thiếu KL → giữ nguyên). Mã đổi theo phường (Cần Giờ).
 * @param opts.cheDo 'thay' (bộ đích = bộ nguồn) | 'gop' (giữ nguyên mã + KL của đích, chỉ thêm mã đích chưa có)
 * @returns { chiTiet, khac: { them, bo, doiKL:[{ma,tu,sang}] }, canhBao:[{loai, ma?, text}], chan: lý do không nên chép | '' , giongHet }
 */
export function chepBoHM(st, nguon, dich, { cheDo = 'thay' } = {}) {
  const catalog = st.catalog || {};
  const plMap = new Map((st.phuLuc || []).map((p) => [p.id, p]));
  const canhBao = [];
  let chan = '';
  const lN = loaiNhom(nguon, plMap.get(nguon?.plId)), lD = loaiNhom(dich, plMap.get(dich?.plId));
  if (lN !== lD) { chan = 'khacLoai'; canhBao.push({ loai: 'khacLoai', text: 'Khác loại công tác với vị trí nguồn' }); }
  if (dich?.trangThai === 'da') { chan = chan || 'daTH'; canhBao.push({ loai: 'daTH', text: 'Đã thực hiện — chép sẽ đổi KL kế hoạch' }); }
  const r = +nguon?.kl > 0 && +dich?.kl > 0 ? +dich.kl / +nguon.kl : 1;
  if (r !== 1) canhBao.push({ loai: 'tiLe', text: `KL nhân ×${r3(r)} theo KL vị trí (${r3(+dich.kl)}/${r3(+nguon.kl)})` });
  const moi = new Map();
  for (const c of nguon?.chiTiet || []) {
    const ma = maTheoPhuong(c.ma, dich?.phuong, catalog);
    if (ma !== c.ma) canhBao.push({ loai: 'doiCG', ma, text: `${c.ma} → ${ma} (theo phường ${dich?.phuong || ''})` });
    moi.set(ma, r3((moi.get(ma) || 0) + (+c.kl || 0) * r));
  }
  const cu = new Map((dich?.chiTiet || []).map((c) => [c.ma, +c.kl || 0]));
  const them = [...moi.keys()].filter((m) => !cu.has(m));
  const chiDich = [...cu.keys()].filter((m) => !moi.has(m));
  const doiKL = [...moi].filter(([m, k]) => cu.has(m) && r3(cu.get(m)) !== k).map(([ma, sang]) => ({ ma, tu: cu.get(ma), sang }));
  // Gộp: giữ nguyên mọi mã + KL của đích, chỉ thêm mã đích chưa có
  const kq = cheDo === 'gop' ? new Map([...cu, ...[...moi].filter(([m]) => !cu.has(m))]) : new Map(moi);
  for (const m of kq.keys()) {
    if (!catalog[m]) canhBao.push({ loai: 'khongDM', ma: m, text: `${m} không có trong danh mục HĐ` });
    else if (!coTrongGoi(catalog, m, dich?.goi)) canhBao.push({ loai: 'ngoaiGoi', ma: m, text: `${m} không có KL trong HĐ gói của vị trí đích` });
  }
  return {
    chiTiet: [...kq].map(([ma, kl]) => ({ ma, kl })),
    khac: { them, bo: cheDo === 'gop' ? [] : chiDich, giu: cheDo === 'gop' ? chiDich : [], doiKL: cheDo === 'gop' ? [] : doiKL },
    canhBao, chan, giongHet: !them.length && (cheDo === 'gop' || (!chiDich.length && !doiKL.length)),
  };
}

/**
 * Vị trí nguồn gợi ý cho 1 nhóm vị trí đích: có chi tiết HM, cùng loại; ưu tiên cùng gói, cùng phường, nhiều mã, đã sửa tay.
 * @returns [{ v, loai, diem }]
 */
export function goiYNguon(st, dichDs, { q = '', toiDa = 30, boQua = null } = {}) {
  const plMap = new Map((st.phuLuc || []).map((p) => [p.id, p]));
  const loaiD = new Set(dichDs.map((v) => loaiNhom(v, plMap.get(v.plId))));
  const idD = new Set(boQua ?? dichDs.map((v) => v.id));   // mặc định không gợi ý chính các vị trí đích
  const goiD = new Set(dichDs.map((v) => v.goi)), phD = new Set(dichDs.map((v) => fold(v.phuong)));
  const tu = fold(q).split(/\s+/).filter(Boolean);
  return (st.viTri || []).filter((v) => !idD.has(v.id) && (v.chiTiet || []).length && loaiD.has(loaiNhom(v, plMap.get(v.plId))))
    .filter((v) => !tu.length || tu.every((t) => fold(`${v.tram} ${v.phuong} ${v.tuyen} ${(v.chiTiet || []).map((c) => c.ma).join(' ')}`).includes(t)))
    .map((v) => ({ v, loai: loaiNhom(v, plMap.get(v.plId)), diem: (goiD.has(v.goi) ? 4 : 0) + (phD.has(fold(v.phuong)) ? 2 : 0) + (v.chiTietSua ? 1 : 0) + Math.min(v.chiTiet.length, 20) / 20 }))
    .sort((a, b) => b.diem - a.diem || String(a.v.tram).localeCompare(String(b.v.tram), 'vi')).slice(0, toiDa);
}
