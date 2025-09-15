# LearnEng Plugin

Chức năng học từ vựng tiếng Anh:

Lệnh:
- `!learnEng <n>`: Lấy n từ mới (mặc định 5). Hiển thị word + nghĩa tiếng Việt.
- `!note word1,word2,...`: Ghi nhớ các từ vào bộ nhớ của bạn.
- `!ttl`: (test the lesson) Bot chọn ngẫu nhiên 1 từ bạn đã lưu và yêu cầu bạn dịch sang tiếng Việt. Bạn reply bằng nghĩa tiếng Việt.

Khi bạn reply:
- Đúng: bot phản hồi ✅ Đúng!
- Sai: bot phản hồi ❌ Sai! + nghĩa đúng để học lại.

Lưu trữ: `data.json` trong thư mục plugin (tự tạo) dạng:
```
{
  "userID": {
    "word": { "vi": "nghĩa", "correct": 3, "wrong": 1, "addedAt": 1690000000000, "lastTest": 1690000005000 }
  },
  "_cache": { "word": { "vi": "nghĩa" } }
}
```

Dịch: sử dụng API MyMemory (miễn phí) và fallback Google translate unofficial (nếu cần) hoặc chỉ dataset cache.

Edge cases:
- Nếu không đủ từ mới => lấy tối đa số còn lại chưa học.
- Nếu người dùng chưa lưu từ nào mà dùng `!ttl` => thông báo.
- Giới hạn n tối đa 50 cho 1 lệnh.

