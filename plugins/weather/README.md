# Weather Plugin (Open‑Meteo)

Plugin xem thời tiết cho ConvoX dùng Open‑Meteo. Không cần API key.

## Cách hoạt động
- Geocoding: chuyển tên địa điểm thành tọa độ qua Open‑Meteo Geocoding (ưu tiên tiếng Việt, có xử lý không dấu và nhiều biến thể truy vấn).
- Reverse geocoding: khi bạn nhập lat,lon, plugin sẽ tìm tên địa điểm gần đó để hiển thị (nếu có).
- Forecast: lấy dữ liệu từ Open‑Meteo Forecast API (nhiệt độ, độ ẩm, gió, mưa; có daily 3 ngày).

Lưu ý: Dữ liệu là dạng lưới dự báo (độ phân giải ~5–11 km), nên các khu vực gần nhau trong cùng thành phố có thể rất giống nhau.

## Lệnh
- !weather [now|daily] <địa điểm|lat,lon>

Ví dụ:
- !weather Hà Nội — Thời tiết hiện tại.
- !weather now Đà Nẵng — Hiện tại.
- !weather daily Ho Chi Minh — Dự báo 3 ngày.
- !weather now 16.00,108.26 — Thời tiết tại tọa độ chỉ định.

Nếu không cung cấp tham số, plugin sẽ dùng defaultLocation (nếu có).

## Mẹo nhập địa điểm
- Có thể nhập có dấu hoặc không dấu: "Ngũ Hành Sơn, Đà Nẵng" hoặc "Ngu Hanh Son, Da Nang".
- Nếu nhập nhiều phần, thứ tự từ cụ thể đến tổng quát: "Quận, Thành phố, Quốc gia".
- Trường hợp muốn chính xác hơn khu vực nhỏ, dùng lat,lon.

## Cấu hình (tùy chọn)
Thêm vào `config/plugins.json`:
```json
{
  "plugins": {
    "defaultPlugins": ["weather"],
    "pluginConfig": {
      "weather": {
        "enabled": true,
        "language": "vi",
        "defaultLocation": "Hà Nội"
      }
    }
  }
}
```

## Ghi chú
- Dữ liệu: https://open-meteo.com/
- Không cần API key.
- Khi địa danh quá rộng (ví dụ: chỉ ghi quốc gia), kết quả có thể chung chung; nên ghi thêm tỉnh/thành hoặc dùng lat,lon.