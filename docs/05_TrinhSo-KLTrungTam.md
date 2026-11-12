# 05 — Trình Sở / Không trình Sở (KL Trung tâm) từ app Khảo sát

Yêu cầu của anh (11/11/2026):
- Mỗi loại khảo sát có lựa chọn **Trình Sở / Không trình Sở**.
- Trình Sở → tổng hợp vào **phụ lục trình Sở**; Không trình Sở → tổng hợp vào **khối lượng Trung tâm**.
- Hiện các hạng mục liên quan để người khảo sát chọn.
- Mặc định chia gói thầu theo địa bàn phường/xã.

Thuật ngữ:
- **Trình Sở** = Nhóm 1, xin chủ trương Sở, đi kèm phụ lục công văn Trung tâm.
- **Không trình Sở** = Nhóm 2, thuộc thẩm quyền Trung tâm QLGT&HTKT.
- Trong dữ liệu, kênh của bản ghi lưu là `TS` (trình Sở) hoặc `TT` (Trung tâm).

## 0. Anh đã chốt (11/11/2026)
1. Ô Trình Sở **bắt buộc chọn**, không chọn sẵn.
2. Khuôn phụ lục theo file mẫu anh gửi: "Tổng hợp KL 3 gói đề xuất SXD quý 3-4.2026 (trình SXD sau k.tra 21-09)".
3. KL Trung tâm xuất **cùng khuôn phụ lục**, có thêm sheet tổng hợp gói × mã HM.
4. Thêm **cột "Trình Sở" ở cuối 17 sheet khảo sát**. Bản cũ để trống.
5. **Ngầm hóa**: thêm 2 trường mới **"Chiều dài cáp ngầm (md)"** và **"Số trụ"**.
6. **Tăng cường đèn** (cả tăng cường KC xa) trình Sở **luôn vào PL Tăng cường HTCS bằng LED**. PL V "HPS đảm bảo an ninh" chỉ nhập tay hoặc nhập file.
7. **Vỏ tủ** **không trình Sở**: cố định kênh TT, form không hiện lựa chọn.
8. **Thêm loại khảo sát mới "Thay sửa tủ điều khiển"** (sheet mới) cho PL II, gồm các trường: Tuyến đường, Quận, Phường, Tủ điều khiển, Năm lắp đặt, Số lượng (tủ), Hiện trạng tủ, Người khảo sát, Ngày khảo sát, Ảnh, Ghi chú, link.
9. Cột "KL đề xuất không có trong kế hoạch bảo trì" (đánh X): **app HĐ tự đánh**, văn phòng bật/tắt từng dòng trước khi xuất.

## 1. Khuôn phụ lục (đợt 21-09)
Các sheet đang hiện: I Hạ ngầm · II Thay sửa tủ · III HPS→LED · IV Thay trụ STK · V HPS đảm bảo an ninh · VI Đèn mỹ thuật.

Mẫu ẩn (khuôn cũ, chỉ lấy tên hạng mục và cột KL, dựng lại theo khuôn 21-09): Thay thế cáp nguồn ngầm · Thay thế hệ thống đèn trang trí · Tăng cường HTCS bằng LED.

Bố cục:
- **Đầu sheet:** dòng 1 "Phụ lục …"; dòng 2 tiêu đề "DUY TRÌ HỆ THỐNG CHIẾU SÁNG ĐÔ THỊ - …"; dòng 3 "(Đính kèm Công văn số …)".
- **Cột:** Stt · Trạm đèn · Phường-Xã · Tuyến đường · Lý trình (Điểm đầu / Điểm cuối) · KL theo loại · "KL đề xuất không có trong kế hoạch bảo trì" · Ghi chú · Đơn giá · Lọc Gói · Lọc CSKV.
- **Thân bảng:** dòng ĐVT → TỔNG CỘNG (SUBTOTAL(9)) → mỗi phường một dòng tiêu đề PHƯỜNG/XÃ (SUM các vị trí bên dưới, kèm Gói + CSKV) → các vị trí của phường đó.

**Số La Mã đổi theo từng đợt** (đợt 4/5: PL I = tủ; đợt 21-09: PL I = Hạ ngầm). Vì vậy:
- Nhận loại phụ lục **theo nội dung tiêu đề**, giữ mã nội bộ cũ: PLI = tủ, PLII = LED, PLIII = trụ, PLIV = trụ trang trí.
- Thêm mã mới: `HANGAM`, `HPS_AN`, `MYTHUAT`, `CAPNGAM`, `TANGCUONG`, `KS:<loại>` (khuôn chung).
- Thứ tự so khớp tiêu đề:
  - "TRỤ TRANG TRÍ" xét trước "THAY THẾ TRỤ";
  - "HPS…THU HỒI…AN NINH" xét trước "HPS…LED" và "TĂNG CƯỜNG";
  - "MỸ THUẬT" xét trước "TĂNG CƯỜNG".
- Số La Mã chỉ sinh khi xuất. `LOAI_TEN` bỏ số La Mã.
- Mặc định **không đọc sheet ẩn**; có tuỳ chọn để đọc.

## 2. Ánh xạ loại khảo sát → phụ lục và cột KL
| Loại KS | Trình Sở → phụ lục | Cột KL lấy từ |
|---|---|---|
| ngam_hoa | HANGAM (Hạ ngầm) | Cáp (md) = "Chiều dài cáp ngầm (md)"; Trụ = "Số trụ" — **2 cột KL** |
| **thay_sua_tu** (mới) | PLI (Thay sửa tủ để kết nối điều khiển tự động) | Tủ = Số lượng; Năm lắp đặt |
| vo_tu | — (luôn TT, khuôn chung "Thay vỏ tủ") | Số lượng |
| thay_den | PLII (HPS→LED) | G Đèn hiện hữu = Số đèn hiện hữu; J Đèn LED mặc định = G, cho sửa — **2 cột KL**; H Năm lắp đặt; K–N từ DIALux nếu có |
| thay_tru | PLIII (Thay trụ STK). **Trụ trang trí ở chung phụ lục này**, ghi chú "Trụ trang trí" | I = Số lượng; G (trụ hiện hữu) mặc định = I; ghi chú lấy từ Quy cách trụ |
| tang_cuong_den, tc_den_kc_xa | TANGCUONG (Tăng cường HTCS bằng LED, dựng theo khuôn 21-09) | Số đèn dự kiến / Số lượng (bộ) |
| tc_ngam | CAPNGAM (Thay thế cáp nguồn ngầm, dựng theo khuôn 21-09) | Số lượng (md). **Khác Hạ ngầm**: thay cáp ngầm hiện hữu, không phải ngầm hóa tuyến nổi |
| tc_noi, cap_luon_can, thay_can, choa_den, hkn, nap_tru, decal_so_tru, nang_mong, thao_go_bang_ron, bao_cao_su_co | `KS:<loại>` khuôn chung, tiêu đề theo tên loại | Số lượng / ĐVT của loại |

- HPS_AN (PL V) và MYTHUAT (PL VI) không có loại khảo sát tương ứng: chỉ nhập file hoặc nhập tay.
- **tc_den_kc_xa ghi "Chủng loại đèn" là HPS mà chọn Trình Sở** → form chặn lưu, nhắc "Phụ lục tăng cường chỉ nhận đèn LED — chọn Không trình Sở hoặc đổi chủng loại"; máy chủ cũng từ chối tổ hợp này (ở tang_cuong_den không có trường loại đèn → mặc định LED).
- **Trụ trang trí**: bỏ cờ gợi ý `goiYPLIV` cho bản KS; PLIV chỉ còn để đọc dữ liệu đợt cũ.
- **thay_sua_tu** có đủ STT (stt_auto), kinh độ, vĩ độ như loại khác; "Trạm đèn" của phụ lục = "Tủ điều khiển".
- **Ngầm hóa bản cũ** trống 2 trường mới → vào nhóm "Thiếu KL", không lấy "Số đèn dự kiến" thay. 2 cột mới đứng **sau DIALUX_COLS** trong HEADERS.ngam_hoa. `kl2` chỉ vào hash khi có giá trị.
- **vo_tu**: máy chủ ép "Không trình Sở" (gửi "Trình Sở" bị đổi thành TT kèm cảnh báo); bản vo_tu cũ để trống tự vào TT, không rơi vào "Chưa phân loại".
- HPS_AN và MYTHUAT không có loại KS nên không sinh Biểu TT. Đề xuất HPS thu hồi muốn trình Sở thì văn phòng nhập tay vào PL V (hệ quả của chốt 6).
- Báo cáo sự cố, Băng rôn, Decal, Nắp trụ, HKN, Chóa: khi chọn "Trình Sở", form hiện nhắc "hạng mục này thường thuộc thẩm quyền Trung tâm" (không chặn).
- **KL Trung tâm** dùng đúng các khuôn trên:
  - Tiêu đề "KHỐI LƯỢNG THUỘC THẨM QUYỀN TRUNG TÂM (không trình Sở) - …", bỏ dòng công văn.
  - Đánh số riêng: **Biểu TT-01, TT-02…**
  - Kèm sheet **TongHop_TT** theo gói × mã HM: KL × hệ số quy đổi ĐVT KS → ĐVT mã HM, rồi SUMIFS × đơn giá ký HĐ.

## 3. Tiêu chí đạt
### App Khảo sát (ks2)
**K1. Ô "Trình Sở" trong form**
- Đặt sau Tủ điều khiển, trước ô "Hạng mục HĐ".
- 2 nút ≥ 48px, không chọn sẵn, bắt buộc với cả bản tạo mới lẫn sửa bản.
- Có ở 17 loại cũ (trừ vo_tu cố định TT) và loại mới thay_sua_tu.
- Dưới ô hiện 1 dòng cho biết bản sẽ vào đâu, ví dụ "→ Phụ lục Thay HPS→LED · Gói 1".
- Dựng thành thành phần riêng (giống hd-chon) rồi ghép vào `data['Trình Sở']`.
- Đi đủ đường: nháp (`__trinhSo`), loadFromQueue, sửa bản, hàng chờ.

**K2. Cột trên sheet**
- Hằng `TAIL_COLS = ['Trình Sở']` đứng **sau BONUS_COLS**. **Không** đưa vào `HEADERS[type]`, để không lệch test schema-sync và không đổi KPI "Đầy đủ".
- `initSheets`, `validateSheets`, `capNhatCotSheet` thêm cột ở **cuối sheet**.
- vo_tu cũng có cột (giá trị luôn "Không trình Sở").

**K3. Máy chủ**
- Chỉ kiểm khi có gửi giá trị: NFC + trim, chỉ nhận đúng "Trình Sở" hoặc "Không trình Sở"; giá trị khác bị từ chối và báo rõ.
- **Không** đưa vào FIELD_RULES.req, để client cũ và hàng chờ có client_id vẫn lưu được.
- **Đọc tiêu đề sheet bên trong khoá** ở submit và update (sửa lỗi có sẵn: chèn cột chen giữa làm lệch cột).
- Sheet thiếu cột "Trình Sở":
  - Có bản sao lưu ≤ 7 ngày (weeklyBackup ghi mốc thời gian vào ScriptProperties) → ghi ô tiêu đề vào `lastCol+1` dưới khoá, không dịch cột nào.
  - Chưa có sao lưu → lưu tạm vào sheet `TrinhSo_ChoCot` (loại, STT, giá trị) và trả cảnh báo; `capNhatCotSheet` điền bù sau.
  - **Không bao giờ bỏ giá trị âm thầm**, cả ở submit lẫn update.
- Loại mới thay_sua_tu: thêm SHEET_MAP, HEADERS, schema, quyền, báo cáo và icon như các loại khác.
- Ngầm hóa: thêm 2 cột mới vào HEADERS.ngam_hoa (cuối danh sách HEADERS) và schema theo đúng thứ tự.

**K3b. Ngầm hóa + loại mới (vòng 2 kỹ thuật)**
- 2 trường Ngầm hóa: `capNhatCotSheet` chèn sau cột DIALux cuối (BONUS + Trình Sở dịch phải) → chạy **giờ không có người khảo sát**, trước khi phát hành client. Thêm vào `newCols` của `getOptionalFields` (KPI tháng cũ không đổi). Không vào FIELD_RULES.req.
- App HĐ: `anhXa` cho phép sheet thiếu cột KL (KL trống → "Thiếu KL"), không dừng cả loại.
- `thay_sua_tu` thêm đủ: SHEET_MAP, HEADERS, FIELD_RULES, STT_PREFIX (**mã `TST`**, không dùng `TT` của Thay trụ), nhóm GPS; schemas.js, report.js, bbht.js; ui.test (17 → 18 loại); KS_MAP `dich:'PLI'`. Sheet mới tạo bằng `initSheets`. "Ảnh" dùng cột BONUS `Ảnh (URLs)`, không thêm cột riêng.
- Nhãn danh sách kênh Trung tâm là **"KL TT"** (tránh lẫn mã STT `TT-…`).
- Test: user1 gửi được và xem danh sách loại mới.

**K4. Hạng mục HĐ:** ô GĐ2 giữ nguyên; gói mặc định theo phường.

**K5. Danh sách / quản lý:** nhãn "Trình Sở" / "KL TT" / "Chưa phân loại", lọc được theo nhãn.

### App HĐ (q2)
**H1. Đọc và phân nhóm**
- Đọc cột "Trình Sở", so khớp không phân biệt dấu và hoa/thường.
- Xem trước có 3 nhóm: Trình Sở · KL Trung tâm · **Chưa phân loại** (bản cũ hoặc giá trị lạ). Nhóm cuối không tự vào đâu; có nút "Đặt TS / Đặt TT", giá trị đặt lưu là `kenhTay`.
- Hash đồng bộ thêm giá trị Trình Sở **chỉ khi có**, để bản cũ không bị báo "thay đổi" hàng loạt.

**H2. Định tuyến**
- Phụ lục có trường `kenh: 'TS'|'TT'`; dữ liệu cũ không có trường này đọc là TS (không cần chuyển đổi). **Không dùng trường `nhom`.**
- `kenh` có trong khoá tìm của: plNhap, chuyenNhap, xemTruoc (keyPL/trungPL), khopThucHien, kiemXuat, xuất file.
- TS và TT trùng trạm + phường + tuyến **không** bị báo trùng phụ lục và không khớp chéo khi đánh dấu thực hiện.
- KS đổi TS ↔ TT:
  - Vị trí đang nháp và chưa thực hiện → chuyển sang phụ lục nháp của kênh mới (đánh lại stt, cập nhật nhóm phường của cả 2 phụ lục).
  - Vị trí đã vào đợt thật hoặc đã thực hiện → chỉ gắn nhãn `nguon.doiTrinhSo = {tu, sang}`.
  - Văn phòng đã đặt kênh tay (`kenhTay`) mà KS đổi khác → chỉ gắn nhãn, văn phòng thắng.

**H3. Chia gói / CSKV**
- Bảng phường → (gói, CSKV) gồm 2 cột độc lập, rút từ phụ lục đã nhập:
  - Lấy phường từ dòng tiêu đề PHƯỜNG/XÃ (bỏ "* "), **không lấy cột C** (cột C còn tên cũ).
  - Chuẩn hoá nhãn CSKV: CSTT = "CST Tâm" = "CS T Tâm" = CS Trung tâm; giữ CS Tây, CS Bắc, CS Nam, LG.
- Phường nhiều gói hoặc chưa có → để trống, báo "Cần gán gói".

**H4. Nhận loại phụ lục theo tiêu đề** (mục 1)
- File 21-09: đọc đúng 6 sheet hiện, đúng loại, bỏ 5 sheet ẩn.
- Nhập lại các file đợt 4/5, D5, Đợt 2 → ra đúng loại như trước.

**H5. Một vị trí nhiều cột KL**
- Thêm `kl2` cho HANGAM (trụ) và PLII (đèn LED).
- Đối chiếu HM vẫn tính theo chi tiết mã HM; xuất ghi đủ 2 cột.

**H6. Cột "Không có trong KH"**
- Vị trí **nhập từ file** giữ đúng X của file (`ngoaiKH = 'file'`), app không tính lại.
- Vị trí **lấy từ KS**: app tự đánh X khi KL các mã HM của vị trí vượt "KH còn lại" năm của gói (cộng dồn theo thứ tự trong đợt).
- Văn phòng bật/tắt từng dòng; giá trị lưu là `ngoaiKH` (tự động / tay).

**H7. Xuất Excel** (công thức sống, Times New Roman, A4/A3 ngang)
- Phụ lục trình Sở: mỗi loại có vị trí 1 sheet, đánh số La Mã theo thứ tự mẫu 21-09.
- KL Trung tâm: Biểu TT-xx + TongHop_TT.
- Xuất được từng gói hoặc cả 3 gói.
- Tên sheet ≤ 31 ký tự, không trùng, không chứa `[]:*?/\`.

**H8. Đối chiếu HM:** "Đã đưa vào KH" tách thành khTS + khTT; tổng khTS + khTT = tổng cũ. Kiểm tra thêm: tổng TS + tổng TT = tổng các bản KS đã phân loại.

**H9. Khớp số với file 21-09** (nhập rồi xuất lại)
- Tổng từng sheet, tổng theo gói (KL chính + cột hiện hữu / cáp), số vị trí từng sheet và số dòng đánh X phải khớp đúng file gốc.
- Bộ số kiểm là số liệu thật của Trung tâm → **không ghi vào repo công khai**; lưu ở tài liệu Project (Sapulico) và test đọc qua biến môi trường `KL_2109` (bỏ qua khi không có file).

### Chung
- PWA; dọc / ngang / 360px; sáng / tối; vùng chạm ≥ 48px.
- Toàn bộ test cũ vẫn đạt. Nạp JSON klvt cũ → doiChieu và xuất ra **giống hệt** trước.

## 4. Ca kiểm thử bắt buộc
- Chèn cột chen giữa lúc đọc tiêu đề và lúc ghi → dòng mới không lệch cột.
- Sheet có cột thêm tay sau BONUS → cột Trình Sở thêm ở cuối, dữ liệu cũ giữ nguyên.
- Sửa bản khi sheet thiếu cột → không mất giá trị.
- Bản trong hàng chờ có client_id nhưng không có Trình Sở → vẫn lưu.
- Giá trị NFD (vẫn nhận), "trinh so", "1" → từ chối.
- TS và TT trùng vị trí → không báo trùng, không khớp chéo.
- Đổi TS ↔ TT ở 3 trạng thái: nháp / đã vào đợt / đã thực hiện.
- khTS + khTT = tổng cũ.
- File 21-09: 6 sheet hiện, bỏ 5 sheet ẩn, khớp mục H9.

## 5. Triển khai
1. Anh dán Code.gs → Deploy new version.
2. Chạy `capNhatCotSheet` một lần (có sao lưu) **trước** khi client mới đến tay người dùng: thêm cột Trình Sở + 2 cột Ngầm hóa, tạo sheet loại mới.
3. Sau đó mới tăng phiên bản cache (sw).

## Nhật ký duyệt
| Ngày | Chốt | Chuyên gia | Quyết định | Thay đổi đã áp |
|---|---|---|---|---|
| 11/11/2026 | Bước 0 v1 | Nghiệp vụ duy tu CS | Duyệt có điều kiện | B1–B8: 2 cột KL Hạ ngầm (anh chốt thêm trường), tăng cường → LED (anh chốt), vỏ tủ TT + loại mới Thay sửa tủ (anh chốt), cột KL theo trường, cột "ngoài KH" (anh chốt app tự đánh), mẫu ẩn dựng lại theo khuôn 21-09, gói/CSKV từ dòng phường + chuẩn hoá CSKV, H9 theo gói / số vị trí / số X |
| 11/11/2026 | Bước 0 v1 | Kỹ thuật Apps Script / PWA / ExcelJS | Duyệt có điều kiện | TAIL_COLS sau BONUS; đọc tiêu đề trong khoá; thêm cột không gọi backup lúc submit + sheet chờ; update không bỏ âm thầm; không vào FIELD_RULES.req; `kenh` thay vì `nhom`; nhận theo tiêu đề giữ mã cũ + thứ tự so khớp + bỏ sheet ẩn; `kl2`; đổi TS ↔ TT theo trạng thái + kenhTay; bổ sung ca kiểm thử |
| 11/11/2026 | Bước 0 v2 | Nghiệp vụ duy tu CS | Duyệt có điều kiện | X từ file giữ nguyên; chặn HPS trình Sở ở tăng cường KC xa; bỏ gợi ý PLIV cho KS; thay_sua_tu có STT/toạ độ; Ngầm hóa cũ → Thiếu KL, cột mới sau DIALUX; vo_tu ép TT; HPS_AN/MYTHUAT không sinh Biểu TT |
| 11/11/2026 | Bước 0 v2 | Kỹ thuật | Duyệt có điều kiện → đã áp | Thứ tự triển khai capNhatCotSheet giờ vắng; newCols KPI; anhXa chịu thiếu cột; danh sách đủ chỗ cho thay_sua_tu, STT `TST`, nhãn "KL TT"; Ảnh dùng cột BONUS. Bước 0 chốt sau 2 vòng (các điều kiện còn lại đều đã ghi vào doc) |
| 11/11/2026 | Chốt UI ô Trình Sở | UX/UI mobile | Chọn A (2 nút ngang) + chữ mô tả của B | Không chọn sẵn; nút đã chọn tô đặc + ✓ + viền 3px; ≥52px, ngang tối đa 480px, "Không trình Sở" không xuống dòng ở 320px; lỗi: viền đỏ cụm + dòng ⚠ + cuộn tới (tính thanh HĐ đáy); chặn HPS ngay khi bấm (role=alert + nút "Chuyển sang Không trình Sở"), nhắc nhẹ ⓘ cho loại thường TT; radiogroup/radio/aria-checked + mũi tên; dòng "→ …" aria-live đổi theo lựa chọn, "Cần gán gói" khi chưa có gói. Nhận NÊN: màu TS xanh dương / TT xanh lục dùng chung danh sách; bản cũ "chưa phân loại"; rung nhẹ |
