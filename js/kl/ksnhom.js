// ksnhom.js — Nhóm hạng mục HĐ theo từng loại khảo sát (anh yêu cầu 10/11/2026:
// "phân loại nhóm hạng mục theo từng loại khảo sát"). Hàm thuần, không DOM.
// Quy tắc theo TÊN hạng mục (bỏ dấu, chữ thường) trên danh mục HĐ đang nhập — không cứng mã,
// để HĐ khác/bảng giá khác vẫn chạy. Dựng theo tên thật của bảng giá ký 2026–2029.
// Mỗi nhóm: { nhom: 'Tên nhóm', co: [regex…] (khớp 1 là vào), tru: [regex…] (khớp 1 là loại ra) }.

export const fold = (x) => String(x ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/gi, 'd').toLowerCase().replace(/\s+/g, ' ').trim();

// Đất/vỉa hè/mương cáp — dùng chung cho cáp ngầm, ngầm hoá
const DAO_HOAN_TRA = [/muong cap/, /mat duong|via he/, /^(dao|dap|rai|xuc|va|trong|lat|lang|tuoi nhu tuong) /, /^pha (bo|do) /, /^cat mat /,
  /^(lap dat|thao do) (van khuon|rao chan)/, /bang canh bao cap ngam/, /^cung cap (co|cat san lap|dat den|vai dia)/, /\bxa ban\b|dat du/];
const CAP_NGAM = [/cap (dien |nguon )?(di )?ngam/, /cap nguon ?cap dien ngam/, /^(lap dat|thay the|keo|thao do) .*ngam/, /cap nhom/];
const DE_CO_DINH = /de co dinh/;
const VAT_TU_PHU = /^cung cap /;

export const NHOM_THEO_LOAI = {
  thay_den: [
    { nhom: 'Thay bộ đèn', co: [/^thay the bo den/, /^thay the den (led|downlight|am|chieu|chi)/, /^cc, thay the bo den/], tru: [/nguon|ruot/] },
    { nhom: 'Lắp đặt bộ đèn', co: [/^lap dat bo den/, /^lap dat den pha led/], tru: [DE_CO_DINH] },
    { nhom: 'Tháo dỡ · di dời đèn', co: [/^thao do bo den/, /^di doi bo den/] },
    { nhom: 'Bóng · chấn lưu · kích', co: [/bong den|bong, |chan luu|kich den|bo chuyen mach 2 cap|^thay the tu dien tu |^thay the tu dien 50/] },
    { nhom: 'Linh kiện đèn LED', co: [/driver|module|bo nguon den|ruot den|chong set den|cum linh kien den/], tru: [/mccb|contactor/] },
  ],
  tang_cuong_den: [
    { nhom: 'Lắp đặt bộ đèn', co: [/^lap dat bo den duong led/, /^lap dat bo den \(sd/] },
    { nhom: 'Lắp đặt cần đèn', co: [/^lap dat can den/] },
    { nhom: 'Dây · cáp lên đèn', co: [/day len den|cap (dien )?len den|day dan 3 ruot/] },
  ],
  tc_den_kc_xa: [
    { nhom: 'Lắp đặt bộ đèn', co: [/^lap dat bo den duong led/, /^lap dat bo den \(sd/] },
    { nhom: 'Lắp đặt cần đèn', co: [/^lap dat can den/] },
    { nhom: 'Dây · cáp lên đèn', co: [/day len den|cap (dien )?len den|day dan 3 ruot/] },
  ],
  ngam_hoa: [
    { nhom: 'Cáp ngầm', co: CAP_NGAM, tru: [/^noi cap/] },
    { nhom: 'Ống · hộp · nối cáp', co: [/\bong hdpe|\bong thep han|\bong nhua (chong chay|xoan)/, /hop noi cap|hop dau noi cap/, /^noi cap ngam/], tru: [/mat duong|muong cap/] },
    { nhom: 'Đào · hoàn trả mặt bằng', co: DAO_HOAN_TRA, tru: [VAT_TU_PHU] },
    { nhom: 'Thu hồi cáp nổi · đèn', co: [/^thao do cap (noi|dien len den)/, /^thao do day dan/, /^thao do bo den/] },
  ],
  hkn: [
    { nhom: 'Hộp nối kín nước', co: [/hop noi cap .*kin nuoc/, /hop kin nuoc/] },
    { nhom: 'Hộp · cầu chì · cầu đấu', co: [/cau chi|cau dau|hop dau noi cap|hop bao ve dau cap/] },
  ],
  tc_noi: [
    { nhom: 'Cáp nguồn nổi', co: [/cap nguon noi|^thao do cap noi|^di doi cap nguon noi/], tru: [/noi ong/] },
    { nhom: 'Phụ kiện treo cáp', co: [/kep treo|kep dung|moc don|bu long moc|kep dau cap/] },
  ],
  tc_ngam: [
    { nhom: 'Cáp ngầm', co: CAP_NGAM, tru: [/^noi cap/] },
    { nhom: 'Nối cáp ngầm', co: [/^noi cap ngam/, /hop noi cap|hop dau noi cap/] },
    { nhom: 'Đào · hoàn trả mặt bằng', co: DAO_HOAN_TRA, tru: [VAT_TU_PHU] },
  ],
  cap_luon_can: [
    { nhom: 'Dây · cáp lên đèn', co: [/day len den|cap (dien )?len den|day dan 3 ruot/] },
  ],
  thay_can: [
    { nhom: 'Thay cần đèn', co: [/^thay the can den/] },
    { nhom: 'Lắp · tháo · di dời cần', co: [/^(lap dat|thao do|di doi) can den/] },
    { nhom: 'Kiềng · sơn cần', co: [/kieng can|son moi can den/] },
  ],
  thay_tru: [
    { nhom: 'Thay trụ', co: [/^thay the tru/] },
    { nhom: 'Lắp · tháo · di dời trụ', co: [/^(lap dat|thao do|di doi) tru/], tru: [DE_CO_DINH] },
    { nhom: 'Móng trụ', co: [/mong tru|khung thep mong|khung bu long mong/], tru: [/nang mong|khong bao gom (khung )?mong/] },
    { nhom: 'Sơn · chỉnh · cắt trụ', co: [/son moi tru|^chinh tru|^cat ngan tru|tay ri tru|^son tru|tam op|binh gang/] },
  ],
  choa_den: [
    { nhom: 'Chóa đèn', co: [/choa den/], tru: [/lap dat bo den|cum linh kien|bo nguon/] },
  ],
  nap_tru: [
    { nhom: 'Nắp cửa trụ', co: [/nap cua tru/] },
  ],
  vo_tu: [
    { nhom: 'Vỏ tủ', co: [/vo tu dieu khien/] },
    { nhom: 'Tủ điều khiển', co: [/tu dieu khien chieu sang/, /kieng tu|mong tu dieu khien/], tru: [/vo tu|^cung cap /] },
    { nhom: 'Khoá · phụ kiện tủ', co: [/o khoa|tui vai chong nuoc|bang ten tu|tam phip/] },
  ],
  decal_so_tru: [
    { nhom: 'Decal · bảng tên', co: [/decal|bang ten tu/] },
  ],
  nang_mong: [
    { nhom: 'Nâng móng', co: [/nang mong/] },
    { nhom: 'Móng trụ', co: [/mong tru|khung thep mong|khung bu long mong/], tru: [/khong bao gom (khung )?mong/] },
  ],
  thao_go_bang_ron: [
    { nhom: 'Băng rôn', co: [/bang ron/] },
  ],
  bao_cao_su_co: [
    { nhom: 'Xử lý sự cố', co: [/cham chap|do kiem tra dong ro|^di doi/] },
    { nhom: 'Thiết bị trong tủ', co: [/contactor|mccb|\bmcb\b|rccb|rcbo|bo dieu khien lap trinh|plc|bao ve dien ap|bien dong|cau chi|domino|do ?mi ?no|cau dau|ro le|chong set lan truyen/],
      tru: [/^thao do/] },
    { nhom: 'Thay bộ đèn', co: [/^thay the bo den/] },
  ],
};

/** Loại không có quy tắc riêng → trả mảng rỗng. */
export const LOAI_CO_NHOM = Object.keys(NHOM_THEO_LOAI);

/** Mã thuộc nhóm không (theo tên). */
export function khopNhom(nhom, ten) {
  const t = fold(ten);
  if (!t) return false;
  if ((nhom.tru || []).some((r) => r.test(t))) return false;
  return nhom.co.some((r) => r.test(t));
}

/**
 * Nhóm hạng mục của 1 loại khảo sát trên danh mục HĐ. Mỗi mã chỉ vào 1 nhóm (nhóm đầu tiên khớp).
 * @returns [{ nhom, ma: [..] }] — bỏ nhóm rỗng; mã xếp theo số thứ tự (HM186 < HM187 < HM187_cg).
 */
export function nhomCua(type, catalog = {}) {
  const ds = NHOM_THEO_LOAI[type] || [];
  const daCo = new Set();
  const out = ds.map((n) => ({ nhom: n.nhom, ma: [] }));
  // Ẩn mã _cg (anh chốt 10/11/2026) và mã không thuộc gói nào
  const ma = Object.keys(catalog).filter((m) => !/_cg$/i.test(m) && !(catalog[m]?.goi && !Object.keys(catalog[m].goi).length)).sort(soSanhMa);
  for (const m of ma) {
    for (let i = 0; i < ds.length; i++) {
      if (daCo.has(m)) break;
      if (khopNhom(ds[i], catalog[m]?.ten)) { out[i].ma.push(m); daCo.add(m); }
    }
  }
  return out.filter((n) => n.ma.length);
}

/** So mã HM theo số rồi hậu tố. */
export function soSanhMa(a, b) {
  const pa = /^([A-Za-z]*)(\d+)(.*)$/.exec(a) || [], pb = /^([A-Za-z]*)(\d+)(.*)$/.exec(b) || [];
  return (pa[1] || '').localeCompare(pb[1] || '') || (+pa[2] || 0) - (+pb[2] || 0) || String(pa[3] || '').localeCompare(String(pb[3] || ''));
}
