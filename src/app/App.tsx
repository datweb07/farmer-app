import { useState, useEffect } from "react";
import { HelpCircle } from "lucide-react";
import { AuthProvider, useAuth } from "../contexts/AuthContext";
import { PublicRoute } from "../components/auth/PublicRoute";
import { Navigation } from "./components/Navigation";
import { MobileTopBar } from "./components/MobileTopBar";
import { MobileBottomNav } from "./components/MobileBottomNav";
import { Tutorial } from "./components/Tutorial";
import { DashboardPage } from "./pages/DashboardPage";
import { BusinessDashboardPage } from "./pages/BusinessDashboardPage";
import { SalinityPage } from "./pages/SalinityPage";
import { PostsPage } from "./pages/PostsPage";
import { ProductsPage } from "./pages/ProductsPage";
import { InvestPage } from "./pages/InvestPage";
import { CreateProjectPage } from "./pages/CreateProjectPage";
import { EditProjectPage } from "./pages/EditProjectPage";
import { AdminPage } from "./pages/AdminPage";
import { AnalyticsPage } from "./pages/AnalyticsPage";
import { LoginPage } from "../pages/auth/LoginPage";
import { RegisterPage } from "../pages/auth/RegisterPage";
import { ProfilePage } from "../pages/auth/ProfilePage";
import { SettingsPage } from "../pages/settings/SettingsPage";

function AppContent() {
  const [currentPage, setCurrentPage] = useState("dashboard");
  const [editProjectId, setEditProjectId] = useState<string | null>(null);
  const [showTutorial, setShowTutorial] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(
    null,
  );
  const { profile } = useAuth();

  // Hiển thị tutorial mỗi khi user login thành công
  useEffect(() => {
    if (profile) {
      setShowTutorial(true);
    }
  }, [profile?.id]); // Chỉ trigger khi user ID thay đổi (login mới)

  // Đóng tutorial
  const handleTutorialClose = () => {
    setShowTutorial(false);
  };

  // Redirect business users to invest page if they try to access restricted pages
  useEffect(() => {
    if (profile?.role === "business") {
      const allowedPages = [
        "invest",
        "profile",
        "settings",
        "create-project",
        "edit-project",
        "products", // Business có thể đăng và mua sản phẩm
        "business-dashboard", // Dashboard quản lý bán hàng
      ];
      if (!allowedPages.includes(currentPage)) {
        setCurrentPage("business-dashboard");
      }
    }
  }, [profile, currentPage]);

  const handleNavigate = (page: string) => {
    // Prevent business users from accessing farmer-only pages
    if (profile?.role === "business") {
      const allowedPages = [
        "invest",
        "profile",
        "settings",
        "create-project",
        "edit-project",
        "products", // Business có thể đăng và mua sản phẩm
        "business-dashboard", // Dashboard quản lý bán hàng
      ];
      if (!allowedPages.includes(page)) {
        return; // Silently ignore navigation attempts to restricted pages
      }
    }
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleNavigateToProduct = (productId: string) => {
    setSelectedProductId(productId);
    setCurrentPage("products");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const renderAuthenticatedPage = () => {
    switch (currentPage) {
      case "dashboard":
        return <DashboardPage onNavigate={handleNavigate} />;
      case "business-dashboard":
        return <BusinessDashboardPage />;
      case "salinity":
      case "prophet":
        return <SalinityPage />;
      case "posts":
        return <PostsPage onNavigateToProduct={handleNavigateToProduct} />;
      case "products":
        return (
          <ProductsPage
            selectedProductId={selectedProductId}
            onProductViewed={() => setSelectedProductId(null)}
          />
        );
      case "invest":
        return (
          <InvestPage
            onNavigate={handleNavigate}
            onEditProject={(id) => {
              setEditProjectId(id);
              setCurrentPage("edit-project");
            }}
          />
        );
      case "create-project":
        return <CreateProjectPage onNavigate={handleNavigate} />;
      case "edit-project":
        return editProjectId ? (
          <EditProjectPage
            projectId={editProjectId}
            onNavigate={handleNavigate}
            onSuccess={() => setEditProjectId(null)}
          />
        ) : null;
      case "admin":
        return <AdminPage onNavigate={handleNavigate} />;
      case "analytics":
        return <AnalyticsPage />;
      case "profile":
        return <ProfilePage onNavigate={handleNavigate} />;
      case "settings":
        return <SettingsPage />;
      default:
        return <DashboardPage onNavigate={handleNavigate} />;
    }
  };

  return (
    <PublicRoute
      redirectTo={
        // Authenticated content
        <div className="min-h-screen bg-gray-50">
          {showTutorial && <Tutorial onClose={handleTutorialClose} />}

          {/* Desktop Navigation - Hidden on mobile */}
          <div className="hidden md:block">
            <Navigation currentPage={currentPage} onNavigate={handleNavigate} />
          </div>

          {/* Mobile Top Bar - Only visible on mobile */}
          <MobileTopBar
            profile={profile}
            onNavigateToProfile={() => handleNavigate("profile")}
          />

          {/* Main Content - Add padding for mobile top/bottom nav */}
          <main className="md:pt-0 pt-14 pb-24 md:pb-0">
            {renderAuthenticatedPage()}
          </main>

          {/* Mobile Bottom Navigation - Only visible on mobile */}
          <MobileBottomNav
            currentPage={currentPage}
            onNavigate={handleNavigate}
          />

          {/* Help Button - Hide on mobile */}
          <button
            onClick={() => setShowTutorial(true)}
            className="hidden md:flex fixed bottom-6 right-6 bg-gradient-to-r from-blue-500 to-blue-600 text-white p-4 rounded-full shadow-2xl hover:scale-110 transition-transform z-40 items-center gap-2"
            title="Mở hướng dẫn"
          >
            <HelpCircle className="w-6 h-6" />
            <span className="font-bold">Trợ giúp</span>
          </button>

          {/* Footer */}
          <footer className="bg-gradient-to-r from-gray-800 to-gray-900 text-white py-8 mt-12">
            <div className="max-w-7xl mx-auto px-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-6">
                <div>
                  <h3 className="font-bold text-lg mb-3 flex items-center gap-2">
                    Nông nghiệp ĐBSCL
                  </h3>
                  <p className="text-gray-300 text-sm">
                    Nền tảng hỗ trợ nông dân vượt qua thách thức xâm nhập mặn,
                    ứng dụng công nghệ để phát triển bền vững.
                  </p>
                </div>
                <div>
                  <h4 className="font-bold mb-3">Liên kết nhanh</h4>
                  <ul className="space-y-2 text-sm text-gray-300">
                    <li>
                      <button
                        onClick={() => handleNavigate("dashboard")}
                        className="hover:text-white transition-colors"
                      >
                        Trang chủ
                      </button>
                    </li>
                    <li>
                      <button
                        onClick={() => handleNavigate("salinity")}
                        className="hover:text-white transition-colors"
                      >
                        Dự đoán độ mặn
                      </button>
                    </li>
                    {/* <li>
                      <button
                        onClick={() => handleNavigate("prophet")}
                        className="hover:text-white transition-colors"
                      >
                        Độ mặn dự báo
                      </button>
                    </li> */}
                    <li>
                      <button
                        onClick={() => handleNavigate("posts")}
                        className="hover:text-white transition-colors"
                      >
                        Cộng đồng
                      </button>
                    </li>
                    <li>
                      <button
                        onClick={() => handleNavigate("invest")}
                        className="hover:text-white transition-colors"
                      >
                        Đầu tư & Hợp tác
                      </button>
                    </li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-bold mb-3">Liên hệ hỗ trợ</h4>
                  <ul className="space-y-2 text-sm text-gray-300">
                    <li>📞 Hotline: 1800-1234</li>
                    <li>✉️ Email: dat82770@gmail.com</li>
                    <li>📍 TP.HCM, Việt Nam</li>
                    <li>🕐 8:00 - 20:00 hàng ngày</li>
                  </ul>
                </div>
              </div>
              <div className="border-t border-gray-700 pt-6 text-center text-sm text-gray-400">
                <p>
                  © 2025 Nền tảng Nông nghiệp ĐBSCL. Phát triển bởi đội ngũ công
                  nghệ vì nông dân.
                </p>
                <p className="mt-2">Cùng nhau xây dựng nông nghiệp bền vững</p>
              </div>
            </div>
          </footer>
        </div>
      }
    >
      {/* Login/Register pages for non-authenticated users */}
      {currentPage === "register" ? (
        <RegisterPage onNavigateToLogin={() => setCurrentPage("login")} />
      ) : (
        <LoginPage onNavigateToRegister={() => setCurrentPage("register")} />
      )}
    </PublicRoute>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
