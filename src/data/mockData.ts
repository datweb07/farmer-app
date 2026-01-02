// Mock data cho nền tảng nông nghiệp Đồng Bằng Sông Cửu Long

export interface SalinityData {
  date: string;
  salinity: number;
  forecast?: boolean;
}

export interface Post {
  id: string;
  author: string;
  authorAvatar: string;
  authorPoints: number;
  title: string;
  content: string;
  category: 'experience' | 'salinity-solution' | 'product';
  image?: string;
  likes: number;
  comments: number;
  views: number;
  createdAt: string;
  productLink?: string;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  image: string;
  seller: string;
  sellerPoints: number;
  category: string;
  contact: string;
}

export interface InvestmentProject {
  id: string;
  title: string;
  description: string;
  fundingGoal: number;
  currentFunding: number;
  farmersImpacted: number;
  area: string;
  status: 'active' | 'funded' | 'pending';
}

// Dữ liệu độ mặn 14 ngày (7 ngày qua + 7 ngày dự đoán)
export const salinityData: SalinityData[] = [
  { date: '08/12', salinity: 2.1 },
  { date: '09/12', salinity: 2.3 },
  { date: '10/12', salinity: 2.8 },
  { date: '11/12', salinity: 3.2 },
  { date: '12/12', salinity: 3.5 },
  { date: '13/12', salinity: 3.8 },
  { date: '14/12', salinity: 4.2 },
  { date: '15/12', salinity: 4.5, forecast: true },
  { date: '16/12', salinity: 4.8, forecast: true },
  { date: '17/12', salinity: 5.2, forecast: true },
  { date: '18/12', salinity: 5.5, forecast: true },
  { date: '19/12', salinity: 5.8, forecast: true },
  { date: '20/12', salinity: 6.1, forecast: true },
  { date: '21/12', salinity: 6.3, forecast: true },
];

// So sánh với năm trước
export const salinityComparison = [
  { date: '08/12', namNay: 2.1, namTruoc: 1.8 },
  { date: '09/12', namNay: 2.3, namTruoc: 2.0 },
  { date: '10/12', namNay: 2.8, namTruoc: 2.2 },
  { date: '11/12', namNay: 3.2, namTruoc: 2.5 },
  { date: '12/12', namNay: 3.5, namTruoc: 2.8 },
  { date: '13/12', namNay: 3.8, namTruoc: 3.1 },
  { date: '14/12', namNay: 4.2, namTruoc: 3.4 },
];

// Dữ liệu bài viết
export const posts: Post[] = [
  {
    id: '1',
    author: 'Anh Nguyễn Văn Hai',
    authorAvatar: 'https://images.unsplash.com/photo-1633332755192-727a05c4013d?w=100',
    authorPoints: 850,
    title: 'Kinh nghiệm trữ nước ngọt mùa khô',
    content: 'Mình đã áp dụng phương pháp đào ao trữ nước được 3 năm rồi. Mỗi năm tiết kiệm được rất nhiều tiền bơm nước. Ao sâu 3m, rộng 20x30m có thể dùng cho cả vụ...',
    category: 'experience',
    image: 'https://baocantho.com.vn/image/fckeditor/upload/2024/20240413/images/T5-a1.webp',
    likes: 234,
    comments: 45,
    views: 1250,
    createdAt: '2 ngày trước',
  },
  {
    id: '2',
    author: 'Chị Trần Thị Lan',
    authorAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100',
    authorPoints: 1200,
    title: 'Giống lúa chịu mặn ST25 - Trải nghiệm thực tế',
    content: 'Năm nay mình thử trồng lúa ST25, giống này chịu mặn tốt lắm. Độ mặn lên đến 4-5‰ vẫn xanh tốt. Năng suất cũng cao hơn giống cũ 20%...',
    category: 'salinity-solution',
    image: 'https://halan.net/wp-content/uploads/2024/02/mot-so-dac-tinh-cua-giong-lua-st25.jpg',
    likes: 456,
    comments: 78,
    views: 2340,
    createdAt: '5 ngày trước',
  },
  {
    id: '3',
    author: 'Anh Lê Minh Tuấn',
    authorAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100',
    authorPoints: 650,
    title: 'Máy đo độ mặn giá rẻ, chính xác',
    content: 'Giới thiệu máy đo mặn mình đang dùng, giá 450k, đo rất chính xác. Shop giao hàng nhanh, bảo hành 2 năm...',
    category: 'product',
    image: 'https://thbvn.com/cdn/images/dmt-20-n.jpg',
    likes: 178,
    comments: 34,
    views: 890,
    createdAt: '1 tuần trước',
    productLink: 'product-1',
  },
  {
    id: '4',
    author: 'Anh Phạm Văn Nam',
    authorAvatar: 'https://images.unsplash.com/photo-1600486913747-55e5470d6f40?w=100',
    authorPoints: 920,
    title: 'Cách bơm nước tiết kiệm điện 40%',
    content: 'Sau khi nghiên cứu, mình phát hiện bơm nước vào ban đêm (sau 10h) giá điện rẻ hơn nhiều. Kết hợp với bể chứa lớn, tiết kiệm được 40% tiền điện...',
    category: 'experience',
    image: 'https://motor.net.vn/file/images/su-dung-may-bom-nuoc-tiet-kiem-dien-1.jpg',
    likes: 312,
    comments: 56,
    views: 1560,
    createdAt: '3 ngày trước',
  },
];

// Dữ liệu sản phẩm
export const products: Product[] = [
  {
    id: 'product-1',
    name: 'Máy đo độ mặn cầm tay',
    description: 'Máy đo độ mặn chính xác, dễ sử dụng. Màn hình LCD lớn, số rõ. Pin dùng lâu. Thích hợp cho nông dân.',
    price: 450000,
    image: 'https://maydochuyendung.com/img/uploads/DMT-20.jpg',
    seller: 'Anh Lê Minh Tuấn',
    sellerPoints: 650,
    category: 'Thiết bị đo',
    contact: '0912345678',
  },
  {
    id: 'product-2',
    name: 'Giống lúa ST25 chịu mặn',
    description: 'Giống lúa ST25 chất lượng cao, chịu mặn tốt đến 5‰. Năng suất 6-7 tấn/ha. Hạt thơm, ngon.',
    price: 85000,
    image: 'https://file.hstatic.net/200000563169/article/lua_st25_187cd3a3c0c84a778d8129703a0bf255.jpg',
    seller: 'HTX Nông nghiệp Mỹ Thuận',
    sellerPoints: 1500,
    category: 'Giống cây trồng',
    contact: '0923456789',
  },
  {
    id: 'product-3',
    name: 'Máy bơm nước tiết kiệm điện',
    description: 'Máy bơm công suất 3HP, tiết kiệm điện. Độ bền cao, ít hỏng hóc. Bảo hành 3 năm.',
    price: 3500000,
    image: 'https://maybompentax.vn/wp-content/uploads/2016/01/cach-dung-may-bom-nuoc-hieu-qua-tiet-kiem-dien-hinh-1.png',
    seller: 'Công ty TNHH Thiết bị Nông nghiệp',
    sellerPoints: 2100,
    category: 'Máy móc',
    contact: '0934567890',
  },
  {
    id: 'product-4',
    name: 'Phân bón chuyên dụng vùng mặn',
    description: 'Phân bón giúp cây trồng khỏe mạnh trong điều kiện đất mặn. Tăng năng suất 15-20%.',
    price: 120000,
    image: 'https://bcp.cdnchinhphu.vn/Uploaded/truonggiangthanh/2020_12_29/2.png',
    seller: 'Chị Nguyễn Thị Hoa',
    sellerPoints: 780,
    category: 'Phân bón',
    contact: '0945678901',
  },
  {
    id: 'product-5',
    name: 'Bạt phủ bể chứa nước',
    description: 'Bạt HDPE chất lượng cao, chống thấm 100%. Kích thước 6x8m, độ dày 0.5mm.',
    price: 850000,
    image: 'https://batnhuahanviet.com.vn/wp-content/uploads/2024/03/Bat-lot-ho-ca-tru-nuoc.jpg',
    seller: 'Anh Trần Văn Bình',
    sellerPoints: 560,
    category: 'Vật tư',
    contact: '0956789012',
  },
  {
    id: 'product-6',
    name: 'Hệ thống tưới nhỏ giọt',
    description: 'Hệ thống tưới nhỏ giọt tiết kiệm nước 60%. Phù hợp cho rau màu và cây ăn trái.',
    price: 2800000,
    image: 'https://dekkopipe.com/upload/photos/shares/Bai-dang/he-thong-tuoi-nho-giot/he-thong-tuoi-nho-giot%20(9)-min.jpg',
    seller: 'HTX Tưới tiêu Cần Thơ',
    sellerPoints: 1850,
    category: 'Hệ thống tưới',
    contact: '0967890123',
  },
];

// Dữ liệu dự án kêu gọi vốn
export const investmentProjects: InvestmentProject[] = [
  {
    id: 'inv-1',
    title: 'Hệ thống cống ngăn mặn Cái Lớn - Cái Bé',
    description: 'Xây dựng hệ thống cống ngăn mặn, bảo vệ 50,000 ha đất canh tác. Giúp 15,000 hộ nông dân ổn định sản xuất.',
    fundingGoal: 85000000000,
    currentFunding: 42000000000,
    farmersImpacted: 15000,
    area: 'Vĩnh Long, Đồng Tháp',
    status: 'active',
  },
  {
    id: 'inv-2',
    title: 'Trạm bơm nước ngọt cộng đồng',
    description: 'Xây dựng 20 trạm bơm nước ngọt phục vụ 5,000 ha lúa. Giảm chi phí bơm nước cho nông dân 50%.',
    fundingGoal: 12000000000,
    currentFunding: 8500000000,
    farmersImpacted: 3200,
    area: 'Bến Tre, Trà Vinh',
    status: 'active',
  },
  {
    id: 'inv-3',
    title: 'Mô hình nông nghiệp tuần hoàn',
    description: 'Triển khai mô hình nuôi tôm - trồng lúa luân canh. Tăng thu nhập gấp 3 lần so với trồng lúa thuần.',
    fundingGoal: 5000000000,
    currentFunding: 5000000000,
    farmersImpacted: 800,
    area: 'Sóc Trăng',
    status: 'funded',
  },
  {
    id: 'inv-4',
    title: 'Ứng dụng AI dự đoán xâm nhập mặn',
    description: 'Phát triển hệ thống AI dự đoán xâm nhập mặn chính xác 95%. Cảnh báo sớm 14 ngày cho nông dân.',
    fundingGoal: 3500000000,
    currentFunding: 1200000000,
    farmersImpacted: 50000,
    area: 'Toàn vùng ĐBSCL',
    status: 'active',
  },
];

// Thống kê tổng quan
export const overallStats = {
  totalFarmers: 48500,
  affectedArea: 125000, // hecta
  activeProjects: 12,
  successRate: 90, // %
  waterSaved: 2400000, // m3
  incomIncrease: 35, // %
};

// Giải pháp khuyến nghị dựa trên mức độ mặn
export const getSalinityRecommendations = (salinity: number) => {
  if (salinity < 4) {
    return {
      level: 'safe',
      title: 'An toàn - Có thể canh tác bình thường',
      recommendations: [
        '✓ Có thể lấy nước sông để tưới',
        '✓ Thích hợp gieo sạ lúa',
        '✓ Trồng rau màu bình thường',
        '✓ Không cần trữ nước đặc biệt',
      ],
      color: 'green',
    };
  } else if (salinity < 6) {
    return {
      level: 'warning',
      title: 'Cảnh báo - Cần chú ý',
      recommendations: [
        '⚠ Hạn chế lấy nước sông trực tiếp',
        '⚠ Nên dùng nước đã trữ từ trước',
        '⚠ Chọn giống lúa chịu mặn (ST25, OM5451)',
        '⚠ Bơm nước vào bể chứa để lắng 2-3 ngày',
        '⚠ Theo dõi màu lá cây hàng ngày',
      ],
      color: 'yellow',
    };
  } else {
    return {
      level: 'danger',
      title: 'Nguy hiểm - Cần hành động ngay',
      recommendations: [
        '✗ KHÔNG lấy nước sông',
        '✗ KHÔNG gieo sạ lúa trong thời điểm này',
        '✓ Sử dụng nguồn nước ngọt đã trữ',
        '✓ Cân nhắc chuyển sang nuôi tôm/cá',
        '✓ Liên hệ trạm bơm nước ngọt gần nhất',
        '✓ Tham gia nhóm hỗ trợ nông dân',
      ],
      color: 'red',
    };
  }
};

// Dữ liệu khu vực bị ảnh hưởng (cho bản đồ)
export const affectedAreas = [
  { province: 'Bến Tre', salinity: 6.8, status: 'danger' },
  { province: 'Trà Vinh', salinity: 5.2, status: 'warning' },
  { province: 'Sóc Trăng', salinity: 4.8, status: 'warning' },
  { province: 'Cà Mau', salinity: 7.2, status: 'danger' },
  { province: 'Kiên Giang', salinity: 3.2, status: 'safe' },
  { province: 'An Giang', salinity: 2.8, status: 'safe' },
  { province: 'Đồng Tháp', salinity: 3.5, status: 'safe' },
  { province: 'Vĩnh Long', salinity: 4.5, status: 'warning' },
  { province: 'Cần Thơ', salinity: 3.8, status: 'safe' },
  { province: 'Hậu Giang', salinity: 3.6, status: 'safe' },
  { province: 'Bạc Liêu', salinity: 6.5, status: 'danger' },
  { province: 'Long An', salinity: 2.5, status: 'safe' },
  { province: 'Tiền Giang', salinity: 3.0, status: 'safe' },
];
