# Quản lý Hợp đồng Duy tu — CSKVTT (Sapulico)

Web app (PWA) quản lý toàn bộ hợp đồng duy tu chiếu sáng nơi Sapulico là **Bên B**: 4 gói dịch vụ công ích + HĐ đặt hàng phường + phụ lục. Theo dõi mốc thời gian, nghiệm thu–thanh toán, phụ lục/khối lượng phát sinh, nghĩa vụ có chế tài phạt, và 3 tầng khối lượng. Dashboard **"mở là thấy"** việc gấp.

- **Chạy**: web tĩnh trên **GitHub Pages** (không cần server).
- **Lưu dữ liệu**: 1 file JSON trên **Google Drive** của anh (OAuth, scope `drive.file` — app chỉ thấy file nó tạo).
- **Cài như app** (PWA): desktop + điện thoại, mở lại được khi offline.
- **Xuất Excel** bất kỳ lúc nào (chạy cả khi offline).

---

## 1) Tạo Client ID Google (làm 1 lần, miễn phí)

Để app đọc/ghi Google Drive, Google bắt buộc có "Client ID". Các bước:

1. Vào **https://console.cloud.google.com/** → đăng nhập bằng Gmail của anh (maivulam2020@gmail.com).
2. Tạo **Project** mới (góc trên, "Select a project" → "New Project"), đặt tên ví dụ `HDDuytu`.
3. Menu trái → **APIs & Services → Library** → tìm **Google Drive API** → bấm **Enable**.
4. **APIs & Services → OAuth consent screen**:
   - User type: **External** → Create.
   - Điền App name (`HĐ Duy tu`), User support email, Developer email → Save.
   - Mục **Audience/Test users**: bấm **Add users**, thêm email của anh. (Ở chế độ Testing là đủ dùng cho cá nhân/nội bộ.)
5. **APIs & Services → Credentials → Create Credentials → OAuth client ID**:
   - Application type: **Web application**.
   - **Authorized JavaScript origins** → Add URI, dán đúng địa chỉ GitHub Pages của anh:
     `https://neo-era.github.io`
   - Create → copy **Client ID** (dạng `xxxxx.apps.googleusercontent.com`).
6. Mở file **`js/config.js`** trong repo, dán Client ID vào:
   ```js
   export const CONFIG = { clientId: 'xxxxx.apps.googleusercontent.com' };
   ```

> Khi đổi/thêm địa chỉ chạy app (ví dụ chạy thử ở `http://localhost:8099`), nhớ thêm origin đó vào mục **Authorized JavaScript origins**, nếu không đăng nhập sẽ báo lỗi `origin mismatch`.

---

## 2) Đưa lên GitHub Pages

```bash
# trong thư mục dự án
git init
git add .
git commit -m "App quản lý hợp đồng duy tu"
git branch -M main
git remote add origin https://github.com/neo-era/<TEN-REPO>.git
git push -u origin main
```
Trên GitHub: **Settings → Pages → Source: Deploy from a branch → Branch: `main` / `/ (root)` → Save.**
Sau ~1 phút app chạy tại `https://neo-era.github.io/<TEN-REPO>/`.

> Nếu repo tên khác `neo-era.github.io`, địa chỉ sẽ có thêm `/<TEN-REPO>/`. Khi đó **Authorized JavaScript origins** vẫn chỉ cần `https://neo-era.github.io` (origin không gồm đường dẫn con).

---

## 3) Dùng app

1. Mở app → bấm **Đăng nhập Google** → chọn tài khoản → cho phép quyền Drive.
2. Lần đầu Drive chưa có dữ liệu: app hiện **dữ liệu mẫu**. Anh vào **Công cụ → Nạp dữ liệu mẫu** để thử, hoặc tự **Thêm hợp đồng**.
3. Mỗi lần sửa, bấm **● Lưu lên Drive** (nút sáng vàng khi có thay đổi chưa lưu).
4. **Cài app**: desktop (Chrome/Edge) hiện biểu tượng cài trên thanh địa chỉ, hoặc nút "⤓ Cài ứng dụng"; điện thoại Android "Thêm vào màn hình chính"; iPhone: Safari → Chia sẻ ⬆ → "Thêm vào MH chính".
5. **Xuất Excel / JSON**: vào **Công cụ**.

---

## 4) Dữ liệu được lưu thế nào
- File duy nhất `hdduytu-data.json` trên Google Drive của anh.
- App cũng giữ một bản **cache offline** trong trình duyệt để mở nhanh/khi mất mạng; khi có mạng và đăng nhập, bấm **Công cụ → Tải lại từ Drive** để lấy bản mới nhất.
- Hai máy cùng sửa: khi lưu, nếu bản trên Drive đã đổi, app **hỏi trước** khi ghi đè (không âm thầm đè).

## 5) Cấu trúc dự án
```
index.html            giao diện khung
app.css               giao diện (Phương án A — phòng trực vận hành)
manifest.webmanifest  khai báo PWA
sw.js                 service worker (offline)
js/calc.js            tính toán thuần (có test)
js/store.js           trạng thái + cache offline
js/drive.js           OAuth + đọc/ghi Google Drive
js/export.js          xuất Excel / JSON, nhập JSON
js/ui.js              kết xuất + CRUD
js/app.js             khởi động
js/config.js          *** DÁN CLIENT ID VÀO ĐÂY ***
vendor/xlsx.full.min.js  thư viện Excel (đóng gói, chạy offline)
sample/seed.js        dữ liệu mẫu
tests/calc.test.js    test (chạy: node tests/calc.test.js)
icons/                icon PWA
```

## 6) Chạy thử tại máy (tuỳ chọn)
```bash
npx serve .            # hoặc: python3 -m http.server 8099
```
Mở `http://localhost:8099` — nhớ thêm origin này vào Authorized JavaScript origins nếu muốn test đăng nhập Google.
