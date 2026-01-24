/**
 * Voice Button Component for Salinity Reading
 * Accessibility feature for elderly farmers
 */

import { Volume2, VolumeX } from "lucide-react";
import { useTextToSpeech } from "../../hooks/useTextToSpeech";

interface VoiceButtonProps {
  salinity: number | null;
  month: number;
  province: string;
  size?: "xs" | "sm" | "md" | "lg" | "xl"; // Thêm size "xl" cho người già
  variant?: "default" | "outline" | "ghost" | "elderly"; // Thêm variant cho người già
  className?: string;
}

export function VoiceButton({
  salinity,
  month,
  province,
  size = "md",
  variant = "default",
  className = "",
}: VoiceButtonProps) {
  const { speak, stop, isSpeaking, isSupported } = useTextToSpeech();

  if (!isSupported) {
    return null; // Hide button if browser doesn't support TTS
  }

  const handleClick = () => {
    if (isSpeaking) {
      stop();
      return;
    }

    if (salinity === null) {
      speak("Hiện tại chưa có dữ liệu độ mặn");
      return;
    }

    // Format the speech text
    const salinityText = salinity.toFixed(1).replace(".", " phẩy ");
    const monthName = getVietnameseMonth(month);
    const speechText = `Tháng ${monthName} ở tỉnh ${province} có độ mặn là ${salinityText} gam trên lít.`;

    // Speak with slower rate for elderly
    speak(speechText, { rate: 0.85 });
  };

  // Size classes - TĂNG KÍCH THƯỚC LÊN
  const sizeClasses = {
    xs: "w-8 h-8 p-1.5",
    sm: "w-12 h-12 p-2.5", // Tăng từ w-8 h-8
    md: "w-16 h-16 p-3", // Tăng từ w-10 h-10
    lg: "w-20 h-20 p-3.5", // Tăng từ w-12 h-12
    xl: "w-24 h-24 p-4", // Thêm size lớn cho người già
  };

  const iconSizes = {
    xs: "w-4 h-4",
    sm: "w-6 h-6", // Tăng từ w-4 h-4
    md: "w-8 h-8", // Tăng từ w-5 h-5
    lg: "w-10 h-10", // Tăng từ w-6 h-6
    xl: "w-12 h-12", // Icon rất to cho người già
  };

  // Variant classes - THÊM VARIANT DÀNH CHO NGƯỜI GIÀ
  const variantClasses = {
    default:
      "bg-blue-600 hover:bg-blue-700 text-white shadow-md hover:shadow-lg",
    outline: "bg-white hover:bg-blue-50 text-blue-600 border-2 border-blue-600",
    ghost: "bg-white/20 hover:bg-white/30 text-white",
    elderly:
      "bg-green-600 hover:bg-green-700 text-white shadow-lg hover:shadow-xl border-4 border-white/30", // Màu xanh lá dễ nhìn
  };

  // Thêm text label cho button (hiển thị khi size lớn)
  const shouldShowLabel =
    size === "lg" || size === "xl" || variant === "elderly";

  return (
    <button
      onClick={handleClick}
      className={`
        ${sizeClasses[size]} 
        ${variantClasses[variant]}
        rounded-full 
        transition-all 
        duration-200 
        flex 
        items-center 
        justify-center
        active:scale-95
        disabled:opacity-50
        disabled:cursor-not-allowed
        focus:outline-none
        focus:ring-4           // Tăng focus ring
        focus:ring-blue-500
        focus:ring-offset-4    // Tăng ring offset
        ${isSpeaking ? "animate-pulse ring-4 ring-yellow-400" : ""}
        ${variant === "elderly" ? "font-bold" : ""}
        ${className}
      `}
      disabled={salinity === null && !isSpeaking}
      aria-label={
        isSpeaking ? "Dừng đọc độ mặn" : "Đọc thông tin độ mặn bằng giọng nói"
      }
      title={
        isSpeaking
          ? "Nhấn để dừng đọc"
          : "Nhấn để nghe thông tin độ mặn (hỗ trợ người cao tuổi)"
      }
    >
      <div className="flex flex-col items-center justify-center gap-1">
        {isSpeaking ? (
          <VolumeX className={iconSizes[size]} />
        ) : (
          <Volume2 className={iconSizes[size]} />
        )}

        {shouldShowLabel && (
          <span
            className={`text-center font-medium ${size === "xl" ? "text-sm" : "text-xs"} whitespace-nowrap`}
          >
            {isSpeaking ? "ĐANG ĐỌC" : "NGHE ĐỘ MẶN"}
          </span>
        )}
      </div>
    </button>
  );
}

// Helper function to convert month number to Vietnamese
function getVietnameseMonth(month: number): string {
  const months = [
    "một",
    "hai",
    "ba",
    "bốn",
    "năm",
    "sáu",
    "bảy",
    "tám",
    "chín",
    "mười",
    "mười một",
    "mười hai",
  ];
  return months[month - 1] || month.toString();
}
