# Dashboard thư viện — Google Sheets → GitHub Actions → JSON → Dashboard

## Thiết lập một lần

1. Giải nén gói. Đưa NỘI DUNG thư mục dashboard-actions lên thư mục gốc repository GitHub hiện tại: index.html, config.json, scripts/ và .github/workflows/sync-data.yml. Không upload nguyên file ZIP và không lồng thêm thư mục dashboard-actions trong repo.
2. Thư mục .github có thể bị ẩn trên máy. Nếu không upload được, trên GitHub chọn Add file → Create new file, nhập tên `.github/workflows/sync-data.yml`, dán nguyên nội dung file cùng tên trong gói rồi Commit. Cần có file này mới chạy tự động.
3. Google Sheets: chia sẻ “Bất kỳ ai có đường liên kết” với quyền “Người xem”. Sheet dữ liệu tên Dashboard. Link đã cài trong config.json. Dữ liệu xuất bản sẽ xem được bởi người có quyền truy cập website Pages; không đặt dữ liệu cần giữ riêng trong sheet xuất bản này.
4. GitHub → Settings → Pages → Build and deployment → Source: **GitHub Actions**.
5. GitHub → Actions → **Dong bo Dashboard** → **Run workflow**, chọn nhánh mặc định (main/master). Nếu có workflow Pages cũ, vô hiệu hóa workflow cũ để không ghi đè website.
6. Chờ workflow hoàn tất. Mở URL tại Settings → Pages. File JSON được tạo trong artifact xuất bản, không cần tự tạo hoặc upload file data/dashboard.json.

## Hàng tháng chỉ cập nhật Sheets

Lần kiểm tra nguồn ngày 21/09/2026 đã gặp lỗi #ERROR! tại dòng 87, cột tháng 06/2026. Trong file mẫu, đó là “Top 5 chuyên khoa sử dụng nhiều nhất – UpToDate”; dòng 88 cũng có lỗi trong cùng tháng. Hãy sửa công thức/nội dung thực tế, hoặc để trống nếu chưa có báo cáo (không điền 0 thay lỗi). Sau đó chạy Run workflow lại; bộ kiểm tra sẽ chỉ rõ lỗi tiếp theo nếu còn. Gói không kèm dữ liệu dự phòng và chưa được triển khai lên repository của bạn.

Thêm số liệu vào cột tháng đúng trong Dashboard. Để trống tháng chưa có số liệu; số 0 được coi là dữ liệu đã nhập. Không điền 0 vào tháng tương lai để giữ chỗ. Mỗi chỉ số có tên và cán bộ phụ trách; tiêu đề nhóm viết hoa, không có số liệu hoặc cán bộ. Ngày tháng nên là ô ngày thực sự, định dạng hiển thị MM/yyyy; chuỗi ngày được hỗ trợ dạng dd/MM/yyyy hoặc MM/yyyy. Không dùng định dạng mơ hồ MM/dd/yyyy dạng text.

Workflow dự kiến chạy lúc **08:17 giờ Việt Nam mỗi ngày**, hoặc chạy ngay bằng Run workflow. Nút “Tải lại dữ liệu” trên Dashboard chỉ đọc bản đã đồng bộ, không chạy workflow. Lịch có thể trễ; workflow theo lịch dùng nhánh mặc định. Nếu repo công khai không có hoạt động 60 ngày, GitHub có thể tắt lịch: bật lại trong Actions.

## Không dùng dữ liệu dự phòng

Chỉ xuất bản các số liệu lấy được từ Sheets và qua kiểm tra. Khi tải/kiểm tra thất bại, workflow xuất bản JSON lỗi và Dashboard ẩn số liệu. Workflow đánh dấu thất bại SAU khi xuất bản thông báo lỗi. Trạng thái và dữ liệu nằm chung một JSON để không trộn hai lần đồng bộ.

Nếu chính GitHub hoặc bước triển khai lỗi, hệ thống không thể thay website ngay lập tức. Vì vậy dữ liệu tự hết hạn sau 48 giờ kể từ lần kiểm tra thành công, kể cả tab đang mở. Đây là thời hạn xác minh nguồn, không phải tuổi của tháng báo cáo. Thời điểm trên Dashboard là lúc đồng bộ, không phải thời điểm người dùng sửa Sheets.

Chọn tháng gần nhất có dữ liệu; so sánh với đúng tháng lịch liền trước. Thiếu tháng trước thì ghi thiếu, không tự lấy tháng xa hơn. Ô trống không thay bằng 0. Biểu đồ xu hướng chỉ hiện đến tháng đang chọn; bảng chi tiết giữ các chỉ số văn bản.

## Các file có tác dụng gì?

- index.html: giao diện Dashboard.
- config.json: link Sheets, tên sheet, thời hạn xác minh 48 giờ.
- scripts/sync-data.mjs: tải bản Excel từ Google Sheets, kiểm tra, chuẩn hóa, tạo _site/data/dashboard.json.
- scripts/read-xlsx.py: đọc Excel bằng thư viện chuẩn Python, giữ số, văn bản và ô trống; không dùng dữ liệu mẫu.
- scripts/sync-data.test.mjs: kiểm tra các trường hợp dữ liệu quan trọng trước khi triển khai.
- .github/workflows/sync-data.yml: lịch đồng bộ và xuất bản Pages.

Không cần npm install, token Google hoặc máy chủ riêng. GitHub tự chuẩn bị Node.js và Python. Workflow chỉ xuất bản thư mục _site; không xuất bản Excel, script hoặc tài liệu hướng dẫn.

## Kiểm tra trên máy (Node.js 22 và Python 3)

    node --test scripts/sync-data.test.mjs
    node scripts/sync-data.mjs
    python3 -m http.server 8080 --directory _site

Mở http://localhost:8080. Không mở HTML bằng file://.

Nếu đồng bộ lỗi: mở bước “Tai va xu ly Google Sheets” trong Actions, kiểm tra quyền chia sẻ, tên sheet, tiêu đề Chỉ số/Cán bộ phụ trách, cột ngày trùng và các ô #ERROR!/ #DIV/0! trong dữ liệu tháng.

Tham khảo: https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages và https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule
