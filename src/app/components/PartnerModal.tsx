import { useState } from "react";
import { TrendingUp, Building2, Award, CheckCircle } from "lucide-react";
import { Modal } from "./Modal";
import { submitContactRequest } from "../../lib/contact/contact.service";
import type { ContactRequest } from "../../lib/investments/types";

interface PartnerModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: "investor" | "business" | "research";
}

export function PartnerModal({ isOpen, onClose, type }: PartnerModalProps) {
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phone: "",
    message: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const content = {
    investor: {
      icon: TrendingUp,
      title: "Dành cho Nhà đầu tư",
      benefits: [
        "Báo cáo minh bạch hàng tháng về tiến độ dự án",
        "Giám sát trực tuyến 24/7 qua dashboard",
        "Ưu đãi thuế cho đầu tư vào nông nghiệp",
        "Tác động xã hội tích cực, hỗ trợ nông dân ĐBSCL",
        "ROI hấp dẫn với mức tăng trưởng bền vững",
      ],
    },
    business: {
      icon: Building2,
      title: "Dành cho Doanh nghiệp",
      benefits: [
        "Nguồn nguyên liệu ổn định, chất lượng cao",
        "Kết nối trực tiếp với 48,500+ nông dân",
        "Hỗ trợ chuyển đổi số trong nông nghiệp",
        "Xây dựng chuỗi giá trị bền vững",
        "Nâng cao thương hiệu với trách nhiệm xã hội",
      ],
    },
    research: {
      icon: Award,
      title: "Dành cho Tổ chức Khoa học - Kỹ thuật",
      benefits: [
        "Dữ liệu thực tế từ 125,000 ha đất canh tác",
        "Cộng đồng nông dân sẵn sàng thử nghiệm",
        "Hỗ trợ chuyển giao công nghệ đến nông dân",
        "Phòng thí nghiệm thực địa quy mô lớn",
        "Tác động trực tiếp đến cuộc sống nông dân",
      ],
    },
  };

  const config = content[type];
  const Icon = config.icon;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (
      !formData.fullName ||
      !formData.email ||
      !formData.phone ||
      !formData.message
    ) {
      setError("Vui lòng điền đầy đủ thông tin");
      return;
    }

    setSubmitting(true);

    const requestData: ContactRequest = {
      full_name: formData.fullName,
      email: formData.email,
      phone_number: formData.phone,
      partnership_type: type,
      message: formData.message,
    };

    const result = await submitContactRequest(requestData);
    setSubmitting(false);

    if (result.success) {
      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
        onClose();
        setFormData({
          fullName: "",
          email: "",
          phone: "",
          message: "",
        });
      }, 2000);
    } else {
      setError(result.error || "Không thể gửi yêu cầu");
    }
  };

  if (showSuccess) {
    return (
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title="Thành công!"
        maxWidth="md"
      >
        <div className="text-center py-6">
          <CheckCircle className="w-12 h-12 text-blue-600 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-gray-900 mb-1">
            Đã gửi yêu cầu!
          </h3>
          <p className="text-gray-600 text-sm">
            Cảm ơn bạn đã quan tâm. Chúng tôi sẽ liên hệ với bạn trong vòng 24
            giờ.
          </p>
        </div>
      </Modal>
    );
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={config.title} maxWidth="xl">
      {/* Header */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
        <div className="flex items-start gap-3 mb-3">
          <div className="w-10 h-10 bg-blue-100 rounded flex items-center justify-center flex-shrink-0">
            <Icon className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Tại sao hợp tác với chúng tôi?
            </h3>
            <ul className="space-y-1">
              {config.benefits.map((benefit, index) => (
                <li key={index} className="flex items-start gap-2 text-sm">
                  <span className="text-blue-600 mt-0.5">•</span>
                  <span className="text-gray-700">{benefit}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Contact Form */}
      <form onSubmit={handleSubmit} className="space-y-3">
        <h4 className="font-medium text-gray-900 text-sm">
          Để lại thông tin liên hệ
        </h4>

        <div>
          <label className="block text-gray-700 font-medium mb-1 text-sm">
            Họ và tên *
          </label>
          <input
            type="text"
            value={formData.fullName}
            onChange={(e) =>
              setFormData({ ...formData, fullName: e.target.value })
            }
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-blue-600 focus:outline-none"
            placeholder="Nguyễn Văn A"
            disabled={submitting}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-gray-700 font-medium mb-1 text-sm">
              Email *
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) =>
                setFormData({ ...formData, email: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-blue-600 focus:outline-none"
              placeholder="email@example.com"
              disabled={submitting}
            />
          </div>
          <div>
            <label className="block text-gray-700 font-medium mb-1 text-sm">
              Số điện thoại *
            </label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) =>
                setFormData({ ...formData, phone: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-blue-600 focus:outline-none"
              placeholder="0912345678"
              disabled={submitting}
            />
          </div>
        </div>

        <div>
          <label className="block text-gray-700 font-medium mb-1 text-sm">
            Nội dung *
          </label>
          <textarea
            value={formData.message}
            onChange={(e) =>
              setFormData({ ...formData, message: e.target.value })
            }
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-blue-600 focus:outline-none resize-none"
            placeholder="Mô tả ý tưởng hợp tác của bạn..."
            disabled={submitting}
          />
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-2">
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-blue-600 text-white px-3 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting ? (
            <div className="flex items-center justify-center gap-2">
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span className="text-sm">Đang gửi...</span>
            </div>
          ) : (
            <span className="text-sm">Gửi yêu cầu hợp tác</span>
          )}
        </button>
      </form>
    </Modal>
  );
}
