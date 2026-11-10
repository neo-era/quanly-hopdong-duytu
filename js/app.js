// app.js — Khởi động app, nạp dữ liệu, PWA, nút cài đặt.
import * as S from './store.js';
import * as D from './drive.js';
import * as UI from './ui.js';

async function boot() {
  UI.bindEvents();

  // 1) Hiển thị ngay từ cache (nếu có) để mở nhanh/offline
  const hadCache = await S.loadFromCache();
  if (!hadCache) await S.loadSeed(); // lần đầu: cho xem demo
  UI.render();

  // 2) Nếu đã cấu hình Google thì chuẩn bị đăng nhập (không ép)
  if (D.hasConfig()) {
    try { await D.initAuth(); } catch (e) { /* im lặng, UI báo cần cấu hình */ }
    D.onAuthChange((signed) => { UI.render(); });
    // Luôn đăng nhập: còn token → tải bản mới nhất từ Drive ngay; hết hạn → chạm đầu tiên tự nối lại phiên.
    if (D.isSignedIn()) { UI.render(); UI.reloadFromDrive({ quiet: true }); }
    let dangNoi = false;
    const noiLai = async () => {
      if (dangNoi || !D.wasSignedIn() || D.msConLai() > 10 * 60 * 1000) return;   // còn > 10 phút thì thôi
      dangNoi = true;
      const mat = !D.isSignedIn();
      const ok = await D.signInSilent();
      dangNoi = false;
      if (ok && mat) UI.reloadFromDrive({ quiet: true });
    };
    document.addEventListener('pointerdown', noiLai, true);
    document.addEventListener('keydown', noiLai, true);
  }

  // 3) Service worker (PWA)
  if ('serviceWorker' in navigator) {
    try { await navigator.serviceWorker.register('./sw.js'); } catch (e) {}
  }

  // 4) Nút cài đặt (desktop + Android)
  let deferred = null;
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault(); deferred = e;
    const b = document.getElementById('btnInstall');
    if (b) { b.hidden = false; b.onclick = async () => { b.hidden = true; deferred.prompt(); await deferred.userChoice; deferred = null; }; }
  });

  // iOS: không có prompt -> hiện gợi ý 1 lần
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
  const standalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;
  if (isIOS && !standalone && !localStorage.getItem('iosHint')) {
    setTimeout(() => { UI.toast('Cài app: bấm Chia sẻ ⬆ → “Thêm vào MH chính”.'); try { localStorage.setItem('iosHint', '1'); } catch {} }, 1500);
  }
}

boot();
