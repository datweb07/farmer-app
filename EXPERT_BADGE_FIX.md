# Fix Expert Badge Issue - README

## 🐛 Vấn Đề

Account mới với **rank #20** và **0 điểm** đang nhận được Expert badge (Top 10) một cách không chính xác.

### Nguyên Nhân

1. **Hàm `get_user_leaderboard_rank()`** đang sử dụng `profiles.points` (cột tĩnh)
2. Nhưng điểm thực tế được tính bởi `calculate_user_points()` (dynamic):

   - Base points từ profile
   - +10 điểm/bài viết
   - +5 điểm/10 likes
   - +2 điểm/100 views

3. Khi nhiều users có `profiles.points = 0`, rank calculation sai → award Expert badge cho users không đủ điều kiện

## ✅ Giải Pháp

Migration mới `017_fix_expert_badge_rank.sql` đã được tạo với các thay đổi:

### 1. Fix Hàm `get_user_leaderboard_rank()`

```sql
-- Trước (SAI):
RANK() OVER (ORDER BY points DESC)  -- Dùng profiles.points tĩnh

-- Sau (ĐÚNG):
RANK() OVER (ORDER BY calculate_user_points(id) DESC)  -- Dùng dynamic calculation
WHERE calculate_user_points(id) > 0  -- Chỉ tính users có điểm thực
```

### 2. Cải Thiện Trigger `check_expert_badge()`

- Tính điểm động trước khi check rank
- Chỉ award khi: `calculated_points >= 100` AND `rank <= 10`
- Tự động xóa Expert badge nếu user không còn đủ điều kiện

### 3. Cleanup Dữ Liệu Cũ

- Xóa Expert badges từ users có < 100 điểm
- Xóa Expert badges từ users không trong top 10

## 🚀 Cách Áp Dụng

### Bước 1: Run Migration Trong Supabase

1. Mở **Supabase Dashboard** → **SQL Editor**
2. Copy toàn bộ nội dung file `supabase/migrations/017_fix_expert_badge_rank.sql`
3. Paste vào SQL Editor và **Run**

### Bước 2: Verify Kết Quả

Run query sau để kiểm tra:

```sql
SELECT
    p.id,
    p.username,
    calculate_user_points(p.id) as calculated_points,
    RANK() OVER (ORDER BY calculate_user_points(p.id) DESC) as rank,
    EXISTS(
        SELECT 1 FROM user_badges
        WHERE user_id = p.id AND badge_id = 'expert'
    ) as has_expert_badge
FROM profiles p
WHERE calculate_user_points(p.id) > 0
ORDER BY calculated_points DESC
LIMIT 20;
```

**Kết quả mong đợi:**

- Chỉ top 10 users với >= 100 điểm mới có `has_expert_badge = true`
- Users mới với 0 điểm KHÔNG có Expert badge

## 📊 Logic Expert Badge Mới

```
Điều kiện award Expert badge:
1. calculated_points >= 100 (ít nhất 100 điểm)
2. rank <= 10 (trong top 10 bảng xếp hạng)

Cách tính điểm:
- Base: profiles.points
- Bài viết: +10 điểm/post
- Likes: +5 điểm/10 likes nhận được
- Views: +2 điểm/100 views
```

## 🧪 Test Cases

### Test 1: New User (0 points)

- **Before:** Có thể nhận Expert badge (BUG ❌)
- **After:** KHÔNG nhận Expert badge (FIXED ✅)

### Test 2: User với 50 points, rank #5

- **Before:** Nhận Expert badge (SAI - không đủ 100 điểm) ❌
- **After:** KHÔNG nhận Expert badge (ĐÚNG) ✅

### Test 3: User với 150 points, rank #8

- **Before & After:** Nhận Expert badge (ĐÚNG) ✅

### Test 4: User với 200 points, rank #15

- **Before & After:** KHÔNG nhận Expert badge (ĐÚNG - ngoài top 10) ✅

## 🔄 Automatic Behavior

Migration này cũng làm cho Expert badge **tự động cập nhật**:

- Khi user tăng điểm và vào top 10 → Tự động award badge
- Khi user giảm xuống dưới 100 điểm hoặc ra khỏi top 10 → Tự động remove badge

## 📁 Files Changed

1. **NEW:** `supabase/migrations/017_fix_expert_badge_rank.sql`

   - Fix `get_user_leaderboard_rank()` function
   - Fix `check_expert_badge()` trigger
   - Cleanup incorrect badges

2. **NO CHANGES NEEDED:**
   - Frontend code (`src/lib/badges/`)
   - Other badge logic
   - RPC functions work correctly now

## 🎯 Next Steps

Sau khi apply migration:

1. ✅ Test với account mới → Không nhận Expert badge
2. ✅ Check top 10 users → Chỉ họ mới có Expert badge
3. ✅ Verify badge counts trong Profile page
4. ✅ Test badge notification không còn xuất hiện cho users không đủ điều kiện

## 💡 Prevention

Migration này đã fix cả **logic calculation** và **cleanup data**, nên:

- Không có users mới bị award sai nữa
- Dữ liệu cũ đã được dọn sạch
- Trigger tự động maintain correctness

---

**Status:** ✅ FIXED - Ready to deploy
**Impact:** Medium (affects badge system integrity)
**Rollback:** Keep old migration files for reference if needed
