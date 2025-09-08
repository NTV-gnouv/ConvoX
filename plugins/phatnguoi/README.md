# Phạt Nguội VN (ConvoX Plugin)

Tra cứu phạt nguội phương tiện tại Việt Nam theo biển số (tùy chọn thêm 6 số cuối số khung). Plugin hoạt động theo mô hình "best‑effort": nếu không thể tra tự động, bot trả về liên kết chính thống và hướng dẫn tự tra.

## Lệnh

 - !phatnguoi <biển_số> [6_số_khung]

Ví dụ:
- !phatnguoi 30A-123.45
- !phatnguoi 51F12345 ABC123

Gợi ý: Thêm 6 số cuối số khung (nếu biết) để tăng khả năng tra cứu ở một số cổng.

## Ghi chú quan trọng

- Hiện không có API công khai, thống nhất cho toàn quốc. Nhiều cổng yêu cầu CAPTCHA hoặc đăng nhập.
- Plugin mặc định ở chế độ liên kết chính thống nếu không cấu hình `providers` tuỳ biến.
- Kết quả (nếu có) chỉ mang tính tham khảo. Hãy xác minh trên cổng chính thống trước khi nộp phạt.

## Cấu hình (tùy chọn)

Trong `config/plugins.json`:

```json
{
  "plugins": {
    "pluginConfig": {
      "phatnguoi": {
        "enabled": true,
        "cooldown": 8,
        "providers": [],
        "providerTimeoutMs": 10000,
  "includeOfficialLinks": true,
  "compactOutput": true
      }
    }
  }
}
```

- `providers`: Mảng các hàm tra cứu tuỳ biến (đòi hỏi bạn tự triển khai tách riêng, có thể cần dịch vụ trung gian để vượt CAPTCHA). Mỗi provider: `(plateCompact, frameLast6) => Promise<{ found: boolean, data?: any, source?: string }>`. Trả `found=true` khi có kết quả.
- `providerTimeoutMs`: Timeout mỗi provider.
- `compactOutput`: true để chỉ in một dòng kết quả gọn; đặt false để kèm liên kết và mẹo.

## Liên kết chính thống tham khảo

- Cục CSGT: https://www.csgt.vn/
- Cổng Dịch vụ công Bộ Công an: https://dichvucong.bocongan.gov.vn/
- Hà Nội: https://congdan.hanoi.gov.vn/tra-cuu-xu-phat-nguoi-vi-pham-giao-thong
- TP.HCM (tham khảo): https://thongtinkhachsatgt.hochiminhcity.gov.vn/ hoặc cổng DVC địa phương
- Đăng kiểm (thông tin phương tiện): https://app.vr.org.vn/ptpublic/#!/home

## Credits

- ConvoX Team (NTV-gnouv & contributors)
- Ý tưởng và triển khai: Cộng đồng ConvoX

Ghi công được ẩn trong mã nguồn plugin, không hiển thị ra người dùng khi sử dụng lệnh.