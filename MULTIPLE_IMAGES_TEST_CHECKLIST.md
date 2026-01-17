# 🧪 Multiple Images - Test Checklist

## ⚙️ Pre-Test Setup

### 1. Database Migration

- [ ] Vào Supabase Dashboard
- [ ] Mở SQL Editor
- [ ] Chạy file `supabase/migrations/014_media_enhancement.sql`
- [ ] Verify tables exist:
  ```sql
  SELECT * FROM post_images LIMIT 1;
  SELECT * FROM product_images LIMIT 1;
  ```

### 2. Storage Buckets

- [ ] Vào Supabase Dashboard > Storage
- [ ] Check bucket `post-images` exists
- [ ] Check bucket `product-images` exists
- [ ] Verify buckets are PUBLIC

### 3. Start Dev Server

```bash
cd "d:\final app\final-app"
npm run dev
```

---

## 📝 Test Posts - Multiple Images

### Test Case 1: Upload Multiple Images

- [ ] Vào page `/posts` (Community)
- [ ] Click "Đăng bài mới"
- [ ] Nhập title: "Test Multiple Images"
- [ ] Nhập content: "Testing upload nhiều ảnh"
- [ ] Chọn category: "Kinh nghiệm"
- [ ] Click vào upload box
- [ ] **Chọn 3 ảnh cùng lúc** (Ctrl + Click)
- [ ] ✅ Xem 3 previews trong grid 3x3
- [ ] ✅ Mỗi ảnh có số thứ tự (1, 2, 3)
- [ ] ✅ Mỗi ảnh có button X để xóa
- [ ] Click "Đăng bài ngay"
- [ ] ✅ Post được tạo thành công
- [ ] ✅ Carousel hiển thị với 3 ảnh

### Test Case 2: Add More Images

- [ ] Vào "Đăng bài mới"
- [ ] Upload 2 ảnh trước
- [ ] ✅ Xem preview 2 ảnh
- [ ] Click vào upload box lần nữa
- [ ] Chọn thêm 2 ảnh nữa
- [ ] ✅ Xem total 4 ảnh
- [ ] Thêm 1 ảnh nữa (total 5)
- [ ] ✅ Upload box biến mất (đạt max 5)
- [ ] Submit post
- [ ] ✅ Carousel có 5 ảnh

### Test Case 3: Remove Individual Images

- [ ] Vào "Đăng bài mới"
- [ ] Upload 4 ảnh
- [ ] Click X ở ảnh số 2
- [ ] ✅ Ảnh số 2 bị xóa
- [ ] ✅ Còn 3 ảnh (1, 3, 4 → renumber to 1, 2, 3)
- [ ] ✅ Upload box hiển thị lại
- [ ] Thêm 1 ảnh mới
- [ ] ✅ Total 4 ảnh

### Test Case 4: Carousel Navigation

- [ ] Tìm post có nhiều ảnh
- [ ] ✅ Ảnh đầu tiên hiển thị
- [ ] ✅ Dots indicator hiển thị (● ○ ○)
- [ ] Hover vào ảnh
- [ ] ✅ Arrows xuất hiện
- [ ] Click arrow phải →
- [ ] ✅ Chuyển sang ảnh 2
- [ ] ✅ Dots update (○ ● ○)
- [ ] Click arrow trái ←
- [ ] ✅ Quay lại ảnh 1
- [ ] Click dot thứ 3
- [ ] ✅ Jump đến ảnh 3

### Test Case 5: Limit Validation

- [ ] Vào "Đăng bài mới"
- [ ] Chọn 6 ảnh cùng lúc
- [ ] ✅ Error message: "Tối đa 5 ảnh cho một bài viết"
- [ ] ✅ Không ảnh nào được thêm
- [ ] Chọn lại 5 ảnh
- [ ] ✅ Success

---

## 🛒 Test Products - Multiple Images

### Test Case 6: Product Multiple Images

- [ ] Vào page `/products`
- [ ] Click "Đăng sản phẩm"
- [ ] Nhập tên: "Máy đo độ mặn test"
- [ ] Nhập mô tả
- [ ] Nhập giá: 500000
- [ ] Chọn category: "Thiết bị đo"
- [ ] Nhập SĐT: 0912345678
- [ ] Upload 4 ảnh
- [ ] ✅ Ảnh đầu tiên có badge "Chính" (màu xanh)
- [ ] ✅ Grid 3x3 hiển thị
- [ ] Submit
- [ ] ✅ Product card hiển thị carousel

### Test Case 7: Product Primary Image

- [ ] Tạo product với 3 ảnh
- [ ] ✅ Ảnh thứ 1 = Primary (badge "Chính")
- [ ] Xóa ảnh thứ 1
- [ ] ✅ Ảnh thứ 2 trở thành ảnh 1
- [ ] ✅ Badge "Chính" chuyển sang ảnh mới
- [ ] Submit
- [ ] ✅ Ảnh chính hiển thị đầu tiên trong carousel

### Test Case 8: Product Carousel

- [ ] Tìm product có nhiều ảnh
- [ ] ✅ Carousel height = 256px (h-64)
- [ ] Hover → arrows
- [ ] Click arrows → change images
- [ ] ✅ Smooth transitions
- [ ] ✅ Dots indicator works

---

## 🔄 Test Backward Compatibility

### Test Case 9: Old Posts

- [ ] Tìm post cũ (created before multiple images)
- [ ] ✅ Single image hiển thị bình thường
- [ ] ✅ Không có errors
- [ ] ✅ No carousel (single image)

### Test Case 10: Mixed Content

- [ ] Create new post với 3 ảnh
- [ ] Scroll qua posts cũ và mới
- [ ] ✅ Posts cũ: single image
- [ ] ✅ Posts mới: carousel
- [ ] ✅ No crashes or errors

---

## 🎨 Test UI/UX

### Test Case 11: Responsive Design

**Desktop:**

- [ ] ✅ Grid 3x3 rộng vừa phải
- [ ] ✅ Arrows hover smooth
- [ ] ✅ Carousel full width

**Mobile:**

- [ ] Resize browser to mobile width
- [ ] ✅ Grid 3x3 thu nhỏ
- [ ] ✅ Images vẫn clickable
- [ ] ✅ Carousel responsive
- [ ] ✅ Dots visible

### Test Case 12: Loading States

- [ ] Upload 5 ảnh lớn (mỗi ảnh 3-4MB)
- [ ] ✅ Loading spinner hiển thị
- [ ] ✅ Button disabled khi uploading
- [ ] ✅ "Đang xử lý..." text
- [ ] ✅ Success message khi done

---

## ⚠️ Test Error Handling

### Test Case 13: File Size Limit

- [ ] Vào "Đăng bài mới"
- [ ] Chọn ảnh > 5MB
- [ ] ✅ Error: "Kích thước tối đa 5MB"
- [ ] ✅ Ảnh không được thêm

### Test Case 14: Invalid File Type

- [ ] Chọn file .pdf hoặc .txt
- [ ] ✅ Error: "Chỉ chấp nhận định dạng JPG, PNG, WebP, GIF"
- [ ] ✅ File bị reject

### Test Case 15: Network Error

- [ ] Disconnect internet
- [ ] Upload ảnh
- [ ] ✅ Error message hiển thị
- [ ] ✅ Post không được tạo
- [ ] Reconnect internet
- [ ] Retry
- [ ] ✅ Success

---

## 🗄️ Test Database

### Test Case 16: Verify Database Records

```sql
-- After creating post with 3 images
SELECT * FROM post_images
WHERE post_id = 'YOUR_POST_ID'
ORDER BY display_order;

-- Should return 3 rows with:
-- display_order: 0, 1, 2
-- image_url: valid URLs
```

### Test Case 17: Verify Storage

- [ ] Vào Supabase Dashboard > Storage
- [ ] Open bucket `post-images`
- [ ] ✅ Tìm thấy uploaded images
- [ ] ✅ Filenames format: `{userId}/{timestamp}-{random}.{ext}`
- [ ] Click image URL
- [ ] ✅ Image hiển thị public

---

## 🎯 Performance Test

### Test Case 18: Upload Speed

- [ ] Upload 5 ảnh (mỗi ảnh 1MB)
- [ ] ⏱️ Measure time
- [ ] ✅ Expected: ~10-15 seconds
- [ ] ✅ No freezing/hanging

### Test Case 19: Page Load Speed

- [ ] Reload page với 10 posts
- [ ] ✅ Images load progressively
- [ ] ✅ No layout shift
- [ ] ✅ Carousel ready after images load

---

## ✅ Success Criteria

**All tests pass if:**

- ✅ Upload multiple images works (max 5)
- ✅ Preview grid displays correctly
- ✅ Carousel navigation smooth
- ✅ Dots indicator functional
- ✅ Database records saved correctly
- ✅ Backward compatible with old posts
- ✅ Error handling proper
- ✅ Responsive on mobile
- ✅ No console errors

---

## 📊 Test Results

Date: ******\_\_\_******
Tester: ******\_\_\_******

| Category        | Tests Passed | Tests Failed | Notes |
| --------------- | ------------ | ------------ | ----- |
| Posts Upload    | \_\_/5       | \_\_/5       |       |
| Products Upload | \_\_/3       | \_\_/3       |       |
| UI/UX           | \_\_/2       | \_\_/2       |       |
| Error Handling  | \_\_/3       | \_\_/3       |       |
| Database        | \_\_/2       | \_\_/2       |       |
| Performance     | \_\_/2       | \_\_/2       |       |
| **TOTAL**       | **\_\_/17**  | **\_\_/17**  |       |

**Overall Status:** ✅ Pass / ❌ Fail

**Comments:**

---

---

---

---

**Ready to test! 🚀**
