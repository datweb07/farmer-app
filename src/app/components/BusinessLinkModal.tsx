// @ts-nocheck
import { useState, useEffect } from "react";
import {
  Building2,
  X,
  AlertCircle,
  CheckCircle,
  Link,
  Search,
} from "lucide-react";
import {
  checkBusinessLink,
  createBusinessLink,
} from "../../lib/business/link.service";
import { supabase } from "../../lib/supabase/supabase";

interface BusinessLinkModalProps {
  businessId?: string; // Optional - if not provided, user can search
  businessName?: string;
  onClose: () => void;
  onLinked: () => void;
  onSkip?: () => void; // Optional - only for purchase flow
  allowSearch?: boolean; // Enable search mode
}

export function BusinessLinkModal({
  businessId: initialBusinessId,
  businessName: initialBusinessName,
  onClose,
  onLinked,
  onSkip,
  allowSearch = false,
}: BusinessLinkModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Search state
  const [searchMode, setSearchMode] = useState(
    allowSearch && !initialBusinessId,
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedBusiness, setSelectedBusiness] = useState<any>(
    initialBusinessId
      ? { id: initialBusinessId, username: initialBusinessName }
      : null,
  );

  useEffect(() => {
    if (allowSearch && !initialBusinessId) {
      loadBusinesses();
    }
  }, []);

  const loadBusinesses = async () => {
    setSearching(true);
    const { data, error } = await supabase
      .from("profiles")
      .select("id, username, phone_number, avatar_url, role")
      .eq("role", "business")
      .order("username", { ascending: true })
      .limit(50);

    if (!error && data) {
      setSearchResults(data);
    } else {
      console.error("Error loading businesses:", error);
    }
    setSearching(false);
  };

  const handleBusinessSelect = (business: any) => {
    setSelectedBusiness(business);
    setSearchQuery(business.username);
    setSearchResults([]);
    setSearchMode(false);
  };

  const handleLink = async () => {
    if (!selectedBusiness) {
      setError("Vui lòng chọn doanh nghiệp");
      return;
    }

    setLoading(true);
    setError(null);

    const result = await createBusinessLink(selectedBusiness.id);

    if (result.error) {
      setError(result.error);
      setLoading(false);
    } else {
      setSuccess(true);
      setTimeout(() => {
        onLinked();
      }, 1500);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
              <Building2 className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900">
                Liên kết tài khoản
              </h3>
              <p className="text-sm text-gray-600">Với doanh nghiệp</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {success ? (
          <div className="text-center py-6">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-10 h-10 text-green-600" />
            </div>
            <h4 className="text-lg font-semibold text-gray-900 mb-2">
              Liên kết thành công!
            </h4>
            <p className="text-gray-600">
              Tài khoản của bạn đã được liên kết với{" "}
              {selectedBusiness?.username}
            </p>
          </div>
        ) : (
          <>
            {/* Select Business (if enabled) */}
            {searchMode ? (
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Chọn doanh nghiệp
                </label>

                {searching ? (
                  <div className="text-center py-8">
                    <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
                    <p className="text-sm text-gray-500 mt-2">
                      Đang tải danh sách...
                    </p>
                  </div>
                ) : searchResults.length === 0 ? (
                  <p className="text-sm text-gray-500 py-4 text-center">
                    Không có doanh nghiệp nào
                  </p>
                ) : (
                  <div className="border border-gray-300 rounded-lg max-h-80 overflow-y-auto">
                    {searchResults.map((business) => (
                      <button
                        key={business.id}
                        type="button"
                        onClick={() => handleBusinessSelect(business)}
                        className="w-full px-4 py-3 text-left hover:bg-gray-50 flex items-center gap-3 border-b border-gray-200 last:border-b-0 transition-colors"
                      >
                        {business.avatar_url ? (
                          <img
                            src={business.avatar_url}
                            alt={business.username}
                            className="w-10 h-10 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                            <Building2 className="w-5 h-5 text-blue-600" />
                          </div>
                        )}
                        <div>
                          <div className="font-medium text-gray-900">
                            {business.username}
                          </div>
                          {business.phone_number && (
                            <div className="text-sm text-gray-500">
                              {business.phone_number}
                            </div>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              selectedBusiness && (
                <div className="mb-6">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <Link className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                      <div className="flex-1">
                        <p className="font-medium text-blue-900 mb-1">
                          Liên kết với:{" "}
                          <span className="font-bold">
                            {selectedBusiness.username}
                          </span>
                        </p>
                        <p className="text-sm text-blue-800">
                          Việc liên kết tài khoản giúp doanh nghiệp quản lý đơn
                          hàng của bạn hiệu quả hơn và cung cấp các ưu đãi đặc
                          biệt.
                        </p>
                      </div>
                      {allowSearch && (
                        <button
                          onClick={() => {
                            setSearchMode(true);
                            setSelectedBusiness(null);
                            setSearchQuery("");
                          }}
                          className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                        >
                          Đổi
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="mt-4 space-y-3">
                    <h4 className="font-semibold text-gray-900">Lợi ích:</h4>
                    <ul className="space-y-2 text-sm text-gray-700">
                      <li className="flex items-start gap-2">
                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                        <span>Theo dõi lịch sử mua hàng dễ dàng</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                        <span>Nhận hạn mức tín dụng và thanh toán trả sau</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                        <span>Được ưu tiên hỗ trợ và chăm sóc khách hàng</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                        <span>
                          Nhận thông báo về chương trình khuyến mãi đặc biệt
                        </span>
                      </li>
                    </ul>
                  </div>
                </div>
              )
            )}

            {/* Error Message */}
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <span className="text-sm">{error}</span>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col gap-3">
              <button
                onClick={handleLink}
                disabled={loading || searchMode || !selectedBusiness}
                className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
              >
                {loading ? "Đang liên kết..." : "Đồng ý liên kết"}
              </button>
              {onSkip && (
                <button
                  onClick={onSkip}
                  disabled={loading}
                  className="w-full px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Bỏ qua (tiếp tục mua hàng)
                </button>
              )}
            </div>

            <p className="text-xs text-gray-500 text-center mt-4">
              Bạn có thể hủy liên kết bất cứ lúc nào trong trang Hồ sơ
            </p>
          </>
        )}
      </div>
    </div>
  );
}
