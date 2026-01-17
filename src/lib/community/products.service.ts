// @ts-nocheck - Types will be fully available after running SQL schema in Supabase
// ============================================
// Products Service
// ============================================
// Handles all product-related operations
// ============================================

import { supabase } from "../supabase/supabase";
import type {
  CreateProductData,
  UpdateProductData,
  ProductWithStats,
} from "./types";
import { uploadImage } from "./image-upload";

/**
 * Create a new product
 */
export async function createProduct(data: CreateProductData): Promise<{
  success: boolean;
  product?: ProductWithStats;
  error?: string;
}> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: "Chưa đăng nhập" };
    }

    console.log("🔵 [Products] Creating product...");

    // Upload image if provided
    let imageUrl: string | undefined;
    if (data.image) {
      const { url, error } = await uploadImage(
        data.image,
        "product-images",
        user.id,
      );
      if (error) {
        return { success: false, error };
      }
      imageUrl = url || undefined;
    }

    // Insert product
    const { data: product, error: insertError } = await supabase
      .from("products")
      .insert({
        user_id: user.id,
        name: data.name,
        description: data.description,
        price: data.price,
        category: data.category,
        image_url: imageUrl,
        contact: data.contact,
        moderation_status: "pending", // Luôn chờ duyệt khi tạo mới
      })
      .select()
      .single();

    if (insertError || !product) {
      console.error("🔴 [Products] Insert error:", insertError);
      return { success: false, error: "Không thể tạo sản phẩm" };
    }

    // Fetch user profile for seller info
    const { data: profile } = await supabase
      .from("profiles")
      .select("username, avatar_url")
      .eq("id", user.id)
      .single();

    // Construct full product with seller info (since it's just created)
    const fullProduct: ProductWithStats = {
      id: product.id,
      user_id: product.user_id,
      name: product.name,
      description: product.description,
      price: product.price,
      category: product.category,
      image_url: product.image_url,
      contact: product.contact,
      created_at: product.created_at,
      seller_username: profile?.username || "",
      seller_avatar: profile?.avatar_url || null,
    };

    console.log("✅ [Products] Product created:", product.id);
    return { success: true, product: fullProduct };
  } catch (err) {
    console.error("🔴 [Products] Unexpected error:", err);
    return { success: false, error: "Đã xảy ra lỗi không mong muốn" };
  }
}

/**
 * Get products with filters
 */
export async function getProducts(params?: {
  category?: string;
  search?: string;
  limit?: number;
  offset?: number;
}): Promise<{
  products: ProductWithStats[];
  error?: string;
}> {
  try {
    console.log("🔵 [Products] Fetching products...");

    const { data, error } = await supabase.rpc("get_products_with_stats", {
      category_filter: params?.category || null,
      search_query: params?.search || null,
      limit_count: params?.limit || 20,
      offset_count: params?.offset || 0,
    });

    if (error) {
      console.error("🔴 [Products] Fetch error:", error);
      return { products: [], error: "Không thể tải sản phẩm" };
    }

    console.log("✅ [Products] Fetched", data?.length || 0, "products");
    return { products: (data as ProductWithStats[]) || [] };
  } catch (err) {
    console.error("🔴 [Products] Unexpected error:", err);
    return { products: [], error: "Đã xảy ra lỗi không mong muốn" };
  }
}

/**
 * Get single product by ID
 */
export async function getProductById(
  productId: string,
): Promise<ProductWithStats | null> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { data, error } = await supabase.rpc("get_product_with_stats", {
      product_uuid: productId,
      current_user_id: user?.id || null,
    });

    if (error || !data || data.length === 0) {
      console.error("🔴 [Products] Fetch error:", error);
      return null;
    }

    return data[0] as ProductWithStats;
  } catch (err) {
    console.error("🔴 [Products] Unexpected error:", err);
    return null;
  }
}

/**
 * Update product
 */
export async function updateProduct(
  productId: string,
  updates: UpdateProductData,
): Promise<{ success: boolean; error?: string }> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: "Chưa đăng nhập" };
    }

    const updatesToSave: any = {
      name: updates.name,
      description: updates.description,
      price: updates.price,
      category: updates.category,
      contact: updates.contact,
    };

    if (updates.image) {
      const { url, error: uploadError } = await uploadImage(
        updates.image,
        "product-images",
        user.id,
      );

      if (uploadError) {
        return { success: false, error: uploadError };
      }

      updatesToSave.image_url = url || null;
    } else if (updates.removeImage) {
      updatesToSave.image_url = null;
    } else if (updates.image_url !== undefined) {
      updatesToSave.image_url = updates.image_url;
    }

    Object.keys(updatesToSave).forEach((key) => {
      if (updatesToSave[key] === undefined) {
        delete updatesToSave[key];
      }
    });

    const { error } = await supabase
      .from("products")
      .update(updatesToSave)
      .eq("id", productId)
      .eq("user_id", user.id);

    if (error) {
      console.error("🔴 [Products] Update error:", error);
      return { success: false, error: "Không thể cập nhật sản phẩm" };
    }

    console.log("✅ [Products] Product updated:", productId);
    return { success: true };
  } catch (err) {
    console.error("🔴 [Products] Unexpected error:", err);
    return { success: false, error: "Đã xảy ra lỗi không mong muốn" };
  }
}

/**
 * Delete product
 */
export async function deleteProduct(productId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: "Chưa đăng nhập" };
    }

    const { error } = await supabase
      .from("products")
      .delete()
      .eq("id", productId)
      .eq("user_id", user.id);

    if (error) {
      console.error("🔴 [Products] Delete error:", error);
      return { success: false, error: "Không thể xóa sản phẩm" };
    }

    console.log("✅ [Products] Product deleted:", productId);
    return { success: true };
  } catch (err) {
    console.error("🔴 [Products] Unexpected error:", err);
    return { success: false, error: "Đã xảy ra lỗi không mong muốn" };
  }
}

/**
 * Track product view
 */
export async function trackProductView(productId: string): Promise<void> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    await supabase.rpc("increment_product_views", {
      product_uuid: productId,
      viewer_id: user?.id || null,
    });

    console.log("✅ [Products] View tracked:", productId);
  } catch (err) {
    console.error("🔴 [Products] View tracking error:", err);
  }
}

/**
 * Format price in VND
 */
export function formatPrice(price: number): string {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(price);
}

/**
 * Generate Zalo contact link
 */
export function getZaloLink(phoneNumber: string): string {
  // Remove all non-numeric characters
  const cleanPhone = phoneNumber.replace(/\D/g, "");

  // Remove leading 84 if present and add back
  let formattedPhone = cleanPhone;
  if (cleanPhone.startsWith("84")) {
    formattedPhone = cleanPhone.substring(2);
  }

  // Add 0 prefix if not present
  if (!formattedPhone.startsWith("0")) {
    formattedPhone = "0" + formattedPhone;
  }

  return `https://zalo.me/${formattedPhone}`;
}
