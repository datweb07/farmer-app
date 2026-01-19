# 🌊 Độ Mặn Dự Báo - Quick Start

## Tóm Tắt Nhanh

Trang dự báo độ mặn bằng mô hình Prophet đã được triển khai hoàn chỉnh.

## 🚀 Bắt Đầu Nhanh

### Bước 1: Tạo Bảng trong Supabase

Vào Supabase SQL Editor và chạy:

```sql
-- File: supabase/migrations/025_prophet_predict_table.sql
```

Hoặc copy SQL từ file và execute.

### Bước 2: Import Dữ Liệu Mẫu (Optional)

```sql
INSERT INTO prophet_predict (nam, tinh, ten_tram, lon, lat, du_bao_man, lower_ci, upper_ci, he_so_vi_tri) VALUES
(2024, 'Cà Mau', 'Trạm Sông Đốc', 104.89, 9.28, 0.85, 0.65, 1.05, 1.20),
(2024, 'Bạc Liêu', 'Trạm Bạc Liêu', 105.72, 9.29, 2.15, 1.75, 2.55, 1.85),
(2025, 'Cà Mau', 'Trạm Sông Đốc', 104.89, 9.28, 0.92, 0.70, 1.14, 1.20);
```

### Bước 3: Truy Cập Trang

1. Khởi động app: `npm run dev`
2. Đăng nhập
3. Click menu **"Dự báo"** (icon TrendingUpDown)

## 📂 Files Được Tạo

```
src/
├── types/prophet.ts                 - Type definitions
├── hooks/useProphetPredict.ts       - Data hook
├── components/
│   ├── FilterBar.tsx                - Filters
│   ├── SalinityChart.tsx            - Chart
│   ├── SalinityMap.tsx              - Map
│   └── SalinityTable.tsx            - Table
└── pages/SalinityForecast.tsx       - Main page

supabase/migrations/
└── 025_prophet_predict_table.sql    - Schema
```

## ✨ Tính Năng

- ✅ Filter: Năm / Tỉnh / Trạm
- ✅ Map: Color-coded markers (Xanh < 1 g/l, Vàng 1-4 g/l, Đỏ > 4 g/l)
- ✅ Chart: Line + Confidence Interval band
- ✅ Table: Sortable + Pagination
- ✅ Stats: Overview cards

## 📖 Chi Tiết

Xem file `SALINITY_FORECAST_GUIDE.md` để biết thêm chi tiết.

## 🔧 Import Dữ Liệu từ Python

```python
from supabase import create_client
import pandas as pd

# Kết nối
supabase = create_client(
    "YOUR_SUPABASE_URL",
    "YOUR_SUPABASE_KEY"
)

# Đọc predictions từ Prophet
df = pd.read_csv('prophet_output.csv')

# Transform data
data = df.rename(columns={
    'ds': 'nam',
    'yhat': 'du_bao_man',
    'yhat_lower': 'lower_ci',
    'yhat_upper': 'upper_ci'
}).to_dict('records')

# Insert vào Supabase
result = supabase.table('prophet_predict').insert(data).execute()
print(f"Inserted {len(data)} records")
```

## ⚠️ Lưu Ý

- Đảm bảo có environment variables: `VITE_SUPABASE_URL` và `VITE_SUPABASE_ANON_KEY`
- RLS policies đã enable public read
- Dependencies đã được cài: `leaflet`, `react-leaflet`, `recharts`

## 📞 Help

- Không có data? → Chạy migration và import data
- Map không hiển thị? → Check lat/lon hợp lệ
- Chart trống? → Verify có data trong Supabase

**Xong! Trang đã sẵn sàng sử dụng! 🎉**
