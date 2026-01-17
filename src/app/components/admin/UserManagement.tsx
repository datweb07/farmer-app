import { useState, useEffect } from "react";
import {
  Search,
  Ban,
  Shield,
  Edit,
  Loader2,
  CheckCircle,
  XCircle,
} from "lucide-react";
import {
  getUsers,
  banUser,
  changeUserRole,
} from "../../../lib/admin/admin.service";
import type { AdminUser } from "../../../lib/admin/types";

export function UserManagement() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | "farmer" | "business">(
    "all",
  );
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "banned">(
    "all",
  );
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    loadUsers();
  }, [roleFilter, statusFilter]);

  const loadUsers = async () => {
    setLoading(true);
    const result = await getUsers({
      search: searchQuery || undefined,
      role: roleFilter !== "all" ? roleFilter : undefined,
      status: statusFilter !== "all" ? statusFilter : undefined,
      limit: 50,
    });
    if (!result.error) {
      setUsers(result.users);
    }
    setLoading(false);
  };

  const handleBan = async (userId: string, currentlyBanned: boolean) => {
    const reason = prompt(
      currentlyBanned
        ? "Lý do mở khóa tài khoản (tùy chọn):"
        : "Lý do khóa tài khoản (bắt buộc):",
    );

    if (!currentlyBanned && !reason) {
      alert("Vui lòng nhập lý do khóa tài khoản");
      return;
    }

    setActionLoading(userId);
    const result = await banUser({
      user_id: userId,
      ban_status: !currentlyBanned,
      reason: reason || undefined,
    });

    if (result.success) {
      await loadUsers();
      alert(currentlyBanned ? "Đã mở khóa tài khoản" : "Đã khóa tài khoản");
    } else {
      alert("Lỗi: " + result.error);
    }
    setActionLoading(null);
  };

  const handleChangeRole = async (userId: string, currentRole: string) => {
    const newRole = prompt(
      `Thay đổi vai trò từ "${currentRole}" sang (farmer/business):`,
      currentRole,
    );

    if (!newRole || (newRole !== "farmer" && newRole !== "business")) {
      alert("Vai trò không hợp lệ");
      return;
    }

    const makeAdmin = confirm(
      "Bạn có muốn cấp quyền admin cho user này không?",
    );

    setActionLoading(userId);
    const result = await changeUserRole({
      user_id: userId,
      new_role: newRole as "farmer" | "business",
      make_admin: makeAdmin,
    });

    if (result.success) {
      await loadUsers();
      alert("Đã cập nhật vai trò");
    } else {
      alert("Lỗi: " + result.error);
    }
    setActionLoading(null);
  };

  return (
    <div className="bg-white rounded-lg shadow-sm">
      {/* Filters */}
      <div className="p-6 border-b">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tìm kiếm
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && loadUsers()}
                placeholder="Tìm theo tên..."
                className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Vai trò
            </label>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value as any)}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">Tất cả</option>
              <option value="farmer">Nông dân</option>
              <option value="business">Doanh nghiệp</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Trạng thái
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">Tất cả</option>
              <option value="active">Hoạt động</option>
              <option value="banned">Bị khóa</option>
            </select>
          </div>
        </div>
        <button
          onClick={loadUsers}
          className="mt-4 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          Tìm kiếm
        </button>
      </div>

      {/* Users Table */}
      <div className="overflow-x-auto">
        {loading ? (
          <div className="p-12 text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-600 mb-2" />
            <p className="text-gray-600">Đang tải...</p>
          </div>
        ) : users.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            Không tìm thấy user nào
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Vai trò
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Hoạt động
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Điểm
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Trạng thái
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  Hành động
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {users.map((user) => (
                <tr key={user.id} className={user.is_banned ? "bg-red-50" : ""}>
                  <td className="px-6 py-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-gray-900">
                          {user.username}
                        </p>
                        {user.is_admin && (
                          <Shield
                            className="w-4 h-4 text-yellow-600"
                            aria-label="Admin"
                          />
                        )}
                      </div>
                      <p className="text-sm text-gray-500">
                        {user.phone_number}
                      </p>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                        user.role === "business"
                          ? "bg-purple-100 text-purple-800"
                          : "bg-green-100 text-green-800"
                      }`}
                    >
                      {user.role === "business" ? "Doanh nghiệp" : "Nông dân"}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    <div>{user.total_posts} bài viết</div>
                    <div>{user.total_products} sản phẩm</div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="font-semibold text-gray-900">
                      {user.points}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {user.is_banned ? (
                      <div>
                        <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800">
                          <XCircle className="w-3 h-3" />
                          Bị khóa
                        </span>
                        {user.banned_reason && (
                          <p className="text-xs text-gray-500 mt-1">
                            {user.banned_reason}
                          </p>
                        )}
                      </div>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                        <CheckCircle className="w-3 h-3" />
                        Hoạt động
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleChangeRole(user.id, user.role)}
                        disabled={actionLoading === user.id}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Thay đổi vai trò"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleBan(user.id, user.is_banned)}
                        disabled={actionLoading === user.id}
                        className={`p-2 rounded-lg transition-colors ${
                          user.is_banned
                            ? "text-green-600 hover:bg-green-50"
                            : "text-red-600 hover:bg-red-50"
                        }`}
                        title={user.is_banned ? "Mở khóa" : "Khóa tài khoản"}
                      >
                        {actionLoading === user.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Ban className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
