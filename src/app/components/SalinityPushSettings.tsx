// @ts-nocheck - Firebase Web SDK is imported at runtime from the official CDN.
import { useEffect, useMemo, useState } from "react";
import { BellRing, ShieldCheck } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase/supabase";

type Prediction = { tinh: string; ten_tram: string };

async function loadFirebaseMessaging() {
  const sdkBase = "https://www.gstatic.com/firebasejs/12.19.0";
  const [appSdk, messagingSdk] = await Promise.all([
    import(/* @vite-ignore */ sdkBase + "/firebase-app.js"),
    import(/* @vite-ignore */ sdkBase + "/firebase-messaging.js"),
  ]);
  const app = appSdk.getApps().length ? appSdk.getApp() : appSdk.initializeApp(firebaseConfig);
  return { messagingSdk, messaging: messagingSdk.getMessaging(app) };
}

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const firebaseReady = Boolean(
  firebaseConfig.apiKey &&
  firebaseConfig.projectId &&
  firebaseConfig.messagingSenderId &&
  firebaseConfig.appId &&
  import.meta.env.VITE_FIREBASE_VAPID_KEY,
);
let unsubscribeForegroundMessage: (() => void) | null = null;

export function SalinityPushSettings({ data }: { data: Prediction[] }) {
  const { user } = useAuth();
  const provinces = useMemo(
    () => [...new Set(data.map((row) => row.tinh).filter(Boolean))].sort(),
    [data],
  );
  const [province, setProvince] = useState("");
  const [station, setStation] = useState("");
  const [threshold, setThreshold] = useState("1");
  const [activeCount, setActiveCount] = useState(0);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const stations = useMemo(
    () =>
      [...new Set(
        data
          .filter((row) => !province || row.tinh === province)
          .map((row) => row.ten_tram)
          .filter(Boolean),
      )].sort(),
    [data, province],
  );

  useEffect(() => {
    if (!province && provinces.length) setProvince(provinces[0]);
  }, [province, provinces]);

  useEffect(() => {
    if (!user) {
      setActiveCount(0);
      return;
    }
    let alive = true;
    supabase
      .from("salinity_push_subscriptions")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("active", true)
      .then(({ count, error }) => {
        if (alive && !error) setActiveCount(count || 0);
      });
    return () => { alive = false; };
  }, [user]);

  async function enableAlerts() {
    setMessage("");
    if (!user) {
      setMessage("Vui lòng đăng nhập để lưu cảnh báo vào tài khoản của bạn.");
      return;
    }
    if (!firebaseReady) {
      setMessage("Ứng dụng chưa được cấu hình Firebase. Hãy hoàn tất các bước cấu hình trong hướng dẫn.");
      return;
    }
    const selectedThreshold = Number(threshold);
    if (!province || !Number.isFinite(selectedThreshold) || selectedThreshold < 0) {
      setMessage("Vui lòng chọn khu vực và nhập ngưỡng hợp lệ (g/L).");
      return;
    }

    setBusy(true);
    try {
      if (!("Notification" in window) || !("serviceWorker" in navigator)) {
        throw new Error("Trình duyệt này chưa hỗ trợ thông báo đẩy.");
      }
      const { messagingSdk, messaging } = await loadFirebaseMessaging();
      if (!(await messagingSdk.isSupported())) throw new Error("Trình duyệt này chưa hỗ trợ Firebase Web Push.");
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        throw new Error("Bạn chưa cấp quyền thông báo. Hãy cho phép trong cài đặt trình duyệt rồi thử lại.");
      }

      const worker = await navigator.serviceWorker.register("/firebase-messaging-sw.js");
      const token = await messagingSdk.getToken(messaging, {
        vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY,
        serviceWorkerRegistration: worker,
      });
      if (!token) throw new Error("Không lấy được mã đăng ký thiết bị từ Firebase.");
      unsubscribeForegroundMessage?.();
      unsubscribeForegroundMessage = messagingSdk.onMessage(messaging, (payload) => {
        const notificationData = payload.data || {};
        void navigator.serviceWorker.ready.then((registration) =>
          registration.showNotification(notificationData.title || "Cảnh báo độ mặn", {
            body: notificationData.body || "Dữ liệu độ mặn mới đã vượt ngưỡng bạn cài đặt.",
            icon: "/favicon.ico",
            tag: notificationData.tag || "champ-manh-salinity",
            data: { url: notificationData.url || "/" },
          }),
        );
      });

      const { error } = await supabase.from("salinity_push_subscriptions").upsert(
        {
          user_id: user.id,
          token,
          province,
          station: station || null,
          threshold: selectedThreshold,
          active: true,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "token" },
      );
      if (error) throw error;
      localStorage.setItem("salinity-fcm-token:" + user.id, token);
      setActiveCount((count) => Math.max(1, count));
      setMessage("Đã bật cảnh báo trên thiết bị này. Chúng tôi sẽ báo khi có dữ liệu mới vượt ngưỡng.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Không thể bật cảnh báo lúc này.");
    } finally {
      setBusy(false);
    }
  }

  async function disableAlerts() {
    if (!user) return;
    setBusy(true);
    setMessage("");
    try {
      let token = localStorage.getItem("salinity-fcm-token:" + user.id);
      let sdk: any = null;
      let messaging: any = null;
      if ("Notification" in window && Notification.permission === "granted" && "serviceWorker" in navigator && firebaseReady) {
        const loaded = await loadFirebaseMessaging();
        sdk = loaded.messagingSdk;
        messaging = loaded.messaging;
        token ||= await sdk.getToken(messaging, {
          vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY,
          serviceWorkerRegistration: await navigator.serviceWorker.register("/firebase-messaging-sw.js"),
        });
      }
      if (token) {
        const { error } = await supabase
          .from("salinity_push_subscriptions")
          .delete()
          .eq("user_id", user.id)
          .eq("token", token);
        if (error) throw error;
        if (sdk && messaging) await sdk.deleteToken(messaging);
      }
      localStorage.removeItem("salinity-fcm-token:" + user.id);
      setActiveCount((count) => Math.max(0, count - 1));
      setMessage("Đã tắt đăng ký cảnh báo trên thiết bị này. Nếu muốn, bạn cũng có thể chặn thông báo trong cài đặt trình duyệt.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Không thể tắt cảnh báo lúc này.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mb-5 rounded-lg border border-emerald bg-white p-4 md:p-5" aria-labelledby="salinity-push-title">
      <div className="flex items-start gap-3">

        <div className="min-w-0 flex-1">
          <h2 id="salinity-push-title" className="font-semibold text-gray-900">Cảnh báo độ mặn</h2>
          <p className="mt-1 text-sm text-gray-600">Lưu ý từ người phát triển phần mềm: Chỉ nhận được Web Push từ iOS 16.4+ và đối với một số phiên bản IOS, người dùng phải thêm Web App vào màn hình chính thì mới bật được tính năng Push. Cảm ơn!</p>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <label className="text-sm text-gray-700">
          <span className="mb-1 block">Tỉnh / thành phố</span>
          <select value={province} onChange={(event) => { setProvince(event.target.value); setStation(""); }} className="w-full rounded-md border border-gray-300 bg-white px-3 py-2">
            {provinces.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        </label>
        <label className="text-sm text-gray-700">
          <span className="mb-1 block">Trạm đo</span>
          <select value={station} onChange={(event) => setStation(event.target.value)} className="w-full rounded-md border border-gray-300 bg-white px-3 py-2">
            <option value="">Tất cả trạm trong tỉnh</option>
            {stations.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        </label>
        <label className="text-sm text-gray-700">
          <span className="mb-1 block">Ngưỡng cảnh báo (g/L)</span>
          <input type="number" min="0" step="0.1" value={threshold} onChange={(event) => setThreshold(event.target.value)} className="w-full rounded-md border border-gray-300 px-3 py-2" />
        </label>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button type="button" onClick={enableAlerts} disabled={busy || !provinces.length} className="inline-flex items-center gap-2 rounded-md border border-emerald-700 px-4 py-2 font-medium text-emerald-800 hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-60">
          <BellRing size={16} /> {busy ? "Đang bật…" : "Bật cảnh báo độ mặn"}
        </button>
        {activeCount > 0 && <span className="inline-flex items-center gap-1 text-sm text-emerald-800"><ShieldCheck size={16} /> {activeCount} thiết bị đang nhận cảnh báo</span>}
        {activeCount > 0 && <button type="button" onClick={disableAlerts} disabled={busy} className="rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-60">Tắt trên thiết bị này</button>}
      </div>
      {message && <p role="status" className="mt-3 text-sm text-gray-700">{message}</p>}
      <p className="mt-3 text-xs text-gray-500">Chỉ bật sau khi bạn đồng ý quyền thông báo. Bạn có thể thu hồi quyền trong cài đặt trình duyệt.</p>
    </section>
  );
}
