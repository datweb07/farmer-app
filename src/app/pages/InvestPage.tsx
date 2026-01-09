import { useState, useEffect } from 'react';
import {
  Building2,
  Users,
  TrendingUp,
  Award,
  Mail,
  Phone,
  MapPin,
  Plus,

  Loader2,
} from "lucide-react";
import { InvestmentProjectCard } from "../components/InvestmentProjectCard";
import { StatsCard } from "../components/StatsCard";
import { PartnerModal } from "../components/PartnerModal";
import { ProjectLeaderboard } from "../components/ProjectLeaderboard";
import { getProjects, getOverallStats, type OverallStats } from "../../lib/investments/investments.service";
import type { InvestmentProjectWithStats } from "../../lib/investments/types";
import { useAuth } from "../../contexts/AuthContext";

interface InvestPageProps {
  onNavigate?: (page: string) => void;
  onEditProject?: (projectId: string) => void;
}

export function InvestPage({ onNavigate, onEditProject }: InvestPageProps) {
  const { user } = useAuth();
  const [projects, setProjects] = useState<InvestmentProjectWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [partnerModalType, setPartnerModalType] = useState<'investor' | 'business' | 'research' | null>(null);
  const [stats, setStats] = useState<OverallStats>({
    totalFarmers: 0,
    affectedArea: 0,
    activeProjects: 0,
    successRate: 0,
  });

  // Load projects and stats
  useEffect(() => {
    loadProjects();
    loadStats();
  }, []);

  const loadProjects = async () => {
    setLoading(true);
    const result = await getProjects({ limit: 50 });
    if (!result.error) {
      setProjects(result.projects);
    }
    setLoading(false);
  };

  const loadStats = async () => {
    const result = await getOverallStats();
    if (result.stats) {
      setStats(result.stats);
    }
  };



  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="bg-white border border-gray-200 rounded-lg p-6 mb-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-4 gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-semibold text-gray-900 mb-2">
                Đầu tư & Hợp tác phát triển bền vững
              </h1>
              <p className="text-gray-600">
                Kết nối nhà đầu tư - Doanh nghiệp - Tổ chức khoa học - Nông dân
              </p>
            </div>
            {user && (
              <button
                onClick={() => onNavigate?.('create-project')}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Tạo dự án
              </button>
            )}
          </div>
        </div>

        {/* Impact Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatsCard
            title="Nông dân tham gia"
            value={stats.totalFarmers.toLocaleString("vi-VN")}
            icon={Users}
            color="blue"
            subtitle="Được hưởng lợi"
          />
          <StatsCard
            title="Diện tích ảnh hưởng"
            value={`${stats.affectedArea.toLocaleString("vi-VN")} ha`}
            icon={MapPin}
            color="blue"
            subtitle="Đồng Bằng Sông Cửu Long"
          />
          <StatsCard
            title="Dự án đang triển khai"
            value={stats.activeProjects}
            icon={TrendingUp}
            color="blue"
            subtitle="Cần hỗ trợ"
          />
          <StatsCard
            title="Tỷ lệ thành công"
            value={`${stats.successRate}%`}
            icon={Award}
            color="blue"
            subtitle="Các dự án đã hoàn thành"
          />
        </div>

        {/* Why Invest Section */}
        <div className="bg-white border border-gray-200 rounded-lg p-6 mb-8">
          <h2 className="font-semibold text-xl text-gray-900 mb-6">
            Tại sao nên đầu tư vào nông nghiệp ĐBSCL?
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="border border-gray-200 rounded-lg p-4">
              <h3 className="font-semibold text-lg text-gray-900 mb-2">
                Tiềm năng lớn
              </h3>
              <p className="text-gray-700 text-sm">
                ĐBSCL là vựa lúa của Việt Nam, chiếm 50% sản lượng lúa cả nước
              </p>
            </div>
            <div className="border border-gray-200 rounded-lg p-4">
              <h3 className="font-semibold text-lg text-gray-900 mb-2">
                ROI hấp dẫn
              </h3>
              <p className="text-gray-700 text-sm">
                Thu nhập nông dân tăng trung bình 35% sau khi áp dụng công nghệ
              </p>
            </div>
            <div className="border border-gray-200 rounded-lg p-4">
              <h3 className="font-semibold text-lg text-gray-900 mb-2">
                Tác động xã hội
              </h3>
              <p className="text-gray-700 text-sm">
                Giúp đỡ hàng chục nghìn nông dân vượt qua khó khăn xâm nhập mặn
              </p>
            </div>
          </div>
        </div>

        {/* Leaderboard Section */}
        <div className="mb-8">
          <h2 className="font-semibold text-xl text-gray-900 mb-4">
            Bảng xếp hạng dự án
          </h2>
          <ProjectLeaderboard limit={10} />
        </div>

        {/* Investment Projects */}
        <div className="mb-8">
          <h2 className="font-semibold text-xl text-gray-900 mb-6">
            Các dự án đang kêu gọi đầu tư
          </h2>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
          ) : projects.length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {projects.map((project) => (
                <InvestmentProjectCard
                  key={project.id}
                  project={project}
                  onUpdate={loadProjects}
                  onEdit={onEditProject}
                />
              ))}
            </div>
          ) : (
            <div className="bg-white border border-gray-200 rounded-lg p-8 text-center">
              <p className="text-gray-600">
                Chưa có dự án nào đang kêu gọi đầu tư
              </p>
              {user && (
                <button
                  onClick={() => onNavigate?.('create-project')}
                  className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors"
                >
                  Tạo dự án đầu tiên
                </button>
              )}
            </div>
          )}
        </div>

        {/* Partner Types */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* For Investors */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <div className="bg-blue-50 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
              <TrendingUp className="w-6 h-6 text-blue-600" />
            </div>
            <h3 className="font-semibold text-lg text-gray-900 mb-3">Nhà đầu tư</h3>
            <p className="text-gray-700 text-sm mb-4">
              Tìm kiếm cơ hội đầu tư sinh lợi và tạo tác động xã hội tích cực
            </p>
            <ul className="space-y-1 text-sm text-gray-600 mb-4">
              <li className="flex items-start gap-2">
                <span className="text-blue-600 mt-0.5">•</span>
                <span>Báo cáo minh bạch hàng tháng</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 mt-0.5">•</span>
                <span>Giám sát tiến độ trực tuyến</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 mt-0.5">•</span>
                <span>Ưu đãi thuế cho đầu tư nông nghiệp</span>
              </li>
            </ul>
            <button
              onClick={() => setPartnerModalType('investor')}
              className="w-full bg-blue-600 text-white py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              Tìm hiểu thêm
            </button>
          </div>

          {/* For Businesses */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <div className="bg-blue-50 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
              <Building2 className="w-6 h-6 text-blue-600" />
            </div>
            <h3 className="font-semibold text-lg text-gray-900 mb-3">
              Doanh nghiệp
            </h3>
            <p className="text-gray-700 text-sm mb-4">
              Hợp tác cùng phát triển chuỗi giá trị nông sản bền vững toàn diện
            </p>
            <ul className="space-y-1 text-sm text-gray-600 mb-4">
              <li className="flex items-start gap-2">
                <span className="text-blue-600 mt-0.5">•</span>
                <span>Nguồn nguyên liệu ổn định</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 mt-0.5">•</span>
                <span>Kết nối 48,500+ nông dân</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 mt-0.5">•</span>
                <span>Hỗ trợ chuyển đổi số nông nghiệp</span>
              </li>
            </ul>
            <button
              onClick={() => setPartnerModalType('business')}
              className="w-full bg-blue-600 text-white py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              Đăng ký hợp tác
            </button>
          </div>

          {/* For Research */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <div className="bg-blue-50 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
              <Award className="w-6 h-6 text-blue-600" />
            </div>
            <h3 className="font-semibold text-lg text-gray-900 mb-3">
              Tổ chức Khoa học - Kỹ thuật
            </h3>
            <p className="text-gray-700 text-sm mb-4">
              Triển khai nghiên cứu, thử nghiệm mô hình mới tại vùng thực tế
            </p>
            <ul className="space-y-1 text-sm text-gray-600 mb-4">
              <li className="flex items-start gap-2">
                <span className="text-blue-600 mt-0.5">•</span>
                <span>Dữ liệu thực tế từ nông dân</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 mt-0.5">•</span>
                <span>Cộng đồng sẵn sàng thử nghiệm</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 mt-0.5">•</span>
                <span>Hỗ trợ transfer công nghệ</span>
              </li>
            </ul>
            <button
              onClick={() => setPartnerModalType('research')}
              className="w-full bg-blue-600 text-white py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              Liên hệ hợp tác
            </button>
          </div>
        </div>

        {/* Contact Form
        <div className="bg-white border border-gray-200 rounded-lg p-6 mb-8">
          <h2 className="font-semibold text-xl text-gray-900 mb-6">
            Liên hệ với chúng tôi
          </h2>

          {contactSuccess && (
            <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-blue-600" />
              <p className="text-blue-700">
                Đã gửi yêu cầu thành công! Chúng tôi sẽ liên hệ với bạn sớm nhất.
              </p>
            </div>
          )}

          <form onSubmit={handleContactSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-gray-700 font-medium mb-1">
                  Họ và tên *
                </label>
                <input
                  type="text"
                  value={contactForm.fullName}
                  onChange={(e) => setContactForm({ ...contactForm, fullName: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-blue-600 focus:outline-none"
                  placeholder="Nguyễn Văn A"
                  disabled={submittingContact}
                />
              </div>
              <div>
                <label className="block text-gray-700 font-medium mb-1">
                  Số điện thoại *
                </label>
                <input
                  type="tel"
                  value={contactForm.phone}
                  onChange={(e) => setContactForm({ ...contactForm, phone: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-blue-600 focus:outline-none"
                  placeholder="0912345678"
                  disabled={submittingContact}
                />
              </div>
              <div>
                <label className="block text-gray-700 font-medium mb-1">
                  Email *
                </label>
                <input
                  type="email"
                  value={contactForm.email}
                  onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-blue-600 focus:outline-none"
                  placeholder="email@example.com"
                  disabled={submittingContact}
                />
              </div>
              <div>
                <label className="block text-gray-700 font-medium mb-1">
                  Loại hình hợp tác *
                </label>
                <select
                  value={contactForm.partnershipType}
                  onChange={(e) => setContactForm({ ...contactForm, partnershipType: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-blue-600 focus:outline-none"
                  disabled={submittingContact}
                >
                  <option value="investor">Nhà đầu tư</option>
                  <option value="business">Doanh nghiệp</option>
                  <option value="research">Tổ chức Khoa học - Kỹ thuật</option>
                  <option value="other">Khác</option>
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="block text-gray-700 font-medium mb-1">
                  Nội dung *
                </label>
                <textarea
                  rows={4}
                  value={contactForm.message}
                  onChange={(e) => setContactForm({ ...contactForm, message: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-blue-600 focus:outline-none resize-none"
                  placeholder="Vui lòng mô tả ý tưởng hợp tác của bạn..."
                  disabled={submittingContact}
                />
              </div>
            </div>

            {contactError && (
              <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-red-700">{contactError}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={submittingContact}
              className="mt-6 w-full bg-blue-600 text-white px-4 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {submittingContact ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Đang gửi...
                </>
              ) : (
                'Gửi yêu cầu hợp tác'
              )}
            </button>
          </form>
        </div> */}

        {/* Direct Contact */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <Phone className="w-6 h-6 text-blue-600 mb-2" />
            <h3 className="font-semibold text-gray-900 mb-1">Hotline</h3>
            <p className="text-lg font-semibold text-blue-600">1800-2468</p>
            <p className="text-sm text-gray-600 mt-1">8:00 - 20:00 hàng ngày</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <Mail className="w-6 h-6 text-blue-600 mb-2" />
            <h3 className="font-semibold text-gray-900 mb-1">Email</h3>
            <p className="text-lg font-semibold text-blue-600">ueh.edu.vn</p>
            <p className="text-sm text-gray-600 mt-1">Phản hồi trong 24h</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <MapPin className="w-6 h-6 text-blue-600 mb-2" />
            <h3 className="font-semibold text-gray-900 mb-1">Văn phòng</h3>
            <p className="font-semibold text-gray-900">Long An, Việt Nam</p>
            <p className="text-sm text-gray-600 mt-1">Đồng Bằng Sông Cửu Long</p>
          </div>
        </div>

        {/* Mission Statement */}
        <div className="bg-white border border-gray-200 rounded-lg p-6 text-center">
          <h2 className="font-semibold text-xl text-gray-900 mb-4">Sứ mệnh của chúng tôi</h2>
          <p className="text-gray-700">
            Ứng dụng công nghệ để giúp nông dân Đồng Bằng Sông Cửu Long vượt qua
            thách thức xâm nhập mặn, nâng cao thu nhập và phát triển nông nghiệp
            bền vững. Kết nối các bên liên quan để tạo ra giá trị chung cho cộng
            đồng.
          </p>
        </div>
      </div>

      {/* Partner Modal */}
      {partnerModalType && (
        <PartnerModal
          isOpen={true}
          onClose={() => setPartnerModalType(null)}
          type={partnerModalType}
        />
      )}
    </div>
  );
}