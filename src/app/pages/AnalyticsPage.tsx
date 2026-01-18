import { useState } from "react";
import { BarChart3, TrendingUp, Users, DollarSign } from "lucide-react";
import { UserAnalytics } from "../components/analytics/UserAnalytics";
import { ProjectAnalytics } from "../components/analytics/ProjectAnalytics";
import { PlatformStatistics } from "../components/analytics/PlatformStatistics";

type AnalyticsTab = "users" | "projects" | "platform";

export function AnalyticsPage() {
  const [activeTab, setActiveTab] = useState<AnalyticsTab>("platform");

  const tabs = [
    {
      id: "platform" as AnalyticsTab,
      label: "Tổng quan nền tảng",
      icon: BarChart3,
    },
    {
      id: "users" as AnalyticsTab,
      label: "Phân tích người dùng",
      icon: Users,
    },
    {
      id: "projects" as AnalyticsTab,
      label: "Phân tích dự án",
      icon: DollarSign,
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <TrendingUp className="w-8 h-8 text-green-600" />
            <h1 className="text-3xl font-bold text-gray-900">
              Phân tích & Báo cáo
            </h1>
          </div>
          <p className="text-gray-600">
            Theo dõi hiệu suất, xu hướng và tăng trưởng của nền tảng
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b border-gray-200">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  flex items-center gap-2 px-4 py-3 font-medium transition-colors
                  border-b-2 -mb-[1px]
                  ${
                    activeTab === tab.id
                      ? "border-green-600 text-green-600"
                      : "border-transparent text-gray-600 hover:text-gray-900"
                  }
                `}
              >
                <Icon className="w-5 h-5" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Content */}
        <div className="space-y-6">
          {activeTab === "platform" && <PlatformStatistics />}
          {activeTab === "users" && <UserAnalytics />}
          {activeTab === "projects" && <ProjectAnalytics />}
        </div>
      </div>
    </div>
  );
}
