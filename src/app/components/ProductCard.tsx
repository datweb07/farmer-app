import { Phone, Award, Tag } from 'lucide-react';
import type { Product } from '../../data/mockData';

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(price);
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg overflow-hidden border-2 border-gray-100 hover:shadow-xl transition-all hover:scale-105">
      {/* Image */}
      <div className="relative">
        <img
          src={product.image}
          alt={product.name}
          className="w-full h-56 object-cover"
        />
        <div className="absolute top-3 right-3 bg-blue-500 text-white px-3 py-1 rounded-full flex items-center gap-1">
          <Tag className="w-4 h-4" />
          <span className="text-sm font-bold">{product.category}</span>
        </div>
      </div>

      {/* Content */}
      <div className="p-5">
        <h3 className="font-bold text-xl text-gray-900 mb-2">{product.name}</h3>
        <p className="text-gray-600 text-sm leading-relaxed line-clamp-2 mb-4">
          {product.description}
        </p>

        {/* Price */}
        <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-xl p-4 mb-4">
          <p className="text-sm text-gray-600 mb-1">Giá bán</p>
          <p className="text-2xl font-bold text-green-600">{formatPrice(product.price)}</p>
        </div>

        {/* Seller Info */}
        <div className="flex items-center gap-2 mb-4 pb-4 border-b border-gray-100">
          <div className="flex-1">
            <p className="text-sm text-gray-500">Người bán</p>
            <p className="font-bold text-gray-900">{product.seller}</p>
          </div>
          <div className="flex items-center gap-1 bg-yellow-100 px-3 py-2 rounded-lg">
            <Award className="w-5 h-5 text-yellow-600" />
            <span className="font-bold text-yellow-700">{product.sellerPoints}</span>
          </div>
        </div>

        {/* Contact Button */}
        <button className="w-full bg-gradient-to-r from-blue-500 to-blue-600 text-white px-6 py-4 rounded-xl font-bold flex items-center justify-center gap-3 hover:scale-105 transition-transform shadow-lg">
          <Phone className="w-6 h-6" />
          Liên hệ: {product.contact}
        </button>
      </div>
    </div>
  );
}
