# 07 — Chép nguyên bộ HM từ vị trí hoàn chỉnh sang các vị trí cùng công tác (16/11/2026)

## Yêu cầu (anh Lâm)
> "Các công tác giống nhau thì cho phép sao chép nguyên bộ hạng mục của công tác hoàn chỉnh, và có cảnh báo các hạng mục khác nhau."

Bối cảnh: tab KL vị trí, xã Bình Chánh — tủ Bình Trường-1 và Đinh Đức Thiện-3 đã gắn đủ HM; Đinh Đức Thiện-4, -1… còn "Chưa gắn HM". "Như vị trí trước" (docs/06) chỉ chép từng vị trí trong hộp chi tiết, từ vị trí vừa sửa.

## Cách dùng
Tick các vị trí cần gắn → thanh chọn → **⧉ Chép bộ HM từ vị trí…** → (1) chọn vị trí nguồn → (2) nếu có vị trí đích đã có HM: *Thay bằng bộ nguồn* hoặc *Chỉ thêm mã còn thiếu* → (3) xem từng vị trí đích → **Chép cho n vị trí**. Sau khi chép có nút **↶ Hoàn tác chép bộ HM** ở thanh trên (10 phút).

## Tiêu chí "chạy đúng"
**C1.** Vị trí đích trống → nhận nguyên bộ mã của nguồn.
**C2. Cảnh báo khác nhau:** vị trí đích đã có HM → hiện từng mã `+` thêm / `−` bỏ (đỏ, gạch) / `~` đổi KL / `=` giữ. Mặc định **không tick** vị trí đích đã có HM (xem khác biệt rồi tự tick). "Thay": bộ đích = bộ nguồn. "Chỉ thêm mã còn thiếu": giữ nguyên mã + KL của đích. Giống hệt → báo "Giống hệt — bỏ qua".
**C3. Chặn mặc định:** khác loại công tác (loại phụ lục / loại KS gốc khác nguồn) và vị trí đã thực hiện — nhãn đỏ, không tick; người dùng vẫn tick được nếu chắc.
**C4.** KL nhân theo tỉ lệ KL vị trí (đích/nguồn), thiếu KL → giữ nguyên; ghi rõ "KL nhân ×…".
**C5.** Mã theo phường đích: Cần Giờ → mã `_cg` (nếu có), ngoài Cần Giờ → mã thường. Mã không có KL trong HĐ gói của đích / không có trong danh mục → cảnh báo đỏ.
**C6.** Gợi ý nguồn: vị trí cùng loại đã gắn HM (kể cả vị trí đang chọn), ưu tiên cùng gói, cùng phường, đã sửa tay, nhiều mã; tìm theo trạm/phường/tuyến/mã HM. Vị trí đang chọn có nhiều mã nhất được chọn sẵn làm nguồn.
**C7.** Không vỡ: chép = sửa chi tiết (đánh dấu đã sửa tay, gộp mã trùng); Hoàn tác trả nguyên chi tiết + cờ cũ; mọi test cũ đạt. Điện thoại dọc/ngang/360, sáng/tối, không tràn ngang.

## Kiểm thử
`tests/hmlq.test.js` C1–C6 (lõi `chepBoHM`, `goiYNguon` trong `js/kl/hmlienquan.js`). Playwright: 4 cỡ màn, chép → kết quả → Hoàn tác; tick vị trí đã có HM + "Chỉ thêm mã còn thiếu"; đổi nguồn sang vị trí đang chọn.

## Nhật ký duyệt
| Ngày | Chốt | Chuyên gia | Quyết định | Thay đổi đã áp |
|---|---|---|---|---|
