# Hướng dẫn Setup Notifications System

## 1. Chạy Migration

Truy cập Supabase Dashboard và chạy file migration:

```bash
# File: supabase/migrations/013_notifications_system.sql
```

Hoặc chạy trực tiếp trong Supabase SQL Editor:

- Mở Supabase Dashboard
- Vào SQL Editor
- Copy nội dung file `013_notifications_system.sql`
- Execute

## 2. Kiểm tra Database

Sau khi chạy migration, kiểm tra các bảng đã được tạo:

```sql
-- Kiểm tra notifications table
SELECT * FROM notifications LIMIT 1;

-- Kiểm tra functions
SELECT routine_name FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name LIKE '%notification%';

-- Kiểm tra triggers
SELECT trigger_name FROM information_schema.triggers
WHERE event_object_schema = 'public';
```

## 3. Các Tính Năng Đã Implement

### ✅ Database Schema

- `notifications` table với RLS policies
- Triggers tự động tạo notifications cho:
  - POST_LIKE: Khi ai đó like bài viết
  - POST_COMMENT: Khi ai đó comment bài viết
  - COMMENT_REPLY: Khi ai đó reply comment
  - POST_SHARE: Khi ai đó share bài viết
  - PROJECT_INVESTMENT: Khi ai đó đầu tư vào dự án
  - PROJECT_RATING: Khi ai đó đánh giá dự án

### ✅ Services

- `getNotifications()`: Lấy danh sách notifications
- `getUnreadCount()`: Đếm số notifications chưa đọc
- `markAsRead()`: Đánh dấu 1 notification đã đọc
- `markAllAsRead()`: Đánh dấu tất cả đã đọc
- `deleteNotification()`: Xóa 1 notification
- `deleteAllRead()`: Xóa tất cả đã đọc
- `subscribeToNotifications()`: Real-time updates

### ✅ UI Components

- **NotificationDropdown**: Dropdown hiển thị notifications
  - Badge đỏ hiển thị số unread
  - Click notification để mark as read
  - Delete individual notifications
  - Mark all as read
  - Delete all read
  - Real-time updates
  - Responsive design

### ✅ Integration

- Đã tích hợp vào Navigation (Desktop & Mobile)
- Real-time subscription khi user login
- Auto-refresh unread count

## 4. Cách Sử Dụng

### User Experience:

1. User nhận notification real-time khi có hoạt động
2. Badge đỏ hiển thị số notifications chưa đọc
3. Click vào Bell icon để xem notifications
4. Click vào notification để mark as read
5. Có thể delete, mark all as read

### Developer:

Notifications được tạo tự động qua triggers, không cần code thêm!

```typescript
// Ví dụ: Khi user like post
await likePost(postId); // Service này đã có
// → Trigger tự động tạo notification cho post owner
```

## 5. Testing

### Test Manual:

1. Login với 2 accounts khác nhau
2. Account A tạo 1 post
3. Account B like/comment post của A
4. Check notifications của Account A

### Test Functions:

```sql
-- Test tạo notification
SELECT create_notification(
  'user-uuid',
  'POST_LIKE',
  'Test Title',
  'Test message',
  '/posts/123',
  'actor-uuid'
);

-- Test get unread count
SELECT get_unread_notifications_count('user-uuid');

-- Test mark all read
SELECT mark_all_notifications_read('user-uuid');
```

## 6. Troubleshooting

### Lỗi: Notifications không hiển thị

- Check RLS policies: `SELECT * FROM notifications WHERE user_id = auth.uid()`
- Check triggers đã được tạo: Query ở bước 2

### Lỗi: Real-time không hoạt động

- Check Supabase Realtime settings
- Verify subscribeToNotifications được gọi khi user login

### Lỗi: Unread count không đúng

- Refresh page
- Check function: `get_unread_notifications_count`

## 7. Tính Năng Có Thể Mở Rộng

- [ ] Email notifications (tuần 1 lần)
- [ ] Push notifications (mobile app)
- [ ] Notification preferences/settings
- [ ] Mute specific users
- [ ] Sound/visual alerts
- [ ] Notification categories filter

## 8. Performance Tips

- Notifications được index tốt (user_id, is_read, created_at)
- Chỉ load 20 notifications đầu tiên
- Real-time chỉ subscribe khi dropdown mở (optional)
- Auto-cleanup notifications cũ (có thể thêm cron job)

## 9. Security

- ✅ RLS policies: User chỉ xem được notifications của mình
- ✅ No self-notifications: Không tạo notification cho chính mình
- ✅ Actor info được cache trong notification (không cần query lại)

---

**🎉 Notifications System đã hoàn thiện!**
