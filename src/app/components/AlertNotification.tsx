import { useState, useEffect } from "react";
import { Bell, X, AlertTriangle, Droplets, Info } from "lucide-react";

interface AlertNotificationProps {
  province: string;
  salinity: number | null;
  latestDate?: string | null;
  latestStation?: string | null;
}

interface SalinitySolution {
  level: "safe" | "warning" | "danger";
  color: string;
  iconColor: string;
  title: string;
  message: string;
  solutions: string[];
}

const getSalinitySolutions = (
  salinity: number | null,
  province: string,
): SalinitySolution | null => {
  if (salinity === null) return null;

  // Ngưỡng độ mặn (g/l)
  // < 4: An toàn
  // 4-8: Cảnh báo
  // > 8: Nguy hiểm

  if (salinity < 4) {
    // Không có cảnh báo
    return null;
  } else if (salinity >= 4 && salinity < 8) {
    // Cảnh báo vừa
    return {
      level: "warning",
      color: "bg-yellow-50 border-yellow-200 text-yellow-800",
      iconColor: "text-yellow-600",
      title: `Cảnh báo độ mặn vừa tại ${province}`,
      message: `Độ mặn hiện tại đạt ${salinity} g/l, đang ở mức cảnh báo. Cần theo dõi và có biện pháp phòng ngừa.`,
      solutions: [
        "Giảm lượng nước tưới trong thời gian này",
        "Chọn giống cây trồng chịu mặn như lúa OM18, ST25",
        "Kiểm tra nguồn nước tưới thường xuyên",
        "Sử dụng hệ thống tưới nhỏ giọt để tiết kiệm nước",
        "Theo dõi dự báo độ mặn hàng ngày",
        "Bổ sung phân hữu cơ để cải tạo đất",
      ],
    };
  } else {
    // Nguy hiểm cao
    return {
      level: "danger",
      color: "bg-red-50 border-red-200 text-red-800",
      iconColor: "text-red-600",
      title: `Cảnh báo độ mặn nguy hiểm tại ${province}`,
      message: `Độ mặn hiện tại đạt ${salinity} g/l, đã vượt ngưỡng an toàn. Cần có hành động khẩn cấp!`,
      solutions: [
        "NGỪNG canh tác lúa nước ngay lập tức",
        "Chuyển đổi sang cây trồng chịu mặn: dừa, tôm, cua",
        "Tìm nguồn nước ngọt thay thế từ kênh khác",
        "Xây dựng đập ngăn mặn tạm thời",
        "Liên hệ Chi cục Thủy lợi địa phương ngay",
        "Cân nhắc chuyển sang mô hình tôm - lúa luân canh",
        "Đăng ký hỗ trợ từ chương trình của chính phủ",
        "Rửa mặn đất bằng nước ngọt nếu có điều kiện",
      ],
    };
  }
};

export function AlertNotification({
  province,
  salinity,
  latestDate,
  latestStation,
}: AlertNotificationProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [alert, setAlert] = useState<SalinitySolution | null>(null);

  useEffect(() => {
    const solution = getSalinitySolutions(salinity, province);
    setAlert(solution);
  }, [salinity, province]);

  // Không hiển thị nút nếu không có cảnh báo
  if (!alert) {
    return null;
  }

  return (
    <>
      {/* Alert Button - Fixed position on right */}
      <button
        onClick={() => setIsOpen(true)}
        className={`fixed top-65 right-4 z-40 ${
          alert.level === "danger"
            ? "bg-gradient-to-br from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 animate-bounce"
            : "bg-gradient-to-br from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 animate-pulse"
        } text-white p-3 rounded-full shadow-lg hover:shadow-xl transition-all duration-300`}
        title="Cảnh báo độ mặn"
      >
        <Bell className="w-6 h-6" />
        <span className="absolute -top-1 -right-1 bg-white text-red-600 text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center border-2 border-red-600 shadow-md">
          !
        </span>
      </button>

      {/* Alert Modal */}
      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-end p-4 bg-black/50 backdrop-blur-sm"
          onClick={() => setIsOpen(false)}
        >
          <div
            className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col mt-16"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div
              className={`${
                alert.level === "danger"
                  ? "bg-gradient-to-r from-red-500 to-red-600"
                  : "bg-gradient-to-r from-yellow-500 to-orange-500"
              } text-white p-4 flex items-center justify-between`}
            >
              <div className="flex items-center gap-3">
                <Droplets className="w-6 h-6" />
                <div>
                  <h2 className="text-lg font-bold">Cảnh báo độ mặn</h2>
                  <p className="text-sm opacity-90">{province}</p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 hover:bg-white/20 rounded-lg transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Alert Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {/* Main Alert Card */}
              <div className={`border-2 rounded-xl p-5 mb-6 ${alert.color}`}>
                <div className="flex gap-4">
                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-lg mb-2">{alert.title}</h3>
                    <p className="text-sm leading-relaxed mb-3">
                      {alert.message}
                    </p>

                    {/* Salinity Details */}
                    <div className="bg-white/50 rounded-lg p-3 space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="font-medium">Tỉnh/Thành:</span>
                        <span className="font-bold">{province}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-medium">Độ mặn:</span>
                        <span className="font-bold">{salinity} g/l</span>
                      </div>
                      {latestDate && (
                        <div className="flex justify-between">
                          <span className="font-medium">Cập nhật:</span>
                          <span>
                            {new Date(latestDate).toLocaleDateString("vi-VN", {
                              day: "2-digit",
                              month: "2-digit",
                              year: "numeric",
                            })}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Solutions Section */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <h4 className="font-bold text-gray-900 text-lg">
                    Giải pháp xử lý
                  </h4>
                </div>

                <div className="space-y-3">
                  {alert.solutions.map((solution, index) => (
                    <div
                      key={index}
                      className="flex gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-bold">
                        {index + 1}
                      </div>
                      <p className="text-sm text-gray-700 leading-relaxed flex-1">
                        {solution}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="border-t p-4 bg-gray-50 flex gap-3">
              <button
                onClick={() => setIsOpen(false)}
                className="flex-1 px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg font-medium transition-colors"
              >
                Đã hiểu
              </button>
              <button
                onClick={() => {
                  // TODO: Navigate to salinity page for more details
                  setIsOpen(false);
                }}
                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
              >
                Xem chi tiết
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
