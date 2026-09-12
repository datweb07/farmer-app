import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, Loader2, MapPin, PackageCheck, Star } from "lucide-react";
import type { UserRole } from "../../lib/auth/auth.types";
import type { PaymentVelocity, ProcurementRequest } from "../../lib/procurement/types";
import {
  acceptProcurementRequest,
  completeProcurementRequest,
  getFarmerProcurementRequests,
  getIncomingProcurementRequests,
  getReviewedRequestIds,
  submitBusinessReview,
} from "../../lib/procurement/procurement.service";

export function ProcurementManager({ role }: { role: UserRole }) {
  const [requests, setRequests] = useState<ProcurementRequest[]>([]);
  const [reviewedIds, setReviewedIds] = useState(new Set<string>());
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<ProcurementRequest | null>(null);
  const [mode, setMode] = useState<"complete" | "review" | null>(null);

  const load = useCallback(async () => {
    const result = role === "business" ? await getIncomingProcurementRequests() : await getFarmerProcurementRequests();
    setRequests(result.requests);
    if (role === "farmer") setReviewedIds(await getReviewedRequestIds(result.requests.map((r) => r.id)));
    setLoading(false);
  }, [role]);
  useEffect(() => {
    let active = true;
    const loadInitial = async () => {
      const result = role === "business"
        ? await getIncomingProcurementRequests()
        : await getFarmerProcurementRequests();
      if (!active) return;
      setRequests(result.requests);
      if (role === "farmer") {
        const ids = await getReviewedRequestIds(result.requests.map((request) => request.id));
        if (active) setReviewedIds(ids);
      }
      if (active) setLoading(false);
    };
    void loadInitial();
    return () => { active = false; };
  }, [role]);

  if (loading) return <div className="flex justify-center py-5"><Loader2 className="h-5 w-5 animate-spin" /></div>;
  return <div className="rounded-lg border border-gray-200 bg-white p-6 mb-6">
    <h2 className="mb-4 text-lg font-semibold">{role === "business" ? "Đăng ký thu mua nhận được" : "Giao dịch thu mua của tôi"}</h2>
    {requests.length === 0 ? <p className="text-sm text-gray-500">Chưa có đăng ký thu mua nào.</p> : <div className="space-y-3">{requests.map((request) => <div key={request.id} className="rounded-lg border p-4">
      <div className="flex flex-wrap justify-between gap-3"><div><p className="font-semibold">{request.product_name}</p><p className="text-sm text-gray-600">{request.farmer_name} · {request.phone_number} · hẹn {new Date(request.desired_date).toLocaleDateString("vi-VN")}</p>{request.note && <p className="mt-1 text-sm text-gray-500">{request.note}</p>}</div><span className="h-fit rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">{request.status === "pending" ? "Chờ xác nhận" : request.status === "accepted" ? "Đã nhận" : request.status === "completed" ? "Hoàn thành" : request.status}</span></div>
      {request.status === "completed" && <p className="mt-2 flex items-center gap-2 text-sm text-emerald-700"><PackageCheck className="h-4 w-4" /> {request.actual_weight_tons} tấn {request.actual_product_name} {request.gps_verified && "· GPS đã xác thực"}</p>}
      <div className="mt-3 flex gap-2">{role === "business" && request.status === "pending" && <><button onClick={async () => { await acceptProcurementRequest(request.id); load(); }} className="rounded-lg border px-3 py-2 text-sm">Nhận đăng ký</button><button onClick={() => { setSelected(request); setMode("complete"); }} className="rounded-lg bg-emerald-700 px-3 py-2 text-sm text-white">Thu mua hoàn thành</button></>}{role === "business" && request.status === "accepted" && <button onClick={() => { setSelected(request); setMode("complete"); }} className="rounded-lg bg-emerald-700 px-3 py-2 text-sm text-white">Thu mua hoàn thành</button>}{role === "farmer" && request.status === "completed" && !reviewedIds.has(request.id) && <button onClick={() => { setSelected(request); setMode("review"); }} className="flex items-center gap-1 rounded-lg bg-amber-500 px-3 py-2 text-sm font-medium text-white"><Star className="h-4 w-4" /> Đánh giá doanh nghiệp</button>}</div>
    </div>)}</div>}
    {selected && mode === "complete" && <CompletionDialog request={selected} onClose={() => { setSelected(null); setMode(null); }} onDone={load} />}
    {selected && mode === "review" && <ReviewDialog request={selected} onClose={() => { setSelected(null); setMode(null); }} onDone={load} />}
  </div>;
}

function CompletionDialog({ request, onClose, onDone }: { request: ProcurementRequest; onClose: () => void; onDone: () => void }) {
  const [product, setProduct] = useState(request.product_name); const [weight, setWeight] = useState(""); const [payment, setPayment] = useState<PaymentVelocity>("on_site"); const [coords, setCoords] = useState<{ latitude: number; longitude: number }>(); const [error, setError] = useState("");
  const capture = () => navigator.geolocation?.getCurrentPosition(({ coords: c }) => setCoords({ latitude: c.latitude, longitude: c.longitude }), () => setError("Không lấy được GPS, có thể hoàn tất không kèm xác thực vị trí."));
  const submit = async () => { const amount = Number(weight); if (!product || amount <= 0) return setError("Nhập nông sản và khối lượng hợp lệ."); const result = await completeProcurementRequest(request.id, { actual_product_name: product, actual_weight_tons: amount, payment_velocity: payment, buyer_latitude: coords?.latitude, buyer_longitude: coords?.longitude }); if (result.error) return setError(result.error); onDone(); onClose(); };
  return <Dialog title="Xác nhận thu mua hoàn thành" onClose={onClose}><input value={product} onChange={(e) => setProduct(e.target.value)} className="w-full rounded-lg border px-3 py-2" placeholder="Nông sản thực tế" /><input type="number" step="0.001" value={weight} onChange={(e) => setWeight(e.target.value)} className="w-full rounded-lg border px-3 py-2" placeholder="Khối lượng thực tế (tấn)" /><select value={payment} onChange={(e) => setPayment(e.target.value as PaymentVelocity)} className="w-full rounded-lg border px-3 py-2"><option value="on_site">Thanh toán tại vườn</option><option value="within_48h">Trong 24–48 giờ</option><option value="within_7d">Trong 7 ngày</option><option value="over_7d">Công nợ trên 7 ngày</option></select><button onClick={capture} className="flex w-full items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm"><MapPin className="h-4 w-4" /> {coords ? "Đã ghi nhận GPS" : "Ghi nhận GPS xe thu mua"}</button>{error && <p className="text-sm text-red-600">{error}</p>}<button onClick={submit} className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-700 py-2.5 font-medium text-white"><CheckCircle2 className="h-4 w-4" /> Hoàn tất</button></Dialog>;
}

function ReviewDialog({ request, onClose, onDone }: { request: ProcurementRequest; onClose: () => void; onDone: () => void }) {
  const [price, setPrice] = useState(5); const [care, setCare] = useState(5); const [transparent, setTransparent] = useState(5); const [comment, setComment] = useState(""); const [error, setError] = useState("");
  const submit = async () => { const result = await submitBusinessReview(request, { price_integrity: price, punctuality_care: care, transparency_attitude: transparent, comment: comment || null }); if (result.error) return setError(result.error); onDone(); onClose(); };
  return <Dialog title="Đánh giá doanh nghiệp" onClose={onClose}><Rating label="Độ chính xác về giá" value={price} onChange={setPrice} /><Rating label="Đúng hẹn & kỹ thuật hái" value={care} onChange={setCare} /><Rating label="Minh bạch cân cáp & thái độ" value={transparent} onChange={setTransparent} /><textarea value={comment} onChange={(e) => setComment(e.target.value)} rows={3} className="w-full rounded-lg border p-3" placeholder="Chia sẻ trải nghiệm của bạn..." />{error && <p className="text-sm text-red-600">{error}</p>}<button onClick={submit} className="w-full rounded-lg bg-amber-500 py-2.5 font-semibold text-white">Gửi đánh giá</button></Dialog>;
}

function Rating({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) { return <div><p className="mb-1 text-sm font-medium">{label}</p><div className="flex gap-1">{[1,2,3,4,5].map((n) => <button key={n} onClick={() => onChange(n)}><Star className={`h-7 w-7 ${n <= value ? "fill-amber-400 text-amber-400" : "text-gray-300"}`} /></button>)}</div></div>; }
function Dialog({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) { return <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/50 p-4" onClick={onClose}><div className="w-full max-w-md space-y-4 rounded-xl bg-white p-5" onClick={(e) => e.stopPropagation()}><div className="flex justify-between"><h3 className="font-bold">{title}</h3><button onClick={onClose}>×</button></div>{children}</div></div>; }
