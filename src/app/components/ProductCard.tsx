import { useEffect, useState } from "react";
import { Phone, Award, Tag, Eye, ShoppingCart } from "lucide-react";
import type { ProductWithStats } from "../../lib/community/types";
import {
  trackProductView,
  formatPrice,
  getZaloLink,
} from "../../lib/community/products.service";
import { supabase } from "../../lib/supabase/supabase";
import { MediaCarousel } from "./MediaCarousel";
import type { MediaItem } from "./MediaCarousel";

interface ProductCardProps {
  product: ProductWithStats;
  onViewDetail?: () => void;
  onBuyClick?: () => void; // Callback khi click nút Mua
}

export function ProductCard({
  product,
  onViewDetail,
  onBuyClick,
}: ProductCardProps) {
  const [productMedia, setProductMedia] = useState<MediaItem[]>([]);
  const [loadingMedia, setLoadingMedia] = useState(true);

  // Kiểm tra seller role để hiển thị nút phù hợp
  const isBusinessProduct = product.seller_role === "business";

  useEffect(() => {
    trackProductView(product.id);
    loadProductMedia();
  }, [product.id]);

  // Fetch product images and videos
  const loadProductMedia = async () => {
    try {
      // Load images
      const { data: imagesData, error: imagesError } = await supabase
        .from("product_images")
        .select("image_url, display_order")
        .eq("product_id", product.id)
        .order("display_order");

      // Load videos
      const { data: videosData, error: videosError } = await supabase
        .from("product_videos")
        .select("video_url, thumbnail_url")
        .eq("product_id", product.id);

      if (imagesError) throw imagesError;
      if (videosError) throw videosError;

      const media: MediaItem[] = [];

      // Add images
      if (imagesData && imagesData.length > 0) {
        imagesData.forEach((img: any) => {
          media.push({
            type: "image",
            url: img.image_url,
            display_order: img.display_order,
          });
        });
      } else if (product.image_url) {
        // Fallback to legacy single image
        media.push({
          type: "image",
          url: product.image_url,
          display_order: 0,
        });
      }

      // Add videos
      if (videosData && videosData.length > 0) {
        videosData.forEach((video: any) => {
          media.push({
            type: "video",
            url: video.video_url,
            thumbnail_url: video.thumbnail_url,
            display_order: 999, // Videos come after images by default
          });
        });
      }

      // Sort by display_order
      media.sort((a, b) => (a.display_order || 0) - (b.display_order || 0));

      setProductMedia(media);
    } catch (error) {
      console.error("Error loading product media:", error);
      // Fallback to legacy single image
      if (product.image_url) {
        setProductMedia([
          {
            type: "image",
            url: product.image_url,
            display_order: 0,
          },
        ]);
      }
    } finally {
      setLoadingMedia(false);
    }
  };

  const handleZaloContact = () => {
    const zaloLink = getZaloLink(product.contact);
    window.open(zaloLink, "_blank");
  };

  return (
    <div
      className="bg-white border border-gray-200 rounded-lg overflow-hidden cursor-pointer hover:shadow-lg transition-shadow"
      onClick={onViewDetail}
    >
      {/* Multiple Images/Videos - Media Carousel */}
      <div className="relative">
        {!loadingMedia && productMedia.length > 0 ? (
          <MediaCarousel media={productMedia} className="h-64" />
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
          <p className="text-lg font-semibold text-blue-600">
            {formatPrice(product.price)}
          </p>
        </div>

        {/* Seller Info */}
        <div className="flex items-center gap-2 mb-3 pb-3 border-b border-gray-200">
          <div className="flex-1">
            <p className="text-xs text-gray-500">Người bán</p>
            <p className="font-medium text-gray-900 text-sm">
              {product.seller_username}
            </p>
          </div>
          <div className="flex items-center gap-1 bg-blue-50 px-2 py-1 rounded">
            <Award className="w-3 h-3 text-blue-600" />
            <span className="text-xs font-medium text-blue-700">
              {product.seller_points}
            </span>
          </div>
        </div>

        {/* Contact Button */}
        {isBusinessProduct ? (
          // Nút Mua cho sản phẩm doanh nghiệp
          <button
            onClick={(e) => {
              e.stopPropagation();
              onBuyClick?.();
            }}
            className="w-full bg-green-600 text-white px-3 py-2 rounded-lg font-medium flex items-center justify-center gap-2 hover:bg-green-700 transition-colors"
          >
            <ShoppingCart className="w-4 h-4" />
            <span className="text-sm">Mua ngay</span>
          </button>
        ) : (
          // Nút Liên hệ Zalo cho sản phẩm nông dân
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
        )}
      </div>
    </div>
  );
}
