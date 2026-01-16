import { ShoppingBag, ArrowRight } from "lucide-react";
import type { ProductWithStats } from "../../lib/community/types";

interface RecentProductsProps {
  products: ProductWithStats[];
  loading?: boolean;
  onNavigate?: (page: string) => void;
}

export function RecentProducts({
  products,
  loading,
  onNavigate,
}: RecentProductsProps) {
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(price);
  };

  if (loading) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="font-semibold text-lg text-gray-900 mb-4">
          Sản phẩm mới
        </h3>
        <div className="grid grid-cols-2 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="animate-pulse">
              <div className="aspect-square bg-gray-200 rounded-lg mb-2" />
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-1" />
              <div className="h-3 bg-gray-200 rounded w-1/2" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="font-semibold text-lg text-gray-900 mb-4">
          Sản phẩm mới
        </h3>
        <div className="text-center py-6">
          <p className="text-gray-500 text-sm">Chưa có sản phẩm nào</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-lg text-gray-900 flex items-center gap-2">
          Sản phẩm mới
        </h3>
        <button
          onClick={() => onNavigate?.("products")}
          className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
        >
          Xem tất cả
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {products.slice(0, 4).map((product) => (
          <div
            key={product.id}
            className="border border-gray-200 rounded-lg overflow-hidden hover:border-blue-300 hover:shadow-sm transition-all cursor-pointer group"
          >
            {product.image_url ? (
              <img
                src={product.image_url}
                alt={product.name}
                className="w-full aspect-square object-cover"
              />
            ) : (
              <div className="w-full aspect-square bg-gradient-to-br from-purple-100 to-blue-100 flex items-center justify-center">
                <ShoppingBag className="w-12 h-12 text-gray-400" />
              </div>
            )}
            <div className="p-3">
              <h4 className="text-sm font-medium text-gray-900 truncate group-hover:text-blue-600">
                {product.name}
              </h4>
              <p className="text-sm font-semibold text-blue-600 mt-1">
                {formatPrice(product.price)}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {product.views_count} lượt xem
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
