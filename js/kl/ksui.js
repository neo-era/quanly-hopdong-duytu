// ksui.js — Giao diện liên kết app Khảo sát (phương án B đã chốt 09/11/2026, docs/04_LienKet-KhaoSat.md):
// thống kê 4 ô lọc được + nhóm theo đích (PL III / PL II / Khác / Trùng) dạng accordion, chạm cả dòng để chọn,
// thẻ chi tiết khi bấm ⓘ, phân trang 50 dòng/nhóm, footer ghi rõ "phụ lục nháp · không cộng vào Đã vào KH".
import * as KS from './ks.js';
import { ksLinkInfo, ksLink, ksUnlink, ksPhienMay, ksList, ksPush } from './ksapi.js';

const NHOM = [['PLIII', 'PL III — Thay trụ'], ['PLII', 'PL II — Thay đèn (KL cột J nhập sau)'], ['PLIV', 'PL IV — Trụ trang trí'], ['KHAC', 'Khác — ngoài phụ lục'],
  ['TRUNG', 'Trùng phụ lục đã nhập / STT trùng'], ['XOA', 'Bản khảo sát đã bị xoá']];
const PILL = { moi: ['new', 'Mới'], thayDoi: ['chg', 'Thay đổi'], trungPL: ['dup', 'Trùng PL'], sttTrung: ['bad', 'STT trùng'], xoa: ['bad', 'Nguồn đã xoá'], daCo: ['dup', 'Đã lấy'] };
const PAGE = 50;
const homNay = () => new Date().toISOString().slice(0, 10);

/** Hộp "Liên kết app Khảo sát": trạng thái liên kết + các thao tác. c = ngữ cảnh từ ui.js. */
export async function moKS(c) {
  const { esc, openModal, api } = c;
  const info = await ksLinkInfo();
  const phien = ksPhienMay();
  if (!info || info.hetHan) {
    return openModal('Liên kết app Khảo sát', `
      <p class="muted">Lấy bản ghi khảo sát làm vị trí đề xuất và đẩy KL HĐ còn lại sang app Khảo sát. Cần tài khoản app Khảo sát có quyền <b>quản lý</b> hoặc <b>báo cáo</b>.
      App không lưu mật khẩu — chỉ giữ một mã liên kết 30 ngày${info?.hetHan ? ' (mã cũ đã hết hạn)' : ''}.</p>
      ${phien ? `<button class="btn amber ks-w" data-phien>Dùng tài khoản đang đăng nhập app Khảo sát: <b>${esc(phien.full_name || phien.username)}</b> (${esc(phien.role)})</button><p class="muted ks-or">hoặc đăng nhập</p>` : ''}
      <form class="kl-impf" data-f autocomplete="on">
        <label class="fld"><span>Tên đăng nhập app Khảo sát</span><input class="kl-in" name="u" autocomplete="username" required></label>
        <label class="fld"><span>Mật khẩu</span><input class="kl-in" name="p" type="password" autocomplete="current-password" required></label>
      </form>
      <p class="ks-err" role="alert" data-err></p>
      <div class="sheet-f"><button class="btn ghost" data-x>Huỷ</button><button class="btn ${phien ? 'ghost' : 'amber'}" data-go>Liên kết</button></div>`, {
      onMount: (el, close) => {
        const err = el.querySelector('[data-err]');
        const run = async (btn, args) => {
          btn.disabled = true; err.textContent = '';
          try { const l = await ksLink(args); close(); api.toast(`Đã liên kết app Khảo sát (${l.full_name || l.username}).`, 'ok'); moKS(c); }
          catch (e) { err.textContent = e.message; btn.disabled = false; }
        };
        el.querySelector('[data-phien]')?.addEventListener('click', (e) => run(e.currentTarget, { phien }));
        const go = el.querySelector('[data-go]');
        const submit = () => { const f = el.querySelector('[data-f]'); if (!f.u.value.trim() || !f.p.value) { err.textContent = 'Nhập tên đăng nhập và mật khẩu.'; return; } run(go, { username: f.u.value.trim(), password: f.p.value }); };
        go.onclick = submit;
        el.querySelector('[data-f]').onsubmit = (e) => { e.preventDefault(); submit(); };
      },
    });
  }
  openModal('Liên kết app Khảo sát', `
    <div class="kl-vinfo"><span>Đã liên kết: <b>${esc(info.full_name || info.username)}</b> (${esc(info.username)} · ${esc(info.role)})</span>
      <span>Mã liên kết hết hạn ${new Date(info.expires_at).toLocaleDateString('vi-VN')}</span></div>
    <div class="ks-acts">
      <button class="btn amber ks-w" data-lay>⤓ Lấy bản ghi khảo sát → vị trí đề xuất</button>
      <button class="btn ghost ks-w" data-day ${info.can_push ? '' : 'disabled'}>⇪ Đẩy tóm tắt HĐ sang app Khảo sát</button>
      ${info.can_push ? '' : '<p class="muted">Tài khoản này không có quyền quản lý nên không đẩy được dữ liệu HĐ.</p>'}
    </div>
    <div class="sheet-f"><button class="btn ghost del" data-ngat>Ngắt liên kết</button><button class="btn ghost" data-x>Đóng</button></div>`, {
    onMount: (el, close) => {
      el.querySelector('[data-lay]').onclick = () => { close(); moLayKS(c); };
      el.querySelector('[data-day]').onclick = () => { close(); moDay(c); };
      el.querySelector('[data-ngat]').onclick = async () => { await ksUnlink(); close(); api.toast('Đã ngắt liên kết app Khảo sát.', 'ok'); };
    },
  });
}

/** Lấy bản ghi khảo sát → xem trước → thêm vào phụ lục nháp. */
export function moLayKS(c) {
  const { esc, fmt, goiTen, openModal, api, st, rerender } = c;
  const S = st();
  const nam = new Date().getFullYear();
  const L = { types: Object.keys(KS.KS_MAP).filter((t) => !KS.KS_MAP[t].tat), layThem: [], from: `${nam}-01-01`, to: homNay(), phuong: '', namKH: nam,
    xt: null, loi: {}, tai: false, tienDo: '', loc: '', mo: new Set(['PLIII', 'PLII', 'KHAC']), trang: {}, chiTiet: '', chonGoi: {}, chonDich: {} };
  const goiAll = [...new Set(['G1', 'G2', 'G3', 'G4', ...S.viTri.map((v) => v.goi).filter(Boolean)])].sort();
  const nhomCua = (it) => (['trungPL', 'sttTrung'].includes(it.trangThai) ? 'TRUNG' : it.trangThai === 'xoa' ? 'XOA' : (L.chonDich[it.key] || it.dich));
  const hien = () => (L.xt?.items || []).filter((it) => it.trangThai !== 'daCo')
    .filter((it) => !L.phuong || c.norm(it.vt.phuong).includes(c.norm(L.phuong)))
    .filter((it) => !L.loc || (L.loc === 'thieuKL' ? it.thieuKL : it.trangThai === L.loc));
  const goiCua = (it) => L.chonGoi[it.key] || (it.goi && it.goi !== 'nhieu' ? it.goi : '');
  const chon = () => (L.xt?.items || []).filter((it) => it.chon);

  const rowHTML = (it) => {
    const [pc, pt] = PILL[it.trangThai] || ['', ''];
    const g = goiCua(it);
    const canGoi = !g || it.goi === 'nhieu';
    return `<div class="ks-r ${it.chon ? 'on' : ''}" data-k="${esc(it.key)}" role="checkbox" aria-checked="${it.chon}" tabindex="0">
      <span class="chk ${it.chon ? '' : 'off'}" aria-hidden="true">${it.chon ? '✓' : ''}</span>
      <div class="m"><div class="t">${esc(it.stt)} · ${esc(it.vt.tuyen || '—')}</div>
        <div class="kl-sub">${esc(it.vt.phuong || '—')} · ${esc(it.vt.tram || '—')}${it.vt.lyTrinhDau ? ' · ' + esc(it.vt.lyTrinhDau) : ''}</div></div>
      <div class="k"><b class="n">${it.vt.kl === null ? '—' : fmt(it.vt.kl)}</b> <span class="kl-sub">${esc(it.dvt || '')}</span>
        <div class="ks-pills">${pt ? `<span class="ks-pill ${pc}">${pt}</span>` : ''}${it.thieuKL ? `<span class="ks-pill bad">${it.dich === 'PLII' ? 'KL J nhập sau' : 'Thiếu KL'}</span>` : ''}${it.goiYPLIV ? '<span class="ks-pill chg">Trang trí?</span>' : ''}</div></div>
      ${canGoi ? `<select class="ks-goi" data-goi="${esc(it.key)}" aria-label="Chọn gói cho ${esc(it.stt)}"><option value="">${it.goi === 'nhieu' ? 'Nhiều gói – chọn' : 'Chưa rõ gói'}</option>${(it.goiList.length ? it.goiList : goiAll).map((x) => `<option value="${x}" ${g === x ? 'selected' : ''}>${goiTen(x)}</option>`).join('')}</select>`
        : `<span class="ks-g">${goiTen(g)}</span>`}
      <button class="ks-i" data-ct="${esc(it.key)}" aria-label="Chi tiết ${esc(it.stt)}" aria-expanded="${L.chiTiet === it.key}">ⓘ</button>
    </div>${L.chiTiet === it.key ? ctHTML(it) : ''}`;
  };
  const ctHTML = (it) => `<div class="ks-ct" role="region" aria-label="Chi tiết ${esc(it.stt)}">
    <div class="kv"><span>Khảo sát</span><b>${esc(KS.KS_MAP[it.type]?.ten)} · ${esc(it.stt)}</b><span>Đích</span><b>${esc(KS.TEN_DICH[L.chonDich[it.key] || it.dich])}</b>
      <span>Trạm · tuyến</span><b>${esc(it.vt.tram)} · ${esc(it.vt.tuyen)}</b>${it.vt.lyTrinhDau ? `<span>Lý trình</span><b>${esc(it.vt.lyTrinhDau)}${it.vt.lyTrinhCuoi ? ' → ' + esc(it.vt.lyTrinhCuoi) : ''}</b>` : ''}
      ${it.vt.hienHuu !== undefined ? `<span>Đèn hiện hữu (cột G)</span><b>${fmt(it.vt.hienHuu)}</b>` : ''}${it.vt.namLD ? `<span>Năm lắp đặt</span><b>${esc(it.vt.namLD)}</b>` : ''}
      ${it.vt.ghiChu ? `<span>Ghi chú</span><b>${esc(it.vt.ghiChu)}</b>` : ''}<span>Thuộc Sở</span><b>chưa xác minh — xác nhận ở tab Vị trí trước khi chuyển đợt</b></div>
    ${it.type === 'thay_tru' ? `<label class="kl-chk ks-44"><input type="checkbox" data-pliv="${esc(it.key)}" ${L.chonDich[it.key] === 'PLIV' ? 'checked' : ''}> Đưa vào PL IV (trụ trang trí)</label>` : ''}
    ${it.vt.link ? `<a class="btn ghost sm" href="${esc(it.vt.link)}" target="_blank" rel="noopener">Mở bản đồ</a>` : ''}</div>`;

  const body = () => {
    if (!L.xt) {
      return `<div class="ks-flt">
        <details class="ks-dd"><summary class="ks-chip on">Loại: ${L.types.length} ▾</summary><div class="ks-ddb">
          ${Object.entries(KS.KS_MAP).map(([k, M]) => `<label class="kl-chk ks-44"><input type="checkbox" data-ty="${k}" ${L.types.includes(k) ? 'checked' : ''}> ${esc(M.ten)} → ${esc(KS.TEN_DICH[M.dich].split(' · ')[0])}${M.tat ? ' <span class="kl-sub">(mặc định không lấy)</span>' : ''}</label>`).join('')}</div></details>
        <label class="fld"><span>Từ ngày</span><input type="date" class="kl-in" data-from value="${L.from}"></label>
        <label class="fld"><span>Đến ngày</span><input type="date" class="kl-in" data-to value="${L.to}"></label>
        <label class="fld"><span>Phường (lọc)</span><input class="kl-in" data-ph value="${esc(L.phuong)}" placeholder="vd Bàn Cờ"></label>
        <label class="fld"><span>Năm KH</span><select class="kl-in" data-nam>${[nam - 1, nam, nam + 1, nam + 2].map((y) => `<option ${y === L.namKH ? 'selected' : ''}>${y}</option>`).join('')}</select></label>
      </div>
      <p class="muted" aria-live="polite">${esc(L.tienDo)}</p>
      ${Object.keys(L.loi).length ? `<p class="ks-err">${Object.entries(L.loi).map(([t, m]) => `${esc(KS.KS_MAP[t]?.ten || t)}: ${esc(m)}`).join('<br>')}</p>` : ''}`;
    }
    const d = L.xt.dem;
    const tile = (k, n, t, cls) => `<button class="ks-tile ${cls} ${L.loc === k ? 'on' : ''}" data-loc="${k}" aria-pressed="${L.loc === k}"><b class="n">${fmt(n, 0)}</b><span>${t}</span></button>`;
    const items = hien();
    const groups = NHOM.map(([g, t]) => [g, t, items.filter((it) => nhomCua(it) === g)]).filter(([, , a]) => a.length);
    const daCo = L.xt.items.filter((it) => it.trangThai === 'daCo').length;
    return `<div class="ks-flt ks-flt2">
        <span class="ks-chip on">${L.types.length} loại</span><span class="ks-chip on">${esc(L.from.split('-').reverse().join('/'))}–${esc(L.to.split('-').reverse().join('/'))}</span>
        <label class="ks-chip"><span class="sr">Phường</span><input data-ph value="${esc(L.phuong)}" placeholder="Lọc phường…" aria-label="Lọc phường"></label>
        <span class="ks-chip">Năm KH ${L.namKH}</span><button class="ks-chip" data-lai>↺ Lọc lại</button></div>
      ${Object.keys(L.loi).length ? `<p class="ks-err">${Object.entries(L.loi).map(([t, m]) => `${esc(KS.KS_MAP[t]?.ten || t)}: ${esc(m)} <button class="btn ghost sm" data-lai>Thử lại</button>`).join('<br>')}</p>` : ''}
      <div class="ks-tiles">${tile('moi', d.moi, 'mới', 'g')}${tile('thayDoi', d.thayDoi, 'thay đổi', 'y')}${tile('trungPL', d.trungPL, 'trùng PL', '')}${tile('thieuKL', d.thieuKL, 'thiếu KL', 'r')}</div>
      ${daCo ? `<p class="muted">${fmt(daCo, 0)} bản đã lấy trước đây, không đổi — ẩn.</p>` : ''}
      ${groups.length ? groups.map(([g, t, a]) => {
        const nOn = a.filter((x) => x.chon).length;
        const open = L.mo.has(g);
        const lim = L.trang[g] || PAGE;
        return `<section class="ks-grp"><div class="ks-gh">
          <input type="checkbox" class="ks-gcb" data-gall="${g}" ${nOn === a.length ? 'checked' : ''} data-ind="${nOn > 0 && nOn < a.length ? 1 : 0}" aria-label="Chọn cả nhóm ${esc(t)}">
          <button class="ks-gt" data-mo="${g}" aria-expanded="${open}"><b>${esc(t)}</b><span class="kl-sub">${nOn}/${a.length} · ${fmt(a.reduce((s, x) => s + (+x.vt.kl || 0), 0))}</span><span aria-hidden="true">${open ? '▾' : '▸'}</span></button></div>
          ${open ? a.slice(0, lim).map(rowHTML).join('') + (a.length > lim ? `<button class="btn ghost ks-w" data-trang="${g}">Hiện thêm ${fmt(Math.min(PAGE, a.length - lim), 0)} / còn ${fmt(a.length - lim, 0)}</button>` : '') : ''}</section>`;
      }).join('') : '<div class="kl-empty"><h3>Không có bản ghi trong khoảng đã lọc</h3></div>'}`;
  };
  const foot = () => {
    const n = chon().length;
    return `<span class="ks-ft">→ <b>phụ lục nháp</b> · năm ${L.namKH} · không cộng vào "Đã vào KH"</span>
      <button class="btn ghost" data-x>Huỷ</button>
      ${L.xt ? `<button class="btn amber" data-them ${n && !L.tai ? '' : 'disabled'}>Thêm ${fmt(n, 0)} vị trí</button>` : `<button class="btn amber" data-tai ${L.tai || !L.types.length ? 'disabled' : ''}>${L.tai ? 'Đang lấy…' : 'Lấy dữ liệu'}</button>`}`;
  };

  openModal('Lấy từ app Khảo sát', `<div class="ks" data-ks>${body()}</div><div class="sheet-f ks-sf" data-foot>${foot()}</div>`, {
    wide: true,
    onMount: (el, close) => {
      const host = el.querySelector('[data-ks]'), ft = el.querySelector('[data-foot]');
      el.classList.add('ks-sheet');
      const paint = () => {
        host.innerHTML = body(); ft.innerHTML = foot();
        host.querySelectorAll('[data-ind="1"]').forEach((x) => { x.indeterminate = true; });
      };
      const tai = async () => {
        L.tai = true; L.loi = {}; L.tienDo = 'Đang kết nối…'; paint();
        try {
          const types = [...new Set([...L.types])];
          const r = await ksList(types, { from: L.from, to: L.to }, (i, n, t) => { L.tienDo = t ? `Đang lấy ${KS.KS_MAP[t]?.ten || t} (${i + 1}/${n})` : ''; paint(); });
          L.loi = r.loi;
          L.xt = KS.xemTruoc(S, r.rows, { namKH: L.namKH, layThem: types.filter((t) => KS.KS_MAP[t]?.tat) });
        } catch (e) { L.tienDo = ''; L.loi = { _: e.message }; }
        L.tai = false; paint();
      };
      const toggle = (key) => { const it = L.xt.items.find((x) => x.key === key); if (it) { it.chon = !it.chon; paint(); host.querySelector(`[data-k="${CSS.escape(key)}"]`)?.focus(); } };
      el.addEventListener('click', async (e) => {
        const t = e.target;
        if (t.closest('[data-x]')) return;
        if (t.closest('[data-tai]')) return tai();
        if (t.closest('[data-lai]')) { L.xt = null; L.loi = {}; return paint(); }
        const loc = t.closest('[data-loc]'); if (loc) { L.loc = L.loc === loc.dataset.loc ? '' : loc.dataset.loc; return paint(); }
        const mo = t.closest('[data-mo]'); if (mo) { L.mo.has(mo.dataset.mo) ? L.mo.delete(mo.dataset.mo) : L.mo.add(mo.dataset.mo); return paint(); }
        const tr = t.closest('[data-trang]'); if (tr) { L.trang[tr.dataset.trang] = (L.trang[tr.dataset.trang] || PAGE) + PAGE; return paint(); }
        const ct = t.closest('[data-ct]'); if (ct) { L.chiTiet = L.chiTiet === ct.dataset.ct ? '' : ct.dataset.ct; return paint(); }
        if (t.closest('select, input, a, label, details, summary')) return;
        const r = t.closest('[data-k]'); if (r) return toggle(r.dataset.k);
        if (t.closest('[data-them]')) {
          const items = chon();
          let k = {};
          await api.mutate(() => { k = KS.apDung(S, items, { namKH: L.namKH, chonGoi: L.chonGoi, chonDich: L.chonDich }); });
          close();
          api.toast(`Đã thêm ${fmt(k.them || 0, 0)} · cập nhật ${fmt(k.capNhat || 0, 0)}${k.giuKL ? ` · ${k.giuKL} vị trí đã thực hiện giữ KL` : ''}${k.xoa ? ` · ${k.xoa} đánh dấu nguồn đã xoá` : ''} — vào phụ lục nháp.`, 'ok');
          rerender();
        }
      });
      el.addEventListener('keydown', (e) => { const r = e.target.closest?.('[data-k]'); if (r && e.target === r && (e.key === ' ' || e.key === 'Enter')) { e.preventDefault(); toggle(r.dataset.k); } });
      el.addEventListener('change', (e) => {
        const t = e.target;
        if (t.dataset.ty) { const s = new Set(L.types); t.checked ? s.add(t.dataset.ty) : s.delete(t.dataset.ty); L.types = [...s]; ft.innerHTML = foot(); host.querySelector('summary').textContent = `Loại: ${L.types.length} ▾`; return; }
        if (t.dataset.from !== undefined) L.from = t.value;
        if (t.dataset.to !== undefined) L.to = t.value;
        if (t.dataset.nam !== undefined) L.namKH = +t.value;
        if (t.dataset.goi) { L.chonGoi[t.dataset.goi] = t.value; const it = L.xt.items.find((x) => x.key === t.dataset.goi); if (it && t.value) it.chon = true; return paint(); }
        if (t.dataset.pliv) { t.checked ? (L.chonDich[t.dataset.pliv] = 'PLIV') : delete L.chonDich[t.dataset.pliv]; return paint(); }
        if (t.dataset.gall) { const on = t.checked; hien().filter((it) => nhomCua(it) === t.dataset.gall).forEach((it) => { it.chon = on; }); return paint(); }
      });
      let ph = 0;
      el.addEventListener('input', (e) => { if (e.target.dataset.ph === undefined) return; clearTimeout(ph); const v = e.target.value; ph = setTimeout(() => { L.phuong = v; if (L.xt) { paint(); const i = host.querySelector('[data-ph]'); if (i) { i.focus(); i.setSelectionRange(v.length, v.length); } } }, 250); });
      paint();
    },
  });
}

/** Đẩy bản tóm tắt HĐ (năm chọn) sang app Khảo sát. */
export function moDay(c) {
  const { esc, fmt, openModal, api, st, confirmBox } = c;
  const S = st();
  const nam = new Date().getFullYear();
  const html = (y) => {
    const p = KS.tomTat(S, y);
    const size = JSON.stringify(p).length;
    return `<p class="muted">Gửi sang app Khảo sát: gói, mã gói thầu, KL HĐ phần Sapulico / đã vào KH / còn lại theo mã HM; phường → gói; mã HM của từng loại khảo sát; trạng thái các bản ghi đã lấy. Không gửi giá trị tiền, đơn giá, số hợp đồng.</p>
      <label class="fld"><span>Năm</span><select class="kl-in" data-y>${[nam - 1, nam, nam + 1].map((x) => `<option ${x === y ? 'selected' : ''}>${x}</option>`).join('')}</select></label>
      <div class="kl-plnum"><span><b class="n">${fmt(p.tomTat.length, 0)}</b> dòng mã HM</span><span><b class="n">${fmt(p.phuongGoi.length, 0)}</b> phường</span><span><b class="n">${fmt(p.lienKet.length, 0)}</b> bản ghi liên kết</span></div>
      ${!p.phuongGoi.length ? '<p class="ks-err">Chưa có phụ lục nào có gói theo phường — app Khảo sát sẽ báo "phường chưa có trong HĐ".</p>' : ''}
      ${size > 1e6 || p.tomTat.length > 5000 ? '<p class="ks-err">Dữ liệu vượt giới hạn 1.000.000 ký tự / 5.000 dòng — chọn lại năm.</p>' : ''}
      <p class="ks-err" role="alert" data-err></p>
      <div class="sheet-f"><button class="btn ghost" data-x>Huỷ</button><button class="btn amber" data-go ${size > 1e6 || p.tomTat.length > 5000 ? 'disabled' : ''}>⇪ Đẩy sang app Khảo sát</button></div>`;
  };
  let y = nam;
  openModal('Đẩy tóm tắt HĐ sang app Khảo sát', `<div data-h>${html(y)}</div>`, {
    onMount: (el, close) => {
      const h = el.querySelector('[data-h]');
      el.addEventListener('change', (e) => { if (e.target.dataset.y !== undefined) { y = +e.target.value; h.innerHTML = html(y); } });
      el.addEventListener('click', async (e) => {
        const b = e.target.closest('[data-go]'); if (!b) return;
        const err = h.querySelector('[data-err]');
        b.disabled = true; b.textContent = 'Đang gửi…'; err.textContent = '';
        const data = KS.tomTat(S, y);
        const meta = { source_file_id: api.getData().updatedAt || 'qlhd', generated_at: new Date().toISOString() };
        try {
          let r;
          try { r = await ksPush(data, meta); }
          catch (x) {
            if (!/cũ hơn/.test(x.message)) throw x;
            if (!(await confirmBox(x.message + ' Vẫn ghi đè bằng dữ liệu đang mở?', 'Ghi đè'))) return;
            r = await ksPush(data, meta, { force: true });
          }
          close(); api.toast(`Đã đẩy sang app Khảo sát (bản ${r.version}).`, 'ok');
        } catch (x) { if (h.isConnected) { err.textContent = x.message; b.disabled = false; b.textContent = '⇪ Đẩy sang app Khảo sát'; } else api.toast(x.message, 'err'); }
      });
    },
  });
}
