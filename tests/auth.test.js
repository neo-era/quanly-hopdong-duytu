// auth.test.js — "Luôn đăng nhập" (11/11/2026): giữ token trên máy, nối lại phiên không hỏi, đăng xuất xoá sạch.
import { readFileSync } from 'node:fs';
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.log('✗', m); } };
const store = new Map();
globalThis.localStorage = { getItem: (k) => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, String(v)), removeItem: (k) => store.delete(k) };
let lanXin = [], traLoi = (o) => ({ access_token: 'tok' + lanXin.length, expires_in: 3600 });
globalThis.window = { google: { accounts: { oauth2: {
  initTokenClient: (cfg) => { const c = { callback: cfg.callback, requestAccessToken(o) { lanXin.push(o); setTimeout(() => c.callback(traLoi(o)), 1); } }; return c; },
  revoke() {} } } } };
globalThis.document = { head: { appendChild() {} }, createElement: () => ({}) };
const src = readFileSync(new URL('../js/drive.js', import.meta.url), 'utf8').replace(/^import .*$/m, "const CONFIG = { clientId: 'x.apps.googleusercontent.com' };");
const nap = () => import('data:text/javascript;charset=utf-8,' + encodeURIComponent(src + '\n//' + Math.random()));

let D = await nap();
ok(!D.isSignedIn() && !D.wasSignedIn(), 'máy mới: chưa đăng nhập');
await D.initAuth();
await D.signIn();
ok(lanXin[0].prompt === 'consent', 'lần đầu hỏi đồng ý');
ok(D.isSignedIn() && D.wasSignedIn(), 'đăng nhập xong được nhớ');

D = await nap();   // mở lại app (tải lại trang) trong hạn token
ok(D.isSignedIn(), 'mở lại trong hạn → vào thẳng, không bấm Đăng nhập');

const o = JSON.parse(store.get('hd_gauth_v1')); o.exp = Date.now() - 1; store.set('hd_gauth_v1', JSON.stringify(o));
D = await nap(); await D.initAuth();
ok(!D.isSignedIn() && D.wasSignedIn(), 'token hết hạn: chưa vào nhưng còn nhớ đã đăng nhập');
lanXin = [];
ok(await D.signInSilent() === true && D.isSignedIn(), 'nối lại phiên được');
ok(lanXin[0].prompt === '', 'nối lại không hỏi chọn tài khoản/đồng ý');
await D.signIn(); ok(lanXin[1].prompt === '', 'bấm "Tiếp tục phiên" cũng không hỏi lại');

traLoi = () => ({ error: 'interaction_required' });
ok(await D.signInSilent() === false, 'Google từ chối → trả false, không ném lỗi');

store.set('hd_gauth_v1', '{hỏng'); D = await nap();
ok(!D.isSignedIn(), 'dữ liệu hỏng không làm sập app');

traLoi = (x) => ({ access_token: 'z', expires_in: 3600 }); await D.initAuth(); await D.signIn();
D.signOut();
ok(!D.isSignedIn() && !D.wasSignedIn() && !store.has('hd_gauth_v1'), 'đăng xuất xoá token + cờ nhớ');

const app = readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');
ok(/addEventListener\('pointerdown', noiLai, true\)/.test(app), 'chạm đầu tiên tự nối lại phiên');
const ui = readFileSync(new URL('../js/ui.js', import.meta.url), 'utf8');
ok(/st\.dirty\) \{ toast\('Đang có thay đổi chưa lưu/.test(ui), 'tự tải không đè bản sửa dở');
console.log(fail ? `✗ auth: ${pass} đạt, ${fail} lỗi` : `✓ auth: ${pass} đạt, 0 lỗi`);
process.exit(fail ? 1 : 0);
