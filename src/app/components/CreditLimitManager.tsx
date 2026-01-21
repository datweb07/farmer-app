// @ts-nocheck
import { useState, useEffect } from "react";
import {
  CreditCard,
  Plus,
  Edit,
  Trash2,
  Search,
  X,
  AlertCircle,
  CheckCircle,
  Users,
} from "lucide-react";
import {
  createCreditLimit,
  getBusinessCreditLimits,
  updateCreditLimit,
  deleteCreditLimit,
} from "../../lib/payment/credit.service";
import type { CreditLimit } from "../../lib/payment/types";
import { supabase } from "../../lib/supabase/supabase";

export function CreditLimitManager() {
  const [creditLimits, setCreditLimits] = useState<CreditLimit[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingLimit, setEditingLimit] = useState<CreditLimit | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);

  // Form state
  const [formData, setFormData] = useState({
    credit_limit: "",
    default_term_days: "30",
    default_interest_rate: "0",
    default_late_fee_rate: "2",
    risk_level: "medium" as "low" | "medium" | "high",
    notes: "",
  });

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    loadCreditLimits();
  }, []);

  const loadCreditLimits = async () => {
    setLoading(true);
    const result = await getBusinessCreditLimits();
    if (result.creditLimits) {
      setCreditLimits(result.creditLimits);
    }
    setLoading(false);
  };

  const searchCustomers = async (query: string) => {
    if (!query || query.length < 2) {
      setSearchResults([]);
      return;
    }

    const { data, error } = await supabase
      .from("profiles")
      .select("id, username, phone_number, avatar_url, role")
      .or(`username.ilike.%${query}%,phone_number.ilike.%${query}%`)
      .limit(10);

    if (!error && data) {
      setSearchResults(data);
    }
  };

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    searchCustomers(value);
  };

  const handleCustomerSelect = (customer: any) => {
    setSelectedCustomer(customer);
    setSearchQuery(customer.username);
    setSearchResults([]);
  };

  const handleOpenModal = (limit?: CreditLimit) => {
    if (limit) {
      setEditingLimit(limit);
      setFormData({
        credit_limit: limit.credit_limit.toString(),
        default_term_days: limit.default_term_days?.toString() || "30",
        default_interest_rate: limit.default_interest_rate?.toString() || "0",
        default_late_fee_rate: limit.default_late_fee_rate?.toString() || "2",
        risk_level: limit.risk_level || "medium",
        notes: limit.notes || "",
      });
      // Load customer info
      loadCustomerInfo(limit.customer_id);
    } else {
      setEditingLimit(null);
      setFormData({
        credit_limit: "",
        default_term_days: "30",
        default_interest_rate: "0",
        default_late_fee_rate: "2",
        risk_level: "medium",
        notes: "",
      });
      setSelectedCustomer(null);
      setSearchQuery("");
    }
    setShowModal(true);
    setError(null);
    setSuccess(null);
  };

  const loadCustomerInfo = async (customerId: string) => {
    const { data } = await supabase
      .from("profiles")
      .select("id, username, phone_number, avatar_url, role")
      .eq("id", customerId)
      .single();

    if (data) {
      setSelectedCustomer(data);
      setSearchQuery(data.username);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setSuccess(null);

    if (!selectedCustomer && !editingLimit) {
      setError("Vui lòng chọn khách hàng");
      setSubmitting(false);
      return;
    }

    const payload = {
      customer_id: editingLimit
        ? editingLimit.customer_id
        : selectedCustomer.id,
      credit_limit: parseFloat(formData.credit_limit),
      default_term_days: parseInt(formData.default_term_days),
      default_interest_rate: parseFloat(formData.default_interest_rate),
      default_late_fee_rate: parseFloat(formData.default_late_fee_rate),
      risk_level: formData.risk_level,
      notes: formData.notes,
    };

    if (editingLimit) {
      const result = await updateCreditLimit(editingLimit.id, payload);
      if (result.error) {
        setError(result.error);
      } else {
        setSuccess("Cập nhật hạn mức thành công!");
        setTimeout(() => {
          setShowModal(false);
          loadCreditLimits();
        }, 1500);
      }
    } else {
      const result = await createCreditLimit(payload);
      if (result.error) {
        setError(result.error);
      } else {
        setSuccess("Tạo hạn mức thành công!");
        setTimeout(() => {
          setShowModal(false);
          loadCreditLimits();
        }, 1500);
      }
    }

    setSubmitting(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Bạn có chắc muốn xóa hạn mức này?")) return;

    const result = await deleteCreditLimit(id);
    if (result.error) {
      alert("Lỗi: " + result.error);
    } else {
      loadCreditLimits();
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(amount);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            Quản lý hạn mức tín dụng
          </h2>
          <p className="text-gray-600 mt-1">
            Thiết lập kỳ hạn và lãi suất cho khách hàng
          </p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Thêm hạn mức
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Tổng khách hàng</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {creditLimits.length}
              </p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Tổng hạn mức</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {formatCurrency(
                  creditLimits.reduce((sum, l) => sum + l.credit_limit, 0),
                )}
              </p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
              <CreditCard className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Đang hoạt động</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {creditLimits.filter((l) => l.is_active).length}
              </p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Credit Limits Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Khách hàng
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Hạn mức
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Đã sử dụng
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Kỳ hạn
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Lãi suất
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Trạng thái
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Thao tác
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-6 py-8 text-center text-gray-500"
                  >
                    Đang tải...
                  </td>
                </tr>
              ) : creditLimits.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-6 py-8 text-center text-gray-500"
                  >
                    Chưa có hạn mức nào
                  </td>
                </tr>
              ) : (
                creditLimits.map((limit) => (
                  <tr key={limit.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">
                        {limit.customer_username || "N/A"}
                      </div>
                      <div className="text-sm text-gray-500">
                        {limit.customer_phone}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {formatCurrency(limit.credit_limit)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">
                        {formatCurrency(limit.used_credit || 0)}
                      </div>
                      <div className="text-xs text-gray-500">
                        Còn:{" "}
                        {formatCurrency(
                          limit.available_credit || limit.credit_limit,
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {limit.default_term_days} ngày
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {limit.default_interest_rate}% / năm
                    </td>
                    <td className="px-6 py-4">
                      {limit.is_active ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          Hoạt động
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                          Tạm ngưng
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleOpenModal(limit)}
                          className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(limit.id)}
                          className="p-1 text-red-600 hover:bg-red-50 rounded"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h3 className="text-xl font-bold text-gray-900">
                {editingLimit ? "Chỉnh sửa hạn mức" : "Thêm hạn mức mới"}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {/* Customer Search */}
              {!editingLimit && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Khách hàng <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => handleSearchChange(e.target.value)}
                      placeholder="Tìm kiếm theo tên hoặc email..."
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                    {searchResults.length > 0 && (
                      <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                        {searchResults.map((customer) => (
                          <button
                            key={customer.id}
                            type="button"
                            onClick={() => handleCustomerSelect(customer)}
                            className="w-full px-4 py-3 text-left hover:bg-gray-50 flex items-center gap-3"
                          >
                            {customer.avatar_url ? (
                              <img
                                src={customer.avatar_url}
                                alt={customer.username}
                                className="w-10 h-10 rounded-full object-cover"
                              />
                            ) : (
                              <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center">
                                <Users className="w-5 h-5 text-gray-600" />
                              </div>
                            )}
                            <div>
                              <div className="font-medium text-gray-900">
                                {customer.username}
                              </div>
                              {customer.phone_number && (
                                <div className="text-sm text-gray-500">
                                  {customer.phone_number}
                                </div>
                              )}
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  {selectedCustomer && (
                    <div className="mt-2 p-3 bg-blue-50 rounded-lg flex items-center gap-3">
                      {selectedCustomer.avatar_url ? (
                        <img
                          src={selectedCustomer.avatar_url}
                          alt={selectedCustomer.username}
                          className="w-10 h-10 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-10 h-10 bg-blue-200 rounded-full flex items-center justify-center">
                          <Users className="w-5 h-5 text-blue-600" />
                        </div>
                      )}
                      <div className="flex-1">
                        <div className="font-medium text-gray-900">
                          {selectedCustomer.username}
                        </div>
                        {selectedCustomer.phone_number && (
                          <div className="text-sm text-gray-600">
                            {selectedCustomer.phone_number}
                          </div>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedCustomer(null);
                          setSearchQuery("");
                        }}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Credit Limit */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Hạn mức tín dụng (₫) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  value={formData.credit_limit}
                  onChange={(e) =>
                    setFormData({ ...formData, credit_limit: e.target.value })
                  }
                  placeholder="10000000"
                  min="0"
                  step="100000"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              {/* Term Days and Interest Rate */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Kỳ hạn mặc định (ngày)
                  </label>
                  <select
                    value={formData.default_term_days}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        default_term_days: e.target.value,
                      })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="30">30 ngày</option>
                    <option value="60">60 ngày</option>
                    <option value="90">90 ngày</option>
                    <option value="120">120 ngày</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Lãi suất (% / năm)
                  </label>
                  <input
                    type="number"
                    value={formData.default_interest_rate}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        default_interest_rate: e.target.value,
                      })
                    }
                    placeholder="0"
                    min="0"
                    max="100"
                    step="0.1"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Late Fee Rate and Risk Level */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Phí trả chậm (% / tháng)
                  </label>
                  <input
                    type="number"
                    value={formData.default_late_fee_rate}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        default_late_fee_rate: e.target.value,
                      })
                    }
                    placeholder="2"
                    min="0"
                    max="10"
                    step="0.1"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Mức độ rủi ro
                  </label>
                  <select
                    value={formData.risk_level}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        risk_level: e.target.value as "low" | "medium" | "high",
                      })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="low">Thấp</option>
                    <option value="medium">Trung bình</option>
                    <option value="high">Cao</option>
                  </select>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Ghi chú
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) =>
                    setFormData({ ...formData, notes: e.target.value })
                  }
                  rows={3}
                  placeholder="Thông tin bổ sung..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                />
              </div>

              {/* Error/Success Messages */}
              {error && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700">
                  <AlertCircle className="w-5 h-5" />
                  <span>{error}</span>
                </div>
              )}

              {success && (
                <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700">
                  <CheckCircle className="w-5 h-5" />
                  <span>{success}</span>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
                >
                  {submitting
                    ? "Đang xử lý..."
                    : editingLimit
                      ? "Cập nhật"
                      : "Tạo hạn mức"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
