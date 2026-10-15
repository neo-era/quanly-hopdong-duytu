# Đợt 2 — Chức năng thực tế · App Quản lý HĐ Duy tu

Lập 15/10/2026 · Trạng thái: **CHỜ DUYỆT CHỐT 1 (tiêu chí)**
Nền: bản 342d62e (dashboard, CRUD, Drive, PWA, xuất Excel, OAuth đã chạy).

## Phạm vi (anh đã chọn 4 nhóm) + 1 lỗ hổng phải vá
| # | Chức năng | Ghi chú |
|---|---|---|
| A | Nhập từ file Excel thật | Dự toán thi công tháng + Bảng giá/kế hoạch 11C |
| B | Đính kèm hồ sơ + nhật ký thay đổi | File lưu trên Drive của anh |
| C | Nhắc hạn vào Google Calendar | Lịch riêng, nhắc 7 ngày + 1 ngày |
| D | Báo cáo trình Giám đốc (Word) | Thể thức NĐ 30/2020 |
| + | Sửa được KL tầng 2 (kế hoạch) và tầng 3 (điều chỉnh) trong app | Bản đầu mới sửa được tầng 1 |

---

## A. Nhập từ Excel thật

**A1. Dự toán thi công tháng** (.xls/.xlsx, như "Nhập T9 lãnh lại T10 - G2")
- Đọc: **tháng** từ sheet bìa "BIA DT-TC - Gx" dòng "(Tháng mm/yyyy)"; **gói** từ tên sheet bìa (đuôi "- G2"); **giá trị** từ sheet **THKP**, dòng ký hiệu **GXDCPT** (giá trị sau thuế). Hiển thị kèm dòng **G** (trước thuế) để đối chiếu.
- Kết quả: tạo hoặc cập nhật **kỳ nghiệm thu** `yyyy-mm` của đúng gói; mốc hồ sơ = ngày 05 tháng kế tiếp. **Không** đụng ô "đã thanh toán".
- Đã thử trên file thật: T10/2026 G2 → GXDCPT = **374.771.366 đ**, G = 360.440.991 đ.

**A2. Bảng giá hợp đồng / kế hoạch** (.xlsb/.xlsx có sheet `G1_11C`…`G4_11C`)
- Mỗi gói đọc: **tổng thành tiền** (ô I4), **giá gói thầu** (ô J4), và **giá trị từng năm** = cộng các ô Thành tiền của dòng hạng mục (mã HM…) dưới mỗi tiêu đề "NĂM yyyy".
- **Chốt kiểm tra**: tổng các năm phải bằng tổng thành tiền; lệch → báo đỏ, không cho nhập gói đó.
- Đã thử trên file thật — khớp tuyệt đối cả 4 gói:

| Gói | Tổng thành tiền (I4) | Giá gói thầu (J4) | 2026 | 2027 | 2028 | 2029 |
|---|---|---|---|---|---|---|
| G1 | 382.369.530.323 | 392.698.705.677 | 75,79 tỷ | 116,38 tỷ | 123,87 tỷ | 66,32 tỷ |
| G2 | 511.539.645.805 | 524.780.832.375 | 99,04 tỷ | 155,77 tỷ | 167,25 tỷ | 89,47 tỷ |
| G3 | 597.526.026.856 | 618.535.090.179 | 129,25 tỷ | 176,86 tỷ | 189,73 tỷ | 101,68 tỷ |
| G4 | 262.754.675.608 | 270.453.965.240 | 48,37 tỷ | 80,44 tỷ | 85,97 tỷ | 47,98 tỷ |

- Kết quả: giá trị HĐ + trần (tầng 1) + kế hoạch theo năm (tầng 2) của gói được chọn.
- Mặc định **giá trị HĐ = tổng thành tiền (I4)** (giá sau giảm giá); giá gói thầu (J4) lưu để tham chiếu. Anh đổi được ở màn xem trước.

**Chung cho A**
- Luôn qua **màn xem trước**: hiện số đọc được, chỗ ghi vào, giá trị cũ → mới; anh tick gói rồi bấm **Áp dụng** mới ghi.
- Khớp gói với HĐ trong app theo **mã gói** (G1…G4, trường mới `maGoi`); chưa có thì đề nghị tạo HĐ mới.
- File nặng (10 MB ≈ 20–30 giây): đọc ở luồng nền, có thanh tiến trình, giao diện không treo.
- Chỉ dùng số **có thật trong ô**; không tự nhân/suy ra số thiếu.

## B. Đính kèm hồ sơ + nhật ký

**B1. Đính kèm**
- Mỗi HĐ có mục "Hồ sơ đính kèm". Hai cách: **tải file từ máy lên** (lưu vào Drive của anh, thư mục `HĐ Duy tu - Hồ sơ/<Gói>`), hoặc **dán link** (file Drive/đường dẫn có sẵn).
- Mỗi tệp: tên, loại (HĐ gốc / Phụ lục / BB nghiệm thu / Hồ sơ thanh toán / Khác), gắn với kỳ hoặc phụ lục (tùy chọn), ngày, người đính kèm. Bấm là mở.
- Giới hạn 25 MB/tệp. Xoá mục đính kèm **không** xoá file trên Drive (chỉ gỡ liên kết).

**B2. Nhật ký thay đổi**
- Ghi mọi thao tác: thêm/sửa/xoá, nhập Excel, đính kèm, lưu Drive, đồng bộ lịch — kèm **thời gian, người (email Google), HĐ, nội dung đổi (trước → sau)**.
- Xem theo từng HĐ và xem toàn bộ (lọc theo người/HĐ). Giữ 3.000 dòng gần nhất trong file dữ liệu.

## C. Nhắc hạn vào Google Calendar
- Nút **"Đồng bộ lịch"**: mọi mốc / nghĩa vụ / hạn trình phụ lục **chưa xong và có hạn** → sự kiện cả ngày trong **lịch riêng "HĐ Duy tu CSKVTT"** (tách khỏi lịch cá nhân, tắt/xoá một lần là hết).
- Mỗi sự kiện: tiêu đề `[G2] Ký dự toán NT T10/2026`, mô tả có tên gói + link mở app; nhắc **trước 7 ngày và 1 ngày** (thông báo + email).
- Đồng bộ lại thì **cập nhật** sự kiện cũ (không tạo trùng); mốc đã xong / đã xoá → xoá sự kiện tương ứng.
- Cần: bật Google Calendar API trong project HDDuytu + thêm quyền lịch. Lần đầu bấm, Google hỏi anh cấp thêm quyền.

## D. Báo cáo trình Giám đốc (Word .docx)
- Nút **"Xuất báo cáo"** → chọn ngày chốt số liệu → xem trước nội dung, sửa phần kiến nghị/chỉ đạo → tải **.docx**.
- Thể thức NĐ 30/2020, Times New Roman: CÔNG TY CP CHIẾU SÁNG CÔNG CỘNG TP.HCM / CHIẾU SÁNG KHU VỰC TRUNG TÂM; Số: …/BC-CSKVTT; TP.HCM, ngày …
- Tên loại + trích yếu: **BÁO CÁO** Tình hình thực hiện các hợp đồng duy trì hệ thống chiếu sáng.
- Nội dung:
  I. Tổng hợp chung (bảng: gói, giá trị HĐ, kế hoạch năm, NT luỹ kế, đã thanh toán, công nợ, % thực hiện năm).
  II. Việc quá hạn và sắp đến hạn (≤ 30 ngày).
  III. Nghĩa vụ có chế tài phạt, rủi ro.
  IV. Kiến nghị và chỉ đạo — app **gợi ý sẵn** từ dữ liệu (vd "Gói 3: hoàn tất hồ sơ NT T9, quá hạn 10 ngày"), anh sửa trước khi xuất.
- Nơi nhận + khối ký mặc định: GIÁM ĐỐC — Mai Vũ Lâm (dùng chức danh cụ thể, không "Thủ trưởng đơn vị"); sửa được trong **Cài đặt**.
- Gọi đúng tên đơn vị: "Chiếu sáng khu vực …" (không "Xí nghiệp").

## + Sửa khối lượng tầng 2 & 3
- Thêm/sửa/xoá dòng kế hoạch theo kỳ (kỳ, KL, giá trị, thực hiện) và dòng điều chỉnh (nội dung, Nhóm 1/2, giá trị, trạng thái).

---

## Tiêu chí ĐẠT (đo được)
1. **A1**: nhập file G2 T10 thật → kỳ `2026-10` của Gói 2 = 374.771.366 đ; nhập lại lần 2 không tạo trùng kỳ; "đã thanh toán" giữ nguyên.
2. **A2**: nhập file kế hoạch thật → 4 gói ra đúng bảng số ở trên; tổng năm = I4; không treo giao diện.
3. **B1**: tải 1 file lên → có trong Drive đúng thư mục, mở được từ app; dán link → mở được.
4. **B2**: mỗi thao tác sinh đúng 1 dòng nhật ký có người + trước/sau.
5. **C**: đồng bộ → lịch "HĐ Duy tu CSKVTT" có đúng số sự kiện = số mốc chưa xong có hạn; đồng bộ lần 2 không trùng; đánh dấu xong 1 mốc → đồng bộ → sự kiện đó biến mất.
6. **D**: file .docx mở được bằng Word, đúng thể thức, số liệu khớp dashboard.
7. Test tự động cho phần tính/đọc: bộ đọc Excel (chạy trên 2 file thật), sinh nhật ký, lập danh sách sự kiện lịch (thêm/sửa/xoá), số liệu báo cáo. Toàn bộ test cũ (39) vẫn pass.
8. Giữ chuẩn cũ: PWA, giao diện Phương án A, mobile, offline phần khung.

## Ca xấu phải chịu được
- File Excel không đúng mẫu (thiếu THKP/BIA/11C) → báo rõ thiếu sheet nào, không ghi gì.
- File dự toán không tìm được tháng/gói → cho anh chọn tay ở màn xem trước.
- Tổng năm ≠ I4 → chặn gói đó, báo chênh lệch.
- Mất mạng khi tải file/đồng bộ lịch → báo lỗi, phần đã làm giữ nguyên, bấm lại được, không tạo trùng.
- Anh từ chối cấp quyền lịch → các chức năng khác vẫn chạy.
- Mốc không có hạn → không đưa lên lịch.

## Ngoài phạm vi đợt này
Phân quyền nhiều vai trò; tự đồng bộ lịch chạy nền khi app đóng; nhập file định dạng khác ngoài 2 mẫu trên.
