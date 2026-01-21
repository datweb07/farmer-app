// @ts-nocheck
import { useState, useEffect } from "react";
import { Users, Trash2, CheckCircle, Search, User, Phone, Calendar } from "lucide-react";
import {
    getBusinessLinks,
    removeBusinessLink,
} from "../../lib/business/link.service";
import type { BusinessCustomerLink } from "../../lib/business/link.service";

export function CustomerLinksSection() {
    const [links, setLinks] = useState<BusinessCustomerLink[]>([]);
    const [loading, setLoading] = useState(true);
    const [deleting, setDeleting] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState("");

    useEffect(() => {
        loadLinks();
    }, []);

    const loadLinks = async () => {
        setLoading(true);
        const result = await getBusinessLinks();
        if (result.links) {
            setLinks(result.links);
        }
        setLoading(false);
    };

    const handleRemoveLink = async (linkId: string, customerName: string) => {
        if (!confirm(`Bạn có chắc muốn hủy liên kết với khách hàng ${customerName}?`)) return;

        setDeleting(linkId);
        const result = await removeBusinessLink(linkId);

        if (result.success) {
            await loadLinks();
        } else {
            alert("Lỗi: " + result.error);
        }
        setDeleting(null);
    };

    const activeLinks = links.filter((l) => l.status === "active");

    // Filter by search query
    const filteredLinks = activeLinks.filter((link) => {
        if (!searchQuery.trim()) return true;
        const query = searchQuery.toLowerCase();
        return (
            link.customer_name?.toLowerCase().includes(query) ||
            link.customer_phone?.toLowerCase().includes(query)
        );
    });

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString("vi-VN", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
        });
    };

    return (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
                <div>
                    <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                        <Users className="w-5 h-5" />
                        Quản lý khách hàng
                    </h2>
                    <p className="text-sm text-gray-600 mt-1">
                        Danh sách khách hàng đã liên kết với doanh nghiệp của bạn
                    </p>
                </div>
                <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 rounded-lg">
                    <Users className="w-4 h-4 text-blue-600" />
                    <span className="text-sm font-medium text-blue-600">
                        {activeLinks.length} khách hàng
                    </span>
                </div>
            </div>

            {/* Search Bar */}
            {activeLinks.length > 0 && (
                <div className="relative mb-4">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Tìm kiếm theo tên hoặc số điện thoại..."
                        className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none text-sm"
                    />
                </div>
            )}

            {loading ? (
                <div className="text-center py-8">
                    <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
                    <p className="mt-2 text-sm text-gray-600">Đang tải...</p>
                </div>
            ) : activeLinks.length === 0 ? (
                <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg">
                    <Users className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-600 mb-1">Chưa có khách hàng nào</p>
                    <p className="text-sm text-gray-500">
                        Khách hàng sẽ xuất hiện ở đây khi họ liên kết với doanh nghiệp của bạn
                    </p>
                </div>
            ) : filteredLinks.length === 0 ? (
                <div className="text-center py-8">
                    <Search className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-600 mb-1">Không tìm thấy khách hàng</p>
                    <p className="text-sm text-gray-500">
                        Thử tìm kiếm với từ khóa khác
                    </p>
                </div>
            ) : (
                <div className="space-y-3">
                    {filteredLinks.map((link) => (
                        <div
                            key={link.id}
                            className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                        >
                            <div className="flex items-center gap-3">
                                {link.customer_avatar_url ? (
                                    <img
                                        src={link.customer_avatar_url}
                                        alt={link.customer_name || "Customer"}
                                        className="w-12 h-12 rounded-full object-cover"
                                    />
                                ) : (
                                    <div className="w-12 h-12 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center text-white font-semibold text-lg">
                                        {link.customer_name?.[0]?.toUpperCase() || <User className="w-6 h-6" />}
                                    </div>
                                )}
                                <div>
                                    <div className="font-medium text-gray-900">
                                        {link.customer_name || "Khách hàng"}
                                    </div>
                                    <div className="flex items-center gap-3 mt-1 flex-wrap">
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                            <CheckCircle className="w-3 h-3" />
                                            Đã liên kết
                                        </span>
                                        {link.customer_phone && (
                                            <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                                                <Phone className="w-3 h-3" />
                                                {link.customer_phone}
                                            </span>
                                        )}
                                        <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                                            <Calendar className="w-3 h-3" />
                                            {formatDate(link.linked_at || link.created_at)}
                                        </span>
                                    </div>
                                </div>
                            </div>
                            <button
                                onClick={() =>
                                    handleRemoveLink(
                                        link.id,
                                        link.customer_name || "khách hàng",
                                    )
                                }
                                disabled={deleting === link.id}
                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                                title="Hủy liên kết"
                            >
                                {deleting === link.id ? (
                                    <div className="w-5 h-5 border-2 border-red-600 border-t-transparent rounded-full animate-spin"></div>
                                ) : (
                                    <Trash2 className="w-5 h-5" />
                                )}
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
