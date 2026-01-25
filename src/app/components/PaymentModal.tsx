// @ts-nocheck
import { useState, useEffect } from "react";
import {
  CreditCard,
  Wallet,
  Building2,
  Calendar,
  AlertCircle,
  CheckCircle,
  X,
  QrCode,
  Loader2,
  Upload,
  FileText,
  ExternalLink,
} from "lucide-react";
import { QRCode } from "react-qr-code";
import { useAuth } from "../../contexts/AuthContext";
import { VerificationUpload } from "./VerificationUpload";
import {
  createTransaction,
  processPayment,
  checkCreditAvailability,
  getApplicablePricing,
} from "../../lib/payment/payment.service";
import { getCustomerCreditLimit } from "../../lib/payment/credit.service";
import type { PaymentMethod } from "../../lib/payment/types";

interface PaymentModalProps {
  product: {
    id: string;
    name: string;
    price: number;
    image_url?: string;
    user_id: string; // seller ID
  };
  onClose: () => void;
  onSuccess: () => void;
}

export function PaymentModal({
  product,
  onClose,
  onSuccess,
}: PaymentModalProps) {
  const { profile } = useAuth();
  const [step, setStep] = useState<
    | "method"
    | "card-details"
    | "qr"
    | "processing"
    | "success"
    | "error"
    | "coming-soon"
  >("method");
  const [showQRPayment, setShowQRPayment] = useState(false);

  // Payment details
  const [paymentType, setPaymentType] = useState<"immediate" | "credit">(
    "immediate",
  );
  const [paymentMethod, setPaymentMethod] =
    useState<PaymentMethod>("bank_transfer");
  const [quantity, setQuantity] = useState(1);

  // Pricing
  const [basePrice, setBasePrice] = useState(product.price);
  const [finalPrice, setFinalPrice] = useState(product.price);
  const [discount, setDiscount] = useState(0);
  const [discountPercentage, setDiscountPercentage] = useState(0);

  // Credit info
  const [creditAvailable, setCreditAvailable] = useState(true); // Default to true, allow all users to use credit
  const [creditLimit, setCreditLimit] = useState<any>(null);
  const [creditTermDays, setCreditTermDays] = useState(30);
  const [customTermDays, setCustomTermDays] = useState("");
  const [interestRate, setInterestRate] = useState(0);

  // Status
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [transactionId, setTransactionId] = useState<string | null>(null);

  // Credit card details
  const [cardNumber, setCardNumber] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvv, setCardCvv] = useState("");
  const [cardName, setCardName] = useState("");
  const [cardErrors, setCardErrors] = useState<Record<string, string>>({});

  // Verification document (for credit payment)
  const [verificationFile, setVerificationFile] = useState<File | null>(null);
  const [verificationPreview, setVerificationPreview] = useState<string | null>(
    null,
  );
  const [uploadingDocument, setUploadingDocument] = useState(false);

  useEffect(() => {
    loadPricingAndCredit();
  }, [product.id, quantity]);

  const loadPricingAndCredit = async () => {
    try {
      // Get applicable pricing
      const pricingResult = await getApplicablePricing(
        product.user_id,
        product.id,
        product.price * quantity,
      );

      if (pricingResult.pricing) {
        setFinalPrice(
          pricingResult.pricing.final_price || product.price * quantity,
        );
        setDiscount(pricingResult.pricing.discount || 0);
        setDiscountPercentage(pricingResult.pricing.discount_percentage || 0);

        if (pricingResult.pricing.credit_term_days) {
          setCreditTermDays(pricingResult.pricing.credit_term_days);
        }
        if (pricingResult.pricing.interest_rate) {
          setInterestRate(pricingResult.pricing.interest_rate);
        }
      }
    } catch (err) {
      console.error("Error loading pricing:", err);
      // Use default pricing if API fails
      setFinalPrice(product.price * quantity);
    }

    try {
      // Check credit availability
      const creditCheck = await checkCreditAvailability(
        product.user_id,
        finalPrice,
      );

      if (creditCheck.result?.available) {
        setCreditAvailable(true);
        if (creditCheck.result.term_days) {
          setCreditTermDays(creditCheck.result.term_days);
        }
        if (creditCheck.result.interest_rate) {
          setInterestRate(creditCheck.result.interest_rate);
        }
      }
    } catch (err) {
      console.error("Error checking credit:", err);
      // Already set creditAvailable to true by default
    }

    try {
      // Get credit limit details
      const limitResult = await getCustomerCreditLimit(product.user_id);
      if (limitResult.creditLimit) {
        setCreditLimit(limitResult.creditLimit);
      }
    } catch (err) {
      console.error("Error loading credit limit:", err);
      // Continue without credit limit details
    }
  };

  // Handle verification file selection
  const handleVerificationFileSelect = (file: File | null) => {
    setVerificationFile(file);
    if (file) {
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setVerificationPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setVerificationPreview(null);
    }
  };

  const handlePayment = async () => {
    setLoading(true);
    setError(null);

    // For credit payment, require verification document
    if (paymentType === "credit" && !verificationFile) {
      setError("Vui lòng tải lên giấy xác nhận sản xuất nông nghiệp");
      setLoading(false);
      return;
    }

    // Validate custom term days if selected
    if (paymentType === "credit" && creditTermDays === 0) {
      const customDays = Number(customTermDays);
      if (
        !customTermDays ||
        isNaN(customDays) ||
        customDays < 1 ||
        customDays > 3650
      ) {
        setError("Vui lòng nhập số ngày hợp lệ (1-3650 ngày)");
        setLoading(false);
        return;
      }
    }

    // Kiểm tra nếu là ví điện tử thì hiển thị thông báo "Đang phát triển"
    if (paymentType === "immediate" && paymentMethod === "e_wallet") {
      setLoading(false);
      setStep("coming-soon");
      return;
    }

    // If credit card and no card details yet, show card form
    if (
      paymentType === "immediate" &&
      paymentMethod === "credit_card" &&
      !transactionId
    ) {
      setLoading(false);
      setStep("card-details");
      return;
    }

    setStep("processing");

    try {
      // Determine final credit term days (use custom if selected)
      const finalCreditTermDays =
        paymentType === "credit"
          ? creditTermDays === 0
            ? Number(customTermDays) || 30
            : creditTermDays
          : undefined;

      // Create transaction
      const txnResult = await createTransaction({
        seller_id: product.user_id,
        product_id: product.id,
        amount: basePrice * quantity,
        discount_amount: discount,
        final_amount: finalPrice,
        type: paymentType,
        payment_method: paymentType === "immediate" ? paymentMethod : "credit",
        credit_term_days: finalCreditTermDays,
      });

      if (txnResult.error || !txnResult.transaction) {
        throw new Error(txnResult.error || "Không thể tạo giao dịch");
      }

      const transactionId = txnResult.transaction.id;
      setTransactionId(transactionId);

      // For credit payment, upload verification document
      if (paymentType === "credit" && verificationFile && profile?.id) {
        setUploadingDocument(true);

        const { uploadDocumentImage, uploadVerificationDocument } =
          await import("../../lib/verification/verification.service");

        // Upload image file
        const uploadResult = await uploadDocumentImage(
          verificationFile,
          profile.id,
        );
        setUploadingDocument(false);

        if (uploadResult.error || !uploadResult.url) {
          throw new Error(
            uploadResult.error || "Không thể tải lên giấy xác nhận",
          );
        }

        // Save verification document record
        await uploadVerificationDocument({
          user_id: profile.id,
          transaction_id: transactionId,
          document_type: "farming_certificate",
          document_url: uploadResult.url,
          reference_link:
            "https://luatvietnam.vn/bieu-mau/mau-giay-xac-nhan-truc-tiep-san-xuat-nong-nghiep-571-91809-article.html",
        });
      }

      // Process immediate payment
      if (paymentType === "immediate") {
        // For bank transfer, show QR code first
        if (paymentMethod === "bank_transfer") {
          setStep("qr");
          setLoading(false);
          return;
        }

        // For other methods, process immediately
        const paymentResult = await processPayment({
          transaction_id: txnResult.transaction.id,
          payment_method: paymentMethod,
          payment_provider: getPaymentProvider(paymentMethod),
          payment_reference: `PAY-${Date.now()}`,
        });

        if (paymentResult.error) {
          throw new Error(paymentResult.error);
        }
      }

      setStep("success");
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 2000);
    } catch (err: any) {
      console.error("Payment error:", err);
      setError(err.message);
      setStep("error");
    } finally {
      setLoading(false);
    }
  };

  const getPaymentProvider = (method: PaymentMethod): string => {
    switch (method) {
      case "bank_transfer":
        return "Local Bank";
      case "e_wallet":
        return "MoMo";
      case "credit_card":
        return "VNPay";
      default:
        return "Unknown";
    }
  };

  // Format card number with spaces
  const formatCardNumber = (value: string) => {
    const v = value.replace(/\s+/g, "").replace(/[^0-9]/gi, "");
    const matches = v.match(/\d{4,16}/g);
    const match = (matches && matches[0]) || "";
    const parts = [];
    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4));
    }
    return parts.length ? parts.join(" ") : value;
  };

  // Format expiry date MM/YY
  const formatExpiry = (value: string) => {
    const v = value.replace(/\s+/g, "").replace(/[^0-9]/gi, "");
    if (v.length >= 2) {
      return `${v.substring(0, 2)}/${v.substring(2, 4)}`;
    }
    return v;
  };

  // Validate card details
  const validateCardDetails = () => {
    const errors: Record<string, string> = {};

    // Card number (16 digits)
    const cleanNumber = cardNumber.replace(/\s/g, "");
    if (!cleanNumber) {
      errors.cardNumber = "S\u1ed1 th\u1ebb l\u00e0 b\u1eaft bu\u1ed9c";
    } else if (cleanNumber.length !== 16) {
      errors.cardNumber =
        "S\u1ed1 th\u1ebb ph\u1ea3i c\u00f3 16 ch\u1eef s\u1ed1";
    }

    // Expiry date
    if (!cardExpiry) {
      errors.cardExpiry =
        "Ng\u00e0y h\u1ebft h\u1ea1n l\u00e0 b\u1eaft bu\u1ed9c";
    } else {
      const [month, year] = cardExpiry.split("/");
      const currentYear = new Date().getFullYear() % 100;
      const currentMonth = new Date().getMonth() + 1;

      if (!month || !year) {
        errors.cardExpiry =
          "\u0110\u1ecbnh d\u1ea1ng kh\u00f4ng h\u1ee3p l\u1ec7 (MM/YY)";
      } else {
        const m = parseInt(month);
        const y = parseInt(year);
        if (m < 1 || m > 12) {
          errors.cardExpiry = "Th\u00e1ng kh\u00f4ng h\u1ee3p l\u1ec7";
        } else if (y < currentYear || (y === currentYear && m < currentMonth)) {
          errors.cardExpiry = "Th\u1ebb \u0111\u00e3 h\u1ebft h\u1ea1n";
        }
      }
    }

    // CVV (3 or 4 digits)
    if (!cardCvv) {
      errors.cardCvv = "M\u00e3 CVV l\u00e0 b\u1eaft bu\u1ed9c";
    } else if (cardCvv.length < 3 || cardCvv.length > 4) {
      errors.cardCvv = "M\u00e3 CVV kh\u00f4ng h\u1ee3p l\u1ec7";
    }

    // Cardholder name
    if (!cardName.trim()) {
      errors.cardName = "T\u00ean ch\u1ee7 th\u1ebb l\u00e0 b\u1eaft bu\u1ed9c";
    }

    setCardErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Generate VietQR string for banking apps
  const generateVietQR = () => {
    // VietQR format: BankID|AccountNumber|AccountName|Amount|Description
    const bankId = "970422"; // MB Bank (example)
    const accountNumber = "0123456789"; // Replace with actual
    const accountName = "CONG TY ABC";
    const amount = finalPrice;
    const description = transactionId
      ? `DH ${transactionId.slice(0, 8)}`
      : `DH ${Date.now()}`;

    // Compact format for QR
    return `2|010|A|${accountNumber}|${accountName}|${amount}|${description}|VND`;
  };

  const handleConfirmQRPayment = async () => {
    // User confirms they have transferred money
    setLoading(true);
    setStep("processing");

    try {
      if (!transactionId) {
        throw new Error("Không tìm thấy mã giao dịch");
      }

      // Process the payment
      const paymentResult = await processPayment({
        transaction_id: transactionId,
        payment_method: "bank_transfer",
        payment_provider: "VietQR",
        payment_reference: `QR-${Date.now()}`,
      });

      if (paymentResult.error) {
        throw new Error(paymentResult.error);
      }

      setStep("success");
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 2000);
    } catch (err: any) {
      console.error("Payment confirmation error:", err);
      setError(err.message);
      setStep("error");
    } finally {
      setLoading(false);
    }
  };

  const handleCardPayment = async () => {
    // Validate card details
    if (!validateCardDetails()) {
      return;
    }

    setLoading(true);
    setError(null);
    setStep("processing");

    try {
      // Create transaction
      const txnResult = await createTransaction({
        seller_id: product.user_id,
        product_id: product.id,
        amount: basePrice * quantity,
        discount_amount: discount,
        final_amount: finalPrice,
        type: paymentType,
        payment_method: "credit_card",
      });

      if (txnResult.error || !txnResult.transaction) {
        throw new Error(
          txnResult.error || "Kh\u00f4ng th\u1ec3 t\u1ea1o giao d\u1ecbch",
        );
      }

      setTransactionId(txnResult.transaction.id);

      // Process payment with card details
      const paymentResult = await processPayment({
        transaction_id: txnResult.transaction.id,
        payment_method: "credit_card",
        payment_provider: "VNPay",
        payment_reference: `CARD-${Date.now()}`,
      });

      if (paymentResult.error) {
        throw new Error(paymentResult.error);
      }

      setStep("success");
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 2000);
    } catch (err: any) {
      console.error("Card payment error:", err);
      setError(err.message);
      setStep("error");
    } finally {
      setLoading(false);
    }
  };

  const calculateInterest = () => {
    if (paymentType === "credit" && interestRate > 0) {
      return (finalPrice * interestRate * creditTermDays) / (365 * 100);
    }
    return 0;
  };

  const totalWithInterest = finalPrice + calculateInterest();

  // Render step "coming-soon" (thông báo đang phát triển)
  if (step === "coming-soon") {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
        <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 text-center">
          <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Loader2 className="w-10 h-10 text-yellow-600 animate-spin" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">
            Tính năng đang phát triển
          </h3>
          <div className="flex items-center justify-center gap-3 mb-4">
            <Wallet className="w-12 h-12 text-purple-600" />
            <span className="text-lg font-medium text-gray-900">
              Thanh toán ví điện tử
            </span>
          </div>
          <p className="text-gray-600 mb-6">
            Tính năng thanh toán qua ví điện tử (MoMo, ZaloPay, VNPay) đang được
            phát triển và sẽ sớm ra mắt. Vui lòng chọn phương thức thanh toán
            khác trong thời gian chờ đợi.
          </p>
          <button
            onClick={() => setStep("method")}
            className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            Quay lại chọn phương thức
          </button>
        </div>
      </div>
    );
  }

  // Render different steps
  if (step === "card-details") {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
        <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-gray-900">Thêm thẻ</h3>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Card Number */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Số thẻ
              <span className="ml-2 flex items-center">
                {/* Logo Mastercard Chính Thức */}
                <img
                  src="https://upload.wikimedia.org/wikipedia/commons/2/2a/Mastercard-logo.svg"
                  alt="Mastercard"
                  className="inline h-6 w-auto object-contain"
                />

                {/* Logo Visa Chính Thức */}
                <img
                  src="https://upload.wikimedia.org/wikipedia/commons/5/5e/Visa_Inc._logo.svg"
                  alt="Visa"
                  className="inline h-4 w-auto ml-3 object-contain"
                />
              </span>
            </label>
            <div
              className={`relative ${cardErrors.cardNumber ? "border-red-500" : ""}`}
            >
              <input
                type="text"
                placeholder="Nhập số thẻ"
                value={cardNumber}
                onChange={(e) => {
                  const formatted = formatCardNumber(e.target.value);
                  if (formatted.replace(/\\s/g, "").length <= 19) {
                    setCardNumber(formatted);
                    if (cardErrors.cardNumber) {
                      setCardErrors({ ...cardErrors, cardNumber: "" });
                    }
                  }
                }}
                className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  cardErrors.cardNumber
                    ? "border-red-500 bg-red-50"
                    : "border-gray-300"
                }`}
                maxLength={19}
              />
              {cardErrors.cardNumber && (
                <div className="flex items-center gap-1 mt-1 text-red-600 text-sm">
                  <AlertCircle className="w-4 h-4" />
                  <span>{cardErrors.cardNumber}</span>
                </div>
              )}
            </div>
          </div>

          {/* Expiry and CVV */}
          <div className="grid grid-cols-2 gap-4 mb-4">
            {/* Expiry Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Ngày hết hạn
              </label>
              <input
                type="text"
                placeholder="MM/YY"
                value={cardExpiry}
                onChange={(e) => {
                  const formatted = formatExpiry(e.target.value);
                  if (formatted.replace("/", "").length <= 4) {
                    setCardExpiry(formatted);
                    if (cardErrors.cardExpiry) {
                      setCardErrors({ ...cardErrors, cardExpiry: "" });
                    }
                  }
                }}
                className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  cardErrors.cardExpiry
                    ? "border-red-500 bg-red-50"
                    : "border-gray-300"
                }`}
                maxLength={5}
              />
              {cardErrors.cardExpiry && (
                <div className="flex items-center gap-1 mt-1 text-red-600 text-xs">
                  <AlertCircle className="w-3 h-3" />
                  <span>{cardErrors.cardExpiry}</span>
                </div>
              )}
            </div>

            {/* CVV */}
            <div>
              <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                Mã bảo mật
                <button
                  type="button"
                  className="ml-1 text-gray-400 hover:text-gray-600"
                  title="M\u00e3 CVV/CVC 3-4 ch\u1eef s\u1ed1 \u1edf m\u1eb7t sau th\u1ebb"
                >
                  <AlertCircle className="w-4 h-4" />
                </button>
              </label>
              <input
                type="text"
                placeholder="CVV/CVC"
                value={cardCvv}
                onChange={(e) => {
                  const value = e.target.value.replace(/[^0-9]/g, "");
                  if (value.length <= 4) {
                    setCardCvv(value);
                    if (cardErrors.cardCvv) {
                      setCardErrors({ ...cardErrors, cardCvv: "" });
                    }
                  }
                }}
                className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  cardErrors.cardCvv
                    ? "border-red-500 bg-red-50"
                    : "border-gray-300"
                }`}
                maxLength={4}
              />
              {cardErrors.cardCvv && (
                <div className="flex items-center gap-1 mt-1 text-red-600 text-xs">
                  <AlertCircle className="w-3 h-3" />
                  <span>{cardErrors.cardCvv}</span>
                </div>
              )}
            </div>
          </div>

          {/* Cardholder Name */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tên chủ thẻ
            </label>
            <input
              type="text"
              placeholder="Họ tên"
              value={cardName}
              onChange={(e) => {
                setCardName(e.target.value.toUpperCase());
                if (cardErrors.cardName) {
                  setCardErrors({ ...cardErrors, cardName: "" });
                }
              }}
              className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                cardErrors.cardName
                  ? "border-red-500 bg-red-50"
                  : "border-gray-300"
              }`}
            />
            {cardErrors.cardName && (
              <div className="flex items-center gap-1 mt-1 text-red-600 text-sm">
                <AlertCircle className="w-4 h-4" />
                <span>{cardErrors.cardName}</span>
              </div>
            )}
          </div>

          {/* Security Notice */}
          <div className="bg-teal-50 border border-teal-200 rounded-lg p-4 mb-6 flex items-start gap-3">
            <div className="flex-shrink-0 w-10 h-10 bg-white rounded-lg flex items-center justify-center">
              <svg
                className="w-6 h-6 text-teal-600"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="flex-1 text-sm text-teal-800">
              <p className="font-medium mb-1">Quy định bảo mật</p>
              <p className="text-teal-700">
                Chúng tôi giữ an toàn và mã hóa thông tin thẻ của bạn. Chúng tôi
                sẽ không lưu mã bảo mật (CVV/CVC) của thẻ. Bạn có thể xóa thẻ
                bất cứ lúc nào.
              </p>
            </div>
          </div>

          {/* Info Text */}
          <p className="text-sm text-gray-600 mb-6">
            Để xác minh thẻ của bạn hợp lệ, chúng tôi có thể tạm trừ một khoản
            phí vào thẻ. Khoản phí này sẽ hoàn lại ngay lập tức sau khi xác minh
            thẻ thành công.
          </p>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              onClick={() => setStep("method")}
              disabled={loading}
              className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
            >
              Quay lại
            </button>
            <button
              onClick={handleCardPayment}
              disabled={loading}
              className="flex-1 px-4 py-3 bg-pink-600 text-white rounded-lg hover:bg-pink-700 disabled:opacity-50 transition-colors font-medium"
            >
              {loading ? "Đang xử lý..." : "Lưu"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (step === "qr") {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
        <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-gray-900">
              Quét mã QR để thanh toán
            </h3>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* QR Code */}
          <div className="bg-gradient-to-br from-blue-50 to-purple-50 p-6 rounded-xl mb-6">
            <div className="bg-white p-4 rounded-lg shadow-md mb-4 flex items-center justify-center">
              <QRCode value={generateVietQR()} size={200} level="H" />
            </div>
            <div className="text-center">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-100 text-blue-800 rounded-full text-sm font-medium mb-2">
                <QrCode className="w-4 h-4" />
                Mở app ngân hàng và quét mã
              </div>
            </div>
          </div>

          {/* Bank Info */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Ngân hàng:</span>
              <span className="font-medium text-gray-900">MB Bank</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Số tài khoản:</span>
              <span className="font-mono font-medium text-gray-900">
                0123456789
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Chủ tài khoản:</span>
              <span className="font-medium text-gray-900">CONG TY ABC</span>
            </div>
            <div className="flex justify-between pt-2 border-t border-gray-200">
              <span className="text-gray-600">Số tiền:</span>
              <span className="font-bold text-lg text-blue-600">
                {finalPrice.toLocaleString("vi-VN")} ₫
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Nội dung:</span>
              <span className="font-mono text-gray-900">
                {transactionId ? `DH ${transactionId.slice(0, 8)}` : "DH..."}
              </span>
            </div>
          </div>

          {/* Instructions */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <div className="flex gap-2">
              <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-yellow-800">
                <p className="font-medium mb-1">Lưu ý:</p>
                <ul className="list-disc list-inside space-y-1 text-yellow-700">
                  <li>Quét mã QR bằng app ngân hàng</li>
                  <li>Kiểm tra số tiền và nội dung chuyển khoản</li>
                  <li>Nhấn "Đã chuyển khoản" sau khi hoàn tất</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              onClick={() => setStep("method")}
              className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Quay lại
            </button>
            <button
              onClick={handleConfirmQRPayment}
              disabled={loading}
              className="flex-1 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors font-medium flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Đang xử lý...
                </>
              ) : (
                <>
                  <CheckCircle className="w-5 h-5" />
                  Đã chuyển khoản
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (step === "processing") {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
        <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <h3 className="text-xl font-bold text-gray-900 mb-2">
            Đang xử lý thanh toán...
          </h3>
          <p className="text-gray-600">Vui lòng chờ trong giây lát</p>
        </div>
      </div>
    );
  }

  if (step === "success") {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
        <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-10 h-10 text-green-600" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">
            Thanh toán thành công!
          </h3>
          <p className="text-gray-600">
            {paymentType === "credit"
              ? "Khoản trả sau đã được ghi nhận"
              : "Giao dịch đã hoàn tất"}
          </p>
        </div>
      </div>
    );
  }

  if (step === "error") {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
        <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
              <AlertCircle className="w-6 h-6 text-red-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-900">
              Thanh toán thất bại
            </h3>
          </div>
          <p className="text-gray-600 mb-6">{error}</p>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
            >
              Đóng
            </button>
            <button
              onClick={() => {
                setStep("method");
                setError(null);
              }}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Thử lại
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Main payment method selection
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">Thanh toán</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6">
          {/* Product Info */}
          <div className="flex gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
            {product.image_url && (
              <img
                src={product.image_url}
                alt={product.name}
                className="w-20 h-20 object-cover rounded-lg"
              />
            )}
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900">{product.name}</h3>
              <p className="text-gray-600">
                {product.price.toLocaleString("vi-VN")} ₫
              </p>

              {/* Quantity */}
              <div className="flex items-center gap-2 mt-2">
                <span className="text-sm text-gray-600">Số lượng:</span>
                <input
                  type="number"
                  min="1"
                  value={quantity}
                  onChange={(e) =>
                    setQuantity(Math.max(1, parseInt(e.target.value) || 1))
                  }
                  className="w-20 px-2 py-1 border border-gray-300 rounded text-center"
                />
              </div>
            </div>
          </div>

          {/* Pricing Summary */}
          <div className="mb-6 p-4 border border-gray-200 rounded-lg space-y-2">
            <div className="flex justify-between text-gray-600">
              <span>Tổng tiền hàng:</span>
              <span>{(basePrice * quantity).toLocaleString("vi-VN")} ₫</span>
            </div>
            {discount > 0 && (
              <div className="flex justify-between text-green-600">
                <span>Giảm giá ({discountPercentage}%):</span>
                <span>-{discount.toLocaleString("vi-VN")} ₫</span>
              </div>
            )}
            <div className="flex justify-between font-semibold text-lg pt-2 border-t border-gray-200">
              <span>Tổng thanh toán:</span>
              <span className="text-blue-600">
                {finalPrice.toLocaleString("vi-VN")} ₫
              </span>
            </div>
          </div>

          {/* Payment Type Selection */}
          <div className="mb-6">
            <h3 className="font-semibold text-gray-900 mb-3">
              Hình thức thanh toán
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setPaymentType("immediate")}
                className={`p-4 border-2 rounded-lg transition-all ${
                  paymentType === "immediate"
                    ? "border-blue-600 bg-blue-50"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <CreditCard
                  className={`w-6 h-6 mx-auto mb-2 ${
                    paymentType === "immediate"
                      ? "text-blue-600"
                      : "text-gray-400"
                  }`}
                />
                <div className="text-center">
                  <div className="font-medium">Trả liền</div>
                  <div className="text-sm text-gray-600">Thanh toán ngay</div>
                </div>
              </button>

              <button
                onClick={() => setPaymentType("credit")}
                disabled={!creditAvailable}
                className={`p-4 border-2 rounded-lg transition-all ${
                  paymentType === "credit"
                    ? "border-blue-600 bg-blue-50"
                    : creditAvailable
                      ? "border-gray-200 hover:border-gray-300"
                      : "border-gray-200 opacity-50 cursor-not-allowed"
                }`}
              >
                <Calendar
                  className={`w-6 h-6 mx-auto mb-2 ${
                    paymentType === "credit" ? "text-blue-600" : "text-gray-400"
                  }`}
                />
                <div className="text-center">
                  <div className="font-medium">Trả sau</div>
                  <div className="text-sm text-gray-600">
                    {creditAvailable
                      ? `${creditTermDays} ngày`
                      : "Chưa có hạn mức"}
                  </div>
                </div>
              </button>
            </div>
          </div>

          {/* Payment Method (for immediate) */}
          {paymentType === "immediate" && (
            <div className="mb-6">
              <h3 className="font-semibold text-gray-900 mb-3">
                Phương thức thanh toán
              </h3>
              <div className="space-y-2">
                <label
                  className={`flex items-center gap-3 p-4 border-2 rounded-lg cursor-pointer transition-all ${
                    paymentMethod === "bank_transfer"
                      ? "border-blue-600 bg-blue-50"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <input
                    type="radio"
                    name="payment_method"
                    value="bank_transfer"
                    checked={paymentMethod === "bank_transfer"}
                    onChange={(e) =>
                      setPaymentMethod(e.target.value as PaymentMethod)
                    }
                    className="w-4 h-4 text-blue-600"
                  />
                  <Building2 className="w-6 h-6 text-blue-600" />
                  <div className="flex-1">
                    <div className="font-medium">Chuyển khoản ngân hàng</div>
                    <div className="text-sm text-gray-600">
                      Chuyển trực tiếp qua ngân hàng
                    </div>
                  </div>
                </label>

                <label
                  className={`flex items-center gap-3 p-4 border-2 rounded-lg cursor-pointer transition-all ${
                    paymentMethod === "e_wallet"
                      ? "border-blue-600 bg-blue-50"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <input
                    type="radio"
                    name="payment_method"
                    value="e_wallet"
                    checked={paymentMethod === "e_wallet"}
                    onChange={(e) =>
                      setPaymentMethod(e.target.value as PaymentMethod)
                    }
                    className="w-4 h-4 text-blue-600"
                  />
                  <Wallet className="w-6 h-6 text-purple-600" />
                  <div className="flex-1">
                    <div className="font-medium">Ví điện tử</div>
                    <div className="text-sm text-gray-600">
                      MoMo, ZaloPay, VNPay
                    </div>
                  </div>
                </label>

                <label
                  className={`flex items-center gap-3 p-4 border-2 rounded-lg cursor-pointer transition-all ${
                    paymentMethod === "credit_card"
                      ? "border-blue-600 bg-blue-50"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <input
                    type="radio"
                    name="payment_method"
                    value="credit_card"
                    checked={paymentMethod === "credit_card"}
                    onChange={(e) =>
                      setPaymentMethod(e.target.value as PaymentMethod)
                    }
                    className="w-4 h-4 text-blue-600"
                  />
                  <CreditCard className="w-6 h-6 text-green-600" />
                  <div className="flex-1">
                    <div className="font-medium">Thẻ tín dụng/ghi nợ</div>
                    <div className="text-sm text-gray-600">
                      Visa, Mastercard
                    </div>
                  </div>
                </label>
              </div>
            </div>
          )}

          {/* Credit Info */}
          {paymentType === "credit" && creditAvailable && (
            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h4 className="font-semibold text-blue-900 mb-3">
                Thông tin trả sau
              </h4>
              <div className="space-y-3 text-sm">
                {creditLimit?.available_credit && (
                  <div className="flex justify-between">
                    <span className="text-blue-800">Hạn mức còn lại:</span>
                    <span className="font-medium text-blue-900">
                      {creditLimit.available_credit.toLocaleString("vi-VN")} ₫
                    </span>
                  </div>
                )}
                <div>
                  <label className="block text-blue-800 mb-2 font-medium">
                    Chọn kỳ hạn thanh toán:
                  </label>
                  <select
                    value={creditTermDays === 0 ? "custom" : creditTermDays}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === "custom") {
                        setCreditTermDays(0);
                      } else {
                        setCreditTermDays(Number(val));
                        setCustomTermDays("");
                      }
                    }}
                    className="w-full px-3 py-2 border border-blue-300 rounded-lg bg-white text-blue-900 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value={30}>1 tháng (30 ngày)</option>
                    <option value={90}>3 tháng (90 ngày)</option>
                    <option value={180}>6 tháng (180 ngày)</option>
                    <option value={365}>1 năm (365 ngày)</option>
                    <option value={1095}>3 năm (1095 ngày)</option>
                    <option value="custom">Tùy chọn khác</option>
                  </select>
                  {creditTermDays === 0 && (
                    <div className="mt-2">
                      <input
                        type="number"
                        min="1"
                        max="3650"
                        placeholder="Nhập số ngày (tối đa 3650 ngày)"
                        value={customTermDays}
                        onChange={(e) => setCustomTermDays(e.target.value)}
                        className="w-full px-3 py-2 border border-blue-300 rounded-lg bg-white text-blue-900 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  )}
                </div>
                {interestRate > 0 && (
                  <>
                    <div className="flex justify-between">
                      <span className="text-blue-800">Lãi suất:</span>
                      <span className="font-medium text-blue-900">
                        {interestRate}% / năm
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-blue-800">Tiền lãi dự kiến:</span>
                      <span className="font-medium text-blue-900">
                        {calculateInterest().toLocaleString("vi-VN")} ₫
                      </span>
                    </div>
                    <div className="flex justify-between pt-2 border-t border-blue-300">
                      <span className="text-blue-800 font-semibold">
                        Tổng phải trả:
                      </span>
                      <span className="font-bold text-blue-900">
                        {totalWithInterest.toLocaleString("vi-VN")} ₫
                      </span>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Verification Document Upload (for credit payment) */}
          {paymentType === "credit" && creditAvailable && (
            <div className="mb-6">
              <VerificationUpload
                onFileSelect={handleVerificationFileSelect}
                selectedFile={verificationFile}
                preview={verificationPreview}
                error={
                  error?.includes("giấy xác nhận")
                    ? "Vui lòng tải lên giấy xác nhận"
                    : undefined
                }
              />
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Hủy
            </button>
            <button
              onClick={handlePayment}
              disabled={
                loading || (paymentType === "credit" && !creditAvailable)
              }
              className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
            >
              {loading ? "Đang xử lý..." : "Xác nhận thanh toán"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
