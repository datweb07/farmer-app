import {
  Home,
  ShoppingBag,
  Handshake,
  Menu,
  X,
  User,
  Shield,
  BarChart3,
  Droplet,
} from "lucide-react";
import { useState, useEffect } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { NotificationDropdown } from "./NotificationDropdown";
import { isAdmin } from "../../lib/admin/admin.service";

interface NavigationProps {
  currentPage: string;
  onNavigate: (page: string) => void;
}

export function Navigation({ currentPage, onNavigate }: NavigationProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { profile } = useAuth();
  const [isAdminUser, setIsAdminUser] = useState(false);

  useEffect(() => {
    let active = true;
    if (!profile?.id) return () => { active = false; };
    isAdmin().then((adminStatus) => { if (active) setIsAdminUser(adminStatus); });
    return () => { active = false; };
  }, [profile?.id]);

  const allNavItems = [
    { id: "dashboard", label: "Trang chủ", icon: Home, roles: ["farmer"] },
    {
      id: "business-dashboard",
      label: "Quản lý bán hàng",
      icon: BarChart3,
      roles: ["business"],
    },
    { id: "salinity", label: "Độ mặn", icon: Droplet, roles: ["farmer", "business"] },
    { id: "posts", label: "Cộng đồng Thu mua", icon: DurianFruitIcon, roles: ["farmer", "business"] },
    {
      id: "products",
      label: "Sản phẩm",
      icon: ShoppingBag,
      roles: ["farmer", "business"],
    },
    {
      id: "connections",
      label: "Kết nối",
      icon: Handshake,
      roles: ["farmer", "business"],
    },
    {
      id: "profile",
      label: "Hồ sơ",
      icon: User,
      roles: ["farmer", "business"],
    },
  ];

  // Add admin item if user is admin
  const navItemsWithAdmin = isAdminUser
    ? [
      ...allNavItems,
      {
        id: "analytics",
        label: "Thống kê",
        icon: BarChart3,
        roles: ["farmer", "business"],
      },
      {
        id: "admin",
        label: "Admin",
        icon: Shield,
        roles: ["farmer", "business"],
      },
    ]
    : allNavItems;

  // Filter navigation items based on user role
  const navItems = navItemsWithAdmin.filter((item) =>
    item.roles.includes(profile?.role || "farmer"),
  );

  return (
    <>
      {/* Desktop Navigation */}
      <nav className="bg-white border-b-2 border-gray-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex justify-between items-center h-20">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div>
                <h1 className="font-bold text-xl text-blue-600">
                  Nông nghiệp ĐBSCL
                </h1>
                <p className="text-sm text-green-600">Hỗ trợ nông dân</p>
              </div>
            </div>

            {/* Desktop Menu */}
            <div className="hidden md:flex items-center gap-2">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = currentPage === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => onNavigate(item.id)}
                    className={`flex flex-col items-center gap-1 px-6 py-3 rounded-xl transition-all ${isActive
                        ? "bg-blue-500 text-white shadow-lg scale-105"
                        : "text-gray-600 hover:bg-gray-100"
                      }`}
                  >
                    <Icon className="w-6 h-6" />
                    <span className="text-sm font-medium">{item.label}</span>
                  </button>
                );
              })}

              {/* Notification Bell */}
              <NotificationDropdown />
            </div>

            {/* Mobile Menu Button & Notifications */}
            <div className="md:hidden flex items-center gap-2">
              <NotificationDropdown />
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-3 rounded-xl bg-gray-100"
              >
                {mobileMenuOpen ? (
                  <X className="w-6 h-6" />
                ) : (
                  <Menu className="w-6 h-6" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t-2 border-gray-200 bg-white">
            <div className="px-4 py-3 space-y-2">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = currentPage === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      onNavigate(item.id);
                      setMobileMenuOpen(false);
                    }}
                    className={`w-full flex items-center gap-4 px-6 py-4 rounded-xl transition-all ${isActive
                        ? "bg-blue-500 text-white shadow-lg"
                        : "text-gray-700 hover:bg-gray-100"
                      }`}
                  >
                    <Icon className="w-7 h-7" />
                    <span className="text-lg font-medium">{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </nav>
    </>
  );
}

function DurianFruitIcon({ className }: { className?: string }) {
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M12 5c-.9-1.2-.9-2.5-.5-4" />
    <path d="M11.2 6.1c-1.2-1.3-2.7-1.4-3.6-1.1l.3 2.1c-1.5-.2-2.8.4-3.5 1.5l1.4 1.4c-1.3.6-2 1.8-2 3.1l1.9.7c-.9 1.2-.9 2.6-.2 3.8l2-.3c-.3 1.5.4 2.8 1.5 3.5l1.4-1.4c.6 1.3 1.8 2 3.1 2l.7-1.9c1.2.9 2.6.9 3.8.2l-.3-2c1.5.3 2.8-.4 3.5-1.5l-1.4-1.4c1.3-.6 2-1.8 2-3.1l-1.9-.7c.9-1.2.9-2.6.2-3.8l-2 .3c.3-1.5-.4-2.8-1.5-3.5l-1.4 1.4c-.6-1.3-1.8-2-3.1-2l-.7 1.9Z" />
  </svg>;
}
