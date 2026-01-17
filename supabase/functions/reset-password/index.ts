// Setup Supabase Edge Function for password reset
/// <reference types="https://esm.sh/@supabase/functions-js/src/edge-runtime.d.ts" />

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { corsHeaders } from "../_shared/cors.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

interface ResetPasswordRequest {
    phoneNumber: string;
    code: string;
    newPassword: string;
}

Deno.serve(async (req: Request) => {
    // Handle CORS preflight requests
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        // Parse request body
        const { phoneNumber, code, newPassword }: ResetPasswordRequest =
            await req.json();

        console.log("🔵 [ResetPassword] Processing request for phone:", phoneNumber);

        // Validate input
        if (!phoneNumber || !code || !newPassword) {
            return new Response(
                JSON.stringify({
                    error: "Thiếu thông tin bắt buộc",
                    code: "missing_fields",
                }),
                {
                    status: 400,
                    headers: { ...corsHeaders, "Content-Type": "application/json" },
                }
            );
        }

        // Validate password length
        if (newPassword.length < 6) {
            return new Response(
                JSON.stringify({
                    error: "Mật khẩu phải có ít nhất 6 ký tự",
                    code: "invalid_password",
                }),
                {
                    status: 400,
                    headers: { ...corsHeaders, "Content-Type": "application/json" },
                }
            );
        }

        // Create Supabase admin client
        const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
            auth: {
                autoRefreshToken: false,
                persistSession: false,
            },
        });

        // Normalize phone number (remove spaces, dashes)
        const normalizedPhone = phoneNumber.replace(/[\s-]/g, "");

        // Verify the reset code using the database function
        const { data: verifyData, error: verifyError } = await supabaseAdmin.rpc(
            "verify_password_reset_code",
            {
                reset_phone_number: normalizedPhone,
                reset_code: code,
            }
        ) as {
            data: Array<{ valid: boolean; user_id: string; username: string }> | null;
            error: any;
        };

        if (verifyError) {
            console.error("🔴 [ResetPassword] Verification error:", verifyError);
            return new Response(
                JSON.stringify({
                    error: "Đã xảy ra lỗi khi xác minh mã",
                    code: "verification_error",
                }),
                {
                    status: 500,
                    headers: { ...corsHeaders, "Content-Type": "application/json" },
                }
            );
        }

        // Check if code is valid
        if (!verifyData || verifyData.length === 0 || !verifyData[0].valid) {
            console.error("🔴 [ResetPassword] Invalid or expired code");
            return new Response(
                JSON.stringify({
                    error: "Mã xác nhận không hợp lệ hoặc đã hết hạn",
                    code: "invalid_code",
                }),
                {
                    status: 400,
                    headers: { ...corsHeaders, "Content-Type": "application/json" },
                }
            );
        }

        const userId = verifyData[0].user_id;
        const username = verifyData[0].username;
        console.log("🔵 [ResetPassword] User info:", { userId, username });

        // Update password directly using userId from database
        console.log("🔵 [ResetPassword] Updating password for user ID:", userId);
        const { data: updateData, error: updateError } =
            await supabaseAdmin.auth.admin.updateUserById(userId, {
                password: newPassword,
            });

        if (updateError) {
            console.error("🔴 [ResetPassword] Password update error:", updateError);
            return new Response(
                JSON.stringify({
                    error: "Không thể cập nhật mật khẩu",
                    code: "update_failed",
                    details: updateError.message,
                }),
                {
                    status: 500,
                    headers: { ...corsHeaders, "Content-Type": "application/json" },
                }
            );
        }

        console.log("✅ [ResetPassword] Password updated successfully");

        // Mark reset code as used
        const { error: markError } = await supabaseAdmin.rpc("mark_reset_code_used", {
            reset_phone_number: normalizedPhone,
            reset_code: code,
        });

        if (markError) {
            console.warn("🟡 [ResetPassword] Failed to mark code as used:", markError);
            // Don't fail the request, password is already updated
        }

        console.log("✅ [ResetPassword] Reset code marked as used");

        return new Response(
            JSON.stringify({
                message: "Mật khẩu đã được cập nhật thành công",
            }),
            {
                status: 200,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
        );
    } catch (error) {
        console.error("🔴 [ResetPassword] Unexpected error:", error);
        return new Response(
            JSON.stringify({
                error: "Đã xảy ra lỗi không mong muốn",
                code: "unknown_error",
                details: error instanceof Error ? error.message : String(error),
            }),
            {
                status: 500,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
        );
    }
});
