# Hướng Dẫn: Hệ Thống Kiểm Duyệt Nội Dung

## Tổng Quan

Từ bây giờ, tất cả **posts** và **products** mới đăng sẽ ở trạng thái **"Chờ duyệt" (pending)** cho đến khi admin phê duyệt.

## Những Gì Đã Thay Đổi

### 1. ✅ Trạng Thái Mặc Định Khi Đăng

**Posts:**

- ❌ Trước: `moderation_status = 'approved'` → Hiển thị ngay
- ✅ Sau: `moderation_status = 'pending'` → Chờ duyệt

**Products:**

- ❌ Trước: `moderation_status = 'approved'` → Hiển thị ngay
- ✅ Sau: `moderation_status = 'pending'` → Chờ duyệt

**Investment Projects:**

- ✅ Đã luôn là `'pending'` từ đầu

### 2. ✅ Hiển Thị Nội Dung

**Người dùng thông thường:**

- Chỉ thấy posts/products đã được duyệt (`moderation_status = 'approved'`)
- Thấy posts/products của chính mình (kể cả đang pending)
- Không thấy posts/products bị từ chối hoặc đang chờ duyệt của người khác

**Admin:**

- Thấy tất cả posts/products qua Admin Dashboard
- Tab "Kiểm duyệt Posts" và "Kiểm duyệt Products"
- Có thể duyệt (approve), từ chối (reject), hoặc xóa

## Files Đã Sửa

### Migration Files:

1. **019_admin_system.sql** (đã update)
   - Đổi default của posts: `DEFAULT 'pending'`
   - Đổi default của products: `DEFAULT 'pending'`

2. **020_filter_approved_content.sql** (mới tạo)
   - Update RPC functions để filter approved content
   - `get_posts_with_stats()` - chỉ trả về approved posts
   - `get_post_with_stats()` - chỉ trả về approved post
   - `get_user_posts()` - user thấy posts của mình, người khác chỉ thấy approved
   - `get_user_shared_posts()` - chỉ approved posts
   - `get_products_with_stats()` - chỉ approved products
   - `get_product_with_stats()` - chỉ approved product

### Service Files:

3. **src/lib/community/posts.service.ts**

   ```typescript
   // Explicitly set moderation_status khi tạo post
   moderation_status: "pending";
   ```

4. **src/lib/community/products.service.ts**
   ```typescript
   // Explicitly set moderation_status khi tạo product
   moderation_status: "pending";
   ```

## Cách Chạy Migration

### Bước 1: Chạy Migration 019 (Cập nhật)

```sql
-- Mở Supabase SQL Editor
-- Copy nội dung từ: supabase/migrations/019_admin_system.sql
-- Paste và Run
```

**Hoặc nếu đã chạy 019 trước đó, cập nhật column default:**

```sql
-- Update default value cho posts
ALTER TABLE posts
ALTER COLUMN moderation_status SET DEFAULT 'pending';

-- Update default value cho products
ALTER TABLE products
ALTER COLUMN moderation_status SET DEFAULT 'pending';
```

### Bước 2: Chạy Migration 020 (Mới)

```sql
-- Mở Supabase SQL Editor
-- Copy nội dung từ: supabase/migrations/020_filter_approved_content.sql
-- Paste và Run
```

### Bước 3: (Optional) Approve Nội Dung Cũ

Nếu muốn approve tất cả posts/products cũ (trước khi có migration):

```sql
-- Approve tất cả posts hiện tại
UPDATE posts
SET moderation_status = 'approved'
WHERE moderation_status IS NULL OR moderation_status = 'pending';

-- Approve tất cả products hiện tại
UPDATE products
SET moderation_status = 'approved'
WHERE moderation_status IS NULL OR moderation_status = 'pending';
```

## Flow Hoạt Động

### User Đăng Post/Product:

1. User điền form và submit
2. Post/Product được tạo với `moderation_status = 'pending'`
3. User không thấy post/product của mình trong danh sách chung (vì pending)
   - Nhưng có thể thấy trong profile của mình
4. Thông báo hiển thị: "Bài viết/Sản phẩm đang chờ duyệt"

### Admin Duyệt:

1. Admin login và vào Admin Dashboard
2. Click tab "Kiểm duyệt Posts" hoặc "Kiểm duyệt Products"
3. Filter "Chờ duyệt" để xem nội dung pending
4. Xem chi tiết và quyết định:
   - **Duyệt** → `moderation_status = 'approved'` → Hiển thị công khai
   - **Từ chối** → `moderation_status = 'rejected'` → Không hiển thị
   - **Xóa** → Xóa khỏi database

### Người Dùng Khác:

1. Chỉ thấy posts/products đã được duyệt
2. Không biết có posts/products pending
3. Không thấy posts/products bị từ chối

## Testing

### Test 1: Đăng Post Mới

**Steps:**

1. Login với user account (không phải admin)
2. Tạo post mới
3. Check database:

```sql
SELECT id, title, moderation_status FROM posts
WHERE user_id = 'your_user_id'
ORDER BY created_at DESC LIMIT 1;
```

4. Expected: `moderation_status = 'pending'`

### Test 2: Post Không Hiển Thị

**Steps:**

1. Sau khi đăng post
2. Vào trang Community/Posts
3. Search post vừa đăng
4. Expected: Không thấy trong danh sách

### Test 3: User Thấy Post Của Mình

**Steps:**

1. Vào Profile của mình
2. Tab "Bài viết của tôi"
3. Expected: Thấy post pending với badge "Chờ duyệt"

### Test 4: Admin Duyệt Post

**Steps:**

1. Login với admin account
2. Admin Dashboard → Tab "Kiểm duyệt Posts"
3. Filter "Chờ duyệt"
4. Click "Duyệt" trên post vừa test
5. Expected: Post status → 'approved'

### Test 5: Post Hiển Thị Sau Khi Duyệt

**Steps:**

1. Logout admin, login lại user hoặc user khác
2. Vào trang Community
3. Expected: Thấy post đã được duyệt

### Test 6-10: Lặp lại với Products

Làm tương tự với Products:

- Tạo product mới
- Check không hiển thị
- Thấy trong profile
- Admin duyệt
- Hiển thị sau khi duyệt

## UI Updates Cần Có

### 1. Badge Status trong Profile

Thêm badge hiển thị trạng thái:

```tsx
{
  post.moderation_status === "pending" && (
    <span className="px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded">
      Chờ duyệt
    </span>
  );
}

{
  post.moderation_status === "rejected" && (
    <span className="px-2 py-1 text-xs bg-red-100 text-red-800 rounded">
      Bị từ chối
    </span>
  );
}
```

### 2. Thông Báo Sau Khi Đăng

Sau khi tạo post/product thành công:

```tsx
alert(
  "Bài viết/Sản phẩm đã được đăng và đang chờ admin duyệt. Bạn sẽ nhận được thông báo khi được duyệt.",
);
```

### 3. Số Lượng Pending trong Admin Dashboard

Admin dashboard stat card hiển thị:

- "X bài viết chờ duyệt"
- "Y sản phẩm chờ duyệt"

## Troubleshooting

### Issue: Posts cũ biến mất

**Nguyên nhân:** Migration 020 filter chỉ approved, nhưng posts cũ có `moderation_status = NULL`

**Solution:**
Migration 020 đã xử lý: `(p.moderation_status = 'approved' OR p.moderation_status IS NULL)`

Hoặc chạy:

```sql
UPDATE posts SET moderation_status = 'approved' WHERE moderation_status IS NULL;
UPDATE products SET moderation_status = 'approved' WHERE moderation_status IS NULL;
```

### Issue: User không thấy post của mình sau khi đăng

**Nguyên nhân:** RPC function chưa update

**Solution:**

- Chạy migration 020
- Restart dev server
- Hard refresh browser

### Issue: Admin không thấy pending posts

**Nguyên nhân:** Admin panel dùng function khác

**Solution:**

- Admin panel dùng `get_content_for_moderation()` từ migration 019
- Không bị ảnh hưởng bởi migration 020

## Best Practices

### 1. Xử Lý UX

- Hiển thị message rõ ràng sau khi đăng
- Thêm badge trạng thái trong profile
- Thông báo khi được duyệt (cần implement)

### 2. Admin Workflow

- Check pending content thường xuyên
- Dùng bulk actions để duyệt nhiều cùng lúc
- Ghi rõ lý do khi reject

### 3. Performance

- Index trên `moderation_status` để query nhanh:

```sql
CREATE INDEX IF NOT EXISTS idx_posts_moderation_status
ON posts(moderation_status);

CREATE INDEX IF NOT EXISTS idx_products_moderation_status
ON products(moderation_status);
```

## Summary

✅ **Đã hoàn thành:**

- Posts/Products mới luôn pending
- Chỉ hiển thị approved content
- User thấy own content
- Admin duyệt qua dashboard
- Migration files đầy đủ

🔄 **Cần implement thêm:**

- UI badges cho status
- Notification khi được duyệt
- Bulk approve actions
- Auto-approve cho trusted users (optional)

📝 **Cần chạy:**

1. Migration 019 (updated)
2. Migration 020 (new)
3. Optional: Approve existing content
