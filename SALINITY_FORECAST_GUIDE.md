# Hướng Dẫn Trang Độ Mặn Dự Báo

## Tổng Quan

Trang **Độ Mặn Dự Báo** là một hệ thống hoàn chỉnh để hiển thị và phân tích dữ liệu dự báo độ mặn nước mặt dựa trên mô hình Prophet. Hệ thống phục vụ mục đích nghiên cứu khoa học và quản lý tài nguyên nước.

## Công Nghệ Sử Dụng

- **Frontend**: React 19 + TypeScript + Vite
- **Database**: Supabase (PostgreSQL)
- **Charts**: Recharts
- **Maps**: Leaflet + React-Leaflet
- **Styling**: Tailwind CSS
- **Auth**: Supabase RLS (Public read access)

## Cấu Trúc Dự Án

```
src/
├── types/
│   └── prophet.ts                  # Type definitions
├── hooks/
│   └── useProphetPredict.ts        # Data fetching hook
├── components/
│   ├── FilterBar.tsx               # Filter controls
│   ├── SalinityChart.tsx           # Line chart with CI band
│   ├── SalinityMap.tsx             # Interactive map
│   └── SalinityTable.tsx           # Data table with sorting
├── pages/
│   └── SalinityForecast.tsx        # Main page
└── lib/
    └── supabase/
        └── supabase.ts             # Supabase client

supabase/
└── migrations/
    └── 025_prophet_predict_table.sql
```

## Cài Đặt

### 1. Dependencies đã được cài đặt

```bash
npm install leaflet react-leaflet @types/leaflet
```

Dependencies khác đã có sẵn:

- `recharts` - cho biểu đồ
- `@supabase/supabase-js` - kết nối Supabase
- `react-router-dom` - routing

### 2. Tạo Table trong Supabase

Chạy migration SQL trong Supabase Dashboard:

```bash
# Đường dẫn file: supabase/migrations/025_prophet_predict_table.sql
```

Hoặc copy SQL và chạy trong SQL Editor của Supabase.

### 3. Thêm CSS cho Leaflet

Thêm import CSS của Leaflet vào file main entry (nếu chưa có):

```typescript
// src/main.tsx hoặc src/App.tsx
import "leaflet/dist/leaflet.css";
```

### 4. Thêm Route

Thêm route vào router của bạn:

```typescript
// Ví dụ trong App.tsx hoặc router config
import { SalinityForecast } from '@/pages/SalinityForecast';

// Trong routes:
<Route path="/salinity-forecast" element={<SalinityForecast />} />
```

## Import Dữ Liệu

### Cách 1: Qua Supabase Dashboard

1. Mở Supabase Dashboard
2. Vào Table Editor → prophet_predict
3. Click "Insert" → "Insert row"
4. Hoặc import từ CSV

### Cách 2: Qua SQL

```sql
INSERT INTO prophet_predict (nam, tinh, ten_tram, lon, lat, du_bao_man, lower_ci, upper_ci, he_so_vi_tri)
VALUES
  (2024, 'Cà Mau', 'Trạm Sông Đốc', 104.89, 9.28, 0.85, 0.65, 1.05, 1.20),
  (2024, 'Bạc Liêu', 'Trạm Bạc Liêu', 105.72, 9.29, 2.15, 1.75, 2.55, 1.85);
```

### Cách 3: Qua Python Script

```python
from supabase import create_client
import pandas as pd

# Kết nối Supabase
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

# Đọc dữ liệu từ Prophet
df = pd.read_csv('prophet_predictions.csv')

# Chuyển đổi và insert
data = df.to_dict('records')
supabase.table('prophet_predict').insert(data).execute()
```

## Tính Năng

### 1. Filter Bar

- Filter theo năm (2024-2030)
- Filter theo tỉnh/thành phố
- Filter theo trạm đo
- Hiển thị active filters
- Reset button

### 2. Interactive Map

- Hiển thị marker theo tọa độ (lat/lon)
- Màu marker theo độ mặn:
  - < 1 g/l: Xanh lá (Thấp)
  - 1-4 g/l: Vàng/Cam (Trung bình)
  - > 4 g/l: Đỏ (Cao)
- Click marker → popup với thông tin chi tiết
- Legend và statistics

### 3. Chart

- Line chart với confidence interval band
- Trục X: Năm
- Trục Y: Độ mặn (g/l)
- Hiển thị khoảng tin cậy 95%
- Summary statistics cards
- Responsive design

### 4. Data Table

- Hiển thị đầy đủ thông tin
- Sorting cho các cột
- Pagination (10 items/page)
- Color-coded salinity values
- Responsive table

### 5. Overview Cards

- Tổng số bản ghi
- Số năm dự báo
- Số tỉnh/thành phố
- Độ mặn trung bình

## API Reference

### Hook: useProphetPredict

```typescript
const { data, loading, error, refetch } = useProphetPredict();
```

**Returns:**

- `data`: Array<ProphetPredict> - Dữ liệu dự báo
- `loading`: boolean - Trạng thái loading
- `error`: string | null - Thông báo lỗi
- `refetch`: () => Promise<void> - Hàm tải lại dữ liệu

### Type: ProphetPredict

```typescript
interface ProphetPredict {
  id: number;
  nam: number; // Năm dự báo
  tinh: string; // Tỉnh/thành phố
  ten_tram: string; // Tên trạm đo
  lon: number; // Kinh độ
  lat: number; // Vĩ độ
  du_bao_man: number; // Độ mặn dự báo (g/l)
  lower_ci: number; // Cận dưới CI 95%
  upper_ci: number; // Cận trên CI 95%
  he_so_vi_tri: number; // Hệ số vị trí
  created_at: string; // Timestamp
}
```

## Customization

### Thay đổi màu marker

Trong `SalinityMap.tsx`:

```typescript
const getSalinityColor = (salinity: number): string => {
  if (salinity < 1) return "#10b981"; // Green
  if (salinity < 4) return "#f59e0b"; // Orange
  return "#ef4444"; // Red
};
```

### Thay đổi số items per page

Trong `SalinityTable.tsx`:

```typescript
const itemsPerPage = 10; // Thay đổi số này
```

### Thay đổi chart colors

Trong `SalinityChart.tsx`:

```typescript
<Line
  stroke="#2563eb"  // Thay đổi màu line
  strokeWidth={3}   // Độ dày line
  dot={{ fill: '#2563eb', r: 5 }}
/>
```

## Troubleshooting

### Lỗi: "Missing Supabase environment variables"

Đảm bảo file `.env` có:

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_anon_key
```

### Map không hiển thị

1. Kiểm tra import CSS: `import 'leaflet/dist/leaflet.css'`
2. Kiểm tra dữ liệu có tọa độ hợp lệ
3. Kiểm tra console cho lỗi Leaflet

### Chart không hiển thị

1. Kiểm tra `recharts` đã được cài đặt
2. Đảm bảo có dữ liệu trong `data` array
3. Kiểm tra console cho lỗi

### Table trống

1. Kiểm tra RLS policies trong Supabase
2. Xác nhận public read access được enable
3. Kiểm tra data đã được import

## Performance Optimization

### 1. Pagination

Table tự động phân trang để tránh render quá nhiều rows.

### 2. Memoization

Sử dụng `useMemo` cho filtered data và computed values.

### 3. Lazy Loading

Map markers chỉ render stations được filter.

### 4. Debouncing

Có thể thêm debounce cho filter changes:

```typescript
import { useDebounce } from "@/hooks/useDebounce";
const debouncedFilters = useDebounce(filters, 300);
```

## Security

- **RLS Enabled**: Row Level Security được bật
- **Public Read**: Dữ liệu public cho nghiên cứu
- **Authenticated Write**: Chỉ user authenticated mới insert/update
- **Input Validation**: Constraints và checks trong database

## Future Enhancements

- [ ] Export data to CSV/Excel
- [ ] Print/PDF report generation
- [ ] Compare multiple years on chart
- [ ] Heatmap visualization
- [ ] Real-time data updates
- [ ] Advanced analytics dashboard
- [ ] Mobile responsive improvements
- [ ] Dark mode support

## Support

Để được hỗ trợ, vui lòng:

1. Kiểm tra migration đã chạy thành công
2. Xác nhận environment variables
3. Kiểm tra console logs cho errors
4. Xem lại documentation

## License

Dự án này phục vụ mục đích nghiên cứu khoa học.
