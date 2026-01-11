import { Home, Droplet, FileText, ShoppingBag, TrendingUp, Menu, X, User } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';

interface NavigationProps {
  currentPage: string;
  onNavigate: (page: string) => void;
}

export function Navigation({ currentPage, onNavigate }: NavigationProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { profile } = useAuth();

  const allNavItems = [
    { id: 'dashboard', label: 'Trang chủ', icon: Home, roles: ['farmer'] },
    { id: 'salinity', label: 'Độ mặn', icon: Droplet, roles: ['farmer'] },
    { id: 'posts', label: 'Cộng đồng', icon: FileText, roles: ['farmer'] },
    { id: 'products', label: 'Sản phẩm', icon: ShoppingBag, roles: ['farmer'] },
    { id: 'invest', label: 'Đầu tư', icon: TrendingUp, roles: ['farmer', 'business'] },
    { id: 'profile', label: 'Hồ sơ', icon: User, roles: ['farmer', 'business'] },
  ];

  // Filter navigation items based on user role
  const navItems = allNavItems.filter(item =>
    item.roles.includes(profile?.role || 'farmer')
  );

  return (
    <>
      {/* Desktop Navigation */}
      <nav className="bg-white border-b-2 border-gray-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex justify-between items-center h-20">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-br from-green-500 to-blue-500 p-3 rounded-xl">
                <Droplet className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="font-bold text-xl text-gray-900">Nông nghiệp ĐBSCL</h1>
                <p className="text-sm text-gray-500">Hỗ trợ nông dân</p>
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
                      ? 'bg-blue-500 text-white shadow-lg scale-105'
                      : 'text-gray-600 hover:bg-gray-100'
                      }`}
                  >
                    <Icon className="w-6 h-6" />
                    <span className="text-sm font-medium">{item.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-3 rounded-xl bg-gray-100"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
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
                      ? 'bg-blue-500 text-white shadow-lg'
                      : 'text-gray-700 hover:bg-gray-100'
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
