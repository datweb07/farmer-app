import { useState } from 'react';
import { X, ChevronRight, ChevronLeft } from 'lucide-react';

interface TutorialProps {
  onClose: () => void;
}

export function Tutorial({ onClose }: TutorialProps) {
  const [currentStep, setCurrentStep] = useState(0);

  const steps = [
    {
      title: 'Chào mừng đến với nền tảng',
      description: 'Hệ thống hỗ trợ nông dân ĐBSCL với giao diện đơn giản, dễ sử dụng',
      tips: [
        'Thông tin hiển thị bằng tiếng Việt dễ hiểu',
        'Các nút to, dễ bấm trên điện thoại',
        'Màu sắc rõ ràng: Xanh (an toàn), Vàng (cảnh báo), Đỏ (nguy hiểm)',
      ],
    },
    {
      title: 'Theo dõi độ mặn',
      description: 'Xem dự báo xâm nhập mặn 7-14 ngày',
      tips: [
        'Kiểm tra biểu đồ độ mặn mỗi ngày',
        'Đọc phần khuyến nghị màu sắc',
        'Làm theo hướng dẫn cụ thể',
        'Chia sẻ với hàng xóm',
      ],
    },
    {
      title: 'Học hỏi từ cộng đồng',
      description: 'Đọc và chia sẻ kinh nghiệm canh tác',
      tips: [
        'Đọc bài viết kinh nghiệm từ nông dân khác',
        'Đăng bài để nhận điểm uy tín',
        'Like và comment để tương tác',
      ],
    },
    {
      title: 'Mua bán thiết bị',
      description: 'Tìm và mua thiết bị hỗ trợ canh tác',
      tips: [
        'Xem thông tin sản phẩm chi tiết',
        'Kiểm tra điểm uy tín người bán',
        'Liên hệ trực tiếp qua số điện thoại',
      ],
    },
    {
      title: 'Tìm nguồn vốn đầu tư',
      description: 'Kết nối với nhà đầu tư và doanh nghiệp',
      tips: [
        'Xem các dự án đang kêu gọi vốn',
        'Tham gia các chương trình hỗ trợ',
        'Kết nối với doanh nghiệp',
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
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-md w-full shadow-xl border border-gray-200">
        {/* Header */}
        <div className="p-6 border-b border-gray-100">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">{step.title}</h2>
              <p className="text-gray-600 mt-1">{step.description}</p>
            </div>
            <button
              onClick={handleSkip}
              className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-1.5 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Progress */}
          <div className="flex items-center gap-2">
            {steps.map((_, index) => (
              <div
                key={index}
                className={`flex-1 h-1.5 rounded-full ${index === currentStep
                  ? 'bg-blue-500'
                  : index < currentStep
                    ? 'bg-blue-300'
                    : 'bg-gray-200'
                  }`}
              />
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="space-y-4 mb-8">
            {step.tips.map((tip, index) => (
              <div key={index} className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center text-sm font-medium flex-shrink-0 mt-0.5">
                  {index + 1}
                </div>
                <p className="text-gray-700">{tip}</p>
              </div>
            ))}
          </div>

          {/* Navigation */}
          <div className="flex gap-3">
            <button
              onClick={handlePrev}
              disabled={currentStep === 0}
              className={`flex-1 py-2.5 rounded-lg font-medium transition-colors ${currentStep === 0
                ? 'text-gray-400 cursor-not-allowed'
                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
            >
              <div className="flex items-center justify-center gap-1">
                <ChevronLeft className="w-4 h-4" />
                Quay lại
              </div>
            </button>

            {currentStep < steps.length - 1 ? (
              <button
                onClick={handleNext}
                className="flex-1 bg-blue-500 text-white py-2.5 rounded-lg font-medium hover:bg-blue-600 transition-colors"
              >
                <div className="flex items-center justify-center gap-1">
                  Tiếp theo
                  <ChevronRight className="w-4 h-4" />
                </div>
              </button>
            ) : (
              <button
                onClick={handleSkip}
                className="flex-1 bg-blue-500 text-white py-2.5 rounded-lg font-medium hover:bg-blue-600 transition-colors"
              >
                Bắt đầu sử dụng
              </button>
            )}
          </div>

          <button
            onClick={handleSkip}
            className="w-full text-center text-gray-500 hover:text-gray-700 py-3 text-sm hover:bg-gray-50 rounded-lg transition-colors"
          >
            Bỏ qua hướng dẫn
          </button>
        </div>
      </div>
    </div>
  );
}