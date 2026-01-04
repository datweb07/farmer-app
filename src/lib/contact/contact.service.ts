// @ts-nocheck - Types will be fully available after running SQL schema in Supabase
// ============================================
// Contact Service
// ============================================
// Handles contact form submissions and email sending
// ============================================

import { supabase } from '../supabase/supabase';
import type { ContactRequest } from '../investments/types';

/**
 * Submit contact request
 * Saves to database and sends email notification
 */
export async function submitContactRequest(data: ContactRequest): Promise<{
    success: boolean;
    error?: string;
}> {
    try {
        console.log('🔵 [Contact] Submitting contact request...');

        // Save to database
        const { error: dbError } = await supabase
            .from('contact_requests')
            .insert({
                full_name: data.full_name,
                phone_number: data.phone_number,
                email: data.email,
                partnership_type: data.partnership_type,
                message: data.message,
                status: 'pending',
            });

        if (dbError) {
            console.error('🔴 [Contact] Database error:', dbError);
            return { success: false, error: 'Không thể lưu yêu cầu liên hệ' };
        }

        // Send email via Supabase Edge Function
        const emailSent = await sendEmailViaEdgeFunction(data);

        if (!emailSent) {
            console.warn('⚠️ [Contact] Email not sent, but request saved to database');
        }

        console.log('✅ [Contact] Contact request submitted');
        return { success: true };
    } catch (err) {
        console.error('🔴 [Contact] Unexpected error:', err);
        return { success: false, error: 'Đã xảy ra lỗi không mong muốn' };
    }
}


/**
 * Send email via Supabase Edge Function
 * This bypasses CORS by calling server-side function
 */
async function sendEmailViaEdgeFunction(data: ContactRequest): Promise<boolean> {
    try {
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

        if (!supabaseUrl || !supabaseAnonKey) {
            console.error('🔴 [Contact] Supabase credentials not configured');
            return false;
        }

        const edgeFunctionUrl = `${supabaseUrl}/functions/v1/send-contact-email`;

        console.log('🔵 [Contact] Calling Edge Function:', edgeFunctionUrl);

        const response = await fetch(edgeFunctionUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${supabaseAnonKey}`,
            },
            body: JSON.stringify({
                full_name: data.full_name,
                email: data.email,
                phone_number: data.phone_number,
                partnership_type: data.partnership_type,
                message: data.message,
            }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error('🔴 [Contact] Edge Function error:', errorData);
            return false;
        }

        const result = await response.json();
        console.log('✅ [Contact] Email sent via Edge Function:', result);
        return true;
    } catch (err) {
        console.error('🔴 [Contact] Edge Function call error:', err);
        return false;
    }
}

/**
 * Legacy function - kept for reference
 * DO NOT USE: This causes CORS errors when called from browser
 */
async function sendContactEmail(data: ContactRequest): Promise<boolean> {
    // This function is deprecated and causes CORS errors
    // Use sendEmailViaEdgeFunction instead
    console.warn('⚠️ [Contact] sendContactEmail is deprecated, use Edge Function instead');
    return false;
}

/**
 * Get partnership type label
 */
export function getPartnershipTypeLabel(type: ContactRequest['partnership_type']): string {
    const labels = {
        investor: 'Nhà đầu tư',
        business: 'Doanh nghiệp',
        research: 'Tổ chức Khoa học - Kỹ thuật',
        other: 'Khác',
    };
    return labels[type];
}
