# ANALYTICS SYSTEM - HƯỚNG DẪN TRIỂN KHAI

## Tổng quan

Hệ thống Analytics cung cấp bảng điều khiển phân tích toàn diện cho nền tảng nông nghiệp ĐBSCL, bao gồm:

- **User Analytics**: Theo dõi hoạt động và tương tác người dùng
- **Project Analytics**: Phân tích hiệu quả đầu tư và ROI dự án
- **Platform Statistics**: Thống kê tổng quan nền tảng

## 🚀 Cài đặt

### 1. Chạy Database Migration

Chạy migration để tạo các RPC functions trong Supabase:

```sql
-- File: supabase/migrations/022_analytics_system.sql
-- Copy nội dung file này và chạy trong Supabase SQL Editor
```

Migration tạo các functions:

- `get_user_engagement_metrics(days_back)` - Metrics hoạt động người dùng
- `get_top_contributors_analytics(limit, period)` - Top người đóng góp
- `get_user_growth_metrics(days_back)` - Tăng trưởng người dùng
- `get_project_analytics(project_id)` - Phân tích dự án cụ thể
- `get_investment_trends(days_back)` - Xu hướng đầu tư
- `get_project_categories_performance()` - Hiệu quả theo danh mục
- `get_platform_statistics()` - Thống kê tổng quan
- `get_content_statistics_by_category()` - Thống kê nội dung

### 2. Cấu trúc Files

```
src/
├── lib/
│   └── analytics/
│       ├── types.ts                    # TypeScript types
│       └── analytics.service.ts         # Service layer
└── app/
    ├── pages/
    │   └── AnalyticsPage.tsx            # Main page với tabs
    └── components/
        └── analytics/
            ├── UserAnalytics.tsx        # User engagement charts
            ├── ProjectAnalytics.tsx     # Project ROI analysis
            └── PlatformStatistics.tsx   # Platform overview
```

## 📊 Tính năng chính

### User Analytics

- **Engagement Metrics**: Active users, posts, comments, likes theo thời gian
- **User Growth**: Tăng trưởng người dùng mới
- **Top Contributors**: Bảng xếp hạng người đóng góp nhiều nhất
- **Period Selector**: Xem dữ liệu 7/30/90 ngày
- **Export**: Xuất CSV/Excel

### Project Analytics

- **Summary Stats**:
  - Tổng vốn đầu tư
  - Tỷ lệ hoàn vốn trung bình
  - Số dự án thành công
  - Tổng nhà đầu tư
- **Investment Trends**: Biểu đồ xu hướng đầu tư (số lượng + giá trị)
- **Category Performance**:
  - Pie chart phân bổ vốn theo danh mục
  - Bar chart tỷ lệ thành công theo danh mục
- **Project Details Table**: Chi tiết từng dự án với ROI, tiến độ, vị trí
- **Export**: Xuất CSV/Excel

### Platform Statistics

- **Key Metrics Cards**:
  - Tổng người dùng (+ growth rate)
  - Tổng bài viết (+ growth rate)
  - Dự án đầu tư
  - Tỷ lệ tương tác
- **Active Users Chart**: Bar chart người dùng hoạt động (hôm nay/tuần/tháng)
- **Content Distribution**: Pie chart phân bổ nội dung
- **Engagement Metrics**: Bar chart bình luận/likes
- **Content by Category**: Breakdown posts & products theo danh mục
- **Detailed Statistics**: Grid thống kê chi tiết
- **Export**: Xuất CSV/In PDF

## 🔐 Kiểm soát truy cập

Analytics chỉ hiển thị cho **Admin users**:

- Kiểm tra `isAdmin()` trong Navigation.tsx
- Chỉ admin mới thấy menu item "Thống kê"
- Route được bảo vệ bởi PublicRoute wrapper

## 📈 Data Visualization

Sử dụng **Recharts** library:

- `LineChart`: Trends theo thời gian (engagement, investment)
- `BarChart`: So sánh giá trị (growth, categories)
- `PieChart`: Phân bổ phần trăm (content, funding)

Colors:

- Primary: `#10b981` (green)
- Secondary: `#3b82f6` (blue)
- Warning: `#f59e0b` (amber)
- Danger: `#ef4444` (red)
- Purple: `#8b5cf6`

## 📤 Export Functionality

### CSV Export

```typescript
exportToCSV(data, filename);
```

- UTF-8 BOM encoding (支持 Vietnamese characters)
- Auto-download
- Formatted headers

### Excel Export (HTML Table)

```typescript
exportToExcel(data, filename);
```

- HTML table format mở trong Excel
- Styled headers
- Auto-download

### PDF Export (Print)

```typescript
printReport();
```

- Sử dụng `window.print()`
- CSS print styles
- Ẩn navigation, export buttons khi in

## 🛠️ Service Layer

### analytics.service.ts

```typescript
// Fetch user engagement
const { data } = await getUserEngagementMetrics(30);

// Fetch top contributors
const { data } = await getTopContributors(10, "30days");

// Fetch project analytics
const { data } = await getProjectAnalytics("project-id");

// Fetch platform stats
const { data } = await getPlatformStatistics();

// Export data
exportToCSV(data, "filename");
exportToExcel(data, "filename");
printReport();
```

## 📋 TypeScript Types

```typescript
// User Engagement
interface UserEngagementMetric {
  date: string;
  active_users: number;
  posts: number;
  comments: number;
  likes: number;
}

// Top Contributor
interface TopContributor {
  user_id: string;
  full_name: string;
  points: number;
  posts_count: number;
  comments_count: number;
  likes_given: number;
  rank: number;
}

// Project Analytics
interface ProjectAnalytic {
  project_id: string;
  project_name: string;
  total_raised: number;
  investor_count: number;
  roi_percentage: number;
  // ... more fields
}

// Platform Statistics
interface PlatformStatistics {
  total_users: number;
  active_users_today: number;
  active_users_week: number;
  active_users_month: number;
  total_posts: number;
  total_products: number;
  total_projects: number;
  // ... more metrics
}
```

## 🎨 UI Components

### Period Selector

```tsx
<select value={period} onChange={(e) => setPeriod(e.target.value)}>
  <option value="7">7 ngày qua</option>
  <option value="30">30 ngày qua</option>
  <option value="90">90 ngày qua</option>
</select>
```

### Summary Cards

```tsx
<div className="bg-white rounded-lg shadow p-6">
  <div className="flex items-center justify-between">
    <Icon className="w-6 h-6 text-green-600" />
    <div>
      <p className="text-sm text-gray-600">Label</p>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  </div>
  <TrendIndicator value={growthRate} />
</div>
```

### Export Buttons

```tsx
<button onClick={() => exportToCSV(data, filename)}>
  <Download className="w-4 h-4" />
  Xuất CSV
</button>
```

## 🔍 Debugging

### Check RPC Functions

```sql
-- In Supabase SQL Editor
SELECT * FROM get_platform_statistics();
SELECT * FROM get_user_engagement_metrics(30);
```

### Check Service Calls

```typescript
console.log("Analytics data:", data);
console.log("Error:", error);
```

### Common Issues

1. **"Function not found"**
   - Đảm bảo đã chạy migration 022
   - Kiểm tra function name trong Supabase

2. **"No data returned"**
   - Kiểm tra có dữ liệu trong database
   - Check RLS policies
   - Verify user permissions

3. **Charts không hiển thị**
   - Kiểm tra data format
   - Verify dataKey names
   - Check ResponsiveContainer width/height

## 📱 Responsive Design

- Desktop: Full charts with legends
- Tablet: 2-column grid layouts
- Mobile: Single column, simplified charts

```css
/* Grid responsive */
grid-cols-1 md:grid-cols-2 lg:grid-cols-4
```

## 🚨 Performance

### Optimization Tips

1. **Lazy Load Components**: Import analytics components only when needed
2. **Memoize Data**: Use `useMemo` for heavy calculations
3. **Pagination**: Limit results với RPC parameters
4. **Caching**: Consider caching results với React Query

### Database Indexes

Migration 022 đã tạo indexes:

- `posts(created_at)`
- `products(created_at)`
- `investment_projects(created_at)`
- `investments(invested_at)`

## 📝 Testing Checklist

- [ ] Migration 022 chạy thành công
- [ ] All RPC functions hoạt động
- [ ] Analytics menu hiển thị cho admin
- [ ] 3 tabs render đúng
- [ ] Charts hiển thị data
- [ ] Export CSV works
- [ ] Export Excel works
- [ ] Print PDF works
- [ ] Responsive trên mobile
- [ ] Loading states
- [ ] Error handling

## 🔄 Future Enhancements

- [ ] Real-time updates với Supabase subscriptions
- [ ] Custom date range selector
- [ ] Email scheduled reports
- [ ] Advanced filters (by region, category, user type)
- [ ] Comparison views (period vs period)
- [ ] Dashboard customization
- [ ] Export to PDF (proper formatting)

## 📞 Support

Nếu gặp vấn đề:

1. Check migration đã chạy chưa
2. Verify user permissions (admin)
3. Check browser console for errors
4. Review Supabase logs

---

**Tạo bởi**: GitHub Copilot  
**Ngày tạo**: 2024  
**Version**: 1.0.0
