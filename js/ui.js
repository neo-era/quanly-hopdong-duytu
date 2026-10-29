// ui.js — Kết xuất giao diện (Phương án A: phòng trực vận hành) + tương tác CRUD.
import * as C from './calc.js';
import * as S from './store.js';
import * as D from './drive.js';
import * as X from './export.js';
import { renderKL } from './kl/ui.js';

const TODAY = () => { // ngày ĐỊA PHƯƠNG (VN UTC+7), không dùng UTC để khỏi lệch hạn buổi sáng
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const app = () => document.getElementById('view');
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[m]));

const LOAI = { 'goi-duy-tu': 'Gói duy tu', 'dat-hang-phuong': 'Đặt hàng phường', 'phu-luc': 'Phụ lục' };
const TT_NHOM = {
  quahan: { cls: 'red', label: 'Quá hạn' }, le7: { cls: 'org', label: '≤ 7 ngày' },
  le15: { cls: 'org', label: '≤ 15 ngày' }, le30: { cls: 'yel', label: '≤ 30 ngày' },
};

let route = { name: 'dashboard', id: null };

// ---------- Toast ----------
export function toast(msg, kind = 'info') {
  const box = document.getElementById('toasts');
  const t = document.createElement('div');
  t.className = 'toast ' + kind;
  t.textContent = msg;
  box.appendChild(t);
  setTimeout(() => { t.style.opacity = '0'; setTimeout(() => t.remove(), 300); }, 3800);
}

// ---------- Router ----------
export function go(name, id = null) { route = { name, id }; render(); window.scrollTo(0, 0); }

// ---------- Header (auth + save) ----------
function renderHeader() {
  const st = S.getState();
  const signed = D.isSignedIn();
  const authBtn = !D.hasConfig()
    ? `<span class="hint">Chưa cấu hình Google — xem README</span>`
    : signed
      ? `<button class="btn ghost" id="btnSignout">Đăng xuất</button>`
      : `<button class="btn amber" id="btnSignin">Đăng nhập Google</button>`;
  const saveBtn = signed
    ? `<button class="btn ${st.dirty ? 'amber' : 'ghost'}" id="btnSave" ${st.dirty ? '' : 'disabled'}>
         ${st.dirty ? '● Lưu lên Drive' : 'Đã lưu'}</button>`
    : '';
  const src = { drive: 'Drive', cache: 'Bộ nhớ máy (offline)', seed: 'Dữ liệu mẫu' }[st.loadedFrom] || '—';
  document.getElementById('hdr-right').innerHTML = `
    <div class="src">Nguồn: <b>${src}</b>${st.dirty ? ' · <span class="dot-warn">chưa lưu</span>' : ''}</div>
    ${saveBtn} ${authBtn}
    <button class="theme-t" id="btnTheme" aria-label="Đổi giao diện sáng/tối" title="Đổi giao diện sáng/tối">${document.documentElement.dataset.theme === 'light' || (!document.documentElement.dataset.theme && matchMedia('(prefers-color-scheme: light)').matches) ? '☾' : '☀'}</button>`;
  document.getElementById('btnTheme').onclick = () => {
    const isLight = document.documentElement.dataset.theme === 'light' || (!document.documentElement.dataset.theme && matchMedia('(prefers-color-scheme: light)').matches);
    const next = isLight ? 'dark' : 'light';
    document.documentElement.dataset.theme = next;
    try { localStorage.setItem('theme', next); } catch {}
    document.querySelector('meta[name=theme-color]')?.setAttribute('content', next === 'light' ? '#ffffff' : '#0a0f16');
    renderHeader();
  };
}

// ---------- Nav ----------
function renderNav() {
  const n = document.getElementById('nav');
  const item = (name, label) => `<button class="navbtn ${route.name === name ? 'on' : ''}" data-go="${name}">${label}</button>`;
  n.innerHTML = item('dashboard', '⚡ Bảng trực') + item('contracts', '▦ Hợp đồng') + item('klvt', '▤ KL vị trí') + item('tools', '⚙ Công cụ');
}

// ---------- Dashboard ----------
function renderDashboard() {
  const data = S.getData();
  const db = C.tongHopDashboard(data, TODAY(), 2026);
  const kpi = (cls, val, label, sub) => `
    <div class="kpi"><div class="l"><span class="dot ${cls}"></span>${label}</div>
      <div class="v ${cls}">${val}</div><div class="sub">${sub}</div></div>`;

  const cb = db.canhBao;
  const queue = cb.length ? cb.map(c => {
    const t = TT_NHOM[c.loai];
    const pill = c.loai === 'quahan' ? `Quá ${Math.abs(c.soNgay)} ngày` : `còn ${c.soNgay} ngày`;
    return `<button class="q" data-go-hd="${esc(c.hdId)}">
      <div class="bar ${t.cls}"></div>
      <div class="qmain"><div class="qt">${esc(c.ten)} <span class="qtag">${esc(c.nhom)}</span></div>
        <div class="qm">${esc(c.tenGoi)}${c.mo ? ' · ' + esc(c.mo) : ''}</div></div>
      <div class="pill ${t.cls}">${pill}</div></button>`;
  }).join('') : `<div class="empty">Không có mốc nào sắp đến hạn hay quá hạn. Mở một hợp đồng để thêm mốc theo dõi.</div>`;

  const goiCards = (data.contracts || []).map(hd => {
    const pct = C.phanTramGiaiNgan(hd);
    const tran2026 = (hd.khoiLuong?.keHoach || []).filter(k => String(k.ky).includes('2026')).reduce((s, k) => s + C.num(k.giaTri), 0);
    const nt = (hd.khoiLuong?.keHoach || []).filter(k => String(k.ky).includes('2026')).reduce((s, k) => s + C.num(k.thucHien), 0);
    const p = tran2026 > 0 ? Math.min(100, Math.round(nt / tran2026 * 100)) : 0;
    const risk = (hd.nghiaVu || []).some(n => String(n.trangThaiTuanThu).toLowerCase() === 'ruiro');
    return `<button class="gcard" data-go-hd="${esc(hd.id)}">
      <div class="gn">${esc(hd.tenGoi)} ${risk ? '<span class="pill red mini">rủi ro phạt</span>' : ''}</div>
      <div class="gv">Trần 2026: ${C.dinhDangTien(tran2026)} · Giá trị HĐ ${C.dinhDangTien(hd.giaTri)}</div>
      <div class="track"><div class="fill" style="width:${p}%"></div></div>
      <div class="pct"><span>Đã NT ${C.dinhDangTien(nt)}</span><span>${p}%</span></div></button>`;
  }).join('');

  app().innerHTML = `
    <div class="kpis">
      ${kpi('red', db.quaHan, 'QUÁ HẠN', 'mốc cần xử lý ngay')}
      ${kpi('org', db.sapDenHan, 'SẮP ĐẾN HẠN ≤30N', 'trong 30 ngày tới')}
      ${kpi('blue', C.dinhDangTien(db.tongCongNo), 'CÔNG NỢ', 'nghiệm thu chưa thu')}
      ${kpi('grn', db.pctGiaiNganNam == null ? '—' : Math.round(db.pctGiaiNganNam) + '%', 'THỰC HIỆN 2026', 'nghiệm thu / trần năm')}
    </div>
    <div class="grid2">
      <section class="col">
        <div class="h2">⚠ Hàng chờ cảnh báo</div>
        <div class="queue">${queue}</div>
      </section>
      <section class="col">
        <div class="h2">▦ Tiến độ giải ngân theo gói (2026)</div>
        <div class="gk">${goiCards || '<div class="empty">Chưa có hợp đồng.</div>'}</div>
      </section>
    </div>`;
}

// ---------- Danh sách HĐ ----------
function renderContracts() {
  const data = S.getData();
  const rows = (data.contracts || []).map(hd => {
    const pct = C.phanTramGiaiNgan(hd);
    const cn = C.congNo(hd);
    const risk = (hd.nghiaVu || []).some(n => String(n.trangThaiTuanThu).toLowerCase() === 'ruiro');
    return `<tr data-go-hd="${esc(hd.id)}">
      <td><div class="cn">${esc(hd.tenGoi)}</div><div class="cm">${esc(LOAI[hd.loaiHD] || '')} · ${esc(hd.benA || '')}</div></td>
      <td class="r">${C.dinhDangTien(hd.giaTri)}</td>
      <td class="r">${C.dinhDangTien(C.tongNghiemThu(hd))}</td>
      <td class="r">${C.dinhDangTien(cn)}</td>
      <td class="r">${pct == null ? '—' : Math.round(pct) + '%'}</td>
      <td>${risk ? '<span class="pill red mini">rủi ro</span>' : '<span class="pill grn mini">bình thường</span>'}</td>
    </tr>`;
  }).join('');
  app().innerHTML = `
    <div class="toolbar"><div class="h2" style="margin:0">Danh sách hợp đồng</div>
      <button class="btn amber" id="btnAddHd">+ Thêm hợp đồng</button></div>
    <div class="tablewrap"><table class="list">
      <thead><tr><th>Gói / Hợp đồng</th><th class="r">Giá trị</th><th class="r">Đã NT</th><th class="r">Công nợ</th><th class="r">% GN</th><th>Trạng thái</th></tr></thead>
      <tbody>${rows || '<tr><td colspan="6" class="empty">Chưa có hợp đồng. Bấm “Thêm hợp đồng”.</td></tr>'}</tbody>
    </table></div>`;
}

// ---------- Chi tiết HĐ ----------
function sectionChildren(title, items, cols, rowFn, addLabel, addType, hdId) {
  const head = cols.map(c => `<th class="${c.r ? 'r' : ''}">${c.t}</th>`).join('');
  const body = items.length ? items.map(rowFn).join('')
    : `<tr><td colspan="${cols.length + 1}" class="empty">Chưa có mục nào.</td></tr>`;
  return `<section class="dcard">
    <div class="dhead"><h3>${title}</h3>
      <button class="btn ghost sm" data-add="${addType}" data-hd="${esc(hdId)}">+ ${addLabel}</button></div>
    <div class="tablewrap"><table class="sub"><thead><tr>${head}<th></th></tr></thead><tbody>${body}</tbody></table></div>
  </section>`;
}

function renderDetail(id) {
  const hd = S.getContract(id);
  if (!hd) { go('contracts'); return; }
  const pct = C.phanTramGiaiNgan(hd);
  const warnNgay = C.ngaySai(hd) ? `<div class="warnline">⚠ Ngày kết thúc đang nhỏ hơn ngày hiệu lực — kiểm tra lại.</div>` : '';

  const editBtn = (type, item) => `<button class="ic" data-edit="${type}" data-hd="${esc(id)}" data-item="${esc(item.id)}" title="Sửa">✎</button>`;
  const delBtn = (type, item) => `<button class="ic del" data-del="${type}" data-hd="${esc(id)}" data-item="${esc(item.id)}" title="Xoá">🗑</button>`;

  const moc = sectionChildren('Mốc thời gian', hd.mocThoiGian || [],
    [{ t: 'Tên mốc' }, { t: 'Hạn' }, { t: 'Trạng thái' }],
    (m) => {
      const c = C.phanLoaiCanhBao(m.han, TODAY(), C.mocDaXong(m));
      const tag = TT_NHOM[c.loai] ? `<span class="pill ${TT_NHOM[c.loai].cls} mini">${TT_NHOM[c.loai].label}</span>` : (c.loai === 'xong' ? '<span class="pill grn mini">xong</span>' : '');
      return `<tr><td>${esc(m.ten)}${m.ghiChu ? `<div class="cm">${esc(m.ghiChu)}</div>` : ''}</td><td>${C.dinhDangNgay(m.han)} ${tag}</td><td>${esc(m.trangThai || '')}</td><td class="acts">${editBtn('moc', m)}${delBtn('moc', m)}</td></tr>`;
    }, 'Thêm mốc', 'moc', id);

  const ky = sectionChildren('Nghiệm thu & thanh toán', hd.kyThanhToan || [],
    [{ t: 'Kỳ' }, { t: 'Mốc hồ sơ' }, { t: 'Giá trị NT', r: 1 }, { t: 'Đã TT', r: 1 }, { t: 'Còn lại', r: 1 }],
    (k) => `<tr><td>${esc(k.ky)}</td><td>${C.dinhDangNgay(k.mocHoSo)}</td><td class="r">${C.dinhDangTien(k.giaTriNT)}</td><td class="r">${C.dinhDangTien(k.daThanhToan)}</td><td class="r">${C.dinhDangTien(C.num(k.giaTriNT) - C.num(k.daThanhToan))}</td><td class="acts">${editBtn('ky', k)}${delBtn('ky', k)}</td></tr>`,
    'Thêm kỳ', 'ky', id);

  const pl = sectionChildren('Phụ lục & KL phát sinh', hd.phuLuc || [],
    [{ t: 'Nội dung' }, { t: 'Nhóm' }, { t: 'Giá trị', r: 1 }, { t: 'Trạng thái HS' }, { t: 'Hạn' }],
    (p) => `<tr><td>${esc(p.noiDung || p.viTri)}${p.viTri && p.noiDung ? `<div class="cm">${esc(p.viTri)}</div>` : ''}</td><td>${esc(p.nhom || '')}</td><td class="r">${C.dinhDangTien(p.giaTri)}</td><td>${esc(p.trangThaiHoSo || '')}</td><td>${C.dinhDangNgay(p.ngayHan)}</td><td class="acts">${editBtn('pl', p)}${delBtn('pl', p)}</td></tr>`,
    'Thêm phụ lục', 'pl', id);

  const nv = sectionChildren('Nghĩa vụ & rủi ro phạt', hd.nghiaVu || [],
    [{ t: 'Nghĩa vụ' }, { t: 'Căn cứ' }, { t: 'Mức phạt' }, { t: 'Hạn' }, { t: 'Trạng thái' }],
    (n) => {
      const risk = String(n.trangThaiTuanThu).toLowerCase() === 'ruiro';
      return `<tr><td>${esc(n.ten)}</td><td>${esc(n.canCu || '')}</td><td>${esc(n.mucPhat || '')}</td><td>${C.dinhDangNgay(n.han)}</td><td>${risk ? '<span class="pill red mini">rủi ro</span>' : esc(n.trangThaiTuanThu || '')}</td><td class="acts">${editBtn('nv', n)}${delBtn('nv', n)}</td></tr>`;
    }, 'Thêm nghĩa vụ', 'nv', id);

  // Khối lượng 3 tầng
  const dt = hd.khoiLuong?.duToanDuyet || {};
  const kh = (hd.khoiLuong?.keHoach || []).map(k => `<tr><td>${esc(k.ky)}</td><td class="r">${C.dinhDangTien(k.giaTri)}</td><td class="r">${C.dinhDangTien(k.thucHien)}</td><td class="r">${C.num(k.giaTri) > 0 ? Math.round(C.num(k.thucHien) / C.num(k.giaTri) * 100) + '%' : '—'}</td></tr>`).join('') || `<tr><td colspan="4" class="empty">Chưa có kế hoạch kỳ.</td></tr>`;
  const dc = (hd.khoiLuong?.dieuChinh || []).map(d => `<tr><td>${esc(d.noiDung)}</td><td>Nhóm ${esc(d.nhom)}</td><td class="r">${C.dinhDangTien(d.giaTri)}</td><td>${esc(d.trangThai || '')}</td></tr>`).join('') || `<tr><td colspan="4" class="empty">Chưa có điều chỉnh.</td></tr>`;
  const room = C.roomTran(hd);
  const klSection = `<section class="dcard">
    <div class="dhead"><h3>Khối lượng — 3 tầng</h3>
      <button class="btn ghost sm" data-edit="kl" data-hd="${esc(id)}">✎ Sửa khối lượng</button></div>
    <div class="kl3">
      <div class="klbox"><div class="klt">Tầng 1 · Dự toán duyệt (trần)</div>
        <div class="klbig">${C.dinhDangTien(dt.giaTri)}</div>
        <div class="klsub">Đã thực hiện (NT luỹ kế): ${C.dinhDangTien(C.tongNghiemThu(hd))}${room != null ? ` · Còn room: <b>${C.dinhDangTien(room)}</b>` : ''}</div></div>
      <div class="klbox"><div class="klt">Tầng 2 · Kế hoạch theo kỳ</div>
        <table class="sub tight"><thead><tr><th>Kỳ</th><th class="r">Kế hoạch</th><th class="r">Thực hiện</th><th class="r">%</th></tr></thead><tbody>${kh}</tbody></table></div>
      <div class="klbox"><div class="klt">Tầng 3 · Điều chỉnh bổ sung</div>
        <table class="sub tight"><thead><tr><th>Nội dung</th><th>Nhóm</th><th class="r">Giá trị</th><th>Trạng thái</th></tr></thead><tbody>${dc}</tbody></table></div>
    </div></section>`;

  app().innerHTML = `
    <button class="back" data-go="contracts">← Danh sách hợp đồng</button>
    <div class="dtop">
      <div><h2 class="dtitle">${esc(hd.tenGoi)}</h2>
        <div class="dmeta">${esc(LOAI[hd.loaiHD] || '')} · Bên A: ${esc(hd.benA || '—')}<br>
          Số HĐ: ${esc(hd.soHD || '—')} · Hiệu lực ${C.dinhDangNgay(hd.ngayHieuLuc)} → ${C.dinhDangNgay(hd.ngayKetThuc)}</div></div>
      <div class="dstats">
        <div><span>Giá trị HĐ</span><b>${C.dinhDangTien(hd.giaTri)}</b></div>
        <div><span>Công nợ</span><b>${C.dinhDangTien(C.congNo(hd))}</b></div>
        <div><span>% giải ngân</span><b>${pct == null ? '—' : Math.round(pct) + '%'}</b></div>
      </div>
      <div class="dactions"><button class="btn ghost sm" data-edit="hd" data-hd="${esc(id)}">✎ Sửa thông tin</button>
        <button class="btn ghost sm del" data-del="hd" data-hd="${esc(id)}">🗑 Xoá HĐ</button></div>
    </div>
    ${warnNgay}
    ${moc}${ky}${pl}${nv}${klSection}`;
}

// ---------- Công cụ ----------
function renderTools() {
  app().innerHTML = `
    <div class="h2">⚙ Công cụ dữ liệu</div>
    <div class="toolgrid">
      <div class="dcard pad"><h3>Xuất Excel</h3><p class="muted">Bung toàn bộ dữ liệu ra file .xlsx (5 sheet) để tra tay, gửi, in.</p><button class="btn amber" id="btnXlsx">Xuất Excel</button></div>
      <div class="dcard pad"><h3>Sao lưu / Di chuyển (JSON)</h3><p class="muted">Tải file JSON bản sao, hoặc nạp lại từ file JSON đã lưu.</p>
        <button class="btn ghost" id="btnExpJson">Tải JSON</button>
        <label class="btn ghost filelbl">Nạp JSON<input type="file" id="impJson" accept="application/json,.json" hidden></label></div>
      <div class="dcard pad"><h3>Dữ liệu mẫu</h3><p class="muted">Nạp dữ liệu demo (4 gói + ĐH phường) để thử nhanh. Sẽ thay dữ liệu hiện có.</p><button class="btn ghost" id="btnSeed">Nạp dữ liệu mẫu</button></div>
      <div class="dcard pad"><h3>Đồng bộ Drive</h3><p class="muted">Tải lại bản mới nhất từ Google Drive.</p><button class="btn ghost" id="btnReload" ${D.isSignedIn() ? '' : 'disabled'}>Tải lại từ Drive</button></div>
    </div>`;
}

// ---------- Render chính ----------
export function render() {
  renderHeader(); renderNav();
  app().classList.toggle('wide', route.name === 'klvt');
  if (route.name !== 'klvt') { const v = app(); v.onclick = v.onchange = v.oninput = v.onkeydown = null; }
  if (route.name === 'dashboard') renderDashboard();
  else if (route.name === 'contracts') renderContracts();
  else if (route.name === 'detail') renderDetail(route.id);
  else if (route.name === 'tools') renderTools();
  else if (route.name === 'klvt') renderKL(app(), { getData: S.getData, mutate: S.mutate, toast, render });
}

// ---------- Modal form ----------
function openForm(title, fields, values, onSave) {
  const ov = document.getElementById('modal');
  const body = fields.map(f => {
    const v = values?.[f.k] ?? f.def ?? '';
    if (f.type === 'select')
      return `<label class="fld"><span>${f.label}</span><select name="${f.k}">${f.opts.map(o => `<option value="${o.v}" ${String(v) === String(o.v) ? 'selected' : ''}>${o.t}</option>`).join('')}</select></label>`;
    if (f.type === 'textarea')
      return `<label class="fld wide"><span>${f.label}</span><textarea name="${f.k}" rows="2">${esc(v)}</textarea></label>`;
    return `<label class="fld ${f.wide ? 'wide' : ''}"><span>${f.label}${f.hint ? ` <i>${f.hint}</i>` : ''}</span><input name="${f.k}" type="${f.type || 'text'}" value="${esc(v)}" ${f.type === 'number' ? 'step="any"' : ''}></label>`;
  }).join('');
  ov.innerHTML = `<div class="sheet"><div class="sheet-h">${esc(title)}</div>
    <form id="mform"><div class="grid-form">${body}</div>
    <div class="sheet-f"><button type="button" class="btn ghost" id="mcancel">Huỷ</button><button type="submit" class="btn amber">Lưu</button></div></form></div>`;
  ov.classList.add('on');
  const close = () => ov.classList.remove('on');
  ov.querySelector('#mcancel').onclick = close;
  ov.onclick = (e) => { if (e.target === ov) close(); };
  ov.querySelector('#mform').onsubmit = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const out = {};
    for (const f of fields) {
      let val = fd.get(f.k);
      if (f.type === 'number') val = C.num(val);
      out[f.k] = val;
    }
    await onSave(out);
    close();
    render();
  };
}

// ---------- Field schemas ----------
const F = {
  hd: [
    { k: 'tenGoi', label: 'Tên gói / HĐ', wide: true },
    { k: 'soHD', label: 'Số HĐ' },
    { k: 'loaiHD', label: 'Loại', type: 'select', opts: [{ v: 'goi-duy-tu', t: 'Gói duy tu' }, { v: 'dat-hang-phuong', t: 'Đặt hàng phường' }, { v: 'phu-luc', t: 'Phụ lục' }] },
    { k: 'benA', label: 'Bên A (chủ đầu tư)', wide: true },
    { k: 'giaTri', label: 'Giá trị HĐ (đồng)', type: 'number' },
    { k: 'ngayHieuLuc', label: 'Ngày hiệu lực', type: 'date' },
    { k: 'ngayKetThuc', label: 'Ngày kết thúc', type: 'date' },
    { k: 'ghiChu', label: 'Ghi chú', type: 'textarea' },
  ],
  moc: [
    { k: 'ten', label: 'Tên mốc', wide: true },
    { k: 'han', label: 'Hạn', type: 'date' },
    { k: 'trangThai', label: 'Trạng thái', type: 'select', opts: [{ v: 'dang', t: 'Đang làm' }, { v: 'chua', t: 'Chưa làm' }, { v: 'xong', t: 'Đã xong' }] },
    { k: 'ghiChu', label: 'Ghi chú', type: 'textarea' },
  ],
  ky: [
    { k: 'ky', label: 'Kỳ', hint: '(vd 2026-10)' },
    { k: 'mocHoSo', label: 'Mốc hồ sơ', type: 'date' },
    { k: 'giaTriNT', label: 'Giá trị nghiệm thu (đồng)', type: 'number' },
    { k: 'daThanhToan', label: 'Đã thanh toán (đồng)', type: 'number' },
  ],
  pl: [
    { k: 'noiDung', label: 'Nội dung', wide: true },
    { k: 'viTri', label: 'Vị trí' },
    { k: 'nhom', label: 'Nhóm tài sản', type: 'select', opts: [{ v: 'A', t: 'A — trong HĐ' }, { v: 'B', t: 'B — đất công ngoài HĐ' }, { v: 'C', t: 'C — chưa bàn giao' }] },
    { k: 'giaTri', label: 'Giá trị (đồng)', type: 'number' },
    { k: 'trangThaiHoSo', label: 'Trạng thái HS', type: 'select', opts: [{ v: 'danglap', t: 'Đang lập' }, { v: 'dangtrinh', t: 'Đã trình' }, { v: 'daduyet', t: 'Đã duyệt' }, { v: 'tuchoi', t: 'Từ chối' }] },
    { k: 'ngayTrinh', label: 'Ngày trình', type: 'date' },
    { k: 'ngayDuyet', label: 'Ngày duyệt', type: 'date' },
    { k: 'ngayHan', label: 'Hạn trình', type: 'date' },
    { k: 'tinhTrangTT', label: 'Thanh toán', type: 'select', opts: [{ v: 'chua', t: 'Chưa' }, { v: 'roi', t: 'Đã TT' }] },
  ],
  nv: [
    { k: 'ten', label: 'Nghĩa vụ', wide: true },
    { k: 'canCu', label: 'Căn cứ (điều/khoản)' },
    { k: 'mucPhat', label: 'Mức phạt' },
    { k: 'han', label: 'Hạn', type: 'date' },
    { k: 'trangThaiTuanThu', label: 'Trạng thái', type: 'select', opts: [{ v: 'chua', t: 'Chưa làm' }, { v: 'dang', t: 'Đang làm' }, { v: 'xong', t: 'Đã xong' }, { v: 'ruiro', t: 'Rủi ro' }] },
    { k: 'ghiChu', label: 'Ghi chú', type: 'textarea' },
  ],
};

const CHILD_KEY = { moc: 'mocThoiGian', ky: 'kyThanhToan', pl: 'phuLuc', nv: 'nghiaVu' };

// ---------- Sự kiện toàn cục ----------
export function bindEvents() {
  document.body.addEventListener('click', async (e) => {
    const t = e.target.closest('[data-go],[data-go-hd],[data-add],[data-edit],[data-del]');
    if (!t) return;

    if (t.dataset.go) return go(t.dataset.go);
    if (t.dataset.goHd) return go('detail', t.dataset.goHd);

    // Thêm con
    if (t.dataset.add) {
      const type = t.dataset.add, hdId = t.dataset.hd;
      return openForm('Thêm mục', F[type], {}, async (vals) => {
        await S.mutate(d => {
          const hd = d.contracts.find(c => c.id === hdId);
          (hd[CHILD_KEY[type]] ||= []).push({ id: S.uid(type), ...vals });
        });
        toast('Đã thêm. Nhớ bấm “Lưu lên Drive”.', 'ok');
      });
    }

    // Sửa
    if (t.dataset.edit) {
      const type = t.dataset.edit, hdId = t.dataset.hd, itemId = t.dataset.item;
      if (type === 'hd') {
        const hd = S.getContract(hdId);
        return openForm('Sửa thông tin hợp đồng', F.hd, hd, async (vals) => {
          await S.mutate(() => Object.assign(hd, vals)); toast('Đã cập nhật.', 'ok');
        });
      }
      if (type === 'kl') return openKhoiLuong(hdId);
      const hd = S.getContract(hdId);
      const item = (hd[CHILD_KEY[type]] || []).find(x => x.id === itemId);
      return openForm('Sửa mục', F[type], item, async (vals) => {
        await S.mutate(() => Object.assign(item, vals)); toast('Đã cập nhật.', 'ok');
      });
    }

    // Xoá
    if (t.dataset.del) {
      const type = t.dataset.del, hdId = t.dataset.hd, itemId = t.dataset.item;
      if (type === 'hd') {
        if (!confirm('Xoá toàn bộ hợp đồng này?')) return;
        await S.mutate(d => { d.contracts = d.contracts.filter(c => c.id !== hdId); });
        toast('Đã xoá hợp đồng.', 'ok'); return go('contracts');
      }
      if (!confirm('Xoá mục này?')) return;
      await S.mutate(() => {
        const hd = S.getContract(hdId);
        hd[CHILD_KEY[type]] = (hd[CHILD_KEY[type]] || []).filter(x => x.id !== itemId);
      });
      toast('Đã xoá.', 'ok'); return render();
    }
  });

  // Nút header / công cụ (delegation theo id)
  document.body.addEventListener('click', async (e) => {
    const id = e.target.id;
    if (id === 'btnSignin') { try { await D.signIn(); toast('Đã đăng nhập Google.', 'ok'); await reloadFromDrive(); } catch (err) { toast(err.message, 'err'); } }
    if (id === 'btnSignout') { D.signOut(); toast('Đã đăng xuất.'); render(); }
    if (id === 'btnSave') return doSave();
    if (id === 'btnReload') return reloadFromDrive();
    if (id === 'btnAddHd') return openForm('Thêm hợp đồng', F.hd, { loaiHD: 'goi-duy-tu' }, async (vals) => {
      await S.mutate(d => d.contracts.push({ id: S.uid('hd'), ...vals, mocThoiGian: [], kyThanhToan: [], phuLuc: [], nghiaVu: [], khoiLuong: { duToanDuyet: {}, keHoach: [], dieuChinh: [] } }));
      toast('Đã thêm hợp đồng.', 'ok');
    });
    if (id === 'btnXlsx') { try { await X.xuatExcel(S.getData(), TODAY()); toast('Đã xuất Excel.', 'ok'); } catch (err) { toast(err.message, 'err'); } }
    if (id === 'btnExpJson') { X.xuatJSON(S.getData()); toast('Đã tải JSON.', 'ok'); }
    if (id === 'btnSeed') { if (confirm('Nạp dữ liệu mẫu, thay dữ liệu hiện có?')) { await S.loadSeed(); toast('Đã nạp dữ liệu mẫu.', 'ok'); go('dashboard'); } }
  });

  document.body.addEventListener('change', async (e) => {
    if (e.target.id === 'impJson') {
      try { const obj = await X.nhapJSON(e.target.files[0]); await S.mutate(d => { d.contracts = obj.contracts; if (obj.klvt) d.klvt = obj.klvt; }); toast('Đã nạp dữ liệu từ JSON.', 'ok'); go('dashboard'); }
      catch (err) { toast(err.message, 'err'); }
      e.target.value = '';
    }
  });
}

// Khối lượng: form gọn tầng 1 (các tầng 2/3 chỉnh qua JSON ở bản đầu, hoặc mở rộng sau)
function openKhoiLuong(hdId) {
  const hd = S.getContract(hdId);
  const dt = hd.khoiLuong?.duToanDuyet || {};
  openForm('Sửa trần dự toán duyệt (Tầng 1)', [
    { k: 'giaTri', label: 'Trần giá trị được duyệt (đồng)', type: 'number', wide: true },
    { k: 'tongKL', label: 'Tổng khối lượng', type: 'number' },
  ], dt, async (vals) => {
    await S.mutate(() => { (hd.khoiLuong ||= {}).duToanDuyet = { ...dt, ...vals }; });
    toast('Đã cập nhật trần.', 'ok');
  });
}

async function doSave() {
  try {
    if (await D.remoteNewerThan(S.getState().baseModifiedTime)) {
      if (!confirm('Bản trên Drive đã thay đổi (có thể từ máy khác). Vẫn ghi đè bằng bản của bạn?')) return;
    }
    const mt = await D.saveData(S.getData());
    S.markSaved(mt);
    toast('Đã lưu lên Google Drive.', 'ok');
  } catch (err) { toast('Lưu thất bại: ' + err.message, 'err'); }
}

export async function reloadFromDrive() {
  try {
    const res = await D.loadData();
    if (res) { await S.setFromDrive(res.data, res.modifiedTime); toast('Đã tải dữ liệu từ Drive.', 'ok'); }
    else toast('Drive chưa có dữ liệu — bạn có thể nhập mới rồi “Lưu lên Drive”.');
    go('dashboard');
  } catch (err) { toast('Không tải được từ Drive: ' + err.message, 'err'); }
}
