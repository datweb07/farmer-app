import { useEffect } from 'react';
import { Phone, Award, Tag, Eye } from 'lucide-react';
import type { ProductWithStats } from '../../lib/community/types';
import { trackProductView, formatPrice, getZaloLink } from '../../lib/community/products.service';

interface ProductCardProps {
  product: ProductWithStats;
  onViewDetail?: () => void;
}

export function ProductCard({ product, onViewDetail }: ProductCardProps) {
  useEffect(() => {
    trackProductView(product.id);
  }, [product.id]);

  const handleZaloContact = () => {
    const zaloLink = getZaloLink(product.contact);
    window.open(zaloLink, '_blank');
  };

  return (
    <div
      className="bg-white border border-gray-200 rounded-lg overflow-hidden cursor-pointer hover:shadow-lg transition-shadow"
      onClick={onViewDetail}
    >
      {/* Image */}
      <div className="relative">
        {product.image_url ? (
          <img
            src={product.image_url}
            alt={product.name}
            className="w-full h-64 object-cover"
          />
        ) : (
          <div className="w-full h-48 bg-gray-100 flex items-center justify-center">
            <Tag className="w-12 h-12 text-gray-400" />
          </div>
        )}
        <div className="absolute top-2 right-2 bg-blue-600 text-white px-2 py-1 rounded flex items-center gap-1">
          <Tag className="w-3 h-3" />
          <span className="text-xs font-medium">{product.category}</span>
        </div>
        <div className="absolute bottom-2 left-2 bg-gray-800 text-white px-2 py-1 rounded flex items-center gap-1">
          <Eye className="w-3 h-3" />
          <span className="text-xs font-medium">{product.views_count}</span>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        <h3 className="font-semibold text-gray-900 mb-2">{product.name}</h3>
        <p className="text-gray-600 text-sm leading-relaxed line-clamp-2 mb-3">
          {product.description}
        </p>

        {/* Price */}
        <div className="border border-gray-200 rounded-lg p-3 mb-3">
          <p className="text-sm text-gray-600 mb-1">Giá bán</p>
          <p className="text-lg font-semibold text-blue-600">{formatPrice(product.price)}</p>
        </div>

        {/* Seller Info */}
        <div className="flex items-center gap-2 mb-3 pb-3 border-b border-gray-200">
          <div className="flex-1">
            <p className="text-xs text-gray-500">Người bán</p>
            <p className="font-medium text-gray-900 text-sm">{product.seller_username}</p>
          </div>
          <div className="flex items-center gap-1 bg-blue-50 px-2 py-1 rounded">
            <Award className="w-3 h-3 text-blue-600" />
            <span className="text-xs font-medium text-blue-700">{product.seller_points}</span>
          </div>
        </div>

        {/* Contact Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleZaloContact();
          }}
          className="w-full bg-blue-600 text-white px-3 py-2 rounded-lg font-medium flex items-center justify-center gap-2 hover:bg-blue-700 transition-colors"
        >
          <Phone className="w-4 h-4" />
          <span className="text-sm">Liên hệ Zalo</span>
        </button>
      </div>
    </div>
  );
}