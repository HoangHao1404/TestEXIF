# Hệ thống Scoring & Confidence - Báo cáo Pothole

## Tổng quan

Hệ thống tính độ tin cậy (confidence) của một báo cáo dựa trên **3 tiêu chí**:

| Tiêu chí      | Nguồn dữ liệu                      | Mục đích                                          |
| ------------- | ---------------------------------- | ------------------------------------------------- |
| **Vị trí**    | GPS từ ảnh vs GPS báo cáo          | Xác thực người dùng có đến đúng nơi báo cáo không |
| **Nội dung**  | Từ khóa trong mô tả                | Đánh giá mức độ liên quan đến ổ gà                |
| **Thời gian** | EXIF DateTime vs thời gian báo cáo | Phát hiện báo cáo cũ, ảnh chụp từ lâu             |

---

## 1. Location Score (Vị trí)

### Công thức

```
score = max(0, 100 - (distance_km / 1) × 100)
```

### Bảng điểm

| Khoảng cách | Điểm |
| ----------- | ---- |
| 0 m         | 100  |
| 100 m       | 90   |
| 250 m       | 75   |
| 500 m       | 50   |
| 750 m       | 25   |
| 1 km        | 0    |

### Quy tắc

- **Có GPS EXIF + GPS báo cáo:** Tính khoảng cách Haversine → điểm
- **Thiếu GPS EXIF:** Không tính tiêu chí này
- **Báo cáo dạng text địa chỉ:** 0 điểm (trong tương lai sẽ hỗ trợ geocoding)

---

## 2. Content Score (Nội dung)

### Danh sách từ khóa

| Loại       | Điểm  | Từ khóa                                                                                                                                           |
| ---------- | ----- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Mạnh**   | 2 pts | pothole, hole, hố, nứt, crack, gãy, broken, nguy hiểm, hazard, accident, tai nạn, damaged, hư hỏng                                                |
| **Thường** | 1 pt  | road, đường, asphalt, nhựa, pavement, vỉa hè, traffic, giao thông, repair, sửa chữa, unsafe, không an toàn, risk, rủi ro, deteriorated, suy thoái |

### Công thức

```
total_score = Σ(điểm từ khóa tìm thấy)
score = min(100, (total_score / 18) × 100)
```

_Giải thích: 18 là tổng điểm tối đa (9 từ khóa mạnh × 2 điểm)_

### Bảng điểm tham khảo

| Kịch bản                | Điểm |
| ----------------------- | ---- |
| 9 từ mạnh               | 100  |
| 6 từ mạnh               | 67   |
| 4 từ mạnh               | 44   |
| 3 từ mạnh + 2 từ thường | 50   |
| 2 từ mạnh               | 22   |
| 1 từ mạnh               | 11   |
| Không có từ nào         | 0    |

### Quy tắc

- Không phân biệt hoa/thường
- Tìm kiếm chính xác (word boundary)
- Từ khóa xuất hiện nhiều lần chỉ tính 1 lần
- Nội dung trống → 0 điểm

---

## 3. Time Score (Thời gian)

### Công thức

```
score = max(0, 100 - (hours_diff / 6) × 100)
```

### Bảng điểm

| Chênh lệch | Điểm |
| ---------- | ---- |
| 0 giờ      | 100  |
| 1.5 giờ    | 75   |
| 3 giờ      | 50   |
| 4.5 giờ    | 25   |
| 6+ giờ     | 0    |

### Quy tắc

- **Có DateTime EXIF:** Tính chênh lệch tuyệt đối với thời gian báo cáo
- **Thiếu DateTime:** Không tính tiêu chí này
- **Khác ngày:** Tính từ 24h trở lên (sẽ được 0 điểm)

## 4. Trọng số

### Trường hợp đầy đủ 3 tiêu chí

| Tiêu chí | Trọng số |
| -------- | -------- |
| Location | 35%      |
| Content  | 35%      |
| Time     | 30%      |

### Trường hợp thiếu 1 tiêu chí

| Thiếu       | Location | Content | Time |
| ----------- | -------- | ------- | ---- |
| Location    | -        | 55%     | 45%  |
| Time        | 45%      | 55%     | -    |
| Chỉ Content | -        | 100%    | -    |

---

## 5. Công thức tổng hợp

```
confidence = Σ(score_i × weight_i)
confidence = round(confidence)
```

---

## 6. Đánh giá mức độ tin cậy

| Khoảng điểm | Mức độ             | Màu | Hành động                 |
| ----------- | ------------------ | --- | ------------------------- |
| 90-100%     | Rất tin cậy        | 🟢  | Tự động duyệt             |
| 80-89%      | Tin cậy cao        | 🟢  | Kiểm tra nhanh            |
| 70-79%      | Tin cậy trung bình | 🟡  | Xác minh thủ công         |
| 50-69%      | Tin cậy thấp       | 🟠  | Yêu cầu bổ sung thông tin |
| < 50%       | Không đủ tin cậy   | 🔴  | Từ chối                   |

---

## 7. Ví dụ minh họa

### Input

```
Báo cáo:
- Vị trí: 10.776234, 106.710049
- Nội dung: "Hố đường lớn trên Nguyễn Huệ, nứt gãy nguy hiểm"
- Thời gian: 2024-03-23 10:30

EXIF ảnh:
- GPS: 10.776300, 106.710100 (cách 100m)
- DateTime: 2024-03-23 08:45 (cách 1.75 giờ)
```

### Tính toán

| Tiêu chí       | Điểm | Trọng số | Thành phần     |
| -------------- | ---- | -------- | -------------- |
| Location       | 90   | 35%      | 31.5           |
| Content        | 100  | 35%      | 35.0           |
| Time           | 71   | 30%      | 21.3           |
| **Confidence** |      |          | **87.8 → 88%** |

### Kết luận

**88% - Tin cậy cao** 🟢 → Kiểm tra nhanh

---

## 8. Các tham số có thể điều chỉnh

| Tham số              | Giá trị mặc định | Mục đích                  |
| -------------------- | ---------------- | ------------------------- |
| maxDistance          | 1 km             | Ngưỡng khoảng cách tối đa |
| maxHoursDiff         | 6 giờ            | Ngưỡng thời gian tối đa   |
| maxKeywordScore      | 18 điểm          | Tổng điểm tối đa từ khóa  |
| weights              | 35/35/30         | Trọng số các tiêu chí     |
| strongKeywordWeight  | 2 pts            | Điểm cho từ khóa mạnh     |
| regularKeywordWeight | 1 pt             | Điểm cho từ khóa thường   |

---

**Ghi chú:** Hệ thống này chỉ tính độ tin cậy dựa trên metadata và nội dung. AI xử lý ảnh (phát hiện ổ gà) là module riêng biệt.
