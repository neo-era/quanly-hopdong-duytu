// kl/ui.js — Màn "KL theo vị trí ↔ hạng mục HĐ".
// Tab Vị trí: dạng sổ phụ lục (PA 1). Tab Đối chiếu: bàn đối chiếu theo mã HM (PA 2). + Mẫu HM, Phụ lục đã nhập.
import * as K from './core.js';
import { PL_TEMPLATES } from './templates.js';

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
const fmt = (n, d = 2) => (n === null || n === undefined || n === '' ? '—' : (+n).toLocaleString('vi-VN', { maximumFractionDigits: d }));
const tien = (n) => { const a = Math.abs(n || 0); return a >= 1e9 ? fmt(n / 1e9, 2) + ' tỷ' : a >= 1e6 ? fmt(n / 1e6, 1) + ' tr' : fmt(n, 0); };
const goiTen = (g) => (g ? 'Gói ' + g.replace(/^G/, '') : '—');
const thangNay = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; };
const thangTen = (t) => (t ? esc(String(t).replace(/^(\d{4})-(\d{2})$/, 'T$2/$1')) : '');
const PAGE = 400;

let api = null;
/** Danh sách gói: G1–G4 + mọi gói có trong bảng giá HĐ và dữ liệu (không mất gói 5, 6…). */
const goiList = (S, extra) => [...new Set(['G1', 'G2', 'G3', 'G4', ...Object.values(S.catalog).flatMap((it) => Object.keys(it.goi || {})), ...S.viTri.map((v) => v.goi), extra].filter(Boolean))]
  .sort((a, b) => (+a.slice(1) || 0) - (+b.slice(1) || 0));
const ui = { tab: 'vitri', f: { loai: '', plId: '', goi: '', donVi: '', trangThai: '', q: '' }, sel: new Set(), limit: PAGE,
  dc: { goi: '', nam: 0, ma: '', open: new Set(), touched: false, tatCa: false, phan: 'ld' }, mauLoai: 'PLI', focus: '' };

const st = () => { const d = api.getData(); if (!d.klvt) d.klvt = K.emptyState(); return d.klvt; };
const isLandPhone = () => matchMedia('(orientation: landscape) and (max-height: 520px)').matches;

// ============ Khung ============
export function renderKL(root, a) {
  api = a;
  const S = st();
  const nVT = S.viTri.length;
  root.innerHTML = `
  <div class="kl">
    <div class="kl-top">
      <button class="kl-back" data-go="dashboard" aria-label="Quay lại">‹</button>
      <div class="kl-ttl"><b>KL theo vị trí ↔ hạng mục HĐ</b>
        <span>${S.phuLuc.length} phụ lục · ${fmt(nVT, 0)} vị trí · ${Object.keys(S.catalog).length ? fmt(Object.keys(S.catalog).length, 0) + ' mã HM' : 'chưa có bảng giá HĐ'}</span></div>
      <div class="kl-acts">
        <button class="btn ghost sm" data-kl="nhapHM">⤓ Bảng giá HĐ</button>
        <button class="btn ghost sm" data-kl="nhapPL">⤓ Nhập phụ lục</button>
        <button class="btn ghost sm" data-kl="nhapTH" ${nVT ? '' : 'disabled'}>⤓ Nhập đã thực hiện</button>
        <button class="btn amber sm" data-kl="xuat" ${S.phuLuc.length ? '' : 'disabled'}>⇪ Xuất Excel trình Sở</button>
      </div>
    </div>
    <div class="kl-tabs" role="tablist">
      ${[['vitri', 'Vị trí'], ['doichieu', 'Đối chiếu HM'], ['mau', 'Mẫu chi tiết HM'], ['phuluc', 'Phụ lục đã nhập']].map(([k, t]) =>
        `<button role="tab" class="kl-tab ${ui.tab === k ? 'on' : ''}" aria-selected="${ui.tab === k}" data-tab="${k}">${t}</button>`).join('')}
    </div>
    <div class="kl-view" id="klView"></div>
  </div>`;
  const v = root.querySelector('#klView');
  if (!S.phuLuc.length && ui.tab !== 'mau' && ui.tab !== 'phuluc') v.innerHTML = emptyHTML(S);
  else if (ui.tab === 'vitri') renderViTri(v);
  else if (ui.tab === 'doichieu') renderDoiChieu(v);
  else if (ui.tab === 'mau') renderMau(v);
  else renderPhuLuc(v);
  root.onclick = onClick; root.onchange = onChange; root.oninput = onInput;
  root.onkeydown = (e) => { // Enter / Space trên dòng hoặc thẻ vị trí = mở chi tiết
    const t = e.target.closest?.('[data-vt]');
    if (!t || e.target !== t || (e.key !== 'Enter' && e.key !== ' ')) return;
    e.preventDefault(); if (isLandPhone()) { ui.focus = t.dataset.vt; rerender(); } else openViTri(t.dataset.vt);
  };
}
const rerender = () => (api.render ? api.render() : renderKL(document.getElementById('view'), api));

function emptyHTML(S) {
  return `<div class="kl-empty">
    <h3>Chưa có phụ lục nào</h3>
    <p>Bắt đầu theo 2 bước: <b>1.</b> nhập file bảng giá HĐ (có sheet "Tong hop HM" và Gx_11C) để có KL hợp đồng theo mã HM;
    <b>2.</b> nhập các file phụ lục trình Sở (PL I tủ, PL II đèn LED, PL III trụ, PL IV trụ trang trí).</p>
    <div class="kl-empty-acts">
      <button class="btn ${Object.keys(S.catalog).length ? 'ghost' : 'amber'}" data-kl="nhapHM">1. Nhập bảng giá HĐ${Object.keys(S.catalog).length ? ' ✓' : ''}</button>
      <button class="btn amber" data-kl="nhapPL">2. Nhập phụ lục trình Sở</button>
    </div></div>`;
}

// ============ Tab Vị trí (sổ phụ lục) ============
function renderViTri(el) {
  const S = st();
  const list = K.locViTri(S, ui.f);
  const by = (k) => { const m = new Map(); for (const v of S.viTri) { const x = typeof k === 'function' ? k(v) : v[k]; if (x) m.set(x, (m.get(x) || 0) + 1); } return m; };
  const plOf = new Map(S.phuLuc.map((p) => [p.id, p]));
  const rail = (title, key, entries, label = (x) => x) => `<div class="kl-rg"><h4>${title}</h4>
    <button class="kl-it ${!ui.f[key] ? 'on' : ''}" data-f="${key}" data-v="">Tất cả</button>
    ${entries.map(([v, n]) => `<button class="kl-it ${ui.f[key] === v ? 'on' : ''}" data-f="${key}" data-v="${esc(v)}"><span>${esc(label(v))}</span><span class="n">${fmt(n, 0)}</span></button>`).join('')}</div>`;
  const plEntries = S.phuLuc.map((p) => [p.id, S.viTri.filter((v) => v.plId === p.id).length]);
  const chuaGan = S.viTri.filter((v) => !(v.chiTiet || []).length).length;

  const shown = list.slice(0, ui.limit);
  const groups = new Map();
  for (const v of shown) { const k = `${v.plId}§${v.nhom}`; if (!groups.has(k)) groups.set(k, []); groups.get(k).push(v); }
  const tongKL = list.reduce((a, v) => a + (+v.kl || 0), 0);
  const chips = (v) => (v.chiTiet || []).length
    ? `<div class="kl-hm">${v.chiTiet.map((c) => `<span class="kl-chip ${S.catalog[c.ma] ? '' : 'bad'}" title="${esc(S.catalog[c.ma]?.ten || 'Không có trong danh mục HĐ')}">${esc(c.ma)} ×${fmt(c.kl)}</span>`).join('')}</div>`
    : '<span class="pill red mini">Chưa gắn HM</span>';
  const stt = (v) => v.trangThai === 'da' ? `<span class="pill grn mini">Đã TH${v.thangNT ? ' · ' + thangTen(v.thangNT) : ''}</span>` : v.trangThai === 'dang' ? '<span class="pill org mini">Đang làm</span>' : '<span class="pill mut mini">Chưa làm</span>';

  let rows = '', cards = '';
  for (const [k, items] of groups) {
    const pl = plOf.get(items[0].plId);
    const allSel = items.every((v) => ui.sel.has(v.id));
    const sum = items.reduce((a, v) => a + (+v.kl || 0), 0);
    rows += `<tr class="grp"><td><input type="checkbox" class="kl-cb" data-selg="${esc(k)}" ${allSel ? 'checked' : ''} aria-label="Chọn cả phường"></td>
      <td colspan="4">${esc(items[0].nhom || '(chưa rõ phường)')} <span class="kl-sub">${esc(K.LOAI_TEN[pl?.loai] || '')}</span></td><td class="r n">${fmt(sum)}</td><td colspan="3"></td></tr>`;
    cards += `<div class="kl-ph"><span>${esc(items[0].nhom || '(chưa rõ phường)')}</span><span class="n">${fmt(sum)} ${esc(PL_TEMPLATES[pl?.loai]?.dvt || '')}</span></div>`;
    for (const v of items) {
      const on = ui.sel.has(v.id);
      rows += `<tr class="${on ? 'sel' : ''}" data-vt="${v.id}" tabindex="0" aria-label="${esc(v.tram)} — Enter để mở chi tiết"><td><input type="checkbox" class="kl-cb" data-sel="${v.id}" ${on ? 'checked' : ''} aria-label="Chọn"></td>
        <td class="n">${esc(v.stt)}</td><td><b>${esc(v.tram)}</b>${v.boSungTu ? '' : ''}</td><td>${esc(v.phuong)}</td><td>${esc(v.tuyen)}${v.lyTrinhDau ? `<div class="kl-sub">${esc(v.lyTrinhDau)} → ${esc(v.lyTrinhCuoi)}</div>` : ''}</td>
        <td class="r n">${fmt(v.kl)}</td><td>${esc(goiTen(v.goi))}<div class="kl-sub">${esc(v.donVi)}</div></td><td>${chips(v)}</td><td>${stt(v)}</td></tr>`;
      cards += `<div class="kl-card ${on ? 'sel' : ''} ${ui.focus === v.id ? 'focus' : ''}" data-vt="${v.id}" tabindex="0" role="button" aria-label="${esc(v.tram)} — mở chi tiết">
        <div class="h"><span class="kl-cn"><input type="checkbox" class="kl-cb" data-sel="${v.id}" ${on ? 'checked' : ''} aria-label="Chọn ${esc(v.tram)}"> ${esc(v.tram)}</span><span class="n">${fmt(v.kl)} ${esc(PL_TEMPLATES[pl?.loai]?.dvt || '')}</span></div>
        <div class="s">${esc(v.tuyen)} · ${esc(goiTen(v.goi))}${v.donVi ? ' · ' + esc(v.donVi) : ''}${v.namLD ? ' · lắp ' + esc(v.namLD) : ''}</div>${chips(v)}<div class="st">${stt(v)}</div></div>`;
    }
  }
  const focusV = ui.focus && S.viTri.find((x) => x.id === ui.focus);
  const selVT = ui.sel.size ? S.viTri.filter((v) => ui.sel.has(v.id)) : [];
  el.innerHTML = `
  <div class="kl-body">
    <aside class="kl-rail">
      ${rail('Phụ lục', 'plId', plEntries, (id) => { const p = plOf.get(id); return `${K.LOAI_TEN[p.loai]}${p.dot ? ' · ' + p.dot : ''}`; })}
      ${rail('Gói', 'goi', [...by('goi')].sort(), goiTen)}
      ${rail('Đơn vị', 'donVi', [...by('donVi')].sort())}
      ${rail('Trạng thái', 'trangThai', [['chua', S.viTri.filter((v) => v.trangThai !== 'da' && v.trangThai !== 'dang').length], ['dang', by((v) => v.trangThai === 'dang' ? 1 : 0).get(1) || 0], ['da', S.viTri.filter((v) => v.trangThai === 'da').length], ['chuaGan', chuaGan]],
        (x) => ({ chua: 'Chưa làm', dang: 'Đang làm', da: 'Đã thực hiện', chuaGan: 'Chưa gắn HM' }[x]))}
    </aside>
    <section class="kl-main">
      <div class="kl-bar">
        <input class="kl-search" type="search" placeholder="Tìm trạm đèn, tuyến, phường…" value="${esc(ui.f.q)}" data-q aria-label="Tìm">
        <select class="kl-sel-m" data-fsel="plId" aria-label="Phụ lục"><option value="">Mọi phụ lục</option>${S.phuLuc.map((p) => `<option value="${p.id}" ${ui.f.plId === p.id ? 'selected' : ''}>${esc(K.LOAI_TEN[p.loai])}${p.dot ? ' · ' + esc(p.dot) : ''}</option>`).join('')}</select>
        <select class="kl-sel-m" data-fsel="goi" aria-label="Gói"><option value="">Mọi gói</option>${[...by('goi').keys()].sort().map((g) => `<option value="${g}" ${ui.f.goi === g ? 'selected' : ''}>${goiTen(g)}</option>`).join('')}</select>
        <select class="kl-sel-m" data-fsel="trangThai" aria-label="Trạng thái">${[['', 'Mọi trạng thái'], ['chua', 'Chưa làm'], ['dang', 'Đang làm'], ['da', 'Đã thực hiện'], ['chuaGan', 'Chưa gắn HM']].map(([k, t]) => `<option value="${k}" ${ui.f.trangThai === k ? 'selected' : ''}>${t}</option>`).join('')}</select>
        <select class="kl-sel-m" data-fsel="donVi" aria-label="Đơn vị"><option value="">Mọi đơn vị</option>${[...by('donVi').keys()].sort().map((d) => `<option value="${esc(d)}" ${ui.f.donVi === d ? 'selected' : ''}>${esc(d)}</option>`).join('')}</select>
        <span class="kl-count">${fmt(list.length, 0)} vị trí · ${fmt(tongKL)}</span>
      </div>
      <div class="kl-split">
        <div class="kl-tw"><table class="kl-tb">
          <thead><tr><th><input type="checkbox" class="kl-cb" data-selall ${list.length && list.every((v) => ui.sel.has(v.id)) ? 'checked' : ''} aria-label="Chọn tất cả"></th><th>Stt</th><th>Trạm đèn</th><th>Phường-Xã</th><th>Tuyến đường</th><th class="r">KL</th><th>Gói / Đơn vị</th><th>Chi tiết HM</th><th>Trạng thái</th></tr></thead>
          <tbody>${rows || `<tr><td colspan="9" class="empty">Không có vị trí khớp bộ lọc.</td></tr>`}</tbody></table>
          <div class="kl-cards">${cards || '<div class="empty">Không có vị trí khớp bộ lọc.</div>'}</div>
          ${list.length > ui.limit ? `<button class="btn ghost kl-more" data-kl="more">Hiện thêm (${fmt(list.length - ui.limit, 0)} vị trí nữa)</button>` : ''}
        </div>
        <div class="kl-focus">${focusV ? focusHTML(focusV) : '<div class="empty">Chạm một vị trí để xem chi tiết HM.</div>'}</div>
      </div>
      <div class="kl-sbar ${ui.sel.size ? 'on' : ''}">
        <b>${fmt(ui.sel.size, 0)} vị trí đã chọn</b>
        <span class="kl-sub">· ${fmt(selVT.reduce((a, v) => a + (+v.kl || 0), 0))} · ${fmt(selVT.reduce((a, v) => a + (v.chiTiet?.length || 0), 0), 0)} dòng HM</span>
        <div class="kl-sbar-acts">
          <button class="btn ghost sm" data-kl="boChon">Bỏ chọn</button>
          <button class="btn ghost sm" data-kl="ganMau">Gắn mẫu HM</button>
          <button class="btn ghost sm" data-kl="boTH">Đặt lại "Chưa làm"</button>
          <button class="btn amber" data-kl="danhDau">✓ Đánh dấu đã thực hiện</button>
        </div>
      </div>
    </section>
  </div>`;
}

function focusHTML(v) {
  const S = st();
  return `<div class="kl-fh"><b>${esc(v.tram)}</b><div class="kl-sub">${esc(v.phuong)} · ${esc(v.tuyen)} · ${esc(goiTen(v.goi))}${v.donVi ? ' · ' + esc(v.donVi) : ''}</div></div>
    <table class="kl-tb tight"><thead><tr><th>Mã HM</th><th class="r">KL KH</th><th class="r">KL TH</th></tr></thead><tbody>
    ${(v.chiTiet || []).map((c) => `<tr><td class="n">${esc(c.ma)}<div class="kl-sub">${esc(S.catalog[c.ma]?.ten || '')}</div></td><td class="r n">${fmt(c.kl)}</td><td class="r n">${v.trangThai === 'da' ? fmt((v.thucHien || {})[c.ma] ?? c.kl) : '—'}</td></tr>`).join('') || '<tr><td colspan="3" class="empty">Chưa gắn HM</td></tr>'}
    </tbody></table><button class="btn ghost sm" data-open="${v.id}" style="margin-top:8px">✎ Sửa chi tiết</button>`;
}

// ============ Tab Đối chiếu (bàn đối chiếu) ============
function dcOptions() {
  const S = st();
  const goi = [...new Set([...S.viTri.map((v) => v.goi).filter(Boolean)])].sort();
  const nam = [...new Set([...S.phuLuc.map((p) => +p.namKH)])].sort();
  if (!ui.dc.goi || !goi.includes(ui.dc.goi)) {
    const dem = (g) => S.viTri.filter((v) => v.goi === g && (v.chiTiet || []).length).length * 1e6 + S.viTri.filter((v) => v.goi === g).length;
    ui.dc.goi = [...goi].sort((a, b) => dem(b) - dem(a))[0] || '';
  }
  if (!ui.dc.nam || !nam.includes(ui.dc.nam)) ui.dc.nam = nam[nam.length - 1] || new Date().getFullYear();
  return { goi, nam };
}
function renderDoiChieu(el) {
  const S = st();
  const { goi, nam } = dcOptions();
  const khongGoi = S.viTri.filter((v) => !v.goi).length;
  if (!goi.length) { el.innerHTML = `<div class="kl-empty"><h3>Chưa có vị trí nào được gán gói</h3><p>${fmt(khongGoi, 0)} vị trí chưa có gói nên chưa đối chiếu được với KL hợp đồng. Mở từng vị trí (hoặc nhập lại phụ lục, chọn "gán gói") để gán gói.</p></div>`; return; }
  const bg = S.bangGia?.[ui.dc.goi];
  if (ui.dc.phan === 'sap' && !bg?.lienDanh) ui.dc.phan = 'ld';
  const opt = { phan: ui.dc.phan };
  const d = K.doiChieu(S, ui.dc.goi, ui.dc.nam, opt);
  let rows = d.rows;
  if (ui.dc.tatCa) {
    const have = new Set(rows.map((r) => r.ma));
    for (const [ma, it] of Object.entries(S.catalog)) {
      const gg = it.goi?.[ui.dc.goi];
      const hd = ui.dc.phan === 'sap' ? gg?.klSap?.[ui.dc.nam] ?? gg?.kl?.[ui.dc.nam] : gg?.kl?.[ui.dc.nam];
      if (hd && !have.has(ma)) rows = rows.concat([{ ma, ten: it.ten, dvt: it.dvt, hd, kh: 0, th: 0, khConLai: 0, hdConLai: hd, vuot: false, nVT: 0, dg: gg.dgNam?.[ui.dc.nam] ?? gg.dg ?? 0, tienKH: 0 }]);
    }
  }
  if (!ui.dc.ma || !rows.find((r) => r.ma === ui.dc.ma)) ui.dc.ma = rows[0]?.ma || '';
  const noCat = !Object.keys(S.catalog).length;
  const card = (r) => {
    const mx = Math.max(r.hd, r.kh, 1) * 1.04;
    return `<button class="kl-hmc ${ui.dc.ma === r.ma ? 'on' : ''}" data-ma="${esc(r.ma)}">
      <div class="h"><b class="n">${esc(r.ma)}</b>${r.khongCoTrongHD ? '<span class="pill red mini">Không có trong HĐ</span>' : r.vuot ? `<span class="pill red mini">Vượt ${fmt(r.kh - r.hd)}</span>` : `<span class="pill grn mini">Còn ${fmt(r.hdConLai)}</span>`}</div>
      <div class="nm">${esc(r.ten || '—')}${r.dvt ? ' · ' + esc(r.dvt) : ''}</div>
      <div class="kl-stk" aria-hidden="true"><i class="kh" style="width:${(r.kh / mx) * 100}%"></i><i class="th" style="width:${(r.th / mx) * 100}%"></i><i class="mk" style="left:${(r.hd / mx) * 100}%"></i></div>
      <div class="leg"><span>HĐ <b class="n">${fmt(r.hd)}</b></span><span>KH <b class="n">${fmt(r.kh)}</b></span><span>Đã TH <b class="n">${fmt(r.th)}</b></span><span>KH còn <b class="n">${fmt(r.khConLai)}</b></span></div></button>`;
  };
  const sel = rows.find((r) => r.ma === ui.dc.ma);
  el.innerHTML = `
  <div class="kl-dc">
    <div class="kl-dcbar">
      <label>Gói <select data-dc="goi">${goi.map((g) => `<option value="${g}" ${g === ui.dc.goi ? 'selected' : ''}>${goiTen(g)}</option>`).join('')}</select></label>
      <label>Năm <select data-dc="nam">${nam.map((n) => `<option ${n === ui.dc.nam ? 'selected' : ''}>${n}</option>`).join('')}</select></label>
      ${bg?.lienDanh ? `<label>Phạm vi <select data-dc="phan"><option value="ld" ${ui.dc.phan === 'ld' ? 'selected' : ''}>Cả liên danh</option><option value="sap" ${ui.dc.phan === 'sap' ? 'selected' : ''}>Phần Sapulico</option></select></label>` : ''}
      <label class="kl-chk"><input type="checkbox" data-dc="tatCa" ${ui.dc.tatCa ? 'checked' : ''}> Hiện cả mã HM chưa đưa vào KH</label>
      ${noCat ? '<span class="pill org mini">Chưa nhập bảng giá HĐ — cột KL HĐ đang trống</span>'
        : bg ? `<span class="pill grn mini" title="${esc(bg.file)} › ${esc(bg.sheet)}">KL HĐ & đơn giá: bảng giá ký HĐ${bg.lienDanh ? ' · liên danh ' + esc(bg.doiTac || '') : ''}</span>`
        : '<span class="pill org mini">KL HĐ theo Tong hop HM — chưa có bảng giá ký HĐ của gói này</span>'}
    </div>
    <div class="kl-kpis">
      <div class="k"><span>Mã HM có trong KH</span><b class="n">${fmt(d.rows.length, 0)}</b></div>
      <div class="k"><span>Vượt KL HĐ</span><b class="n" style="color:var(--red)">${fmt(d.soVuot, 0)}</b></div>
      <div class="k"><span>Vị trí đã thực hiện</span><b class="n">${fmt(d.soVTDaTH, 0)}<small> / ${fmt(d.soVT, 0)}</small></b></div>
      <div class="k"><span>Giá trị KH theo đơn giá HĐ</span><b class="n">${tien(d.tienKH)}</b></div>
      <div class="k"><span>Chưa gắn HM${khongGoi ? ' · chưa có gói' : ''}</span><b class="n" style="color:${d.chuaGanHM || khongGoi ? 'var(--org)' : 'inherit'}">${fmt(d.chuaGanHM, 0)}${khongGoi ? ` · ${fmt(khongGoi, 0)}` : ''} vị trí</b></div>
    </div>
    <div class="kl-dcbody">
      <div class="kl-hmlist">${rows.map(card).join('') || '<div class="empty">Chưa có vị trí nào gắn mã HM cho gói/năm này. Vào tab "Mẫu chi tiết HM" để khai mẫu, rồi "Gắn mẫu HM".</div>'}</div>
      <div class="kl-det">${sel ? detHTML(S, sel) : ''}</div>
    </div>
    ${sel ? `<div class="kl-msheet"><div class="grab"></div><div class="h"><b>${esc(sel.ma)} · ${fmt(sel.nVT, 0)} vị trí</b>${sel.vuot ? `<span class="pill red mini">Vượt ${fmt(sel.kh - sel.hd)}</span>` : ''}</div>
      <button class="btn amber" data-kl="xemVT">Xem vị trí cấu thành</button></div>` : ''}
  </div>`;
}
function detHTML(S, r) {
  const vts = K.viTriCuaHM(S, r.ma, ui.dc.goi, ui.dc.nam, { phan: ui.dc.phan });
  const byNhom = new Map();
  for (const v of vts) { if (!byNhom.has(v.nhom)) byNhom.set(v.nhom, []); byNhom.get(v.nhom).push(v); }
  const klOf = (v) => (v.chiTiet || []).filter((c) => c.ma === r.ma).reduce((a, c) => a + c.kl, 0);
  const thOf = (v) => v.trangThai === 'da' ? ((v.thucHien || {})[r.ma] ?? klOf(v)) : null;
  return `<div class="kl-dh"><b>${esc(r.ma)}</b><span>${esc(r.ten)}</span>${r.vuot ? `<span class="pill red mini">Vượt HĐ ${fmt(r.kh - r.hd)} ${esc(r.dvt)}</span>` : ''}
    <span class="kl-sub" style="margin-left:auto">${fmt(vts.length, 0)} vị trí · ${fmt(byNhom.size, 0)} phường · đơn giá HĐ ${fmt(r.dg, 0)} đ</span></div>
    ${[...byNhom].map(([nhom, items], i) => {
      const open = ui.dc.open.has(nhom) || (!ui.dc.touched && i === 0);
      return `<div class="kl-acc"><button class="ah" data-acc="${esc(nhom)}" aria-expanded="${open}"><span>${open ? '▾' : '▸'} ${esc(nhom || '(chưa rõ phường)')}</span><span class="n">${fmt(items.length, 0)} vị trí · ${fmt(items.reduce((a, v) => a + klOf(v), 0))}</span></button>
      ${open ? items.map((v) => `<div class="ar ${ui.sel.has(v.id) ? 'sel' : ''}"><input type="checkbox" class="kl-cb" data-sel="${v.id}" ${ui.sel.has(v.id) ? 'checked' : ''} aria-label="Chọn">
        <button class="lnk" data-open="${v.id}"><b>${esc(v.tram)}</b></button><span class="kl-sub">${esc(v.tuyen)}</span>
        <span class="n r">KH ${fmt(klOf(v))}</span><span class="n r">TH ${thOf(v) === null ? '—' : fmt(thOf(v))}</span>
        <span>${v.trangThai === 'da' ? `<span class="pill grn mini">Đã TH${v.thangNT ? ' · ' + thangTen(v.thangNT) : ''}</span>` : '<span class="pill mut mini">Chưa làm</span>'}</span></div>`).join('') : ''}</div>`;
    }).join('')}
    <div class="kl-sbar ${ui.sel.size ? 'on' : ''} inl"><b>${fmt(ui.sel.size, 0)} đã chọn</b><div class="kl-sbar-acts"><button class="btn ghost sm" data-kl="boChon">Bỏ chọn</button><button class="btn amber sm" data-kl="danhDau">✓ Đánh dấu đã thực hiện</button></div></div>`;
}

// ============ Tab Mẫu chi tiết HM ============
function renderMau(el) {
  const S = st();
  const L = ui.mauLoai;
  const rows = S.mau[L] || [];
  const names = Object.entries(S.catalog);
  el.innerHTML = `<div class="kl-pad">
    <div class="kl-seg">${Object.keys(PL_TEMPLATES).map((k) => `<button class="${k === L ? 'on' : ''}" data-mau="${k}">${esc(K.LOAI_TEN[k])}</button>`).join('')}</div>
    <p class="muted">1 ${esc(PL_TEMPLATES[L].dvt)} ở ${esc(K.LOAI_TEN[L])} gồm những mã HM nào, mỗi mã bao nhiêu. Khi nhập phụ lục hoặc bấm "Gắn mẫu HM", app điền sẵn chi tiết = KL vị trí × hệ số; vị trí đã sửa tay được giữ nguyên.</p>
    <datalist id="klHM">${names.slice(0, 2500).map(([m, it]) => `<option value="${esc(m)}">${esc(it.ten)}</option>`).join('')}</datalist>
    <div class="tablewrap"><table class="kl-tb"><thead><tr><th>Mã HM</th><th>Hạng mục (theo bảng giá HĐ)</th><th>ĐVT</th><th class="r">Hệ số / 1 ${esc(PL_TEMPLATES[L].dvt)}</th><th></th></tr></thead><tbody>
    ${rows.map((m, i) => `<tr><td><input class="kl-in n" list="klHM" value="${esc(m.ma)}" data-mrow="${i}" data-mk="ma" aria-label="Mã HM"></td>
      <td>${esc(S.catalog[m.ma]?.ten || (m.ma ? '⚠ Không có trong danh mục HĐ' : ''))}</td><td>${esc(S.catalog[m.ma]?.dvt || '')}</td>
      <td class="r"><input class="kl-in n r" type="number" step="any" min="0" value="${esc(m.heSo)}" data-mrow="${i}" data-mk="heSo" aria-label="Hệ số"></td>
      <td><button class="ic del" data-mdel="${i}" aria-label="Xoá dòng">🗑</button></td></tr>`).join('') || '<tr><td colspan="5" class="empty">Chưa có dòng nào.</td></tr>'}
    </tbody></table></div>
    <div class="kl-row"><button class="btn ghost" data-kl="mauThem">+ Thêm mã HM</button>
      <button class="btn amber" data-kl="mauAp">Áp mẫu cho vị trí ${esc(K.LOAI_TEN[L])}</button></div>
    ${!names.length ? '<p class="muted">Chưa nhập bảng giá HĐ nên chưa tra được tên hạng mục — vẫn khai được mã.</p>' : ''}
  </div>`;
}

// ============ Tab Phụ lục đã nhập ============
function bangGiaHTML(S) {
  const ks = Object.keys(S.bangGia || {}).sort();
  if (!ks.length) return `<div class="kl-bgnone muted">Chưa nhập bảng giá ký HĐ — KL HĐ đang lấy từ sheet "Tong hop HM"${S.catalogNguon ? ` (${esc(S.catalogNguon.file)})` : ''}. Bấm "⤓ Bảng giá HĐ" và chọn các file biểu giá G1–G4 (có thể chọn nhiều file một lần).</div>`;
  return `<div class="kl-plgrid">${ks.map((g) => { const b = S.bangGia[g]; const sum = (o) => Object.values(o || {}).reduce((a, x) => a + x, 0);
    return `<div class="dcard pad kl-pl"><div class="h"><b>${goiTen(g)} — bảng giá ký HĐ</b><span class="kl-sub">${esc(b.sheet)}</span></div>
      <div class="kl-sub">${esc(b.file)} · nhập ${new Date(b.ngay).toLocaleDateString('vi-VN')}${b.lienDanh ? ' · liên danh ' + esc(b.doiTac || '') : ''}</div>
      <div class="kl-plnum"><span><b class="n">${fmt(b.rows.length, 0)}</b> dòng</span><span>Giá trị <b class="n">${tien(sum(b.tong))}</b></span>${b.lienDanh ? `<span>Sapulico <b class="n">${tien(sum(b.tongSap))}</b></span>` : ''}</div></div>`; }).join('')}</div>`;
}
function renderPhuLuc(el) {
  const S = st();
  el.innerHTML = `<div class="kl-pad"><h3 class="kl-h3">Bảng giá ký hợp đồng</h3>${bangGiaHTML(S)}<h3 class="kl-h3">Phụ lục trình Sở đã nhập</h3>${S.phuLuc.length ? '' : '<p class="muted">Chưa có phụ lục nào.</p>'}<div class="kl-plgrid">
    ${S.phuLuc.map((p) => {
      const vts = S.viTri.filter((v) => v.plId === p.id);
      const da = vts.filter((v) => v.trangThai === 'da').length;
      return `<div class="dcard pad kl-pl">
        <div class="h"><b>${esc(K.LOAI_TEN[p.loai])}</b><span class="kl-sub">${esc(p.sheet)}</span></div>
        <div class="kl-sub">${esc(p.file)} · nhập ${new Date(p.ngayNhap).toLocaleDateString('vi-VN')}</div>
        <div class="kl-plnum"><span><b class="n">${fmt(vts.length, 0)}</b> vị trí</span><span><b class="n">${fmt(vts.reduce((a, v) => a + (+v.kl || 0), 0))}</b> ${esc(PL_TEMPLATES[p.loai].dvt)}</span><span><b class="n">${fmt(da, 0)}</b> đã TH</span></div>
        <label class="fld"><span>Đợt</span><input class="kl-in" value="${esc(p.dot)}" data-pl="${p.id}" data-pk="dot"></label>
        <label class="fld"><span>Nhóm vốn</span><input class="kl-in" value="${esc(p.nhomVon)}" data-pl="${p.id}" data-pk="nhomVon"></label>
        <label class="fld"><span>Năm kế hoạch</span><input class="kl-in" type="number" value="${esc(p.namKH)}" data-pl="${p.id}" data-pk="namKH"></label>
        <div class="kl-row"><button class="btn ghost sm" data-plxem="${p.id}">Xem vị trí</button><button class="btn ghost sm del" data-pldel="${p.id}">🗑 Xoá phụ lục</button></div>
      </div>`;
    }).join('')}</div></div>`;
}

// ============ Sự kiện ============
async function onClick(e) {
  const t = e.target.closest('button, [data-vt], input.kl-cb');
  if (!t) return;
  const S = st();
  if (t.dataset.tab) { ui.tab = t.dataset.tab; ui.limit = PAGE; return rerender(); }
  if (t.dataset.f !== undefined) { ui.f[t.dataset.f] = t.dataset.v; ui.limit = PAGE; return rerender(); }
  if (t.matches('input.kl-cb')) {
    if (t.dataset.sel) { t.checked ? ui.sel.add(t.dataset.sel) : ui.sel.delete(t.dataset.sel); }
    else if (t.dataset.selall !== undefined) { const l = K.locViTri(S, ui.f); t.checked ? l.forEach((v) => ui.sel.add(v.id)) : l.forEach((v) => ui.sel.delete(v.id)); }
    else if (t.dataset.selg) { const [pl, nhom] = t.dataset.selg.split('§'); K.locViTri(S, ui.f).filter((v) => v.plId === pl && v.nhom === nhom).forEach((v) => (t.checked ? ui.sel.add(v.id) : ui.sel.delete(v.id))); }
    return rerender();
  }
  if (t.dataset.vt && !e.target.closest('input, label')) {
    if (isLandPhone()) { ui.focus = t.dataset.vt; return rerender(); }
    return openViTri(t.dataset.vt);
  }
  if (t.dataset.open) return openViTri(t.dataset.open);
  if (t.dataset.ma) { ui.dc.ma = t.dataset.ma; ui.dc.open = new Set(); ui.dc.touched = false; return rerender(); }
  if (t.dataset.acc !== undefined) {
    const k = t.dataset.acc;
    if (!ui.dc.touched) { ui.dc.touched = true; const first = t.closest('.kl-det, .sheet-b')?.querySelector('[data-acc]')?.dataset.acc; ui.dc.open = new Set(first !== undefined ? [first] : []); }
    ui.dc.open.has(k) ? ui.dc.open.delete(k) : ui.dc.open.add(k); return rerender();
  }
  if (t.dataset.mau) { ui.mauLoai = t.dataset.mau; return rerender(); }
  if (t.dataset.mdel !== undefined) { await api.mutate(() => S.mau[ui.mauLoai].splice(+t.dataset.mdel, 1)); return rerender(); }
  if (t.dataset.plxem) { ui.tab = 'vitri'; ui.f = { ...ui.f, plId: t.dataset.plxem }; return rerender(); }
  if (t.dataset.pldel) {
    const p = S.phuLuc.find((x) => x.id === t.dataset.pldel);
    const ok = await confirmBox(`Xoá ${K.LOAI_TEN[p.loai]} (${p.sheet}) cùng ${S.viTri.filter((v) => v.plId === p.id).length} vị trí? Thao tác này chỉ xoá trong app, file Excel gốc không bị ảnh hưởng.`, 'Xoá phụ lục');
    if (ok) { await api.mutate(() => K.xoaPhuLuc(S, p.id)); if (ui.f.plId === p.id) ui.f.plId = ''; const con = new Set(S.viTri.map((v) => v.id)); ui.sel = new Set([...ui.sel].filter((id) => con.has(id))); if (ui.focus && !con.has(ui.focus)) ui.focus = ''; api.toast('Đã xoá phụ lục.', 'ok'); rerender(); }
    return;
  }
  switch (t.dataset.kl) {
    case 'nhapPL': return nhapPhuLuc();
    case 'nhapHM': return nhapBangGia();
    case 'nhapTH': return nhapThucHien();
    case 'xuat': return xuatExcel();
    case 'more': ui.limit += PAGE; return rerender();
    case 'boChon': ui.sel.clear(); return rerender();
    case 'danhDau': return danhDau();
    case 'boTH': { const n = ui.sel.size; await api.mutate(() => K.danhDauThucHien(S, [...ui.sel], '', 'chua')); ui.sel.clear(); api.toast(`Đã đặt lại ${n} vị trí về "Chưa làm".`, 'ok'); return rerender(); }
    case 'ganMau': return ganMau();
    case 'mauThem': await api.mutate(() => (S.mau[ui.mauLoai] ||= []).push({ ma: '', heSo: 1 })); return rerender();
    case 'mauAp': {
      if (!(S.mau[ui.mauLoai] || []).filter((m) => m.ma).length) return api.toast('Mẫu đang trống — thêm mã HM trước.', 'err');
      const ghiDe = await confirmBox('Áp cả cho các vị trí đã sửa tay chi tiết HM? Chọn "Không" để giữ nguyên các vị trí đã sửa tay.', 'Có, ghi đè', 'Không');
      let n = 0; await api.mutate(() => (n = K.apMauChoLoai(S, ui.mauLoai, ghiDe)));
      api.toast(`Đã gắn mẫu cho ${n} vị trí.`, 'ok'); return rerender();
    }
    case 'xemVT': {
      const lay = () => K.doiChieu(S, ui.dc.goi, ui.dc.nam, { phan: ui.dc.phan }).rows.find((x) => x.ma === ui.dc.ma);
      const r = lay(); if (!r) return;
      return openModal(`${r.ma} · vị trí cấu thành`, detHTML(S, r), { wide: true, onMount: (el) => {
        const b = el.querySelector('.sheet-b');
        b.addEventListener('click', async (ev) => { if (!ev.target.closest('button, input.kl-cb')) return; await onClick(ev); const r2 = lay(); if (b.isConnected && r2) b.innerHTML = detHTML(S, r2); });
      } });
    }
  }
}
async function onChange(e) {
  const t = e.target, S = st();
  if (t.dataset.fsel) { ui.f[t.dataset.fsel] = t.value; ui.limit = PAGE; return rerender(); }
  if (t.dataset.dc) { if (t.dataset.dc === 'tatCa') ui.dc.tatCa = t.checked; else ui.dc[t.dataset.dc] = t.dataset.dc === 'nam' ? +t.value : t.value; if (t.dataset.dc !== 'phan' && t.dataset.dc !== 'tatCa') ui.dc.ma = ''; return rerender(); }
  if (t.dataset.mrow !== undefined) { await api.mutate(() => { const m = S.mau[ui.mauLoai][+t.dataset.mrow]; m[t.dataset.mk] = t.dataset.mk === 'heSo' ? +t.value || 0 : t.value.trim().toUpperCase(); }); return rerender(); }
  if (t.dataset.pl) {
    if (t.dataset.pk === 'namKH' && !(+t.value >= 2000 && +t.value <= 2100)) { api.toast('Năm kế hoạch không hợp lệ.', 'err'); return rerender(); }
    await api.mutate(() => { const p = S.phuLuc.find((x) => x.id === t.dataset.pl); p[t.dataset.pk] = t.dataset.pk === 'namKH' ? +t.value : t.value.trim(); });
    api.toast('Đã cập nhật phụ lục.', 'ok'); return rerender();
  }
}
let qTimer = 0;
function onInput(e) {
  if (e.target.dataset.q === undefined) return;
  clearTimeout(qTimer);
  const v = e.target.value;
  qTimer = setTimeout(() => { ui.f.q = v; ui.limit = PAGE; rerender(); const i = document.querySelector('[data-q]'); if (i) { i.focus(); i.setSelectionRange(v.length, v.length); } }, 200);
}

// ============ Hộp thoại chung ============
let modalOnKey = null, modalOnClose = null;
function openModal(title, html, { wide = false, onMount, dismiss = true, onClose } = {}) {
  const ov = document.getElementById('modal');
  // Modal cũ bị thay thế → báo cho nó (vd confirmBox trả false), gỡ phím Esc cũ
  if (modalOnKey) document.removeEventListener('keydown', modalOnKey);
  const prevClose = modalOnClose; modalOnClose = null; prevClose?.();
  const back = document.activeElement;
  ov.innerHTML = `<div class="sheet ${wide ? 'wide' : ''}" role="dialog" aria-modal="true" aria-label="${esc(title)}">
    <div class="sheet-h"><span>${esc(title)}</span>${dismiss ? '<button class="ic" data-x aria-label="Đóng">✕</button>' : ''}</div><div class="sheet-b">${html}</div></div>`;
  const sheet = ov.querySelector('.sheet');
  ov.classList.add('on');
  const close = () => {
    if (ov.firstElementChild !== sheet) return; // modal này đã bị thay — không đóng nhầm modal khác
    ov.classList.remove('on'); ov.innerHTML = ''; document.removeEventListener('keydown', onKey);
    modalOnKey = null; const oc = modalOnClose; modalOnClose = null; oc?.();
    if (back && back.isConnected) back.focus?.();
  };
  const onKey = (e) => {
    if (e.key === 'Escape' && dismiss) close();
    if (e.key === 'Tab') { // giữ tiêu điểm trong hộp thoại
      const f = [...sheet.querySelectorAll('button:not([disabled]), input, select, textarea, [tabindex="0"]')].filter((x) => x.offsetParent !== null);
      if (!f.length) return;
      if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
      else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
    }
  };
  modalOnKey = onKey; modalOnClose = onClose || null;
  document.addEventListener('keydown', onKey);
  ov.onclick = (e) => { if (dismiss && (e.target === ov || e.target.closest('[data-x]'))) close(); };
  onMount?.(sheet, close);
  setTimeout(() => { if (sheet.isConnected) (sheet.querySelector('.sheet-b input, .sheet-b select, .sheet-b button, [data-x]') || sheet).focus?.(); }, 0);
  return close;
}
function confirmBox(msg, yes = 'Đồng ý', no = 'Huỷ') {
  return new Promise((res) => {
    let done = false; const fin = (v) => { if (!done) { done = true; res(v); } };
    const close = openModal('Xác nhận', `<p style="margin-bottom:14px">${esc(msg)}</p><div class="sheet-f"><button class="btn ghost" data-n>${esc(no)}</button><button class="btn amber" data-y>${esc(yes)}</button></div>`, {
      onClose: () => fin(false),
      onMount: (el) => { el.querySelector('[data-y]').onclick = () => { fin(true); close(); }; el.querySelector('[data-n]').onclick = () => { fin(false); close(); }; },
    });
  });
}

// ============ Đọc file qua luồng nền ============
let worker = null, wid = 0;
const pending = new Map();
function getWorker() {
  if (worker) return worker;
  worker = new Worker(new URL('./worker.js', import.meta.url), { type: 'module' });
  worker.onmessage = (e) => {
    const p = pending.get(e.data.id); if (!p) return;
    if (e.data.progress) p.onProgress?.(e.data.progress, e.data.text);
    if (e.data.done) { pending.delete(e.data.id); p.resolve(e.data.result); }
    if (e.data.error) { pending.delete(e.data.id); p.reject(new Error(e.data.error)); }
  };
  const fail = (msg) => { for (const p of pending.values()) p.reject(new Error(msg)); pending.clear(); try { worker.terminate(); } catch {} worker = null; };
  worker.onerror = (e) => { e.preventDefault?.(); fail('Luồng đọc file bị lỗi (' + (e.message || 'không rõ') + '). Thử lại hoặc dùng Chrome/Edge bản mới.'); };
  worker.onmessageerror = () => fail('Không nhận được kết quả đọc file.');
  return worker;
}
async function parseFile(kind, file, onProgress) {
  const buf = await file.arrayBuffer();
  const w = getWorker();
  const id = ++wid;
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject, onProgress });
    w.postMessage({ id, kind, name: file.name, buf }, [buf]);
  });
}
const pickFile = (accept, multiple = false) => new Promise((res) => {
  const i = document.createElement('input'); i.type = 'file'; i.accept = accept; i.multiple = multiple;
  i.onchange = () => res([...i.files]); i.click();
});
function progressModal(title) {
  let el;
  const close = openModal(title, `<div class="kl-prog"><div class="bar"><i style="width:3%"></i></div><p class="muted" data-pt>Đang chuẩn bị…</p></div>`, { onMount: (x) => (el = x), dismiss: false });
  return { set: (p, t) => { el.querySelector('.bar i').style.width = p + '%'; if (t) el.querySelector('[data-pt]').textContent = t; }, close };
}

// ---- Nhập bảng giá HĐ ----
async function nhapBangGia() {
  const files = await pickFile('.xlsx,.xlsb,.xlsm,.xls', true);
  if (!files.length) return;
  const pg = progressModal('Đọc bảng giá HĐ');
  const kq = [];
  for (const [i, f] of files.entries()) {
    const set = (p, t) => pg.set(Math.round((i * 100 + p) / files.length), `${f.name}: ${t || ''}`);
    try { kq.push({ f, ...(await parseFile('bg', f, set)) }); }
    catch (err) {
      // Không có Bảng giá HĐ chốt → thử đọc như file kế hoạch có sheet "Tong hop HM"
      try { kq.push({ f, cat: await parseFile('hm', f, set), bg: null, loiBG: err.message }); }
      catch (e2) { kq.push({ f, loi: err.message }); }
    }
  }
  pg.close();
  const S = st();
  const sum = (o) => Object.values(o || {}).reduce((a, x) => a + x, 0);
  // File ký HĐ không mã HM: ghép với bảng giá của gói (đã có, hoặc đang nhập cùng lượt)
  const tam = () => { const t = JSON.parse(JSON.stringify({ catalog: S.catalog, bangGia: S.bangGia || {} })); kq.filter((k) => k.bg?.loai === 'bghd').forEach((k) => { if (k.cat) K.gopDanhMuc(t, k.cat); K.apBangGiaKy(t, k.bg); }); return t; };
  const t0 = tam();
  for (const k of kq) if (k.bg?.loai === 'kyHD') {
    const ung = Object.keys(t0.bangGia).filter((g) => t0.bangGia[g].rows.length === k.bg.rows.length);
    const goi = k.bg.goi || ung[0];
    k.ghep = goi ? K.ghepKyHD(t0, k.bg, goi) : { ok: false, loi: 'Chưa có bảng giá gói nào cùng số dòng để ghép mã HM — nhập file biểu giá của gói đó trước (hoặc cùng lúc).' };
  }
  const nam = (o) => Object.keys(o || {}).sort();
  const html = kq.map((k, i) => {
    if (k.loi) return `<div class="kl-imp bad"><b>${esc(k.f.name)}</b><p>${esc(k.loi)}</p></div>`;
    if (!k.bg) return `<div class="kl-imp"><label class="kl-imph"><input type="checkbox" data-bi="${i}" checked> <b>${esc(k.f.name)}</b> <span class="kl-sub">không có Bảng giá HĐ chốt — dùng sheet "Tong hop HM"</span></label>
      <p class="muted">${fmt(Object.keys(k.cat.hm).length, 0)} mã HM · gói ${k.cat.goi.map(goiTen).join(', ')} · năm ${k.cat.nam.join(', ')}. KL HĐ chỉ ghi cho gói chưa có bảng giá ký HĐ.</p></div>`;
    const b = k.bg, c = b.checks;
    const ok = b.loai === 'kyHD' ? k.ghep?.ok : true;
    return `<div class="kl-imp ${ok ? '' : 'bad'}">
      <label class="kl-imph"><input type="checkbox" data-bi="${i}" ${ok ? 'checked' : 'disabled'}> <b>${b.goi ? goiTen(b.goi) : '?'}</b> <span class="kl-sub">${esc(k.f.name)} › ${esc(b.sheet)}${b.lienDanh ? ' · liên danh ' + esc(b.doiTac || '') : ''}</span></label>
      <div class="kl-impn"><span>${fmt(b.rows.length, 0)} dòng hạng mục</span>
        ${b.loai === 'bghd' ? '<span class="pill grn mini">✓ ghép mã HM khớp 100% với ' + esc(b.goi) + '_11C</span>' : ''}
        ${b.loai === 'kyHD' ? (k.ghep?.ok ? `<span class="pill grn mini">✓ khớp ${fmt(k.ghep.khop, 0)} dòng với bảng giá ${esc(b.goi)}</span> ${Object.entries(k.ghep.khac).filter(([, n]) => n).map(([f, n]) => `<span class="pill red mini">lệch ${f}: ${n} dòng</span>`).join('') || '<span class="pill grn mini">KL, đơn giá, thành tiền giống hệt</span>'}` : `<span class="pill red mini">${esc(k.ghep?.loi || 'không ghép được: lệch tại dòng ' + ((k.ghep?.khop ?? 0) + 1))}</span>`) : ''}</div>
      <table class="kl-tb tight"><thead><tr><th>Năm</th><th class="r">Giá trị HĐ</th>${b.lienDanh ? '<th class="r">Phần Sapulico</th>' : ''}</tr></thead><tbody>
        ${nam(b.tong).map((y) => `<tr><td>${y}</td><td class="r n">${fmt(b.tong[y], 0)}</td>${b.lienDanh ? `<td class="r n">${fmt(b.tongSap[y], 0)}</td>` : ''}</tr>`).join('')}
        <tr><td><b>Cộng</b></td><td class="r n"><b>${fmt(sum(b.tong), 0)}</b></td>${b.lienDanh ? `<td class="r n"><b>${fmt(sum(b.tongSap), 0)}</b></td>` : ''}</tr></tbody></table>
      ${c.ttSai ? `<p class="kl-warn">${c.ttSai} dòng thành tiền ≠ KL × đơn giá.</p>` : ''}${c.tachSai ? `<p class="kl-warn">${c.tachSai} dòng KL Sapulico + đối tác ≠ KL tổng.</p>` : ''}
      ${c.namLech.map((x) => `<p class="kl-warn">⚠ Dòng NĂM ${x.y}${x.kv ? ' (' + esc(x.kv.slice(0, 40)) + ')' : ''}, dòng ${x.row}: ghi ${fmt(x.dongNam, 0)} — cộng các dòng ${fmt(x.congDong, 0)} (lệch ${fmt(x.dongNam - x.congDong, 0)} đ).</p>`).join('')}
      ${S.bangGia?.[b.goi] ? `<p class="muted">Thay bảng giá ${goiTen(b.goi)} đang có (${esc(S.bangGia[b.goi].file)}).</p>` : ''}</div>`;
  }).join('');
  openModal('Xem trước — bảng giá hợp đồng', html + `<p class="muted">Mỗi file biểu giá chứa Bảng giá HĐ của cả 4 gói — app chỉ lấy bản chốt của chính gói đó (sheet "BGHD" hoặc "BGHD Gx" theo tên file).</p>
    <div class="sheet-f"><button class="btn ghost" data-x>Huỷ</button><button class="btn amber" data-ap>Áp dụng</button></div>`, {
    wide: true,
    onMount: (el, close) => { el.querySelector('[data-ap]').onclick = async () => {
      const chon = kq.filter((k, i) => el.querySelector(`[data-bi="${i}"]`)?.checked);
      let soGoi = 0, canh = [];
      await api.mutate(() => {
        S.bangGia ||= {};
        for (const k of chon) if (k.cat) K.gopDanhMuc(S, k.cat);   // tên/ĐVT trước
        for (const k of chon) if (k.bg?.loai === 'bghd') { canh = canh.concat(K.apBangGiaKy(S, k.bg).canhBao); soGoi++; }
        for (const k of chon) if (k.bg?.loai === 'kyHD' && k.ghep?.ok) { const r = K.ghepKyHD(S, k.bg, k.bg.goi); if (r.ok) { canh = canh.concat(K.apBangGiaKy(S, k.bg).canhBao); soGoi++; } }
        const c0 = chon.find((k) => k.cat); if (c0 && !S.catalogNguon) S.catalogNguon = { file: c0.f.name, ngay: new Date().toISOString() };
      });
      close(); api.toast(`Đã nhập bảng giá ký HĐ ${soGoi} gói${canh.length ? ` · ${canh.length} cảnh báo đơn giá` : ''}.`, canh.length ? 'err' : 'ok'); rerender();
    }; },
  });
}

// ---- Nhập phụ lục ----
async function nhapPhuLuc() {
  const files = await pickFile('.xlsx,.xlsm,.xls', true);
  if (!files.length) return;
  const pg = progressModal('Đọc phụ lục trình Sở');
  const all = [];
  try {
    for (const [i, f] of files.entries()) {
      const r = await parseFile('pl', f, (p, t) => pg.set(Math.round((i * 100 + p) / files.length), t));
      all.push({ file: f.name, ...r });
    }
  } catch (err) { pg.close(); return api.toast('Không đọc được file: ' + err.message, 'err'); }
  pg.close();
  const S = st();
  const items = [];
  for (const f of all) for (const r of f.sheets) items.push({ f, r, con: f.sub[r.sheet], chon: !f.sub[r.sheet] && !r.loi && r.viTri.length > 0 });
  if (!items.length) return api.toast('Không thấy sheet phụ lục nào (dòng đầu phải là "Phụ lục I/II/III/IV").', 'err');
  const nam = new Date().getFullYear();
  // Cảnh báo trùng nội dung: so khoá trạm|phường|tuyến với phụ lục cùng loại đã có và với sheet đã chọn phía trên
  const trungND = (i) => {
    const r = items[i].r; if (r.loi) return null;
    const keys = new Set(r.viTri.map(K.keyVT));
    const out = [];
    for (const p of S.phuLuc.filter((p) => p.loai === r.loai && !(p.file === items[i].f.file && p.sheet === r.sheet))) {
      const n = S.viTri.filter((v) => v.plId === p.id && keys.has(K.keyVT(v))).length;
      if (n) out.push(`${p.file} › ${p.sheet} (đã nhập): ${fmt(n, 0)} vị trí giống`);
    }
    for (let j = 0; j < i; j++) {
      const o = items[j]; if (!o.chon || o.r.loi || o.r.loai !== r.loai) continue;
      const n = o.r.viTri.filter((v) => keys.has(K.keyVT(v))).length;
      if (n) out.push(`${o.f.file} › ${o.r.sheet}: ${fmt(n, 0)} vị trí giống`);
    }
    return out.length ? out : null;
  };
  const html = items.map((it, i) => {
    const r = it.r;
    if (r.loi) return `<div class="kl-imp bad"><b>${esc(it.f.file)} › ${esc(r.sheet)}</b><p>${esc(r.loi)}</p></div>`;
    const khop = r.checks.khop;
    const thieuGoi = r.viTri.filter((v) => !v.goi).length;
    const trung = S.phuLuc.find((p) => p.file === it.f.file && p.sheet === r.sheet && p.loai === r.loai);
    return `<div class="kl-imp ${khop ? '' : 'bad'}">
      <label class="kl-imph"><input type="checkbox" data-ic="${i}" ${it.chon ? 'checked' : ''}> <b>${esc(K.LOAI_TEN[r.loai])}</b> <span class="kl-sub">${esc(it.f.file)} › ${esc(r.sheet)}</span></label>
      <div class="kl-impn">
        <span>${fmt(r.viTri.length, 0)} vị trí · ${fmt(r.groups.length, 0)} phường</span>
        <span>Đọc được <b class="n">${fmt(r.checks.tongDoc)}</b> · TỔNG CỘNG của file <b class="n">${fmt(r.tongFile)}</b> ${khop ? '<span class="pill grn mini">✓ khớp</span>' : '<span class="pill red mini">✗ lệch</span>'}</span>
      </div>
      ${r.checks.nhomLech.length ? `<p class="kl-warn">Lệch dòng cộng ở: ${esc(r.checks.nhomLech.join(', '))}</p>` : ''}
      ${(() => { const seen = new Map(); for (const v of r.viTri) { const k = K.keyVT(v); seen.set(k, (seen.get(k) || 0) + 1); }
        const d = [...seen].filter(([, n]) => n > 1);
        return d.length ? `<p class="kl-warn">⚠ ${fmt(d.length, 0)} vị trí ghi lặp trong cùng phụ lục (cùng trạm + phường + tuyến): ${esc(d.slice(0, 5).map(([k, n]) => k.split('|')[0] + ' ×' + n).join(', '))}${d.length > 5 ? '…' : ''} — vẫn nhập đúng như file, anh kiểm tra lại.</p>` : ''; })()}
      ${(() => { const t = trungND(i); return t ? `<p class="kl-warn">⚠ Trùng nội dung với: ${esc(t.join('; '))} — nếu là bản cập nhật của cùng phụ lục, chỉ nhập một bản để không cộng hai lần.</p>` : ''; })()}
      ${it.con ? `<p class="kl-warn">Sheet này là tập con của "${esc(it.con)}" trong cùng file — mặc định không nhập để tránh cộng hai lần.</p>` : ''}
      ${it.f.boSung[r.sheet] ? `<p class="muted">Đã bổ sung gói/đơn vị cho ${fmt(it.f.boSung[r.sheet], 0)} vị trí từ sheet tách của cùng file.</p>` : ''}
      ${r.ngoai.length ? `<details><summary>${fmt(r.ngoai.length, 0)} dòng nằm ngoài vùng công thức cộng của phường (không tính) — ${esc([...new Set(r.ngoai.map((v) => v.dot).filter(Boolean))].join(', ') || 'không ghi đợt')}</summary><div class="kl-ngoai">${r.ngoai.slice(0, 60).map((v) => `${esc(v.nhom)} · ${esc(v.tram)}`).join('<br>')}${r.ngoai.length > 60 ? '<br>…' : ''}</div></details>` : ''}
      ${r.klTrong.length ? `<p class="muted">${fmt(r.klTrong.length, 0)} dòng để trống KL — không tính.</p>` : ''}
      ${trung ? `<p class="kl-warn">Phụ lục này đã nhập ngày ${new Date(trung.ngayNhap).toLocaleDateString('vi-VN')}.
        <label><input type="radio" name="m${i}" value="replace" checked> Thay bằng bản mới (giữ trạng thái thực hiện)</label> <label><input type="radio" name="m${i}" value="skip"> Bỏ qua</label></p>` : ''}
      <div class="kl-impf">
        <label class="fld"><span>Đợt</span><input class="kl-in" data-io="dot" data-i="${i}" value="${esc(trung ? trung.dot : [...new Set(r.viTri.map((v) => v.dot).filter(Boolean))][0] || '')}" placeholder="vd Đợt 2"></label>
        <label class="fld"><span>Nhóm vốn</span><input class="kl-in" data-io="nhomVon" data-i="${i}" value="${esc(trung?.nhomVon || '')}" placeholder="vd BSV (Đợt 2)-Nhóm 5"></label>
        <label class="fld"><span>Năm kế hoạch</span><input class="kl-in" type="number" data-io="namKH" data-i="${i}" value="${trung?.namKH || nam}"></label>
        ${thieuGoi ? `<label class="fld"><span>${fmt(thieuGoi, 0)} vị trí chưa có gói — gán</span><select data-io="goiMacDinh" data-i="${i}"><option value="">Để trống (tự gán sau)</option>${goiList(S).map((g) => `<option value="${g}">${goiTen(g)}</option>`).join('')}</select></label>` : ''}
      </div></div>`;
  }).join('');
  openModal('Xem trước — nhập phụ lục', html + `<div class="sheet-f"><button class="btn ghost" data-x>Huỷ</button><button class="btn amber" data-ap>Nhập các sheet đã chọn</button></div>`, {
    wide: true,
    onMount: (el, close) => {
      el.querySelector('[data-ap]').onclick = async () => {
        let them = 0, nPL = 0, bo = 0;
        await api.mutate(() => {
          items.forEach((it, i) => {
            if (!el.querySelector(`[data-ic="${i}"]`)?.checked) return;
            const o = { file: it.f.file };
            el.querySelectorAll(`[data-i="${i}"]`).forEach((x) => (o[x.dataset.io] = x.value));
            o.mode = el.querySelector(`input[name="m${i}"]:checked`)?.value;
            const res = K.importPL(S, it.r, o);
            if (res.boQua) bo++; else { them += res.them; nPL++; }
          });
        });
        close();
        api.toast(`Đã nhập ${nPL} phụ lục · ${fmt(them, 0)} vị trí${bo ? ` · bỏ qua ${bo}` : ''}.`, 'ok');
        ui.tab = 'vitri'; rerender();
      };
    },
  });
}

// ---- Nhập "đã thực hiện" ----
async function nhapThucHien() {
  const [f] = await pickFile('.xlsx,.xlsm,.xls');
  if (!f) return;
  const pg = progressModal('Đọc file đã thực hiện');
  let res;
  try { res = await parseFile('pl', f, pg.set); } catch (err) { pg.close(); return api.toast('Không đọc được file: ' + err.message, 'err'); }
  pg.close();
  const S = st();
  const sheets = res.sheets.filter((r) => !r.loi && r.viTri.length && !res.sub[r.sheet]);
  if (!sheets.length) return api.toast('File không có sheet đúng form phụ lục.', 'err');
  const preview = (i, thang) => K.khopThucHien(S, sheets[i], thang, { apply: false });
  const body = (i, thang) => { const p = preview(i, thang); return `<p><b class="n">${fmt(p.khop.length, 0)}</b> vị trí khớp (trạm + phường + tuyến) sẽ đánh dấu <b>Đã thực hiện · ${esc(thangTen(thang))}</b>.</p>
    ${p.khop.filter((x) => x.kl !== x.klKH).length ? `<p class="muted">${fmt(p.khop.filter((x) => x.kl !== x.klKH).length, 0)} vị trí có KL thực hiện khác KL kế hoạch — chi tiết HM được tính theo tỉ lệ.</p>` : ''}
    ${p.khongKhop.length ? `<details open><summary class="kl-warn">${fmt(p.khongKhop.length, 0)} dòng không khớp vị trí nào — sẽ không ghi</summary><div class="kl-ngoai">${p.khongKhop.slice(0, 80).map((v) => `${esc(v.nhom)} · ${esc(v.tram)} · ${esc(v.tuyen)}`).join('<br>')}</div></details>` : ''}`; };
  openModal('Xem trước — nhập đã thực hiện', `
    <div class="kl-impf"><label class="fld"><span>Sheet</span><select data-sh>${sheets.map((r, i) => `<option value="${i}">${esc(K.LOAI_TEN[r.loai])} › ${esc(r.sheet)} (${fmt(r.viTri.length, 0)} dòng)</option>`).join('')}</select></label>
    <label class="fld"><span>Tháng nghiệm thu</span><input type="month" data-th value="${thangNay()}"></label></div>
    <div data-pv>${body(0, thangNay())}</div>
    <div class="sheet-f"><button class="btn ghost" data-x>Huỷ</button><button class="btn amber" data-ap>Ghi đã thực hiện</button></div>`, {
    onMount: (el, close) => {
      const cur = () => [+el.querySelector('[data-sh]').value, el.querySelector('[data-th]').value];
      el.querySelector('[data-sh]').onchange = el.querySelector('[data-th]').onchange = () => (el.querySelector('[data-pv]').innerHTML = body(...cur()));
      el.querySelector('[data-ap]').onclick = async () => {
        let r; await api.mutate(() => (r = K.khopThucHien(S, sheets[cur()[0]], cur()[1])));
        close(); api.toast(`Đã ghi ${fmt(r.khop.length, 0)} vị trí đã thực hiện${r.khongKhop.length ? ` · ${r.khongKhop.length} dòng không khớp` : ''}.`, 'ok'); rerender();
      };
    },
  });
}

// ---- Đánh dấu / gắn mẫu hàng loạt ----
async function danhDau() {
  if (!ui.sel.size) return api.toast('Chọn vị trí trước.', 'err');
  openModal('Đánh dấu đã thực hiện', `<p>${fmt(ui.sel.size, 0)} vị trí · KL thực hiện = KL kế hoạch (sửa riêng từng vị trí được trong "Sửa chi tiết").</p>
    <label class="fld"><span>Tháng nghiệm thu</span><input type="month" data-th value="${thangNay()}"></label>
    <div class="sheet-f"><button class="btn ghost" data-x>Huỷ</button><button class="btn amber" data-ap>✓ Đánh dấu</button></div>`, {
    onMount: (el, close) => { el.querySelector('[data-ap]').onclick = async () => {
      const n = ui.sel.size; const S = st();
      await api.mutate(() => K.danhDauThucHien(S, [...ui.sel], el.querySelector('[data-th]').value));
      ui.sel.clear(); close(); api.toast(`Đã đánh dấu ${n} vị trí đã thực hiện.`, 'ok'); rerender();
    }; },
  });
}
async function ganMau() {
  const S = st();
  if (!ui.sel.size) return api.toast('Chọn vị trí trước.', 'err');
  const plLoai = new Map(S.phuLuc.map((p) => [p.id, p.loai]));
  let n = 0, thieu = new Set();
  await api.mutate(() => {
    for (const v of S.viTri) {
      if (!ui.sel.has(v.id)) continue;
      const L = plLoai.get(v.plId);
      if (!(S.mau[L] || []).some((m) => m.ma)) { thieu.add(K.LOAI_TEN[L]); continue; }
      v.chiTiet = K.apMau(S.mau[L], v.kl); v.chiTietSua = false; n++;
    }
  });
  api.toast(`Đã gắn mẫu cho ${n} vị trí${thieu.size ? ` · chưa có mẫu: ${[...thieu].join(', ')}` : ''}.`, thieu.size ? 'err' : 'ok');
  rerender();
}

// ---- Sửa chi tiết 1 vị trí ----
function openViTri(id) {
  const S = st();
  const v = S.viTri.find((x) => x.id === id);
  if (!v) return;
  const pl = S.phuLuc.find((p) => p.id === v.plId);
  const lines = (v.chiTiet || []).map((c) => ({ ...c, th: v.trangThai === 'da' ? ((v.thucHien || {})[c.ma] ?? c.kl) : '' }));
  const row = (c, i) => `<tr><td><input class="kl-in n kl-ma" list="klHM2" value="${esc(c.ma)}" data-ln="${i}" data-lk="ma" aria-label="Mã HM"><div class="kl-sub">${esc(S.catalog[c.ma]?.ten || '')}</div></td>
    <td><input class="kl-in n r" type="number" step="any" value="${esc(c.kl)}" data-ln="${i}" data-lk="kl" aria-label="KL kế hoạch"></td>
    <td><input class="kl-in n r" type="number" step="any" value="${esc(c.th)}" data-ln="${i}" data-lk="th" aria-label="KL thực hiện" placeholder="—"></td>
    <td><button class="ic del" data-lx="${i}" aria-label="Xoá dòng">🗑</button></td></tr>`;
  openModal(v.tram || 'Vị trí', `
    <div class="kl-vinfo"><span>${esc(K.LOAI_TEN[pl?.loai])}</span><span>${esc(v.phuong)} · ${esc(v.tuyen)}</span><span>KL ${fmt(v.kl)} ${esc(PL_TEMPLATES[pl?.loai]?.dvt || '')} · ${esc(goiTen(v.goi))}${v.donVi ? ' · ' + esc(v.donVi) : ''}</span>${v.namLD ? `<span>Năm lắp đặt ${esc(v.namLD)}</span>` : ''}${v.ghiChu ? `<span>${esc(v.ghiChu)}</span>` : ''}</div>
    <datalist id="klHM2">${Object.entries(S.catalog).slice(0, 2500).map(([m, it]) => `<option value="${esc(m)}">${esc(it.ten)}</option>`).join('')}</datalist>
    <div class="tablewrap"><table class="kl-tb tight"><thead><tr><th>Mã HM · hạng mục</th><th class="r">KL kế hoạch</th><th class="r">KL thực hiện</th><th></th></tr></thead><tbody data-lines>${lines.map(row).join('')}</tbody></table></div>
    <button class="btn ghost sm" data-ladd style="margin-top:8px">+ Thêm mã HM</button>
    <div class="kl-impf" style="margin-top:12px">
      <label class="fld"><span>Gói</span><select data-vg><option value="">—</option>${goiList(S, v.goi).map((g) => `<option value="${g}" ${v.goi === g ? 'selected' : ''}>${goiTen(g)}</option>`).join('')}</select></label>
      <label class="fld"><span>Trạng thái</span><select data-vs>${[['chua', 'Chưa làm'], ['dang', 'Đang làm'], ['da', 'Đã thực hiện']].map(([k, t]) => `<option value="${k}" ${v.trangThai === k ? 'selected' : ''}>${t}</option>`).join('')}</select></label>
      <label class="fld"><span>Tháng nghiệm thu</span><input type="month" data-vm value="${esc(v.thangNT || '')}"></label></div>
    <div class="sheet-f"><button class="btn ghost" data-x>Huỷ</button><button class="btn amber" data-ap>Lưu</button></div>`, {
    wide: true,
    onMount: (el, close) => {
      const tb = el.querySelector('[data-lines]');
      const read = () => [...tb.querySelectorAll('tr')].map((tr) => ({ ma: tr.querySelector('[data-lk="ma"]').value.trim().toUpperCase(), kl: +tr.querySelector('[data-lk="kl"]').value || 0, th: tr.querySelector('[data-lk="th"]').value }));
      el.querySelector('[data-ladd]').onclick = () => { const cur = read(); cur.push({ ma: '', kl: 1, th: '' }); tb.innerHTML = cur.map(row).join(''); };
      tb.onclick = (e) => { const x = e.target.closest('[data-lx]'); if (!x) return; const cur = read(); cur.splice(+x.dataset.lx, 1); tb.innerHTML = cur.map(row).join(''); };
      el.querySelector('[data-ap]').onclick = async () => {
        const raw = read().filter((c) => c.ma);
        // Gộp dòng trùng mã: cộng KL kế hoạch và KL thực hiện
        const gm = new Map();
        for (const c of raw) { const o = gm.get(c.ma) || { ma: c.ma, kl: 0, th: '' }; o.kl += c.kl; const th = c.th === '' ? c.kl : +c.th || 0; o.thSum = (o.thSum || 0) + th; o.thSet = o.thSet || c.th !== ''; gm.set(c.ma, o); }
        const cur = [...gm.values()].map((o) => ({ ma: o.ma, kl: o.kl, th: o.thSet ? o.thSum : '' }));
        const trangThai = el.querySelector('[data-vs]').value;
        await api.mutate(() => {
          const sach = (a) => JSON.stringify(a.map((c) => [c.ma, +c.kl || 0]));
          if (sach(cur) !== sach(v.chiTiet || [])) K.suaChiTiet(S, v.id, cur);
          v.goi = el.querySelector('[data-vg]').value || null;
          v.trangThai = trangThai;
          v.thangNT = trangThai === 'da' ? el.querySelector('[data-vm]').value || thangNay() : '';
          const custom = cur.filter((c) => c.th !== '' && +c.th !== c.kl);
          v.thucHien = trangThai === 'da' && custom.length ? Object.fromEntries(cur.map((c) => [c.ma, c.th === '' ? c.kl : +c.th])) : null;
        });
        close(); api.toast('Đã lưu vị trí.', 'ok'); rerender();
      };
    },
  });
}

// ---- Xuất Excel trình Sở ----
let excelLib = null;
function loadExcelJS() {
  if (excelLib) return excelLib;
  excelLib = new Promise((res, rej) => {
    if (window.ExcelJS) return res(window.ExcelJS);
    const s = document.createElement('script'); s.src = './vendor/exceljs.min.js';
    s.onload = () => res(window.ExcelJS); s.onerror = () => { excelLib = null; rej(new Error('Không tải được thư viện xuất Excel.')); };
    document.head.appendChild(s);
  });
  return excelLib;
}
async function xuatExcel() {
  const S = st();
  openModal('Xuất Excel trình Sở', `<p class="muted">Mỗi phụ lục 1 sheet đúng form gốc (tiêu đề, cột, nhóm phường, dòng cộng SUBTOTAL), kèm sheet TongHop, ChiTiet_HM và DoiChieu_HM — mọi số tổng là công thức sống.</p>
    ${S.phuLuc.map((p) => `<label class="kl-chk"><input type="checkbox" data-xp="${p.id}" checked> ${esc(K.LOAI_TEN[p.loai])} — ${esc(p.sheet)}${p.dot ? ' · ' + esc(p.dot) : ''} <span class="kl-sub">(${fmt(S.viTri.filter((v) => v.plId === p.id).length, 0)} vị trí)</span></label>`).join('')}
    <div class="sheet-f"><button class="btn ghost" data-x>Huỷ</button><button class="btn amber" data-ap>⇪ Tải file .xlsx</button></div>`, {
    onMount: (el, close) => { el.querySelector('[data-ap]').onclick = async (e) => {
      const ids = [...el.querySelectorAll('[data-xp]:checked')].map((x) => x.dataset.xp);
      if (!ids.length) return api.toast('Chọn ít nhất 1 phụ lục.', 'err');
      e.target.disabled = true; e.target.textContent = 'Đang lập file…';
      try {
        const [EJ, { buildWorkbook }] = await Promise.all([loadExcelJS(), import('./export.js')]);
        const wb = buildWorkbook(EJ, S, { templates: PL_TEMPLATES, phuLucIds: ids });
        const buf = await wb.xlsx.writeBuffer();
        const a = document.createElement('a');
        a.href = URL.createObjectURL(new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
        const dot = [...new Set(ids.map((id) => S.phuLuc.find((p) => p.id === id).dot).filter(Boolean))].join('-').replace(/\s+/g, '');
        a.download = `PhuLuc_TrinhSo${dot ? '_' + dot : ''}_${new Date().toISOString().slice(0, 10)}.xlsx`;
        document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
        close(); api.toast('Đã xuất file Excel.', 'ok');
      } catch (err) { e.target.disabled = false; e.target.textContent = '⇪ Tải file .xlsx'; api.toast('Xuất thất bại: ' + err.message, 'err'); }
    }; },
  });
}
