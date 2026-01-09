import { useState } from "react";
import { TrendingUp, CheckCircle, AlertCircle } from "lucide-react";
import { Modal } from "./Modal";
import { investInProject } from "../../lib/investments/investments.service";
import type { InvestmentProjectWithStats } from "../../lib/investments/types";

interface InvestmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: InvestmentProjectWithStats;
  onSuccess?: () => void;
}

export function InvestmentModal({
  isOpen,
  onClose,
  project,
  onSuccess,
}: InvestmentModalProps) {
  const [amount, setAmount] = useState("");
  const [investorName, setInvestorName] = useState("");
  const [investorEmail, setInvestorEmail] = useState("");
  const [investorPhone, setInvestorPhone] = useState("");
  const [message, setMessage] = useState("");
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Calculate completion status and remaining funding
  const progress = project.progress_percentage || 0;
  const isCompleted = progress >= 100;
  const remainingFunding = Math.max(0, project.funding_goal - project.current_funding);

  const formatNumber = (value: string) => {
    const number = value.replace(/\D/g, "");
    return number.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, "");
    setAmount(value);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!amount || parseInt(amount) <= 0) {
      setError("Vui lòng nhập số tiền đầu tư");
      return;
    }

    if (!investorName || !investorEmail) {
      setError("Vui lòng điền đầy đủ thông tin");
      return;
    }

    if (!acceptTerms) {
      setError("Vui lòng đồng ý với điều khoản");
      return;
    }

    // Check if project is already 100% funded
    if (isCompleted) {
      setError("Dự án đã hoàn thành gọi vốn 100%. Không thể đầu tư thêm.");
      return;
    }

    // Check if investment amount exceeds remaining funding needed
    if (parseInt(amount) > remainingFunding) {
      setError(`Số tiền đầu tư vượt quá số tiền còn thiếu (${formatNumber(remainingFunding.toString())} VNĐ)`);
      return;
    }

    setSubmitting(true);

    const result = await investInProject({
      project_id: project.id,
      amount: parseInt(amount),
      investor_name: investorName,
      investor_email: investorEmail,
      investor_phone: investorPhone,
      message: message,
    });

    setSubmitting(false);

    if (result.success) {
      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
        onSuccess?.();
        onClose();
        setAmount("");
        setInvestorName("");
        setInvestorEmail("");
        setInvestorPhone("");
        setMessage("");
        setAcceptTerms(false);
      }, 2000);
    } else {
      setError(result.error || "Không thể thực hiện đầu tư");
    }
  };

  const handleClose = () => {
    if (!submitting) {
      onClose();
    }
  };

  if (showSuccess) {
    return (
      <Modal
        isOpen={isOpen}
        onClose={handleClose}
        title="Thành công!"
        maxWidth="md"
      >
        <div className="text-center py-6">
          <CheckCircle className="w-12 h-12 text-blue-600 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-gray-900 mb-1">
            Đầu tư thành công!
          </h3>
          <p className="text-gray-600 text-sm">
            Cảm ơn bạn đã đầu tư vào dự án "{project.title}". Chúng tôi sẽ liên
            hệ với bạn sớm nhất.
          </p>
        </div>
      </Modal>
    );
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Tham gia đầu tư"
      maxWidth="xl"
    >
      {/* Project Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
        <h3 className="font-semibold text-gray-900 mb-2 text-base">
          {project.title}
        </h3>
        <p className="text-gray-700 text-sm mb-3 line-clamp-2">
          {project.description}
        </p>
        <div className="flex items-center gap-4 text-sm">
          <div>
            <span className="text-gray-600">Mục tiêu: </span>
            <span className="font-medium text-blue-600">
              {(project.funding_goal / 1_000_000_000).toFixed(1)} tỷ VNĐ
            </span>
          </div>
          <div>
            <span className="text-gray-600">Đã huy động: </span>
            <span className="font-medium text-blue-600">
              {project.progress_percentage.toFixed(0)}%
            </span>
          </div>
        </div>
      </div>

      {/* Warning banner if project is close to completion */}
      {!isCompleted && remainingFunding > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4 flex items-start gap-2">
          <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="text-blue-900 font-medium">Số tiền còn cần huy động</p>
            <p className="text-blue-700">
              <span className="font-semibold">{formatNumber(remainingFunding.toString())} VNĐ</span>
              {' '}({(100 - progress).toFixed(1)}% còn lại)
            </p>
          </div>
        </div>
      )}

      {/* Completion warning if already 100% */}
      {isCompleted && (
        <div className="bg-green-50 border-2 border-green-500 rounded-lg p-4 mb-4 flex items-start gap-3">
          <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0" />
          <div>
            <p className="text-green-900 font-semibold text-base">Dự án đã hoàn thành gọi vốn!</p>
            <p className="text-green-700 text-sm mt-1">
              Dự án này đã đạt 100% mục tiêu và không thể nhận thêm đầu tư.
            </p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Investment Amount */}
        <div>
          <label className="block text-gray-700 font-medium mb-1 text-sm">
            Số tiền đầu tư *
          </label>
          <div className="relative">
            <input
              type="text"
              value={formatNumber(amount)}
              onChange={handleAmountChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-blue-600 focus:outline-none text-base"
              placeholder="10.000.000"
              disabled={submitting}
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">
              VNĐ
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            {remainingFunding > 0
              ? `Tối đa: ${formatNumber(remainingFunding.toString())} VNĐ`
              : 'Dự án đã hoàn thành gọi vốn'
            }
          </p>
        </div>

        {/* Investor Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-gray-700 font-medium mb-1 text-sm">
              Họ và tên *
            </label>
            <input
              type="text"
              value={investorName}
              onChange={(e) => setInvestorName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-blue-600 focus:outline-none"
              placeholder="Nguyễn Văn A"
              disabled={submitting}
            />
          </div>
          <div>
            <label className="block text-gray-700 font-medium mb-1 text-sm">
              Email *
            </label>
            <input
              type="email"
              value={investorEmail}
              onChange={(e) => setInvestorEmail(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-blue-600 focus:outline-none"
              placeholder="email@example.com"
              disabled={submitting}
            />
          </div>
        </div>

        <div>
          <label className="block text-gray-700 font-medium mb-1 text-sm">
            Số điện thoại
          </label>
          <input
            type="tel"
            value={investorPhone}
            onChange={(e) => setInvestorPhone(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-blue-600 focus:outline-none"
            placeholder="0912345678"
            disabled={submitting}
          />
        </div>

        <div>
          <label className="block text-gray-700 font-medium mb-1 text-sm">
            Lời nhắn (không bắt buộc)
          </label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={2}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-blue-600 focus:outline-none resize-none"
            placeholder="Chia sẻ suy nghĩ của bạn về dự án..."
            disabled={submitting}
          />
        </div>

        {/* Terms */}
        <div className="flex items-start gap-2 bg-gray-50 p-3 rounded-lg">
          <input
            type="checkbox"
            id="terms"
            checked={acceptTerms}
            onChange={(e) => setAcceptTerms(e.target.checked)}
            className="mt-0.5 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            disabled={submitting}
          />
          <label htmlFor="terms" className="text-xs text-gray-700">
            Tôi đồng ý với{" "}
            <a href="#" className="text-blue-600 hover:underline">
              Điều khoản đầu tư
            </a>{" "}
            và hiểu rằng đây là cam kết đầu tư.
          </label>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={submitting || isCompleted}
          className="w-full bg-blue-600 text-white px-4 py-2.5 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {submitting ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span className="text-sm">Đang xử lý...</span>
            </>
          ) : (
            <>
              <TrendingUp className="w-4 h-4" />
              <span className="text-sm">Xác nhận đầu tư</span>
            </>
          )}
        </button>
      </form>
    </Modal>
  );
}
