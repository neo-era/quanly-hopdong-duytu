# 04 — Liên kết hai chiều: App Khảo sát ↔ App Quản lý HĐ duy tu

Ngày lập: 09/11/2026 · Phiên bản 2 (đã áp ý kiến chuyên gia Bước 0)

## 1. Bối cảnh

| | App Khảo sát (KS) | App Quản lý HĐ (HĐ) |
|---|---|---|
| Địa chỉ | neo-era.github.io/khaosat | neo-era.github.io/quanly-hopdong-duytu |
| Lưu dữ liệu | Google Sheets qua Apps Script (`POST text/plain {action, token,…}`) | 1 file JSON trên Drive của người quản lý HĐ + IndexedDB |
| Đăng nhập | Tài khoản KS, token HMAC (1 năm "ghi nhớ" / 8 giờ) | Google OAuth |

Hai app cùng origin `neo-era.github.io`. Dữ liệu HĐ ở Drive riêng → chiều HĐ → KS phải **đẩy bản tóm tắt** sang Sheets của KS.

## 2. Phạm vi

### Chiều 1 — KS → HĐ: lấy bản ghi khảo sát thành **vị trí đề xuất**

1. **Liên kết tài khoản**: HĐ → "Liên kết app Khảo sát" → đăng nhập tài khoản KS có quyền `manage` hoặc `report` (hoặc bấm "Dùng phiên KS trên máy này" — chỉ dùng token đó **một lần** để gọi `hd_link`). Server cấp **token phạm vi `hd`, hạn 30 ngày**, chỉ dùng được cho `list`, `hd_push`, `hd_info`. HĐ lưu token này trong IndexedDB; nút "Ngắt liên kết" xoá; đăng xuất Google cũng xoá.
2. **Lấy dữ liệu**: chọn loại, khoảng ngày, quận/phường → gọi `list` lần lượt từng loại (`includeDeleted:true`), lọc quận/phường ở máy → **bảng xem trước** (chọn/bỏ từng bản ghi).
3. **Ánh xạ** — khoá theo **tiêu đề cột thật** của sheet (server trả tiêu đề tiếng Việt):

| Loại KS | Đích bên HĐ | Cột ghi vào | KL |
|---|---|---|---|
| `thay_den` | **PL II** | "Số đèn hiện hữu" → cột G *Đèn hiện hữu*; "Công suất đèn hiện hữu" → ghi chú; "Năm lắp đặt" → H | **Cột J (KL đề xuất) để trống** – người dùng nhập. Cột I, K, L, M, N để trống |
| `thay_tru` | **PL III** (chỉ gợi ý PL IV khi quy cách "trang trí", người dùng xác nhận) | "Số lượng" → I (KL); "Vị trí" → lý trình đầu (nguyên văn); "Quy cách trụ" → ghi chú; "Năm lắp đặt" → H | "Số lượng" |
| `vo_tu` | **Khác** (không phải PL I — PL I là tủ kết nối điều khiển tự động). Chỉ đưa vào PL I khi người dùng chọn tay từng dòng + ghi lý do | — | "Số lượng" (tủ) |
| `tc_noi`, `tc_ngam`, `cap_luon_can` | Khác | — | "Số lượng" (m) |
| `hkn` | Khác | — | "Số lượng" (hộp) |
| `thay_can`, `choa_den`, `nap_tru`, `decal_so_tru`, `tc_den_kc_xa` | Khác | — | "Số lượng" (cái/bộ theo loại) |
| `nang_mong` | Khác | — | "Số lượng" (trụ); "Độ cao nâng" là mm, **không phải KL** |
| `tang_cuong_den`, `ngam_hoa` | Khác | — | "Số đèn dự kiến" (bộ) |
| `thao_go_bang_ron` | Khác (không cần cột TĐK) | "Vị trí" → lý trình; "Loại quảng cáo" → ghi chú | "Số lượng" (tấm) |
| `bao_cao_su_co` | Khác | "Mã tủ", "Hiện trạng sự cố", "Đề xuất khắc phục" → ghi chú | **trống** — người dùng nhập theo mã HM |

> Anh chốt 09/11/2026: **mọi hạng mục khảo sát đều có hạng mục hợp đồng duy tu** → lấy đủ 17 loại; thanh "Hợp đồng" hiện ở cả 17 form khảo sát.

   - Ô KL trống / không phải số → **KL = trống** (không ghi 0), vị trí bị **chặn xuất phụ lục và không cộng vào đối chiếu** cho đến khi có số. Số dạng "1,5" đọc đúng. Thiếu cột → báo lỗi rõ.
   - Toạ độ: lấy lat/lng nếu có, nếu không giữ "Link Google Map".
4. **Phụ lục nháp "Đề xuất từ KS"**: vị trí lấy về nằm trong phụ lục nháp theo loại + năm KH + đợt. Vị trí nháp **không cộng vào "Đã đưa vào KH"** cho đến khi người dùng chuyển sang một đợt phụ lục thật. Màn đối chiếu hiện thêm cột "Đề xuất KS (nháp)".
5. **Gán mã HM** (anh chốt 09/11: mặc định theo mã HM trong danh mục HĐ của app): đã khai mẫu chi tiết HM cho loại đó → theo mẫu; chưa khai → app tự chọn mã trong danh mục theo quy cách khảo sát (`js/kl/ksma.js`): trụ thép theo chiều cao (HM283–HM286, HM279, HM280), BTLT HM278, trang trí HM287–HM290; vỏ tủ HM131; cáp nổi HM347 (ĐVT 40m); cáp ngầm HM346m/HM346 (100m); cáp luồn cần = dây lên đèn HM330/HM331; HKN HM099 (liên thông HM100); cần đèn HM305–HM314 theo kiểu/chiều dài; chóa HM091–HM105 theo loại; nắp trụ HM254/HM423; decal HM246; nâng móng HM244; băng rôn HM433; đèn LED theo công suất HM187–HM205. Quy đổi ĐVT danh mục (100m, 40m). Không chắc → nhãn "mã … cần xem lại"; không có quy tắc (sự cố, ngầm hóa, chóa LED, cần cổ cò) → để trống, người dùng gắn tay. Mã không có trong danh mục HĐ đang nhập → không gán.
6. **Gán gói / đơn vị**: bảng phường → gói rút từ phụ lục đã nhập. Phường thuộc ≥ 2 gói → "nhiều gói – chọn tay"; phường lạ → "chưa rõ gói". Đơn vị (donVi) **để trống** nếu không chắc (tránh sai phần Sapulico/đối tác).
7. **Phạm vi Sở quản lý**: vị trí mang cờ "chưa xác minh thuộc Sở"; chặn xuất phụ lục đến khi người dùng xác nhận (hoặc khớp danh mục phân cấp nếu đã nạp).
8. **Chống trùng**:
   - Khoá `KS:<type>#<STT>`; STT trùng trong KS → báo, không gộp.
   - Kiểm tra thêm `keyVT` (trạm + phường + tuyến) cùng loại phụ lục với phụ lục đã nhập từ Excel → cảnh báo, **mặc định không thêm**.
   - Lấy lại: so **hash các trường đã ánh xạ** (lưu lúc lấy) → "đã thay đổi" cho cập nhật; vị trí đã thực hiện **không ghi đè KL**.
   - Chỉ đánh dấu "nguồn đã xoá" khi bản ghi có `Deleted At`; không tự xoá vị trí.

### Chiều 2 — HĐ → KS: thông tin HĐ khi nhập + trạng thái bản ghi

1. HĐ → "Đẩy tóm tắt sang KS" (token `hd`, người dùng có `manage`). Gửi kèm `source_file_id`, `generated_at`, người đẩy:
   - `HD_TomTat`: gói, mã gói thầu, năm, mã HM, tên, ĐVT, **KL HĐ phần Sapulico** (`phan='sap'`), đã vào KH, **còn lại chưa vào KH**, NT luỹ kế (nếu có BBNT).
   - `HD_PhuongGoi`: phường → gói (hoặc "nhiều gói").
   - `HD_LienKet`: type, STT, gói, mã HM chính, phụ lục/đợt, trạng thái: **"Đề xuất (nháp)" / "Đã vào PL <đợt>" / "Đã thực hiện T<mm/yyyy>"** (không có nhãn "Đã NT" theo từng bản ghi — BBNT theo mã HM, không theo vị trí).
2. Apps Script:
   - `hd_link` (cấp token `hd` 30 ngày; cần `manage` hoặc `report`).
   - `hd_push` (ghi; cần `manage`): payload ≤ 1 MB, ≤ 5.000 dòng/sheet; `tryLock(10000)` → không được thì "đang bận"; **ghi nguyên tử**: ghi sheet `HD_*_v{n}` + `flush()` → đổi con trỏ `HD_VERSION` (Script Properties) → xoá bản cũ. Từ chối nếu `generated_at` cũ hơn bản đang có (trừ `force`). Cột chữ đặt `setNumberFormat('@')` (chống chèn công thức).
   - `hd_info` (đọc; mọi role **trừ demo** — anh chốt 09/11): theo `{quan, phuong, type}` → gói, mã gói thầu, mã HM của loại kèm KL HĐ / còn lại, thời điểm; theo ≤ 500 cặp `{type, STT}` → trạng thái liên kết. Trả theo **danh sách trường cho phép**, không trả tiền/đơn giá/số HĐ; cache theo `HD_VERSION` ≤ 6 giờ.
   - Hai action mới không trả `stack` khi lỗi; không sửa tiêu đề cột 17 sheet cũ; không chạm cột "Trạng thái xử lý".
3. Giao diện KS:
   - Form: chọn phường xong → **thẻ "Hợp đồng"** (gói • mã gói thầu • mã HM của loại: KL HĐ / còn lại). Ghi chú cố định "Nhập đúng số đo hiện trường; KL HĐ chỉ để tham khảo". Không chặn nhập.
   - Danh sách: nhãn trạng thái liên kết; sửa KL bản ghi đã "Đã vào PL" → cảnh báo.
   - Backend cũ trả `unknown action` → ẩn thẻ êm, không toast; `hd_info` thuộc `READ_ACTIONS`. Cache máy ≤ 12 giờ; dữ liệu > 30 ngày → "dữ liệu HĐ đã cũ".

## 3. Tiêu chí "chạy đúng"

**Dữ liệu**
- T1. Mỗi bản ghi hợp lệ → đúng 1 vị trí, đúng đích theo bảng §2.3, đúng cột; KL trống giữ trống; PL II cột J trống.
- T2. Lấy lại không sinh trùng; trùng `keyVT` với phụ lục Excel → cảnh báo, không thêm; thay đổi phát hiện theo hash; vị trí đã thực hiện không bị ghi đè.
- T3. Gói theo phường: 1 gói → gán; ≥ 2 → chọn tay; lạ → "chưa rõ gói". Không đoán.
- T4. **Tổng "Đã đưa vào KH" trước và sau khi lấy KS bằng nhau**; chuyển nháp → đợt thật thì tăng đúng Σ(KL × hệ số mẫu).
- T5. Phụ lục xuất từ vị trí KS giữ nguyên mẫu gốc; vị trí KL trống / chưa xác nhận thuộc Sở bị chặn xuất kèm lý do.
- T6. `HD_TomTat` khớp màn Đối chiếu (`phan='sap'`) cho từng gói/năm/mã.
- T7. `hd_info` đúng gói theo phường, đúng KL còn lại; dữ liệu cũ > 30 ngày có nhãn.

**Bảo mật / độ bền**
- B1. Token `hd` gọi `delete`/`update`/`users_*`… → bị từ chối (test). Token hết hạn / sai chữ ký → từ chối.
- B2. `hd_push`: thiếu `manage`, payload sai kiểu, > 1 MB, > 5.000 dòng → từ chối; lỗi giữa chừng không làm mất bản đang dùng (con trỏ cũ còn nguyên); hai lần đẩy đè: bản cũ hơn bị từ chối.
- B3. Chuỗi bắt đầu `=`, `+`, `-`, `@` lưu nguyên văn trong Sheets và trong .xlsx xuất ra.
- B4. `hd_info` từ chối `demo`, không trả trường ngoài danh sách cho phép, không trả stack.
- B5. Mọi chuỗi chéo app được escape (kể cả `'`).
- B6. Không commit dữ liệu thật; không sửa tiêu đề 17 sheet; 3 sheet mới tự tạo.

**Giao diện**
- U1. HĐ: hộp "Lấy từ KS" có xem trước, chọn/bỏ, nhãn trùng/thay đổi/thiếu KL; mobile dọc + ngang, sáng + tối.
- U2. KS: thẻ HĐ không che nút lưu, tải nền (đang tải / lỗi / chưa có dữ liệu / cũ); vừa 360×640 và màn ngang.
- U3. Nhãn trạng thái liên kết đọc được ở hai chế độ màu.

**Vận hành / test**
- V1. Apps Script triển khai phiên bản mới, URL giữ nguyên.
- V2. KS với backend cũ: thẻ HĐ ẩn êm; HĐ `hd_push` với backend cũ báo "cần triển khai bản mới".
- V3. Test: lõi ánh xạ (Node), mô phỏng Sheets cho action mới (lock timeout, lỗi khi đổi con trỏ, công thức, token ngoài phạm vi), e2e Playwright chặn mạng bằng `page.route` + backend giả — không gọi URL/token thật.

## 4. Ngoài phạm vi
Đồng bộ tự động theo lịch; KS sửa dữ liệu HĐ; ghi cột "Trạng thái xử lý"; gán gói theo ranh bản đồ.

## 5. Còn chờ anh (không chặn làm)
- PL IV có dùng cho KVTT không (mặc định: chỉ khi chọn tay).
- ~~`tang_cuong_den`, `ngam_hoa` có thuộc HĐ duy tu không~~ → anh chốt 09/11: mọi loại khảo sát đều có hạng mục HĐ.
- Tài khoản Google chủ Apps Script để triển khai bản mới.

## Nhật ký duyệt
| Ngày | Chốt | Chuyên gia | Quyết định | Thay đổi đã áp |
|---|---|---|---|---|
| 09/11/2026 | Bước 0 | Nghiệp vụ duy tu CS | Duyệt có điều kiện | vo_tu ra khỏi PL I; PL II cột G/J; KL trống ≠ 0; phụ lục nháp + T4; trùng keyVT; xoá theo Deleted At; bỏ nhãn "Đã NT"; cờ thuộc Sở; nhiều gói chọn tay, donVi trống; bảng "Khác" tường minh; `phan='sap'` |
| 09/11/2026 | Bước 0 | Apps Script/PWA bảo mật | Duyệt có điều kiện | token phạm vi `hd` 30 ngày; chống chèn công thức; ghi nguyên tử bằng con trỏ; tryLock + trần payload; chống đẩy đè; khoá theo tiêu đề cột thật; tương thích ngược + READ_ACTIONS; không trả stack, allowlist; hash thay đổi; test chặn mạng |
| 09/11/2026 | Q2 | Anh | Mọi tài khoản trừ demo xem KL HĐ | Không nhận góp ý "chỉ manage xem KL"; thay bằng ghi chú "nhập đúng số hiện trường" trên thẻ |
| 09/11/2026 | Chốt UI | UX/UI mobile | Chọn **B** cho cả hai app (KS: thanh chip dính trên nút Lưu + bottom sheet; HĐ: thống kê + nhóm theo đích, ghép bộ lọc chip của A, thẻ chi tiết của C khi chạm dòng) | Bỏ so sánh "số đang nhập > còn lại", chip KL màu trung tính; thanh ≥48px, chữ ≥14px tương phản cao; cao cố định mọi trạng thái; ẩn khi bàn phím mở; pill ≥12px/24px; chạm cả dòng; checkbox nhóm 3 trạng thái; token màu sáng (#15803d/#a16207/#b91c1c); ô thống kê lọc được; phân trang >50 dòng/nhóm; giữ bộ lọc ở màn ngang; trạng thái tải/lỗi/rỗng theo từng loại; footer ghi "không cộng vào Đã đưa vào KH" |
| 09/11/2026 | Phạm vi | Anh | Mọi hạng mục khảo sát đều có hạng mục HĐ duy tu | Lấy đủ 17 loại (thêm tăng cường đèn, ngầm hóa, băng rôn, sự cố vào nhóm Khác); thanh HĐ hiện ở mọi form |
| 09/11/2026 | Mã HM | Anh | Mặc định hạng mục theo mã HM trong app HĐ | Thêm ksma.js: quy tắc chọn mã theo tên hạng mục bảng giá ký (đã đối chiếu 63 mã có trong Tong hop HM thật); mẫu người dùng khai vẫn ưu tiên |
