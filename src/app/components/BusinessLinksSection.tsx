// @ts-nocheck
import { useState, useEffect } from "react";
import { Building2, Plus, Trash2, CheckCircle, X } from "lucide-react";
import {
  getCustomerLinks,
  removeBusinessLink,
} from "../../lib/business/link.service";
import type { BusinessCustomerLink } from "../../lib/business/link.service";
import { BusinessLinkModal } from "./BusinessLinkModal";

export function BusinessLinksSection() {
  const [links, setLinks] = useState<BusinessCustomerLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    loadLinks();
  }, []);

  const loadLinks = async () => {
    setLoading(true);
    const result = await getCustomerLinks();
    if (result.links) {
      setLinks(result.links);
    }
    setLoading(false);
  };

  const handleRemoveLink = async (linkId: string, businessName: string) => {
    if (!confirm(`Bạn có chắc muốn hủy liên kết với ${businessName}?`)) return;

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

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Building2 className="w-5 h-5" />
            Liên kết doanh nghiệp
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            Quản lý các doanh nghiệp bạn đã liên kết
          </p>
        </div>
        <button
          onClick={() => setShowLinkModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
        >
          <Plus className="w-4 h-4" />
          Thêm liên kết
        </button>
      </div>

      {loading ? (
        <div className="text-center py-8">
          <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-2 text-sm text-gray-600">Đang tải...</p>
        </div>
      ) : activeLinks.length === 0 ? (
        <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg">
          <Building2 className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-600 mb-1">Chưa có liên kết nào</p>
          <p className="text-sm text-gray-500">
            Liên kết với doanh nghiệp để nhận ưu đãi đặc biệt
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {activeLinks.map((link) => (
            <div
              key={link.id}
              className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <Building2 className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <div className="font-medium text-gray-900">
                    {link.business_name || "Doanh nghiệp"}
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      <CheckCircle className="w-3 h-3" />
                      Đã liên kết
                    </span>
                    <span className="text-xs text-gray-500">
                      {new Date(
                        link.linked_at || link.created_at,
                      ).toLocaleDateString("vi-VN")}
                    </span>
                  </div>
                </div>
              </div>
              <button
                onClick={() =>
                  handleRemoveLink(
                    link.id,
                    link.business_name || "doanh nghiệp",
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

      {/* Link Modal */}
      {showLinkModal && (
        <BusinessLinkModal
          allowSearch={true}
          onClose={() => setShowLinkModal(false)}
          onLinked={() => {
            setShowLinkModal(false);
            loadLinks();
          }}
        />
      )}
    </div>
  );
}
