import { useState } from 'react';
import { X, ChevronRight, ChevronLeft } from 'lucide-react';

interface TutorialProps {
  onClose: () => void;
}

export function Tutorial({ onClose }: TutorialProps) {
  const [currentStep, setCurrentStep] = useState(0);

  const steps = [
    {
      title: 'Chào mừng đến với nền tảng! 👋',
      description: 'Hệ thống hỗ trợ nông dân ĐBSCL với giao diện đơn giản, dễ sử dụng',
      image: '🌾',
      tips: [
        'Tất cả thông tin hiển thị bằng tiếng Việt dễ hiểu',
        'Các nút to, dễ bấm trên cả điện thoại',
        'Màu sắc rõ ràng: Xanh (an toàn), Vàng (cảnh báo), Đỏ (nguy hiểm)',
      ],
    },
    {
      title: 'Theo dõi độ mặn 💧',
      description: 'Xem dự báo xâm nhập mặn 7-14 ngày',
      image: '📊',
      tips: [
        'Kiểm tra biểu đồ độ mặn mỗi ngày',
        'Đọc phần khuyến nghị màu sắc',
        'Làm theo hướng dẫn cụ thể',
        'Chia sẻ với hàng xóm',
      ],
    },
    {
      title: 'Học hỏi từ cộng đồng 👥',
      description: 'Đọc và chia sẻ kinh nghiệm canh tác',
      image: '💬',
      tips: [
        'Đọc bài viết kinh nghiệm từ nông dân khác',
        'Đăng bài để nhận điểm uy tín',
        'Like và comment để tương tác',
        'Càng nhiều điểm, càng được tin tưởng',
      ],
    },
    {
      title: 'Mua bán thiết bị 🛒',
      description: 'Tìm và mua thiết bị hỗ trợ canh tác',
      image: '📱',
      tips: [
        'Xem thông tin sản phẩm chi tiết',
        'Kiểm tra điểm uy tín người bán',
        'Liên hệ trực tiếp qua số điện thoại',
        'Hỏi kỹ trước khi mua',
      ],
    },
    {
      title: 'Tìm nguồn vốn đầu tư 💰',
      description: 'Kết nối với nhà đầu tư và doanh nghiệp',
      image: '🤝',
      tips: [
        'Xem các dự án đang kêu gọi vốn',
        'Tham gia các chương trình hỗ trợ',
        'Kết nối với doanh nghiệp',
        'Liên hệ để được tư vấn',
      ],
    },
  ];

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSkip = () => {
    onClose();
  };

  const step = steps[currentStep];

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-green-600 p-6 text-white relative">
          <button
            onClick={handleSkip}
            className="absolute top-4 right-4 bg-white/20 hover:bg-white/30 p-2 rounded-lg transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
          <div className="text-center mb-4">
            <span className="text-7xl">{step.image}</span>
          </div>
          <h2 className="text-2xl font-bold text-center mb-2">{step.title}</h2>
          <p className="text-center text-white/90">{step.description}</p>
        </div>

        {/* Content */}
        <div className="p-8">
          <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-6 mb-6">
            <h3 className="font-bold text-lg text-gray-900 mb-4">📝 Điều cần biết:</h3>
            <ul className="space-y-3">
              {step.tips.map((tip, index) => (
                <li key={index} className="flex items-start gap-3 text-gray-700">
                  <span className="bg-blue-500 text-white w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">
                    {index + 1}
                  </span>
                  <span className="pt-1">{tip}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Progress */}
          <div className="mb-6">
            <div className="flex justify-center gap-2">
              {steps.map((_, index) => (
                <div
                  key={index}
                  className={`h-2 rounded-full transition-all ${
                    index === currentStep
                      ? 'bg-blue-500 w-8'
                      : index < currentStep
                      ? 'bg-green-500 w-2'
                      : 'bg-gray-300 w-2'
                  }`}
                />
              ))}
            </div>
            <p className="text-center text-sm text-gray-600 mt-3">
              Bước {currentStep + 1} / {steps.length}
            </p>
          </div>

          {/* Navigation */}
          <div className="flex gap-3">
            <button
              onClick={handlePrev}
              disabled={currentStep === 0}
              className={`flex-1 py-3 rounded-xl font-bold flex items-center justify-center gap-2 ${
                currentStep === 0
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              <ChevronLeft className="w-5 h-5" />
              Quay lại
            </button>
            {currentStep < steps.length - 1 ? (
              <button
                onClick={handleNext}
                className="flex-1 bg-gradient-to-r from-blue-500 to-green-500 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:scale-105 transition-transform"
              >
                Tiếp theo
                <ChevronRight className="w-5 h-5" />
              </button>
            ) : (
              <button
                onClick={handleSkip}
                className="flex-1 bg-gradient-to-r from-green-500 to-blue-500 text-white py-3 rounded-xl font-bold hover:scale-105 transition-transform"
              >
                Bắt đầu sử dụng 🚀
              </button>
            )}
          </div>

          <button
            onClick={handleSkip}
            className="w-full mt-3 text-gray-500 hover:text-gray-700 py-2 text-sm"
          >
            Bỏ qua hướng dẫn
          </button>
        </div>
      </div>
    </div>
  );
}
