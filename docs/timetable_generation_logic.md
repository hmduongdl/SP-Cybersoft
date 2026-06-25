**Logic AI Tạo Thời Gian Biểu (Timetable Generation Algorithm)**  
Tài liệu này mô tả chi tiết logic thuật toán hiện tại mà AI sử dụng để tự động thiết lập thời gian biểu cá nhân hóa cho người dùng, dựa trên các tham số khảo sát đầu vào (Onboarding).  
**1. Dữ liệu đầu vào (Input Parameters)**  
Thuật toán nhận 5 tham số chính từ người dùng:  
- **max_focus_time** (phút): Thời gian tập trung tối đa cho một phiên làm việc (vd: 60, 90, 120 phút).  
- **is_job_flexible** (boolean): Tính chất công việc linh hoạt (true) hay cố định/dự án (false).  
- **best_energy_time**: Buổi có năng lượng làm việc tốt nhất (morning hoặc afternoon).  
- **best_learning_time**: Thời điểm học tập/tiếp thu kiến thức tốt nhất (morning, noon, afternoon, evening).  
- **max_learning_time** (phút): Thời lượng dành cho việc học tập/phát triển bản thân.  
**2. Xử lý "Khối tập trung" (Focus Blocks)**  
Thuật toán sẽ tự động chia nhỏ max_focus_time thành các **Giai đoạn (Phases)** và chèn thời gian  **Giải lao (Breaks)** ở giữa để tránh quá tải:  
- **Dưới 90 phút**: Không chia nhỏ. 1 giai đoạn làm việc liên tục, không có giải lao giữa chừng.  
- **Bằng 90 phút**: Chia thành 2 giai đoạn (mỗi giai đoạn 45 phút), xen giữa là 5 phút giải lao.  
- **Từ 91 đến 120 phút**: Chia thành 2 giai đoạn bằng nhau (max_focus_time / 2), xen giữa là 10 phút giải lao.  
*Ví dụ:* Khối tập trung 90 phút sẽ sinh ra 3 dòng trong bảng: Giai đoạn 1 (45p) -> Giải lao (5p) -> Giai đoạn 2 (45p).  
**3. Xác định thời lượng tập trung cho từng buổi**  
Dựa vào best_energy_time (buổi năng suất nhất), hệ thống điều chỉnh khối lượng công việc:  
- **Buổi có năng lượng tốt nhất (Peak)**: Nhận 100% thời lượng max_focus_time. Block này được dán nhãn focus_peak (Công việc quan trọng).  
- **Buổi năng lượng thấp hơn (Off-peak)**: Chỉ nhận  **75%** thời lượng max_focus_time. Block này được dán nhãn focus_off (Công việc thông thường).  
**4. Cấu trúc Timeline (Trình tự sinh dữ liệu)**  
Hệ thống sử dụng một "Con trỏ thời gian" (Cursor) bắt đầu từ 08:00 sáng và tuần tự chèn các khối vào lịch theo thứ tự sau:  
**Buổi Sáng**  
1. **Khởi động (08:00 - 08:15)**: (Cố định 15 phút) Check email, warm-up, lên kế hoạch. Con trỏ tiến tới 08:15.  
2. **Học tập (Morning Learning)**: *Chỉ chèn nếu * *best_learning_time* * = "morning"*. Dài max_learning_time phút.  
3. **Công việc Sáng (Morning Focus)**: *Chỉ chèn nếu * *is_job_flexible* * = false*. Thời lượng dựa vào việc Sáng có phải là buổi năng suất nhất hay không (100% hoặc 75%). Sử dụng logic chia nhỏ Focus Blocks ở phần 2.  
4. **Học tập (Noon Learning)**: *Chỉ chèn nếu * *best_learning_time* * = "noon"*. Dài max_learning_time phút.  
5. **Tổng kết buổi sáng (Anchor Mid)**: Chèn vào vị trí con trỏ hiện tại,  **nhưng không được sớm hơn ** **11:30**. Kéo dài 30 phút.  
**Buổi Chiều**  
1. **Bắt đầu chiều**: Con trỏ nhảy đến thời điểm hiện tại hoặc  **13:30** (lấy mốc nào trễ hơn).  
2. **Học tập (Afternoon Learning)**: *Chỉ chèn nếu * *best_learning_time* * = "afternoon"*. Dài max_learning_time phút.  
3. **Công việc Chiều (Afternoon Focus)**: *Chỉ chèn nếu * *is_job_flexible* * = false*. Tương tự như buổi sáng, thời lượng sẽ là 100% hoặc 75% tùy vào năng lượng buổi chiều.  
4. **Học tập (Evening Learning)**: *Chỉ chèn nếu * *best_learning_time* * = "evening"*. Dài max_learning_time phút.  
5. **Tổng kết cuối ngày (Anchor End)**: Chèn vào vị trí con trỏ hiện tại,  **nhưng không được sớm hơn ** **18:00**. Kéo dài 30 phút. Review tiến độ, kết quả ngày làm việc.  
**5. Khởi tạo dữ liệu ô (Cells)**  
Mỗi hàng (Row) được tạo ra từ thuật toán trên sẽ tự động được gán các cột:  
- **7 ngày trong tuần**: (Thứ 2 đến Chủ Nhật) content rỗng, task_ids rỗng.  
- **Cột Ghi chú (** **notes** **)**: Mặc định sẽ nhận đoạn mô tả (description) được sinh ra từ thuật toán (ví dụ: "Review toàn bộ ngày...", "Phase 1/2").  
Toàn bộ các hàng và ô này được gói gọn trong một Transaction (giới hạn 30 giây timeout để đảm bảo an toàn với DB) và lưu xuống cơ sở dữ liệu để vẽ ra giao diện bảng.  
