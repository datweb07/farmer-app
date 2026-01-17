# 🛡️ Admin Dashboard System - Quick Setup

## 🚀 3 BƯỚC ĐỂ BẮT ĐẦU

### 1️⃣ Chạy Migration

```sql
-- Trong Supabase SQL Editor, chạy file:
supabase/migrations/019_admin_system.sql
```

### 2️⃣ Cấp Quyền Admin

```sql
-- Thay 'your_username' bằng username của bạn
UPDATE profiles
SET is_admin = TRUE
WHERE username = 'your_username';
```

### 3️⃣ Truy Cập

- Login vào app
- Click **"Admin"** button (có icon Shield) trong navigation
- Enjoy! 🎉

---

## 📋 TÍNH NĂNG

✅ **User Management**

- Ban/unban users
- Change roles (farmer/business)
- Grant admin access
- Search & filter

✅ **Content Moderation**

- Approve/reject posts
- Approve/reject products
- Approve/reject projects (quan trọng!)
- Delete content

✅ **Reports Management**

- View user reports
- Resolve/dismiss reports
- Track violations

✅ **Statistics Dashboard**

- Users, posts, products, projects
- Pending items (with alerts)
- Investment totals

✅ **Admin Logs**

- Full action history
- Audit trail
- Timeline view

---

## 📖 Full Documentation

Xem [ADMIN_SYSTEM_GUIDE.md](./ADMIN_SYSTEM_GUIDE.md) để biết chi tiết đầy đủ.

---

## 🔥 LƯU Ý QUAN TRỌNG

⚠️ **Projects phải được admin approve:**

- Mặc định projects mới: `moderation_status = 'pending'`
- Admin phải approve để project nhận đầu tư
- Protect khỏi scam projects

⚠️ **Luôn nhập lý do:**

- Khi ban user
- Khi reject content
- Khi delete content

---

## 🎯 PAGES & ROUTES

| Page               | Route                 | Description      |
| ------------------ | --------------------- | ---------------- |
| Admin Dashboard    | `/admin`              | Overview stats   |
| User Management    | `/admin?tab=users`    | Manage users     |
| Post Moderation    | `/admin?tab=posts`    | Approve posts    |
| Product Moderation | `/admin?tab=products` | Approve products |
| Project Moderation | `/admin?tab=projects` | Approve projects |
| Reports            | `/admin?tab=reports`  | Handle reports   |
| Logs               | `/admin?tab=logs`     | View history     |

---

**System Status:** ✅ Complete & Ready for Production
