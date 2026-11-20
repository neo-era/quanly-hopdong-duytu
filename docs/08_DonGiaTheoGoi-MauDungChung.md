# 08 — Đơn giá HĐ theo gói + cảnh báo mẫu dùng chung (20/11/2026)

## Yêu cầu (anh Lâm)
Mẫu chi tiết HM dùng chung mọi gói → "có [cảnh báo], và lưu ý HM của gói tương ứng thì lấy đơn giá của hợp đồng tương ứng".

## Quy tắc
- **D1** Cùng 1 mã HM, vị trí gói nào lấy đơn giá trong bảng giá HĐ gói đó (đơn giá năm KH → đơn giá gói). `core.dgHD(st, ma, goi, nam)`.
- **D2** Mã không có trong HĐ gói đã ký → **không có đơn giá** (không mượn giá gói khác, không lấy giá "Tổng hợp HM"); Đối chiếu HM báo "Không có trong HĐ Gói n", tiền = 0; Excel tổng hợp ghi "— không có trong HĐ gói này".
- **D3** Gói chưa nhập bảng giá ký → dùng giá tham khảo "Tổng hợp HM", nhãn "Đơn giá tham khảo".
- **D4** Áp mẫu (nút "Áp mẫu cho vị trí…", "Gắn mẫu HM", nhập phụ lục): vị trí nào nhận mã không có trong HĐ gói của nó → hộp cảnh báo liệt kê mã × gói × số vị trí. Không tự xoá mã.
- **D5** Tab Mẫu chi tiết HM: cột "Có trong HĐ gói" (G1 ✓ / G2 ✗…), di chuột xem đơn giá gói.

## Kiểm thử
`tests/hmlq.test.js` D1–D5; Playwright: gắn mẫu có mã ngoài gói → hộp cảnh báo; cột ✓/✗ ở tab mẫu (390 sáng, 1280 tối), không lỗi trang.
