# 06 — Chọn nhanh hạng mục con liên quan cho từng vị trí (12/11/2026)

## Yêu cầu (anh Lâm)
> "Những hạng mục chính này sẽ có những hạng mục con như vậy. List ra những hạng mục liên quan để người dùng chọn luôn cho nhanh, thuận tiện nhất."

Bối cảnh: hộp "Chi tiết vị trí" (tab Vị trí → bấm 1 vị trí). Ví dụ tủ Bình Trường-1-BC-BC (Thay sửa tủ) anh gắn tay 7 mã: HM127 modem, HM123 biến dòng 50/5A ×3, HM130 biến dòng đo dòng rò, HM431 lắp đặt bộ giao tiếp đo dòng rò, HM151 gói data, HM162 Sim, HM428_CG. Hiện phải bấm "Chọn mã HM (chọn nhiều)" rồi gõ tìm từng mã trong ~1.100 mã. Đã thấy lỗi: chọn nhầm mã Cần Giờ `HM428_CG` thay vì `HM428` (tủ không ở Cần Giờ).

## Phạm vi
App Quản lý HĐ — hộp Chi tiết vị trí (và bảng "Mẫu chi tiết HM" dùng chung danh sách). Không đổi dữ liệu, không đổi công thức đối chiếu/xuất.

## Tiêu chí "chạy đúng" (Bước 0)
**L1. Danh sách hạng mục liên quan theo loại phụ lục của vị trí**, hiện ngay trong hộp (không phải gõ tìm):
- Loại → nhóm (dùng chung quy tắc `ksnhom.js`, theo TÊN hạng mục nên chạy với mọi bảng giá):
  Thay sửa tủ → *Điều khiển · kết nối trung tâm / Đo đếm · đồng hồ đa năng / Đo dòng rò / Đóng cắt · bảo vệ trong tủ / Tủ · vỏ tủ · phụ kiện / Tiếp địa tủ*;
  HPS→LED, HPS AN → nhóm Thay đèn; Thay trụ → nhóm Thay trụ; Hạ ngầm → nhóm Ngầm hóa; Tăng cường LED → nhóm Tăng cường; Thay cáp nguồn ngầm → nhóm Cáp ngầm; khuôn chung `KS:<loại>` → nhóm của loại đó. Vị trí lấy từ khảo sát dùng loại khảo sát gốc.
- Trong nhóm: cặp "Thay thế X" và "Lắp đặt X" đứng cạnh nhau (khớp tên); không tự tick mã đi kèm (có tủ chỉ thay thiết bị, không tính lắp đặt riêng) — chỉ hiện nhãn "đi kèm".
**L2. Tick = có trong bảng chi tiết**: tick thêm dòng KL 1 (hoặc KL gợi ý), bỏ tick xoá dòng; mã đã có trong bảng hiện sẵn dấu tick; KL sửa ở bảng. Hai chiều luôn khớp.
**L3. Mã Cần Giờ (`_cg`)** chỉ hiện khi phường thuộc Cần Giờ (Cần Giờ, Bình Khánh, An Thới Đông, Thạnh An); vị trí khác không hiện. Mã `_cg` đã có trong bảng của vị trí ngoài Cần Giờ → nhãn cảnh báo "mã Cần Giờ" + gợi ý mã thường.
**L4. Hay dùng (tự học)**: nhóm đầu "Hay dùng cho <loại>" = các mã văn phòng đã gắn nhiều nhất cho cùng loại phụ lục (đếm trên dữ liệu vị trí đang có, không lưu thêm), kèm số lần; KL gợi ý = KL hay dùng nhất của mã đó trên 1 đơn vị KL vị trí (vd biến dòng 3/tủ).
**L5. "Như vị trí trước"**: nút chép nguyên chi tiết HM của vị trí cùng loại vừa sửa gần nhất (trong phiên), nhân theo KL vị trí. Chỉ điền vào bảng, phải bấm Lưu mới ghi.
**L6. Mã chỉ có trong HĐ gói của vị trí** mặc định (như bộ chọn hiện tại), có công tắc xem cả mã ngoài gói. Hiện "còn lại" HĐ năm của gói cạnh mã khi có.
**L7. Không vỡ**: bộ chọn tìm kiếm cũ vẫn còn; vị trí không có loại/nhóm → chỉ có "Hay dùng" + tìm kiếm. Tất cả test cũ đạt.
**L8. Giao diện**: dùng tốt trên điện thoại (dòng chạm ≥ 44px, không tràn ngang 360px, dọc + ngang, sáng + tối); mỗi nhóm thu gọn/mở; đếm "đã chọn n/m" mỗi nhóm.

## Kiểm thử
- Lõi thuần (`hmlienquan.js`): nhóm theo loại PL/loại KS; ghép cặp thay thế ↔ lắp đặt trên danh mục thật (modem 127↔429, nguồn 128↔430, biến dòng 123↔425, 124↔426, đồng hồ 125↔427, giao tiếp ĐH 126↔428, dòng rò 129↔431, 130↔432, vỏ tủ 131↔364, RCBO tủ 120↔365, ĐK trung tâm 121↔424); ẩn/hiện `_cg` theo phường; hay dùng + KL gợi ý; "như vị trí trước" nhân theo KL.
- Giao diện (Playwright): tick/bỏ tick đồng bộ bảng; ảnh dọc/ngang/360/desktop, sáng/tối.

## Nhật ký duyệt
| Ngày | Chốt | Chuyên gia | Quyết định | Thay đổi đã áp |
|---|---|---|---|---|
