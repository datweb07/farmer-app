import { Building2, Users, TrendingUp, Award, Mail, Phone, MapPin } from 'lucide-react';
import { InvestmentProjectCard } from '../components/InvestmentProjectCard';
import { StatsCard } from '../components/StatsCard';
import { investmentProjects, overallStats } from '../../data/mockData';

export function InvestPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-8 mb-8 text-white shadow-xl">
          <h1 className="text-3xl md:text-4xl font-bold mb-2 flex items-center gap-3">
            <span className="text-4xl">💰</span>
            Đầu tư & Hợp tác phát triển bền vững
          </h1>
          <p className="text-lg opacity-90">Kết nối nhà đầu tư - Doanh nghiệp - Tổ chức khoa học - Nông dân</p>
        </div>

        {/* Impact Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatsCard
            title="Nông dân tham gia"
            value={overallStats.totalFarmers.toLocaleString('vi-VN')}
            icon={Users}
            color="blue"
            subtitle="Đang hoạt động"
          />
          <StatsCard
            title="Diện tích ảnh hưởng"
            value={`${overallStats.affectedArea.toLocaleString('vi-VN')} ha`}
            icon={MapPin}
            color="green"
            subtitle="Đồng Bằng Sông Cửu Long"
          />
          <StatsCard
            title="Dự án đang triển khai"
            value={overallStats.activeProjects}
            icon={TrendingUp}
            color="purple"
            subtitle="Cần hỗ trợ"
          />
          <StatsCard
            title="Tỷ lệ thành công"
            value={`${overallStats.successRate}%`}
            icon={Award}
            color="orange"
            subtitle="Các dự án đã hoàn thành"
          />
        </div>

        {/* Why Invest Section */}
        <div className="bg-white rounded-2xl shadow-lg p-8 mb-8 border-2 border-indigo-100">
          <h2 className="font-bold text-2xl text-gray-900 mb-6 flex items-center gap-3">
            <span className="text-3xl">🎯</span>
            Tại sao nên đầu tư vào nông nghiệp ĐBSCL?
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6 border-2 border-blue-200">
              <div className="text-4xl mb-3">🌾</div>
              <h3 className="font-bold text-lg text-gray-900 mb-2">Tiềm năng lớn</h3>
              <p className="text-gray-700">
                ĐBSCL là vựa lúa của Việt Nam, chiếm 50% sản lượng lúa cả nước
              </p>
            </div>
            <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-6 border-2 border-green-200">
              <div className="text-4xl mb-3">📈</div>
              <h3 className="font-bold text-lg text-gray-900 mb-2">ROI hấp dẫn</h3>
              <p className="text-gray-700">
                Thu nhập nông dân tăng trung bình 35% sau khi áp dụng công nghệ
              </p>
            </div>
            <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-6 border-2 border-purple-200">
              <div className="text-4xl mb-3">🤝</div>
              <h3 className="font-bold text-lg text-gray-900 mb-2">Tác động xã hội</h3>
              <p className="text-gray-700">
                Giúp đỡ hàng chục nghìn nông dân vượt qua khó khăn xâm nhập mặn
              </p>
            </div>
          </div>
        </div>

        {/* Investment Projects */}
        <div className="mb-8">
          <h2 className="font-bold text-2xl text-gray-900 mb-6 flex items-center gap-3">
            <span className="text-3xl">💼</span>
            Các dự án đang kêu gọi đầu tư
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {investmentProjects.map((project) => (
              <InvestmentProjectCard key={project.id} project={project} />
            ))}
          </div>
        </div>

        {/* Partner Types */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* For Investors */}
          <div className="bg-white rounded-2xl shadow-lg p-6 border-2 border-blue-100">
            <div className="bg-blue-100 w-16 h-16 rounded-2xl flex items-center justify-center mb-4">
              <TrendingUp className="w-8 h-8 text-blue-600" />
            </div>
            <h3 className="font-bold text-xl text-gray-900 mb-3">Nhà đầu tư</h3>
            <p className="text-gray-700 mb-4">
              Tìm kiếm cơ hội đầu tư sinh lợi và tạo tác động xã hội tích cực
            </p>
            <ul className="space-y-2 text-sm text-gray-600 mb-4">
              <li className="flex items-start gap-2">
                <span className="text-blue-500">•</span>
                <span>Báo cáo minh bạch hàng tháng</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-500">•</span>
                <span>Giám sát tiến độ trực tuyến</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-500">•</span>
                <span>Ưu đãi thuế cho đầu tư nông nghiệp</span>
              </li>
            </ul>
            <button className="w-full bg-blue-500 text-white py-3 rounded-xl font-bold hover:bg-blue-600 transition-colors">
              Tìm hiểu thêm
            </button>
          </div>

          {/* For Businesses */}
          <div className="bg-white rounded-2xl shadow-lg p-6 border-2 border-green-100">
            <div className="bg-green-100 w-16 h-16 rounded-2xl flex items-center justify-center mb-4">
              <Building2 className="w-8 h-8 text-green-600" />
            </div>
            <h3 className="font-bold text-xl text-gray-900 mb-3">Doanh nghiệp</h3>
            <p className="text-gray-700 mb-4">
              Hợp tác cùng phát triển chuỗi giá trị nông sản bền vững
            </p>
            <ul className="space-y-2 text-sm text-gray-600 mb-4">
              <li className="flex items-start gap-2">
                <span className="text-green-500">•</span>
                <span>Nguồn nguyên liệu ổn định</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-500">•</span>
                <span>Kết nối 48,500+ nông dân</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-500">•</span>
                <span>Hỗ trợ chuyển đổi số nông nghiệp</span>
              </li>
            </ul>
            <button className="w-full bg-green-500 text-white py-3 rounded-xl font-bold hover:bg-green-600 transition-colors">
              Đăng ký hợp tác
            </button>
          </div>

          {/* For Research */}
          <div className="bg-white rounded-2xl shadow-lg p-6 border-2 border-purple-100">
            <div className="bg-purple-100 w-16 h-16 rounded-2xl flex items-center justify-center mb-4">
              <Award className="w-8 h-8 text-purple-600" />
            </div>
            <h3 className="font-bold text-xl text-gray-900 mb-3">Tổ chức Khoa học - Kỹ thuật</h3>
            <p className="text-gray-700 mb-4">
              Triển khai nghiên cứu, thử nghiệm mô hình mới tại vùng thực tế
            </p>
            <ul className="space-y-2 text-sm text-gray-600 mb-4">
              <li className="flex items-start gap-2">
                <span className="text-purple-500">•</span>
                <span>Dữ liệu thực tế từ nông dân</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-purple-500">•</span>
                <span>Cộng đồng sẵn sàng thử nghiệm</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-purple-500">•</span>
                <span>Hỗ trợ transfer công nghệ</span>
              </li>
            </ul>
            <button className="w-full bg-purple-500 text-white py-3 rounded-xl font-bold hover:bg-purple-600 transition-colors">
              Liên hệ hợp tác
            </button>
          </div>
        </div>

        {/* Contact Form */}
        <div className="bg-white rounded-2xl shadow-lg p-8 border-2 border-gray-100">
          <h2 className="font-bold text-2xl text-gray-900 mb-6 flex items-center gap-3">
            <span className="text-3xl">📞</span>
            Liên hệ với chúng tôi
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-gray-700 font-bold mb-2">Họ và tên *</label>
              <input
                type="text"
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none"
                placeholder="Nguyễn Văn A"
              />
            </div>
            <div>
              <label className="block text-gray-700 font-bold mb-2">Số điện thoại *</label>
              <input
                type="tel"
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none"
                placeholder="0912345678"
              />
            </div>
            <div>
              <label className="block text-gray-700 font-bold mb-2">Email *</label>
              <input
                type="email"
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none"
                placeholder="email@example.com"
              />
            </div>
            <div>
              <label className="block text-gray-700 font-bold mb-2">Loại hình hợp tác *</label>
              <select className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none">
                <option>Nhà đầu tư</option>
                <option>Doanh nghiệp</option>
                <option>Tổ chức Khoa học - Kỹ thuật</option>
                <option>Khác</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-gray-700 font-bold mb-2">Nội dung *</label>
              <textarea
                rows={5}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none"
                placeholder="Vui lòng mô tả ý tưởng hợp tác của bạn..."
              />
            </div>
          </div>
          <button className="mt-6 w-full md:w-auto bg-gradient-to-r from-indigo-500 to-purple-500 text-white px-12 py-4 rounded-xl font-bold text-lg hover:scale-105 transition-transform shadow-lg">
            Gửi yêu cầu hợp tác
          </button>
        </div>

        {/* Direct Contact */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-6 text-white">
            <Phone className="w-10 h-10 mb-3" />
            <h3 className="font-bold text-lg mb-2">Hotline</h3>
            <p className="text-2xl font-bold">1800-2468</p>
            <p className="text-sm opacity-90 mt-1">8:00 - 20:00 hàng ngày</p>
          </div>
          <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-2xl p-6 text-white">
            <Mail className="w-10 h-10 mb-3" />
            <h3 className="font-bold text-lg mb-2">Email</h3>
            <p className="text-lg font-bold">uehstudent.edu.vn</p>
            <p className="text-sm opacity-90 mt-1">Phản hồi trong 24h</p>
          </div>
          <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl p-6 text-white">
            <MapPin className="w-10 h-10 mb-3" />
            <h3 className="font-bold text-lg mb-2">Văn phòng</h3>
            <p className="font-bold">Long An, Việt Nam</p>
            <p className="text-sm opacity-90 mt-1">Đồng Bằng Sông Cửu Long</p>
          </div>
        </div>

        {/* Mission Statement */}
        <div className="mt-8 bg-gradient-to-r from-green-600 to-blue-600 rounded-2xl p-8 text-white text-center shadow-xl">
          <h2 className="font-bold text-3xl mb-4">🌱 Sứ mệnh của chúng tôi</h2>
          <p className="text-xl leading-relaxed max-w-4xl mx-auto">
            Ứng dụng công nghệ để giúp nông dân Đồng Bằng Sông Cửu Long vượt qua thách thức xâm nhập mặn, 
            nâng cao thu nhập và phát triển nông nghiệp bền vững. 
            Kết nối các bên liên quan để tạo ra giá trị chung cho cộng đồng.
          </p>
        </div>
      </div>
    </div>
  );
}
