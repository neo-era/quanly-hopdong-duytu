# Khối lượng theo vị trí ↔ Khối lượng theo hạng mục HĐ

Lập 29/10/2026 · Trạng thái: **CHỜ DUYỆT CHỐT 1 (tiêu chí)**
Nền: app bản 998922d. (Tiêu chí đợt 2 — nhập Excel, hồ sơ, lịch, báo cáo — vẫn chờ duyệt; tính năng này làm trước, phần đọc danh mục HM dùng chung với mục A2 của đợt 2.)

## Anh đã chốt
| Câu hỏi | Chốt |
|---|---|
| Luồng chính | Cả ba: **nhập** phụ lục Excel có sẵn, **sửa/thêm** vị trí trong app, **xuất** lại đúng form trình Sở + **đối chiếu** |
| Cách nối vị trí ↔ HĐ | **Mỗi vị trí ghi KL theo nhiều mã HM** (chi tiết như sheet PTHM) |
| Đối chiếu với | **KL HĐ theo năm của gói** (sheet "Tong hop HM"), thêm cột **đã đưa vào kế hoạch, đã thực hiện, kế hoạch còn lại** |
| Nguồn "đã thực hiện" | **Cả hai**: đánh dấu trong app + nhập hàng loạt từ file Excel |

## Mẫu phụ lục thật đã đọc (3 file trong "03. Dự toán - Khối lượng - Sản lượng")
| Phụ lục | Hạng mục | ĐVT | Cột riêng | Đơn giá ước trong file |
|---|---|---|---|---|
| PL I | Thay thế, sửa chữa tủ điều khiển hiện hữu để kết nối về bộ phận điều khiển tự động | tủ | Năm lắp đặt | 67.033.279 |
| PL II | Thay thế đèn HPS hiện hữu thành đèn LED | bộ | Lý trình đầu/cuối, đèn hiện hữu, năm LĐ, tình hình hoạt động, công suất, Ltb, Etb | 9.000.000 |
| PL III | Sửa chữa, thay thế trụ chiếu sáng | trụ | Lý trình, trụ hiện hữu, năm LĐ | 10.000.000 |
| PL IV | Trụ trang trí (Lữ Gia) | trụ | theo file | — |

Chung: dòng 1 "Phụ lục …", dòng 2 "DUY TRÌ HỆ THỐNG CHIẾU SÁNG ĐÔ THỊ - …", dòng 3 "(Đính kèm Công văn số …/TTGTHTKT-CXCS1, ngày … của Trung tâm …)"; dòng TỔNG CỘNG; nhóm theo **phường-xã** (dòng nhóm có SUBTOTAL); cột phụ: Đợt, Gói, Đơn vị (CS Tây/Bắc/Nam/Trung tâm). Sheet "TongHop": phụ lục × gói × đơn vị → KL, ĐVT, đơn giá, thành tiền.

## Mô hình dữ liệu (thêm vào file JSON trên Drive)
- **Danh mục HM theo gói** (nhập từ bảng giá HĐ .xlsb): mã HM, tên, ĐVT, đơn giá theo gói (sheet Gx_11C), **KL HĐ theo năm** (sheet "Tong hop HM", cột Gx-NĂM yyyy). 1.111 mã.
- **Bộ phụ lục**: loại (PL I/II/III/IV), tiêu đề nguyên văn dòng 2, đợt, nhóm vốn (vd "BSV (ĐỢT 2)-NHÓM 5"), năm kế hoạch, số/ngày công văn, ĐVT, đơn giá phụ lục.
- **Vị trí** (mỗi dòng phụ lục): stt, trạm đèn, phường-xã, tuyến đường, lý trình đầu/cuối, năm lắp đặt, KL phụ lục, ghi chú, gói, đơn vị, các cột riêng của từng loại PL; **chi tiết HM**: danh sách (mã HM, KL kế hoạch); **thực hiện**: trạng thái (Chưa làm / Đang làm / Đã thực hiện), tháng NT, KL thực hiện theo từng mã HM (mặc định = KL kế hoạch, sửa được).

## Chức năng
1. **Nhập danh mục HM + KL HĐ** từ file bảng giá HĐ (.xlsb/.xlsx có "Tong hop HM" + Gx_11C).
2. **Nhập phụ lục trình Sở** (.xlsx đúng form): tự nhận loại PL theo dòng tiêu đề, đọc từng vị trí, nhóm phường, đợt, gói, đơn vị. Màn xem trước → Áp dụng. Kiểm tra: **tổng KL đọc được = ô TỔNG CỘNG của file**, lệch thì báo.
3. **Mẫu chi tiết HM theo loại PL**: khai 1 lần (vd PL II: 1 bộ = 1×HM186); khi nhập/thêm vị trí, app **điền sẵn** chi tiết HM = KL phụ lục × mẫu; sửa riêng được từng vị trí. Không có mẫu thì để trống, báo "chưa gắn HM".
4. **Sửa trong app**: bảng vị trí lọc theo phụ lục/đợt/phường/gói/đơn vị/trạng thái; thêm/sửa/xoá; sửa chi tiết HM từng vị trí; chọn nhiều vị trí → đánh dấu "Đã thực hiện" + tháng NT một lượt.
5. **Nhập "đã thực hiện" từ Excel**: file đúng form phụ lục (cột KL thực hiện / trạng thái) → khớp theo **trạm đèn + phường + tuyến**; dòng không khớp liệt kê riêng, không ghi bừa.
6. **Đối chiếu theo mã HM** (chọn gói + năm): bảng `Mã HM | Tên | ĐVT | KL HĐ năm | Đã đưa vào KH | Đã thực hiện | KH còn lại | HĐ còn lại chưa vào KH`, kèm thành tiền theo đơn giá HĐ; **vượt KL HĐ tô đỏ**; bấm một mã → xem danh sách vị trí cấu thành.
   - Đã đưa vào KH = tổng KL kế hoạch các vị trí có năm KH = năm chọn.
   - Đã thực hiện = tổng KL thực hiện các vị trí "Đã thực hiện".
   - KH còn lại = Đã đưa vào KH − Đã thực hiện.
   - HĐ còn lại chưa vào KH = KL HĐ năm − Đã đưa vào KH.
7. **Xuất Excel đúng form trình Sở**: mỗi phụ lục 1 sheet, **giữ nguyên tiêu đề/cột/dòng nhóm phường** như file gốc; công thức **sống** (SUBTOTAL theo phường, TỔNG CỘNG, thành tiền = KL × đơn giá); Times New Roman, kẻ khung, trang ngang vừa khổ in. Kèm sheet **TongHop** (công thức tham chiếu sang các sheet PL) và sheet **DoiChieu_HM**.

## Tiêu chí ĐẠT (đo được)
1. Nhập 3 file trình Sở thật (Dot2-20.10, dot_4__5, TH SXD-(D5)): số vị trí và tổng KL từng phụ lục **khớp đúng** ô TỔNG CỘNG của file; số nhóm phường khớp.
2. Nhập file bảng giá HĐ thật: đủ mọi mã có trong sheet "Tong hop HM" (thực tế 1.102 mã, gồm cả mục KV2 Cần Giờ `_cg`); KL HĐ năm của một mã mẫu khớp ô trong "Tong hop HM" (vd HM021 G1-2026 = 160.769).
3. Xuất → mở bằng Excel/LibreOffice: tiêu đề + cột giống file gốc; công thức tính ra đúng tổng; **nhập lại file vừa xuất ra đúng y dữ liệu** (vòng tròn xuất–nhập).
4. Đối chiếu: với dữ liệu mẫu có đáp án tính tay, 4 cột số đúng; vượt HĐ tô đỏ.
5. Đánh dấu hàng loạt 50 vị trí "Đã thực hiện" → cột "đã thực hiện" tăng đúng.
6. Nhập "đã thực hiện" từ Excel: dòng khớp được cập nhật, dòng không khớp được liệt kê.
7. Hiệu năng: 2.000 vị trí × 5 mã HM vẫn lọc/cuộn mượt (< 200 ms mỗi thao tác), lưu Drive bình thường.
8. Test tự động cho bộ đọc phụ lục (chạy trên 3 file thật), bộ đọc danh mục HM, phép đối chiếu, bộ xuất (vòng tròn). Test cũ (39) vẫn pass.
9. Giữ chuẩn app: PWA, giao diện phong cách A, dùng được trên điện thoại (dọc + ngang; bảng chuyển dạng thẻ), nút quay lại ở màn phụ.

## Ca xấu phải chịu được
- File không đúng form (không thấy "Phụ lục …" / dòng tiêu đề cột) → báo rõ, không ghi.
- Tổng đọc được ≠ TỔNG CỘNG của file (như 3 phường lệch ở file tách khối lượng trước đây) → hiện chênh lệch từng phường, anh quyết nhập hay không.
- Vị trí trùng (cùng trạm + phường + tuyến trong cùng phụ lục) → cảnh báo.
- Mã HM không có trong danh mục gói → báo đỏ ở dòng đó.
- Nhập lại cùng một phụ lục lần 2 → hỏi "thay thế bộ cũ" hay "bỏ qua", không nhân đôi.
- Ô KL trống / chữ → coi là chưa có, không tự suy số.

## Ngoài phạm vi lần này
Quy đổi mã hiệu định mức (BA…/CS…) trong dự toán tháng sang mã HM; vẽ bản đồ vị trí; nhập PDF phụ lục đã ký.

## Thứ tự làm
Bước 1 doc (file này) → **Chốt UI** (2 phương án màn "Vị trí" + màn "Đối chiếu HM", có màn ngang điện thoại) → Bước 2 test (bộ đọc trên 3 file thật, đối chiếu, xuất vòng tròn) → Bước 3 code → Bước 4 review độc lập → Bước 5 kiểm chứng → đẩy GitHub từ máy jd.

## Bổ sung 29/10/2026 — Bảng giá ký hợp đồng làm nguồn KL HĐ chuẩn
- Nút "⤓ Bảng giá HĐ" nhận nhiều file một lần: 4 file biểu giá G1–G4 (.xlsb) và file "Bảng giá ký HĐ" 1 sheet (vd Thủ Đức).
- Mỗi file biểu giá chứa BGHD của cả 4 gói; app chỉ lấy **bản chốt**: sheet "BGHD" (không hậu tố) hoặc "BGHD Gx" theo số gói trong tên file. Mã HM ghép theo dòng tương ứng của Gx_11C cùng file (phải khớp 100% năm + tên).
- File ký HĐ không có mã HM → ghép theo thứ tự với bảng giá đã nhập của gói cùng số dòng; báo số dòng lệch KL / KL Sapulico / đơn giá / thành tiền.
- Lưu theo gói: KL tổng liên danh, **KL phần Sapulico**, **đơn giá ký HĐ theo năm** (2026 VAT 8%, 2027–2029 VAT 10%). Gói đã có bảng giá ký thì "Tong hop HM" không ghi đè.
- Kiểm tra khi nhập: thành tiền = KL × ĐG; KL Sapulico + đối tác = tổng; dòng NĂM … = cộng các dòng (phát hiện −217 đ gõ tay ở G2/Cần Giờ/2029).
- Đối chiếu HM có thêm "Phạm vi: Cả liên danh / Phần Sapulico" (phần Sapulico bỏ các vị trí có đơn vị Lữ Gia / Phú Thọ).
- Test: 107 (thêm 12 test trên 5 file thật: tổng G1 373.085.620.257 = giá trị HĐ đã ký; G4 Sapulico 128.300.705.356; Thủ Đức khớp 1.942/1.942 dòng).
