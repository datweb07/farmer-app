# Voice Button Feature - Hỗ trợ Accessibility cho Người Cao Tuổi

## ✅ Đã hoàn thành

### 1. **Custom Hook: useTextToSpeech** (`src/hooks/useTextToSpeech.ts`)

- Sử dụng Web Speech API để đọc văn bản
- Tốc độ đọc chậm (0.9x) phù hợp cho người cao tuổi
- Hỗ trợ tiếng Việt (vi-VN)
- Trạng thái: isSpeaking, isSupported
- Phương thức: speak(), stop()

### 2. **Component: VoiceButton** (`src/app/components/VoiceButton.tsx`)

- Icon: Volume2 (đang không đọc) / VolumeX (đang đọc)
- Animation: Pulse effect khi đang đọc
- 3 kích thước: sm, md, lg
- 3 variants: default, outline, ghost
- Accessibility:
  - ARIA labels đầy đủ
  - Focus ring rõ ràng
  - Tooltip hướng dẫn
  - Disabled state khi không có dữ liệu

### 3. **Tích hợp vào DashboardPage**

#### Mobile Layout (dòng ~310-320):

```tsx
<div className="flex items-center gap-2">
  <div className="text-5xl font-bold...">
    {currentSalinity} <span>g/l</span>
  </div>
  <VoiceButton
    salinity={currentSalinity}
    month={new Date().getMonth() + 1}
    province={province}
    size="sm"
    variant="ghost" // Nền trong suốt phù hợp với mobile
  />
</div>
```

#### Desktop Layout (dòng ~593-615):

```tsx
<div className="flex items-center gap-3 mb-2">
  <div className="flex items-baseline gap-2">
    <div className="text-5xl...">{currentSalinity}</div>
    <span>g/l</span>
  </div>
  <VoiceButton
    salinity={currentSalinity}
    month={new Date().getMonth() + 1}
    province={province}
    size="md"
    variant="outline" // Border xanh phù hợp với desktop
  />
</div>
```

## 🎤 Cách hoạt động

### Khi nhấn nút lần đầu:

1. Button hiển thị icon Volume2 (loa)
2. User nhấn vào button
3. Hệ thống đọc: **"Độ mặn tháng [tháng] ở tỉnh [tỉnh] có độ mặn là [số] gam trên lít"**
   - Ví dụ: "Độ mặn tháng một ở tỉnh An Giang có độ mặn là năm phẩy hai gam trên lít"
4. Button chuyển sang icon VolumeX và có hiệu ứng pulse
5. Tốc độ đọc: 0.85x (chậm hơn bình thường 15%)

### Khi nhấn nút lần thứ hai (đang đọc):

1. Dừng đọc ngay lập tức
2. Icon trở về Volume2
3. Button không còn pulse

### Trường hợp đặc biệt:

- **Không có dữ liệu:** Đọc "Hiện tại chưa có dữ liệu độ mặn"
- **Trình duyệt không hỗ trợ:** Button ẩn hoàn toàn
- **Số thập phân:** 5.2 → "năm phẩy hai"
- **Tháng:** 1 → "một", 12 → "mười hai"

## 🎨 Giao diện

### Mobile (Ghost variant - nền trong suốt trắng):

- Size nhỏ (32x32px)
- Màu trắng trên nền tối
- Hiệu ứng hover: nền trắng 30%
- Vị trí: Bên phải số độ mặn

### Desktop (Outline variant - viền xanh):

- Size vừa (40x40px)
- Viền xanh 2px, nền trắng
- Hiệu ứng hover: nền xanh nhạt
- Vị trí: Bên phải g/l, trước thông tin cập nhật

## ♿ Accessibility Features

1. **ARIA Labels:**
   - "Đọc thông tin độ mặn bằng giọng nói"
   - "Dừng đọc độ mặn"

2. **Keyboard Support:**
   - Focus ring rõ ràng (ring-2 ring-blue-500)
   - Tab navigation hoạt động tốt

3. **Visual Feedback:**
   - Pulse animation khi đang đọc
   - Icon thay đổi theo trạng thái
   - Tooltip hướng dẫn rõ ràng

4. **Disabled State:**
   - Opacity 50% khi không có dữ liệu
   - Cursor not-allowed
   - Không thể click

## 🧓 Tối ưu cho Người Cao Tuổi

1. **Tốc độ đọc chậm:** 0.85x (người già nghe rõ hơn)
2. **Button size lớn:** Dễ nhấn (40x40px desktop, 32x32px mobile)
3. **Văn bản rõ ràng:** "gam trên lít" thay vì "g/l"
4. **Số thập phân phát âm:** "năm phẩy hai" dễ hiểu hơn "năm chấm hai"
5. **Tháng bằng chữ:** "tháng một" thay vì "tháng 1"
6. **Tooltip hướng dẫn:** "(hỗ trợ người cao tuổi)"

## 🌐 Trình duyệt hỗ trợ

- ✅ Chrome/Edge (Windows, Android)
- ✅ Safari (iOS, macOS)
- ✅ Firefox (Desktop)
- ⚠️ Opera Mini (Limited)
- ❌ IE11 (Không hỗ trợ)

## 📱 Responsive Design

| Screen  | Button Size  | Variant | Icon Size | Position                |
| ------- | ------------ | ------- | --------- | ----------------------- |
| Mobile  | 32x32px (sm) | ghost   | 16x16px   | Right of salinity value |
| Tablet  | 40x40px (md) | outline | 20x20px   | Right of g/l unit       |
| Desktop | 40x40px (md) | outline | 20x20px   | Right of g/l unit       |

## 🔧 Technical Details

- **API:** Web Speech Synthesis API
- **Language:** vi-VN (Vietnamese)
- **Rate:** 0.85 (15% slower)
- **Pitch:** 1.0 (normal)
- **Volume:** 1.0 (max)

## 🎯 User Flow

```
User sees salinity value → Clicks voice button
    ↓
Check if data exists
    ↓
    ├─ YES: Format speech text
    │   ├─ Convert month to Vietnamese word
    │   ├─ Replace decimal point with "phẩy"
    │   └─ Speak: "Độ mặn tháng X ở tỉnh Y có độ mặn là Z gam trên lít"
    │
    └─ NO: Speak "Hiện tại chưa có dữ liệu độ mặn"

While speaking:
    - Button shows VolumeX icon
    - Pulse animation active
    - Can click to stop
```

## ✨ Bonus Features

- **Auto-stop:** Tự động dừng khi chuyển trang
- **Cancel previous:** Hủy lời nói trước nếu click nhanh
- **Error handling:** Console warning nếu TTS không hoạt động
- **Hide gracefully:** Ẩn button nếu browser không hỗ trợ

---

**Trạng thái:** ✅ Hoàn thành và sẵn sàng sử dụng
**Testing:** Cần test trên thiết bị thật với người cao tuổi
