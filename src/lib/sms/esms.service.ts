// ============================================
// ESMS Service
// ============================================
// Service for sending SMS via ESMS.vn (Vietnam)
// ============================================

const ESMS_API_KEY = import.meta.env.VITE_ESMS_API_KEY;
const ESMS_SECRET_KEY = import.meta.env.VITE_ESMS_SECRET_KEY;
const ESMS_BRANDNAME = import.meta.env.VITE_ESMS_BRANDNAME || 'Notify';

const isESMSConfigured = ESMS_API_KEY && ESMS_SECRET_KEY;

export interface SendSMSOptions {
    to: string;
    message: string;
}

/**
 * Send SMS using ESMS.vn
 */
export async function sendSMS(options: SendSMSOptions): Promise<{
    success: boolean;
    messageId?: string;
    error?: string;
}> {
    try {
        if (!isESMSConfigured) {
            console.warn('⚠️ [SMS] ESMS not configured. SMS not sent.');
            return {
                success: false,
                error: 'ESMS not configured',
            };
        }

        console.log('📱 [SMS] Sending SMS via ESMS to:', options.to);

        // Remove +84 prefix and add 0
        const phone = options.to.replace('+84', '0');

        const response = await fetch('http://rest.esms.vn/MainService.svc/json/SendMultipleMessage_V4_post_json/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                ApiKey: ESMS_API_KEY,
                SecretKey: ESMS_SECRET_KEY,
                Phone: phone,
                Content: options.message,
                Brandname: ESMS_BRANDNAME,
                SmsType: 2, // 2 = SMS Brandname
            }),
        });

        const result = await response.json();

        if (result.CodeResult === '100') {
            console.log('✅ [SMS] SMS sent successfully via ESMS');
            return {
                success: true,
                messageId: result.SMSID,
            };
        } else {
            console.error('❌ [SMS] ESMS error:', result.ErrorMessage);
            return {
                success: false,
                error: result.ErrorMessage,
            };
        }
    } catch (error) {
        console.error('❌ [SMS] Failed to send SMS via ESMS:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to send SMS',
        };
    }
}

/**
 * Send password reset code via SMS
 * Note: ESMS doesn't support Vietnamese characters well, use plain text
 */
export async function sendPasswordResetCode(
    phoneNumber: string,
    code: string
): Promise<{ success: boolean; error?: string }> {
    // Use simple ASCII characters for better compatibility
    const message = `Ma xac nhan dat lai mat khau cua ban la: ${code}. Ma co hieu luc trong 15 phut.`;

    const result = await sendSMS({
        to: phoneNumber,
        message,
    });

    return {
        success: result.success,
        error: result.error,
    };
}
