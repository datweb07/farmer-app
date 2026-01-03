// @ts-nocheck - Types will be fully available after running SQL schema in Supabase
// ============================================
// Products Service
// ============================================
// Handles all product-related operations
// ============================================

import { supabase } from '../supabase/supabase';
import type { CreateProductData, UpdateProductData, ProductWithStats } from './types';
import { uploadImage } from './image-upload';

/**
 * Create a new product
 */
export async function createProduct(data: CreateProductData): Promise<{
    success: boolean;
    product?: ProductWithStats;
    error?: string;
}> {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return { success: false, error: 'Chưa đăng nhập' };
        }

        console.log('🔵 [Products] Creating product...');

        // Upload image if provided
        let imageUrl: string | undefined;
        if (data.image) {
            const { url, error } = await uploadImage(data.image, 'product-images', user.id);
            if (error) {
                return { success: false, error };
            }
            imageUrl = url || undefined;
        }

        // Insert product
        const { data: product, error: insertError } = await supabase
            .from('products')
            .insert({
                user_id: user.id,
                name: data.name,
                description: data.description,
                price: data.price,
                category: data.category,
                image_url: imageUrl,
                contact: data.contact,
            })
            .select()
            .single();

        if (insertError || !product) {
            console.error('🔴 [Products] Insert error:', insertError);
            return { success: false, error: 'Không thể tạo sản phẩm' };
        }

        // Fetch full product with seller info
        const fullProduct = await getProductById(product.id);
        if (!fullProduct) {
            return { success: false, error: 'Sản phẩm đã tạo nhưng không thể tải lại' };
        }

        console.log('✅ [Products] Product created:', product.id);
        return { success: true, product: fullProduct };
    } catch (err) {
        console.error('🔴 [Products] Unexpected error:', err);
        return { success: false, error: 'Đã xảy ra lỗi không mong muốn' };
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
        console.log('🔵 [Products] Fetching products...');

        let query = supabase
            .from('products')
            .select(`
                *,
                profiles:user_id (
                    username,
                    points
                )
            `)
            .order('created_at', { ascending: false });

        // Apply filters
        if (params?.category) {
            query = query.eq('category', params.category);
        }

        if (params?.search) {
            query = query.or(`name.ilike.%${params.search}%,description.ilike.%${params.search}%`);
        }

        if (params?.limit) {
            query = query.limit(params.limit);
        }

        if (params?.offset) {
            query = query.range(params.offset, params.offset + (params.limit || 20) - 1);
        }

        const { data, error } = await query;

        if (error) {
            console.error('🔴 [Products] Fetch error:', error);
            return { products: [], error: 'Không thể tải sản phẩm' };
        }

        const products: ProductWithStats[] = (data || []).map((p: any) => ({
            id: p.id,
            user_id: p.user_id,
            name: p.name,
            description: p.description,
            price: p.price,
            category: p.category,
            image_url: p.image_url,
            contact: p.contact,
            views_count: p.views_count,
            created_at: p.created_at,
            updated_at: p.updated_at,
            seller_username: p.profiles?.username || 'Unknown',
            seller_points: p.profiles?.points || 0,
        }));

        console.log('✅ [Products] Fetched', products.length, 'products');
        return { products };
    } catch (err) {
        console.error('🔴 [Products] Unexpected error:', err);
        return { products: [], error: 'Đã xảy ra lỗi không mong muốn' };
    }
}

/**
 * Get single product by ID
 */
export async function getProductById(productId: string): Promise<ProductWithStats | null> {
    try {
        const { data, error } = await supabase
            .from('products')
            .select(`
                *,
                profiles:user_id (
                    username,
                    points
                )
            `)
            .eq('id', productId)
            .single();

        if (error || !data) {
            console.error('🔴 [Products] Fetch error:', error);
            return null;
        }

        const product: ProductWithStats = {
            id: data.id,
            user_id: data.user_id,
            name: data.name,
            description: data.description,
            price: data.price,
            category: data.category,
            image_url: data.image_url,
            contact: data.contact,
            views_count: data.views_count,
            created_at: data.created_at,
            updated_at: data.updated_at,
            seller_username: (data as any).profiles?.username || 'Unknown',
            seller_points: (data as any).profiles?.points || 0,
        };

        return product;
    } catch (err) {
        console.error('🔴 [Products] Unexpected error:', err);
        return null;
    }
}

/**
 * Update product
 */
export async function updateProduct(
    productId: string,
    updates: UpdateProductData
): Promise<{ success: boolean; error?: string }> {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return { success: false, error: 'Chưa đăng nhập' };
        }

        const { error } = await supabase
            .from('products')
            .update(updates)
            .eq('id', productId)
            .eq('user_id', user.id);

        if (error) {
            console.error('🔴 [Products] Update error:', error);
            return { success: false, error: 'Không thể cập nhật sản phẩm' };
        }

        console.log('✅ [Products] Product updated:', productId);
        return { success: true };
    } catch (err) {
        console.error('🔴 [Products] Unexpected error:', err);
        return { success: false, error: 'Đã xảy ra lỗi không mong muốn' };
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
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return { success: false, error: 'Chưa đăng nhập' };
        }

        const { error } = await supabase
            .from('products')
            .delete()
            .eq('id', productId)
            .eq('user_id', user.id);

        if (error) {
            console.error('🔴 [Products] Delete error:', error);
            return { success: false, error: 'Không thể xóa sản phẩm' };
        }

        console.log('✅ [Products] Product deleted:', productId);
        return { success: true };
    } catch (err) {
        console.error('🔴 [Products] Unexpected error:', err);
        return { success: false, error: 'Đã xảy ra lỗi không mong muốn' };
    }
}

/**
 * Track product view
 */
export async function trackProductView(productId: string): Promise<void> {
    try {
        const { data: { user } } = await supabase.auth.getUser();

        await supabase.rpc('increment_product_views', {
            product_uuid: productId,
            viewer_id: user?.id || null,
        });

        console.log('✅ [Products] View tracked:', productId);
    } catch (err) {
        console.error('🔴 [Products] View tracking error:', err);
    }
}

/**
 * Format price in VND
 */
export function formatPrice(price: number): string {
    return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND',
    }).format(price);
}

/**
 * Generate Zalo contact link
 */
export function getZaloLink(phoneNumber: string): string {
    // Remove all non-numeric characters
    const cleanPhone = phoneNumber.replace(/\D/g, '');

    // Remove leading 84 if present and add back
    let formattedPhone = cleanPhone;
    if (cleanPhone.startsWith('84')) {
        formattedPhone = cleanPhone.substring(2);
    }

    // Add 0 prefix if not present
    if (!formattedPhone.startsWith('0')) {
        formattedPhone = '0' + formattedPhone;
    }

    return `https://zalo.me/${formattedPhone}`;
}
