import { createClient } from "@supabase/supabase-js";
import { createSign, timingSafeEqual } from "node:crypto";

function safeEqual(left, right) {
  const a = Buffer.from(left || "");
  const b = Buffer.from(right || "");
  return a.length === b.length && timingSafeEqual(a, b);
}

async function getFcmAccessToken(serviceAccount) {
  const now = Math.floor(Date.now() / 1000);
  const encode = (value) => Buffer.from(JSON.stringify(value)).toString("base64url");
  const unsigned = encode({ alg: "RS256", typ: "JWT" }) + "." + encode({
    iss: serviceAccount.client_email,
    scope: "https://www.googleapis.com/auth/firebase.messaging",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  });
  const signer = createSign("RSA-SHA256");
  signer.update(unsigned);
  const assertion = unsigned + "." + signer.sign(serviceAccount.private_key, "base64url");
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion }),
  });
  const body = await response.json();
  if (!response.ok || !body.access_token) throw new Error("Google OAuth token request failed: " + JSON.stringify(body));
  return body.access_token;
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const webhookSecret = process.env.SUPABASE_WEBHOOK_SECRET;
  const suppliedSecret = req.headers["x-supabase-webhook-secret"];
  if (!webhookSecret || !safeEqual(suppliedSecret, webhookSecret)) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const payload = req.body;
  if (payload?.type !== "INSERT" || payload?.schema !== "public" || payload?.table !== "prophet_predict") {
    return res.status(400).json({ error: "Expected an INSERT from public.prophet_predict" });
  }
  const row = payload.record;
  const salinity = Number(row?.du_bao_man);
  const predictionId = Number(row?.id);
  if (!row || !Number.isSafeInteger(predictionId) || !Number.isFinite(salinity) || !row.tinh) {
    return res.status(400).json({ error: "Invalid salinity record" });
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) return res.status(500).json({ error: "Server database configuration is missing" });
  let serviceAccount;
  try {
    serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON || "{}");
    serviceAccount.private_key = serviceAccount.private_key?.replace(/\\n/g, "\n");
    if (!serviceAccount.project_id || !serviceAccount.client_email || !serviceAccount.private_key) throw new Error("Incomplete service account JSON");
  } catch (error) {
    console.error("Firebase service account configuration is invalid", error);
    return res.status(500).json({ error: "Server Firebase configuration is missing or invalid" });
  }

  const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: candidates, error: queryError } = await supabase
    .from("salinity_push_subscriptions")
    .select("id, token, threshold, province, station")
    .eq("active", true)
    .eq("province", row.tinh)
    .lte("threshold", salinity);
  if (queryError) {
    console.error("Could not find salinity push subscriptions", queryError);
    return res.status(500).json({ error: "Could not read alert subscriptions" });
  }

  const matches = (candidates || []).filter((item) => !item.station || item.station === row.ten_tram);
  if (!matches.length) return res.status(200).json({ sent: 0, reason: "No matching subscriptions" });

  const claims = [];
  for (const item of matches) {
    const { data: claim, error } = await supabase
      .from("salinity_push_deliveries")
      .insert({ subscription_id: item.id, prediction_id: predictionId, status: "pending" })
      .select("id")
      .maybeSingle();
    if (error?.code === "23505") {
      // Retry a prior failed attempt atomically; pending/sent records are never re-sent.
      const { data: failed } = await supabase
        .from("salinity_push_deliveries")
        .select("id")
        .eq("subscription_id", item.id)
        .eq("prediction_id", predictionId)
        .eq("status", "failed")
        .maybeSingle();
      if (failed) {
        const { data: retry } = await supabase
          .from("salinity_push_deliveries")
          .update({ status: "pending", sent_at: null })
          .eq("id", failed.id)
          .eq("status", "failed")
          .select("id")
          .maybeSingle();
        if (retry) claims.push({ ...item, deliveryId: retry.id });
      }
      continue;
    }
    if (error) {
      console.error("Could not claim salinity delivery", error);
      continue;
    }
    if (claim) claims.push({ ...item, deliveryId: claim.id });
  }
  if (!claims.length) return res.status(200).json({ sent: 0, reason: "Already delivered or claimed" });

  try {
    const accessToken = await getFcmAccessToken(serviceAccount);
    let sent = 0;
    for (let i = 0; i < claims.length; i += 500) {
      const batch = claims.slice(i, i + 500);
      const completed = await Promise.all(batch.map(async (item) => {
        const fcmResponse = await fetch(
          "https://fcm.googleapis.com/v1/projects/" + encodeURIComponent(serviceAccount.project_id) + "/messages:send",
          {
            method: "POST",
            headers: { Authorization: "Bearer " + accessToken, "Content-Type": "application/json" },
            body: JSON.stringify({ message: {
              token: item.token,
              data: {
                title: "Cảnh báo độ mặn",
                body: (row.ten_tram || row.tinh) + ": độ mặn mới " + salinity.toFixed(2) + " g/L, đã chạm/vượt ngưỡng " + Number(item.threshold).toFixed(2) + " g/L.",
                url: "/",
                tag: "salinity-" + predictionId,
              },
              webpush: { headers: { Urgency: "high", TTL: "86400" } },
            } }),
          },
        );
        const responseBody = await fcmResponse.json().catch(() => ({}));
        const isSuccess = fcmResponse.ok;
        const update = await supabase
          .from("salinity_push_deliveries")
          .update({ status: isSuccess ? "sent" : "failed", sent_at: isSuccess ? new Date().toISOString() : null })
          .eq("id", item.deliveryId);
        if (update.error) console.error("Could not update salinity delivery", update.error);
        const fcmError = responseBody.error?.details?.[0]?.errorCode || responseBody.error?.status;
        if (!isSuccess && fcmError === "UNREGISTERED") {
          await supabase.from("salinity_push_subscriptions").update({ active: false }).eq("id", item.id);
        }
        if (!isSuccess) console.error("FCM send failed", responseBody);
        return isSuccess;
      }));
      sent += completed.filter(Boolean).length;
    }
    return res.status(200).json({ sent, matched: claims.length });
  } catch (error) {
    console.error("FCM salinity delivery failed", error);
    await supabase.from("salinity_push_deliveries").update({ status: "failed" }).in("id", claims.map((item) => item.deliveryId));
    return res.status(500).json({ error: "Push delivery failed" });
  }
}
