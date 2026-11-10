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

## 6. Giai đoạn 2 — Chọn hạng mục HĐ ngay trong form khảo sát (anh yêu cầu 10/11/2026)

**Yêu cầu anh:** "cho phép chọn hạng mục hợp đồng, phân loại cập nhật dữ liệu tương ứng" · "phân loại nhóm hạng mục theo từng loại khảo sát". Anh chốt: lựa chọn **lưu vào bản ghi**; app HĐ dùng đúng mã đó thay cho mã tự đoán.

**Hiện trạng gây vướng:** phường chưa có trong phụ lục thật (vd Chợ Lớn) → bảng HĐ chỉ báo "chưa có"; loại Thay đèn chưa có mã HM nào gán sẵn → "chưa gán mã".

### 6.1 Thiết kế
- **Nhóm hạng mục theo loại khảo sát** (`js/kl/ksnhom.js` bên app HĐ): mỗi loại trong 17 loại có 1–4 nhóm con, mỗi nhóm là quy tắc theo **tên hạng mục** (bỏ dấu) trên danh mục HĐ đang nhập, không cứng mã. Vd Thay đèn: Thay bộ đèn · Lắp đèn LED theo công suất · Bóng/chấn lưu/kích · Linh kiện LED (driver, module, nguồn). Mã nằm trong nhóm theo tên thật của bảng giá ký 2026–2029 (đối chiếu danh mục 1.102 mã, không đưa danh mục lên repo).
- **Đẩy sang KS:** bảng `loaiHM` thêm cột 3 "Nhóm" (máy chủ nhận cả bản 2 cột của app HĐ cũ). Mỗi loại kèm đủ mã của các nhóm có trong danh mục.
- **Form KS — bảng "Thông tin hợp đồng":**
  - Phường chưa có trong HĐ hoặc thuộc nhiều gói → **chọn gói** (danh sách gói có trong dữ liệu HĐ, kèm mã gói thầu).
  - **Chọn hạng mục**: danh sách theo nhóm của loại đang nhập, mỗi dòng mã · tên · ĐVT · KL HĐ · còn lại; ô tìm (bỏ dấu, theo mã/tên); "Xem nhóm của loại khác" khi cần. Mặc định "Để app HĐ tự chọn".
  - Đã chọn → thanh HĐ hiện mã đã chọn + KL còn lại của mã đó.
  - **Nhớ lựa chọn**: gợi ý theo lần chọn trước (gói theo phường; mã theo loại + gói) có nhãn "📚 theo lần trước" — chỉ là gợi ý mặc định, không tự lưu; có nút "Quên các lựa chọn đã nhớ".
- **Lưu:** sheet mới `HD_ChonHM` (Loại · STT · Gói · Mã HM · Tên HM · Người chọn · Lúc) — **không thêm cột vào 17 sheet khảo sát**. Ghi kèm lúc lưu bản mới (`submit` nhận `hd:{goi,ma}`), lúc sửa bản (`update`), và qua action `hd_chon` (chủ bản ghi hoặc quyền edit). Bỏ chọn = xoá dòng. Ghi Audit.
- **App HĐ đọc:** `list` trả thêm 2 trường ảo `HĐ – Gói`, `HĐ – Mã HM` cho bản có lựa chọn. Ánh xạ: mã chọn có trong danh mục → chi tiết HM = mã đó × KL (quy đổi ĐVT 100m/40m), nhãn "người khảo sát chọn"; phường không có gói → dùng gói đã chọn. Mẫu người dùng khai / chi tiết đã sửa tay trong app HĐ **vẫn ưu tiên** (không ghi đè chỉnh tay).

### 6.2 Tiêu chí "chạy đúng"
- C1. Mọi 17 loại có ≥ 1 nhóm; Thay đèn ra nhóm đèn (vd HM186, HM187–HM205, HM208–HM209, HM074–HM090); không lẫn mã trụ/cần/chóa vào nhóm đèn và ngược lại (test bằng tên mẫu, không dùng dữ liệu thật).
- C2. Phường không có trong HĐ vẫn chọn được gói rồi chọn mã; số KL HĐ/còn lại đúng theo gói đã chọn và năm.
- C3. Chọn mã → lưu cùng bản ghi (online, offline hàng chờ, sửa bản); bỏ chọn → xoá; không chọn → không ghi gì (giữ hành vi cũ).
- C4. Máy chủ chỉ nhận mã đúng mẫu `HM` + số (+ hậu tố) và gói `G` + số; mã không có trong dữ liệu HĐ đang lưu → từ chối kèm lý do; người không phải chủ bản & không có quyền edit → từ chối.
- C5. App HĐ lấy bản KS có mã chọn → chi tiết đúng mã chọn, KL quy đổi đúng ĐVT; bản không chọn → như cũ (ksma.js); chi tiết đã sửa tay không bị ghi đè.
- C6. Tương thích: máy chủ cũ (chưa có `hd_chon`) → phần chọn ẩn, form vẫn lưu được; app HĐ cũ đẩy `loaiHM` 2 cột vẫn nhận.
- C7. Nhớ lựa chọn: lần sau cùng loại + gói gợi ý mã cũ kèm nhãn; người dùng đổi → nhớ theo lựa chọn mới; xoá được bộ nhớ; dữ liệu hỏng không làm sập form.
- C8. Giao diện: chọn được bằng một tay trên 360×640 và màn ngang; vùng chạm ≥ 48px; danh sách dài cuộn trong bảng, ô tìm không bị bàn phím che; sáng + tối; không che nút Lưu.
- C9. Bảo mật: mọi chuỗi hiển thị được escape; chuỗi ghi sheet qua `sanitizeCell`; không trả tiền/đơn giá.
- C10. Test: lõi nhóm (Node), máy chủ (harness), client (jsdom/Playwright chặn mạng); toàn bộ test cũ vẫn xanh.

### 6.3 Thay đổi bắt buộc sau duyệt Bước 0 (đã áp vào thiết kế)
- **Mã đúng gói:** danh sách, gợi ý `ksma.js` và máy chủ chỉ nhận mã có trong gói đã chọn (vd HM346 ở G1–G3 ĐVT 100m, HM346m ở G4 ĐVT m).
- **Nhiều mã / bản ghi:** tối đa 3 mã, mỗi mã có hệ số KL (mặc định 1) — vd Thay đèn = Tháo dỡ bộ đèn + Lắp đặt LED theo công suất. `HD_ChonHM` 1 dòng/mã, khoá (Loại, STT, Mã).
- **Mã `_cg`:** anh chốt 10/11 — **ẩn khỏi danh sách** của người khảo sát (văn phòng xử lý trong app HĐ). Bỏ dòng không có gói.
- **ĐVT:** quy đổi đủ dạng `100m`, `40m`, `1m`, `1 m`, `100m2`, `10m2`, `100m3`, `1m2`.
- **Gói chọn tay:** chỉ mở khi phường chưa có / nhiều gói; gói có phường cùng quận cũ đứng trước, gói khác quận hỏi xác nhận; lưu cờ "gói do KS chọn", không đưa vào `HD_PhuongGoi`; app HĐ hiện nhãn "gói KS chọn" / "lệch gói" khi phụ lục thật ra gói khác.
- **Năm:** chọn năm trong các năm có dữ liệu HĐ; lưu năm cùng lựa chọn; KL còn lại theo năm đã chọn.
- **Thứ tự ưu tiên ở app HĐ** (theo chốt của anh "app HĐ dùng đúng mã đó"; chuyên gia kỹ thuật đề xuất mẫu đứng trước — không nhận vì trái chốt): chi tiết sửa tay > mã KS chọn > mẫu > `ksma.js`. KS đổi mã sau khi vị trí đã sửa tay → nhãn "KS đổi mã", không ghi đè.
- **Không làm kẹt bản khảo sát:** mã/gói sai → bản khảo sát vẫn lưu, bỏ phần mã, trả `hd_warning`; không gộp vào `validateRecord_`.
- **Thứ tự ghi trong khoá `submit`:** dòng khảo sát → `client_ids` → `HD_ChonHM` (try/catch, lỗi = cảnh báo). Gửi lại trùng: chỉ ghi lựa chọn nếu chưa có.
- **`update`:** không có `hd` = giữ; `hd:null` = bỏ chọn; có `hd` = ghi; tự `tryLock`.
- **Kiểm ở máy chủ:** mã `^HM\d{1,4}[A-Za-z0-9]{0,4}$` (không nhận `_cg`), gói `^G\d{1,2}$`, cặp (gói, năm, mã) có trong `tomTat`; phường thuộc đúng 1 gói thì gói phải trùng; tên HM lấy từ máy chủ; từ chối bản đã xoá; chủ bản (không có quyền edit) bị từ chối khi bản đã vào PL / đã thực hiện / Nghiệm thu, người có quyền edit phải gửi xác nhận. `hd_chon` **không** vào `HD_SCOPE_ACTIONS`.
- **Máy chủ cũ:** máy chủ mới trả `hd_saved:true`; `hd_info` trả `chon:true` → client chỉ hiện phần chọn khi có cờ; đã gửi mã mà không có `hd_saved` → báo người dùng.
- **`loaiHM` 2/3 cột:** nhận cả hai, bù ô thiếu; giới hạn nhóm để tổng ≤ 5.000 dòng (test cỡ thật dựng giả).
- **Cache:** bảng tra gọn "gói|năm|mã → tên, ĐVT" cache riêng có số phiên bản; kiểm mã trước khi lấy khoá.
- **App HĐ:** hash thay đổi chỉ thêm gói/mã chọn khi có; `apDung` dùng gói chọn khi phường chưa có / nhiều gói.
- **Bộ nhớ học:** gợi ý là chip, phải chạm mới thành lựa chọn; tách theo người dùng, ≤ 200 mục, xoá khi đăng xuất, đọc trong try/catch, kiểm lại với danh mục hiện tại.
- **Nháp / hàng chờ / sửa bản:** nháp giữ `__hd`; hàng chờ để `hd` trong payload; mở lại từ hàng chờ và màn sửa khôi phục lựa chọn rồi kiểm lại với `hd_info`.
- **Giao diện (chốt UI — chuyên gia UX chọn C + bảng chọn kiểu B + ô tìm toàn bộ của A):** ô "Hạng mục HĐ" trong form sau Phường/TĐK, chạm cả ô ≥ 56px; mặc định "Để app HĐ tự chọn"; gợi ý ghim đầu, không chọn sẵn; chip ≥ 48px, nút đáy ≥ 52px trong safe-area; viền ≥ 3:1; chữ ≥ 14px; ô tìm 16px, chạm vào thì bảng giãn toàn màn, ô tìm dính đỉnh; màn ngang 2 cột (trái gói/nhóm, phải danh sách); chọn xong đóng bảng, ô nháy viền, toast "Đã chọn … — sẽ lưu cùng bản ghi" + Hoàn tác, `aria-live`; trạng thái đang tải / lỗi + Thử lại / không khớp / máy chủ cũ; "Hết KL" bằng chữ; đổi gói xoá mã đã chọn; chip nhóm có mép mờ báo còn chip; đổi phường/loại → "Cần chọn lại"; Back đóng bảng.

## Nhật ký duyệt
| Ngày | Chốt | Chuyên gia | Quyết định | Thay đổi đã áp |
|---|---|---|---|---|
| 09/11/2026 | Bước 0 | Nghiệp vụ duy tu CS | Duyệt có điều kiện | vo_tu ra khỏi PL I; PL II cột G/J; KL trống ≠ 0; phụ lục nháp + T4; trùng keyVT; xoá theo Deleted At; bỏ nhãn "Đã NT"; cờ thuộc Sở; nhiều gói chọn tay, donVi trống; bảng "Khác" tường minh; `phan='sap'` |
| 09/11/2026 | Bước 0 | Apps Script/PWA bảo mật | Duyệt có điều kiện | token phạm vi `hd` 30 ngày; chống chèn công thức; ghi nguyên tử bằng con trỏ; tryLock + trần payload; chống đẩy đè; khoá theo tiêu đề cột thật; tương thích ngược + READ_ACTIONS; không trả stack, allowlist; hash thay đổi; test chặn mạng |
| 09/11/2026 | Q2 | Anh | Mọi tài khoản trừ demo xem KL HĐ | Không nhận góp ý "chỉ manage xem KL"; thay bằng ghi chú "nhập đúng số hiện trường" trên thẻ |
| 09/11/2026 | Chốt UI | UX/UI mobile | Chọn **B** cho cả hai app (KS: thanh chip dính trên nút Lưu + bottom sheet; HĐ: thống kê + nhóm theo đích, ghép bộ lọc chip của A, thẻ chi tiết của C khi chạm dòng) | Bỏ so sánh "số đang nhập > còn lại", chip KL màu trung tính; thanh ≥48px, chữ ≥14px tương phản cao; cao cố định mọi trạng thái; ẩn khi bàn phím mở; pill ≥12px/24px; chạm cả dòng; checkbox nhóm 3 trạng thái; token màu sáng (#15803d/#a16207/#b91c1c); ô thống kê lọc được; phân trang >50 dòng/nhóm; giữ bộ lọc ở màn ngang; trạng thái tải/lỗi/rỗng theo từng loại; footer ghi "không cộng vào Đã đưa vào KH" |
| 09/11/2026 | Phạm vi | Anh | Mọi hạng mục khảo sát đều có hạng mục HĐ duy tu | Lấy đủ 17 loại (thêm tăng cường đèn, ngầm hóa, băng rôn, sự cố vào nhóm Khác); thanh HĐ hiện ở mọi form |
| 09/11/2026 | Mã HM | Anh | Mặc định hạng mục theo mã HM trong app HĐ | Thêm ksma.js: quy tắc chọn mã theo tên hạng mục bảng giá ký (đã đối chiếu 63 mã có trong Tong hop HM thật); mẫu người dùng khai vẫn ưu tiên |
| 10/11/2026 | Bước 0 (GĐ2) | Nghiệp vụ duy tu CS | Duyệt có điều kiện | mã đúng gói; ≤ 3 mã + hệ số; ẩn `_cg` (anh chốt); ĐVT 8 dạng; gói chọn tay có cờ + nhãn lệch gói; chọn năm; thứ tự ưu tiên; nhóm theo đối tượng đầu tên |
| 10/11/2026 | Bước 0 (GĐ2) | Apps Script/PWA bảo mật | Duyệt có điều kiện | không kẹt bản KS vì mã HĐ; thứ tự ghi; `update` 3 trạng thái; kiểm cặp gói–năm–mã ở máy chủ; `hd_saved` + `chon`; `loaiHM` 2/3 cột, trần 5.000; cache bảng tra gọn; hash; gợi ý phải chạm; nháp/hàng chờ/sửa. Không nhận "mẫu trước mã KS chọn" (trái chốt anh) |
| 10/11/2026 | Chốt UI (GĐ2) | UX/UI mobile | Chọn C + bảng chọn B + tìm toàn bộ của A | 11 thay đổi bắt buộc (mục 6.3 Giao diện) |
| 10/11/2026 | Mã `_cg` | Anh | Ẩn `_cg` khỏi danh sách người khảo sát | — |
| 10/11/2026 | Chốt 2 (GĐ2) vòng 1 | Kỹ thuật + QA độc lập | Duyệt có điều kiện | 5 bắt buộc: đổi phường không làm mất/xoá lựa chọn (chỉ xoá khi bấm Bỏ chọn); `update` qua cùng chốt quyền `hdChonChot_` (đã xoá / vào PL / Nghiệm thu cần xác nhận); lỗi kiểm mã không làm hỏng lưu bản KS; hàng chờ báo `hd_warning`; đổi gói/năm xoá danh sách cũ + chặn chạm khi đang tải |
| 10/11/2026 | Chốt 2 (GĐ2) vòng 2 | Kỹ thuật + QA độc lập | DUYỆT | Đã áp đủ 5 bắt buộc + Back = huỷ, nút Quên bộ nhớ, không gắn lại Lệch gói sau khi văn phòng gán gói, hỏi bỏ lựa chọn cũ khi sửa bản đổi phường. Test: ks2 159/159, q2 ks 150 đạt |
