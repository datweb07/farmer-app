// Setup Supabase Edge Function for sending contact emails
/// <reference types="https://esm.sh/@supabase/functions-js/src/edge-runtime.d.ts" />

interface ContactEmailRequest {
    full_name: string;
    email: string;
    phone_number: string;
    partnership_type: 'investor' | 'business' | 'research' | 'other';
    message: string;
}

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
const ADMIN_EMAIL = Deno.env.get('ADMIN_EMAIL') || 'admin@example.com';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req: Request) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const data: ContactEmailRequest = await req.json();

        if (!RESEND_API_KEY) {
            console.error('RESEND_API_KEY not configured');
            return new Response(
                JSON.stringify({ error: 'Email service not configured' }),
                {
                    status: 500,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                }
            );
        }

        const partnershipTypeLabels = {
            investor: 'Nhà đầu tư',
            business: 'Doanh nghiệp',
            research: 'Tổ chức Khoa học - Kỹ thuật',
            other: 'Khác',
        };

        const emailBody = {
            from: 'onboarding@resend.dev',
            to: ADMIN_EMAIL,
            subject: `🌾 Yêu cầu hợp tác mới: ${partnershipTypeLabels[data.partnership_type]} - ${data.full_name}`,
            html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #4F46E5;">🌾 Yêu cầu hợp tác mới</h2>
          <div style="background: #F3F4F6; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p><strong>Loại hình:</strong> ${partnershipTypeLabels[data.partnership_type]}</p>
            <p><strong>Họ và tên:</strong> ${data.full_name}</p>
            <p><strong>Email:</strong> ${data.email}</p>
            <p><strong>Số điện thoại:</strong> ${data.phone_number}</p>
          </div>
          <div style="margin: 20px 0;">
            <h3 style="color: #1F2937;">Nội dung:</h3>
            <p style="white-space: pre-wrap; background: #F9FAFB; padding: 15px; border-left: 4px solid #4F46E5; border-radius: 4px;">
              ${data.message}
            </p>
          </div>
          <p style="color: #6B7280; font-size: 14px; margin-top: 30px;">
            Email được gửi từ hệ thống Nông nghiệp ĐBSCL
          </p>
        </div>
      `,
        };

        console.log('Sending email via Resend...');

        const response = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${RESEND_API_KEY}`,
            },
            body: JSON.stringify(emailBody),
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error('Resend API error:', errorData);
            return new Response(
                JSON.stringify({ error: 'Failed to send email', details: errorData }),
                {
                    status: response.status,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                }
            );
        }

        const result = await response.json();
        console.log('Email sent successfully:', result);

        return new Response(
            JSON.stringify({ success: true, data: result }),
            {
                status: 200,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
        );

    } catch (error: unknown) {
        console.error('Error:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        return new Response(
            JSON.stringify({ error: errorMessage }),
            {
                status: 500,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
        );
    }
});
