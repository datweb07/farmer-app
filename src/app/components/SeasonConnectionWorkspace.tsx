/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck - database types are generated after applying migration 046.
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { Check, CheckCheck, CircleHelp, Handshake, ImagePlus, Leaf, LoaderCircle, MapPin, MessageCircle, PackageCheck, Send, Smile, Truck, Wheat, X } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { GpsCaptureField } from "./GpsCaptureField";
import { canManageSeasonConnections } from "../../lib/admin/admin.service";
import {
  confirmSeasonProposal,
  createSeasonProposal,
  inviteSeasonMatch,
  loadSeasonMatchDetails,
  loadSeasonWorkspace,
  respondToSeasonMatch,
  rejectSeasonProposal,
  saveSeasonListing,
  sendSeasonChatMessage,
  removeSeasonChatMedia,
  toggleSeasonMessageReaction,
  uploadSeasonChatMedia,
  updateSeasonListingStatus,
} from "../../lib/season-connections/season-connections.service";
import { supabase } from "../../lib/supabase/supabase";
import { loadAdministrativeUnits } from "../../lib/location/administrative-data";
import type { Province } from "../../lib/location/types";

const inputClass = "mt-1.5 w-full rounded-md border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-100";
const cardClass = "rounded-lg border border-gray-200 bg-white";
const dateText = (value?: string) => value ? new Date(`${value}T00:00:00`).toLocaleDateString("vi-VN") : "Chưa xác định";
const dateTime = (value?: string) => value ? new Date(value).toLocaleString("vi-VN", { dateStyle: "short", timeStyle: "short" }) : "";
const priceLabel = (row) => row.price_mode === "fixed" && row.price_per_kg ? `${Number(row.price_per_kg).toLocaleString("vi-VN")} đ/kg` : "Thỏa thuận";
const locationLabel = (row) => [row.address_detail, row.area_detail, row.commune, row.district, row.province].filter(Boolean).join(", ");
const normalizeAdminName = (value = "") => value.trim().toLocaleLowerCase("vi").replace(/^(tỉnh|thành phố|huyện|quận|thị xã|thị trấn)\s+/i, "");

function Field({ label, children, className = "" }) {
  return <label className={`block text-sm font-medium text-gray-700 ${className}`}>{label}{children}</label>;
}

function StatusTag({ children, tone = "gray" }) {
  const tones = { gray: "text-gray-600", green: "text-emerald-700", amber: "text-amber-700", red: "text-red-700" };
  return <span className={`inline-flex px-1 py-0.5 text-xs font-semibold ${tones[tone]}`}>{children}</span>;
}

function ListingForm({ role, userId, initial, onCancel, onSaved }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [locations, setLocations] = useState<Province[]>([]);
  const [locationLoading, setLocationLoading] = useState(true);
  const [province, setProvince] = useState("");
  const [district, setDistrict] = useState("");
  const [gps, setGps] = useState(initial?.farm_latitude != null && initial?.farm_longitude != null ? {
    latitude: Number(initial.farm_latitude), longitude: Number(initial.farm_longitude),
    accuracy: initial.farm_accuracy_m == null ? null : Number(initial.farm_accuracy_m),
  } : null);
  const isSupply = role === "farmer";
  const selectedProvince = locations.find((item) => item.name === province);
  const districts = selectedProvince?.districts ?? [];
  useEffect(() => {
    let active = true;
    loadAdministrativeUnits().then((items) => {
      if (!active) return;
      setLocations(items);
      const currentProvince = items.find((item) => normalizeAdminName(item.name) === normalizeAdminName(initial?.province));
      if (currentProvince) {
        setProvince(currentProvince.name);
        const currentDistrict = currentProvince.districts.find((item) => normalizeAdminName(item.name) === normalizeAdminName(initial?.district));
        if (currentDistrict) setDistrict(currentDistrict.name);
      }
    }).catch((e) => setError(e?.message || "Không tải được danh mục tỉnh/huyện."))
      .finally(() => active && setLocationLoading(false));
    return () => { active = false; };
  }, [initial?.id, initial?.province, initial?.district]);
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    const values = Object.fromEntries(new FormData(event.currentTarget).entries());
    const numeric = (field) => Number(values[field]);
    try {
      if (!gps) throw new Error("Vui lòng ghi nhận GPS trước khi đăng tin mùa vụ.");
      if (!province || !district) throw new Error("Vui lòng chọn tỉnh/thành phố và quận/huyện.");
      const startDate = String(values.start || "");
      const endDate = String(values.end || "");
      if (endDate < startDate) throw new Error("Ngày kết thúc phải sau hoặc trùng ngày bắt đầu.");
      const gpsValues = {
        farm_latitude: gps?.latitude ?? null,
        farm_longitude: gps?.longitude ?? null,
        farm_accuracy_m: gps?.accuracy ?? null,
      };
      if (isSupply) {
        await saveSeasonListing("season_supplies", initial?.id, {
          farmer_id: userId,
          ...gpsValues,
          crop_name: values.crop_name, variety: values.variety || null,
          province, district, commune: values.commune || null, area_detail: values.area_detail || null, address_detail: values.address_detail || null,
          harvest_start: startDate, harvest_end: endDate, estimated_tons: numeric("estimated_tons"),
          sellable_tons: numeric("sellable_tons"), quantity_is_estimated: values.quantity_is_estimated === "on",
          quality_standard: values.quality_standard || null, delivery_mode: values.delivery_mode,
          note: values.note || null, status: initial?.status ?? "open",
        });
      } else {
        await saveSeasonListing("season_demands", initial?.id, {
          business_id: userId,
          ...gpsValues,
          crop_name: values.crop_name, variety: values.variety || null, desired_tons: numeric("desired_tons"),
          province, district, commune: values.commune || null, area_detail: values.area_detail || null, address_detail: values.address_detail || null,
          needed_start: startDate, needed_end: endDate, quality_standard: values.quality_standard || null,
          price_mode: values.price_mode, price_per_kg: values.price_mode === "fixed" ? numeric("price_per_kg") : null,
          delivery_terms: values.delivery_terms || null, payment_terms: values.payment_terms || null,
          note: values.note || null, status: initial?.status ?? "open",
        });
      }
      onSaved();
    } catch (e) {
      setError(e?.message || "Không lưu được thông tin. Kiểm tra các trường và thử lại.");
    } finally { setBusy(false); }
  };

  return <form onSubmit={submit} className="space-y-4">
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label="Nông sản *"><input required name="crop_name" className={inputClass} placeholder="Sầu riêng" defaultValue={initial?.crop_name} /></Field>
      <Field label="Giống"><input name="variety" className={inputClass} placeholder="Ri6, Monthong..." defaultValue={initial?.variety ?? ""} /></Field>
      {isSupply && <>
        <Field label="Sản lượng dự kiến (tấn) *"><input required min="0.01" step="0.01" type="number" name="estimated_tons" className={inputClass} defaultValue={initial?.estimated_tons ?? ""} /></Field>
        <Field label="Sản lượng muốn bán (tấn) *"><input required min="0.01" step="0.01" type="number" name="sellable_tons" className={inputClass} defaultValue={initial?.sellable_tons ?? ""} /></Field>
      </>}
      {!isSupply && <Field label="Sản lượng cần mua (tấn) *"><input required min="0.01" step="0.01" type="number" name="desired_tons" className={inputClass} defaultValue={initial?.desired_tons ?? ""} /></Field>}
      <Field label="Tỉnh / thành phố *"><select required value={province} disabled={locationLoading} onChange={(event) => { setProvince(event.target.value); setDistrict(""); }} className={inputClass}><option value="">{locationLoading ? "Đang tải tỉnh/thành..." : "Chọn tỉnh/thành phố"}</option>{locations.map((item) => <option key={item.code} value={item.name}>{item.name}</option>)}</select></Field>
      <Field label="Quận / huyện *"><select required value={district} disabled={!selectedProvince} onChange={(event) => setDistrict(event.target.value)} className={inputClass}><option value="">Chọn quận/huyện</option>{districts.map((item) => <option key={item.code} value={item.name}>{item.name}</option>)}</select></Field>
      <Field label="Xã / phường"><input name="commune" className={inputClass} placeholder="Nhập xã/phường" defaultValue={initial?.commune ?? ""} /></Field>
      <Field label="Ấp / khu vực"><input name="area_detail" className={inputClass} placeholder="Tên ấp, khu vực..." defaultValue={initial?.area_detail ?? ""} /></Field>
      <Field label="Số nhà / tên đường"><input name="address_detail" className={inputClass} placeholder="Số nhà, tên đường..." defaultValue={initial?.address_detail ?? ""} /></Field>
      <Field label={isSupply ? "Bắt đầu thu hoạch *" : "Cần hàng từ ngày *"}><input required type="date" name="start" className={inputClass} defaultValue={initial?.[isSupply ? "harvest_start" : "needed_start"]?.slice(0, 10) ?? ""} /></Field>
      <Field label={isSupply ? "Kết thúc thu hoạch *" : "Cần hàng đến ngày *"}><input required type="date" name="end" className={inputClass} defaultValue={initial?.[isSupply ? "harvest_end" : "needed_end"]?.slice(0, 10) ?? ""} /></Field>
      <Field label="Chất lượng / tiêu chuẩn"><input name="quality_standard" className={inputClass} placeholder="Kích cỡ, độ chín, mã vùng trồng..." defaultValue={initial?.quality_standard ?? ""} /></Field>
      {isSupply ? <Field label="Cách giao hàng"><select name="delivery_mode" className={inputClass} defaultValue={initial?.delivery_mode ?? "at_farm"}><option value="at_farm">Tại vườn</option><option value="collection_point">Điểm tập kết</option><option value="transport_help">Cần hỗ trợ vận chuyển</option></select></Field> : <>
        <Field label="Giá mua"><select name="price_mode" className={inputClass} defaultValue={initial?.price_mode ?? "negotiable"}><option value="negotiable">Thỏa thuận</option><option value="fixed">Giá cố định</option></select></Field>
        <Field label="Giá cố định (đ/kg), nếu có"><input min="1" type="number" name="price_per_kg" className={inputClass} defaultValue={initial?.price_per_kg ?? ""} /></Field>
        <Field label="Điều kiện giao nhận"><input name="delivery_terms" className={inputClass} placeholder="Thu mua tại vườn / giao kho..." defaultValue={initial?.delivery_terms ?? ""} /></Field>
        <Field label="Điều kiện thanh toán"><input name="payment_terms" className={inputClass} placeholder="Chuyển khoản sau cân..." defaultValue={initial?.payment_terms ?? ""} /></Field>
      </>}
      {isSupply && <label className="flex items-center gap-2 text-sm text-gray-700"><input type="checkbox" name="quantity_is_estimated" defaultChecked={initial?.quantity_is_estimated ?? true} />Sản lượng hiện là dự kiến</label>}
    </div>
    <Field label="Ghi chú"><textarea name="note" rows={3} className={inputClass} placeholder="Thông tin bổ sung để đối tác đánh giá phù hợp" defaultValue={initial?.note ?? ""} /></Field>
    <div className="space-y-2"><p className="text-sm font-medium text-gray-700">Vị trí GPS của {isSupply ? "vườn" : "khu vực thu mua"} <span className="text-red-600">*</span> <span className="text-xs font-normal text-gray-500">(bắt buộc)</span></p><GpsCaptureField initial={gps} onChange={setGps} required /></div>
    {error && <p className="text-sm text-red-700">{error}</p>}
    <div className="flex flex-wrap gap-2"><button disabled={busy} className="inline-flex items-center gap-2 rounded-md border border-emerald-700 bg-transparent px-4 py-2.5 text-sm font-semibold text-emerald-800 disabled:opacity-60">{busy && <LoaderCircle className="h-4 w-4 animate-spin" />}{initial ? "Lưu cập nhật" : "Đăng thông tin"}</button>{onCancel && <button type="button" onClick={onCancel} className="rounded-md border px-4 py-2.5 text-sm">Hủy</button>}</div>
  </form>;
}

export function SeasonConnectionWorkspace() {
  const { user, profile } = useAuth();
  const [admin, setAdmin] = useState(false);
  const [data, setData] = useState({ matches: [], supplies: [], demands: [], profiles: [], transactions: [] });
  const [selectedMatchId, setSelectedMatchId] = useState(() => new URLSearchParams(window.location.search).get("match") ?? "");
  const [details, setDetails] = useState(null);
  const [activeTab, setActiveTab] = useState("listings");
  const [editing, setEditing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [inviteSupply, setInviteSupply] = useState("");
  const [inviteDemand, setInviteDemand] = useState("");
  const [inviteReason, setInviteReason] = useState("");
  const [messageDraft, setMessageDraft] = useState("");
  const [messageFile, setMessageFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const messageFileRef = useRef<HTMLInputElement>(null);
  const [proposalOpen, setProposalOpen] = useState(false);

  const load = useCallback(async (quiet = false) => {
    if (!user) return;
    if (!quiet) setLoading(true);
    try {
      const [adminStatus, workspace] = await Promise.all([canManageSeasonConnections(), loadSeasonWorkspace(admin)]);
      setAdmin(adminStatus);
      // Scoped and full admins both load open supply/demand for matching; the database checks permission too.
      const finalWorkspace = adminStatus && !admin ? await loadSeasonWorkspace(true) : workspace;
      setData(finalWorkspace);
      setError("");
    } catch (e) {
      setError(e?.message || "Không tải được dữ liệu Kết nối mùa vụ.");
    } finally { if (!quiet) setLoading(false); }
  }, [user, admin]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { if (admin) setActiveTab("admin"); }, [admin]);
  useEffect(() => {
    const timer = window.setInterval(() => load(true), 12000);
    return () => window.clearInterval(timer);
  }, [load]);

  const activeMatches = useMemo(() => data.matches, [data.matches]);
  const managedMatches = useMemo(() => activeMatches.filter((match) => match.admin_id === user?.id), [activeMatches, user?.id]);
  const selectedMatch = activeMatches.find((match) => match.id === selectedMatchId) ?? activeMatches[0] ?? null;
  useEffect(() => { if (selectedMatch && selectedMatch.id !== selectedMatchId) setSelectedMatchId(selectedMatch.id); }, [selectedMatch, selectedMatchId]);

  const loadDetails = useCallback(async () => {
    if (!selectedMatch) { setDetails(null); return; }
    try { setDetails(await loadSeasonMatchDetails(selectedMatch)); }
    catch (e) { setError(e?.message || "Không tải được hồ sơ kết nối."); }
  }, [selectedMatch]);
  useEffect(() => { loadDetails(); }, [loadDetails]);
  useEffect(() => {
    if (selectedMatch?.status !== "connected" || !selectedMatch) return;
    const channel = supabase.channel(`season-chat-${selectedMatch.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "season_messages", filter: `match_id=eq.${selectedMatch.id}` }, () => loadDetails())
      .on("postgres_changes", { event: "*", schema: "public", table: "season_message_reactions", filter: `match_id=eq.${selectedMatch.id}` }, () => loadDetails())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [selectedMatch, loadDetails]);

  const perform = async (action, successMessage) => {
    setBusy(true); setError(""); setNotice("");
    try { await action(); setNotice(successMessage); await load(true); await loadDetails(); }
    catch (e) { setError(e?.message || "Thao tác chưa thành công."); }
    finally { setBusy(false); }
  };

  const submitListing = () => { setEditing(null); setActiveTab("listings"); load(true); setNotice("Đã lưu thông tin mùa vụ."); };
  const handleInvite = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await perform(() => inviteSeasonMatch(inviteSupply, inviteDemand, inviteReason), "Đã gửi lời mời riêng cho hai bên.");
    setInviteSupply(""); setInviteDemand(""); setInviteReason("");
  };
  const handleSendMessage = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedMatch || (!messageDraft.trim() && !messageFile) || uploading) return;
    if (messageFile && messageFile.size > 20 * 1024 * 1024) { setError("Mỗi ảnh/video tối đa 20 MB để tiết kiệm dung lượng miễn phí."); return; }
    const body = messageDraft.trim();
    setUploading(true); setError(""); setNotice("");
    let attachment;
    try {
      if (messageFile) attachment = await uploadSeasonChatMedia(selectedMatch.id, user.id, messageFile);
      await sendSeasonChatMessage(selectedMatch.id, body, attachment);
      setMessageDraft(""); setMessageFile(null);
      if (messageFileRef.current) messageFileRef.current.value = "";
      setNotice("Đã gửi tin nhắn."); await loadDetails();
    } catch (e) {
      if (attachment?.path) await removeSeasonChatMedia(attachment.path);
      setError(e?.message || "Không gửi được tin nhắn. Vui lòng thử lại.");
    } finally { setUploading(false); }
  };
  const handleReaction = async (message, emoji) => {
    if (!user?.id || (admin && !assignedManager)) return;
    const selected = details.reactions.some((reaction) => reaction.message_id === message.id && reaction.user_id === user.id && reaction.emoji === emoji);
    try { await toggleSeasonMessageReaction(selectedMatch.id, message.id, user.id, emoji, selected); await loadDetails(); }
    catch (e) { setError(e?.message || "Không cập nhật được cảm xúc."); }
  };
  const handleProposal = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedMatch) return;
    const values = Object.fromEntries(new FormData(event.currentTarget).entries());
    const terms = { ...values, quantity_tons: Number(values.quantity_tons), price_per_kg: values.price_per_kg || null };
    await perform(() => createSeasonProposal(selectedMatch.id, terms), "Đã gửi phiếu thỏa thuận mới; phiên bản trước không còn hiệu lực.");
    setProposalOpen(false);
  };

  const role = profile?.role;
  const isFarmer = role === "farmer";
  const ownListings = isFarmer ? data.supplies : data.demands;
  const profileName = (id) => data.profiles.find((item) => item.id === id)?.username ?? "Tài khoản";
  const matchingSupply = data.supplies.find((item) => item.id === inviteSupply);
  const matchingDemand = data.demands.find((item) => item.id === inviteDemand);
  const counterpartId = selectedMatch ? (user?.id === selectedMatch.farmer_id ? selectedMatch.business_id : selectedMatch.farmer_id) : "";
  const counterpartName = profileName(counterpartId);
  const currentProposal = details?.proposals?.find((item) => item.status === "pending");
  const transaction = details?.transaction;
  const connected = selectedMatch?.status === "connected";
  const assignedManager = admin && selectedMatch?.admin_id === user?.id;
  const canParticipateInChat = !admin || assignedManager;
  const userResponse = selectedMatch ? (user?.id === selectedMatch.farmer_id ? selectedMatch.farmer_response : selectedMatch.business_response) : "pending";
  const invitationPendingForUser = selectedMatch?.status === "invited" && userResponse === "pending" && !admin;

  if (loading) return <div className="flex min-h-[45vh] items-center justify-center text-gray-600"><LoaderCircle className="mr-2 h-5 w-5 animate-spin" />Đang tải dữ liệu kết nối mùa vụ...</div>;

  return <div className="season-connection-workspace min-h-[calc(100vh-7rem)] bg-[#f6f8f6]">
    <style>{`.season-connection-workspace [class*="shadow"]{box-shadow:none!important}.season-connection-workspace [class*="rounded-"]{border-radius:.5rem!important}.season-connection-workspace h2>svg,.season-connection-workspace h2~svg{display:none}.season-connection-workspace span[class*="bg-emerald-"]{background:transparent!important;color:#047857!important;padding-left:0;padding-right:0}.season-connection-workspace button[class*="bg-emerald-"]{background:transparent!important;border:1px solid #2563eb!important;color:#1d4ed8!important}.season-connection-workspace button[class*="bg-transparent"]{border-color:#2563eb!important;color:#1d4ed8!important}`}</style>
    <div className="mx-auto max-w-7xl px-4 py-6 md:px-6 md:py-9">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div><h1 className="text-2xl font-bold tracking-tight text-gray-900 md:text-3xl">Kết nối mùa vụ</h1></div>
        {/* <StatusTag tone="green">Admin giới thiệu · Hai bên tự chốt</StatusTag> */}
      </div>

      <div className="mb-5 flex gap-2 overflow-x-auto rounded-lg border bg-white p-1.5">
        {[
          ...(admin ? [{ id: "admin", label: "Ghép cặp & theo dõi" }] : []),
          ...(admin ? [{ id: "managed", label: `Giao dịch tôi quản lý (${managedMatches.length})` }] : []),
          { id: "listings", label: isFarmer ? "Nguồn cung của tôi" : "Nhu cầu thu mua của tôi" },
          { id: "matches", label: `Hồ sơ kết nối (${activeMatches.length})` },
        ].map((tab) => <button key={tab.id} onClick={() => { setActiveTab(tab.id); setEditing(null); }} className={`whitespace-nowrap rounded-md border px-4 py-2.5 text-sm font-semibold transition ${activeTab === tab.id ? "border-emerald-700 bg-transparent text-emerald-800" : "border-transparent text-gray-600 hover:text-emerald-700"}`}>{tab.label}</button>)}
      </div>

      {error && <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800"><strong>Lỗi:</strong> {error}{(error.toLowerCase().includes("does not exist") || error.toLowerCase().includes("schema cache")) && <p className="mt-2">Cơ sở dữ liệu chưa có các bảng chức năng mới. Hãy chạy migration <code>supabase/migrations/046_season_connections.sql</code> trong Supabase SQL Editor; hướng dẫn chi tiết có trong <code>docs/KET_NOI_MUA_VU_SUPABASE_SETUP.md</code>.</p>}</div>}
      {notice && <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{notice}<button className="float-right" onClick={() => setNotice("")} aria-label="Đóng">×</button></div>}

      {activeTab === "listings" && !admin && <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(320px,.85fr)]">
        <section className={`${cardClass} p-5 md:p-6`}>
          <div className="mb-4 flex items-start justify-between gap-3"><div><h2 className="text-lg font-bold text-gray-900">{isFarmer ? "Đăng nguồn cung mùa vụ" : "Đăng nhu cầu thu mua"}</h2><p className="mt-1 text-sm text-gray-500">{isFarmer ? "Thông tin có thể cập nhật khi sản lượng hoặc lịch thu hoạch thay đổi." : "Cho biết mặt hàng, thời gian và điều kiện thu mua dự kiến."}</p></div>{editing && <StatusTag tone="amber">Đang chỉnh sửa</StatusTag>}</div>
          <ListingForm key={`${role}-${editing?.id ?? "new"}`} role={role} userId={user?.id} initial={editing} onCancel={editing ? () => setEditing(null) : undefined} onSaved={submitListing} />
        </section>
        <section className={`${cardClass} p-5 md:p-6`}><div className="mb-4 flex items-center justify-between"><h2 className="text-lg font-bold text-gray-900">Thông tin của tôi</h2><span className="text-sm text-gray-500">{ownListings.length} tin</span></div>
          {ownListings.length === 0 ? <EmptyState text={isFarmer ? "Bạn chưa đăng nguồn cung mùa vụ." : "Bạn chưa đăng nhu cầu thu mua."} /> : <div className="space-y-3">{ownListings.map((listing) => <article key={listing.id} className="rounded-xl border border-gray-200 p-4"><div className="flex items-start justify-between gap-3"><div><h3 className="font-semibold text-gray-900">{listing.crop_name}{listing.variety ? ` · ${listing.variety}` : ""}</h3><p className="mt-1 text-sm text-gray-600"><MapPin className="mr-1 inline h-4 w-4" />{locationLabel(listing)}</p></div><StatusTag tone={listing.status === "open" ? "green" : listing.status === "paused" ? "amber" : "gray"}>{listing.status === "open" ? "Đang mở" : listing.status === "paused" ? "Tạm dừng" : "Đã đóng"}</StatusTag></div><p className="mt-2 text-sm text-gray-700">{isFarmer ? `${listing.sellable_tons} tấn muốn bán${listing.quantity_is_estimated ? " · dự kiến" : ""}` : `${listing.desired_tons} tấn cần mua`} · {dateText(isFarmer ? listing.harvest_start : listing.needed_start)} – {dateText(isFarmer ? listing.harvest_end : listing.needed_end)}</p><p className="mt-1 text-xs text-gray-400">Cập nhật {dateTime(listing.updated_at)}</p><div className="mt-3 flex flex-wrap gap-2"><button onClick={() => { setEditing(listing); window.scrollTo({ top: 0, behavior: "smooth" }); }} className="rounded-lg border px-3 py-2 text-sm font-medium">Chỉnh sửa</button>{listing.status !== "closed" && <button onClick={() => perform(() => updateSeasonListingStatus(isFarmer ? "season_supplies" : "season_demands", listing.id, listing.status === "open" ? "paused" : "open"), listing.status === "open" ? "Đã tạm dừng tin." : "Đã mở lại tin.")} className="rounded-lg border px-3 py-2 text-sm font-medium">{listing.status === "open" ? "Tạm dừng" : "Mở lại"}</button>}{listing.status !== "closed" && <button onClick={() => perform(() => updateSeasonListingStatus(isFarmer ? "season_supplies" : "season_demands", listing.id, "closed"), "Đã đóng tin mùa vụ.")} className="rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-700">Đóng tin</button>}</div></article>)}</div>}
        </section>
      </div>}

      {activeTab === "admin" && admin && <div className="space-y-5">
        <div className="grid gap-3 sm:grid-cols-4"><Kpi label="Nguồn cung đang mở" value={data.supplies.length} /><Kpi label="Nhu cầu đang mở" value={data.demands.length} /><Kpi label="Hồ sơ được ghép" value={data.matches.length} /><Kpi label="Giao dịch đã chốt" value={data.transactions.length} /></div>
        <div className="grid gap-5 lg:grid-cols-2">
          <section className={`${cardClass} p-5`}><h2 className="mb-3 flex items-center gap-2 font-bold"><Wheat className="h-5 w-5 text-emerald-700" />Nguồn cung nhà vườn</h2>{data.supplies.length ? <div className="max-h-72 space-y-2 overflow-auto">{data.supplies.map((item) => <button key={item.id} onClick={() => setInviteSupply(item.id)} className={`w-full rounded-xl border p-3 text-left ${inviteSupply === item.id ? "border-emerald-600 bg-emerald-50" : "hover:bg-gray-50"}`}><span className="font-semibold">{item.crop_name} {item.variety && `· ${item.variety}`}</span><span className="block text-sm text-gray-600">{locationLabel(item)} · {item.sellable_tons} t · {dateText(item.harvest_start)}–{dateText(item.harvest_end)}</span><span className="mt-1 block text-xs text-gray-500">{profileName(item.farmer_id)} · cập nhật {dateTime(item.updated_at)}</span></button>)}</div> : <EmptyState text="Chưa có nguồn cung đang mở." />}</section>
          <section className={`${cardClass} p-5`}><h2 className="mb-3 flex items-center gap-2 font-bold"><Truck className="h-5 w-5 text-emerald-700" />Nhu cầu doanh nghiệp</h2>{data.demands.length ? <div className="max-h-72 space-y-2 overflow-auto">{data.demands.map((item) => <button key={item.id} onClick={() => setInviteDemand(item.id)} className={`w-full rounded-xl border p-3 text-left ${inviteDemand === item.id ? "border-emerald-600 bg-emerald-50" : "hover:bg-gray-50"}`}><span className="font-semibold">{item.crop_name} {item.variety && `· ${item.variety}`}</span><span className="block text-sm text-gray-600">{locationLabel(item)} · {item.desired_tons} t · {dateText(item.needed_start)}–{dateText(item.needed_end)}</span><span className="mt-1 block text-xs text-gray-500">{profileName(item.business_id)} · {priceLabel(item)} · cập nhật {dateTime(item.updated_at)}</span></button>)}</div> : <EmptyState text="Chưa có nhu cầu thu mua đang mở." />}</section>
        </div>
        <section className={`${cardClass} p-5 md:p-6`}><h2 className="mb-1 text-lg font-bold">Mời hai bên kết nối</h2><p className="mb-4 text-sm text-gray-600">Chỉ mời khi mặt hàng, khu vực, thời gian và lượng hàng có khả năng phù hợp. Hệ thống không chốt mua bán thay hai bên.</p>
          {matchingSupply && matchingDemand && <div className="mb-4 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-950"><b>{matchingSupply.crop_name}</b> tại {locationLabel(matchingSupply)}, dự kiến {dateText(matchingSupply.harvest_start)}–{dateText(matchingSupply.harvest_end)}, có {matchingSupply.sellable_tons} tấn; doanh nghiệp cần {matchingDemand.desired_tons} tấn tại {locationLabel(matchingDemand)}, thời gian {dateText(matchingDemand.needed_start)}–{dateText(matchingDemand.needed_end)}.</div>}
          <form onSubmit={handleInvite} className="grid gap-3 md:grid-cols-[1fr_1fr_2fr_auto]"><Field label="Nguồn cung"><select required value={inviteSupply} onChange={(e) => setInviteSupply(e.target.value)} className={inputClass}><option value="">Chọn nguồn cung</option>{data.supplies.map((item) => <option key={item.id} value={item.id}>{item.crop_name} · {item.district ? `${item.district}, ` : ""}{item.province} · {item.sellable_tons} t</option>)}</select></Field><Field label="Nhu cầu"><select required value={inviteDemand} onChange={(e) => setInviteDemand(e.target.value)} className={inputClass}><option value="">Chọn nhu cầu</option>{data.demands.map((item) => <option key={item.id} value={item.id}>{item.crop_name} · {item.district ? `${item.district}, ` : ""}{item.province} · {item.desired_tons} t</option>)}</select></Field><Field label="Lý do ghép cặp"><input required minLength={10} value={inviteReason} onChange={(e) => setInviteReason(e.target.value)} className={inputClass} placeholder="Mặt hàng, khu vực, mùa thu hoạch và sản lượng có độ tương thích..." /></Field><button disabled={busy || !matchingSupply || !matchingDemand} className="mt-6 inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"><Handshake className="h-4 w-4" />Mời kết nối</button></form>
        </section>
      </div>}

      {(activeTab === "matches" || activeTab === "managed") && <div className="grid gap-5 xl:grid-cols-[minmax(260px,.72fr)_minmax(0,1.7fr)]">
        <section className={`${cardClass} p-3`}><div className="flex items-center justify-between px-2 py-2"><h2 className="font-bold">{activeTab === "managed" ? "Danh sách giao dịch đang quản lý" : "Hồ sơ kết nối"}</h2><button onClick={() => load()} title="Tải lại" className="rounded-lg border px-2.5 py-1.5 text-sm">Tải lại</button></div>{(activeTab === "managed" ? managedMatches : activeMatches).length ? <div className="space-y-2">{(activeTab === "managed" ? managedMatches : activeMatches).map((match) => { const active = selectedMatch?.id === match.id; const supply = data.supplies.find((item) => item.id === match.supply_id); const tone = match.status === "connected" ? "green" : match.status === "declined" ? "red" : "amber"; const label = match.status === "connected" ? "Đang trao đổi" : match.status === "declined" ? "Đã từ chối" : "Chờ phản hồi"; return <button key={match.id} onClick={() => setSelectedMatchId(match.id)} className={`w-full rounded-xl border p-3 text-left ${active ? "border-emerald-500 bg-emerald-50" : "border-gray-100 hover:bg-gray-50"}`}><div className="flex items-start justify-between gap-2"><b className="text-sm">{supply?.crop_name ?? "Kết nối mùa vụ"}</b><StatusTag tone={tone}>{label}</StatusTag></div><p className="mt-1 text-xs text-gray-600">{profileName(match.farmer_id)} ↔ {profileName(match.business_id)}</p><p className="mt-1 line-clamp-2 text-xs text-gray-500">{match.reason}</p></button>; })}</div> : <EmptyState text={activeTab === "managed" ? "Bạn chưa được giao quản lý giao dịch nào." : "Chưa có hồ sơ kết nối."} />}</section>

        {selectedMatch && details ? <div className="space-y-5">
          <section className={`${cardClass} p-5 md:p-6`}>
            <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-wide text-emerald-800">Hồ sơ kết nối · {selectedMatch.id.slice(0, 8).toUpperCase()}</p><h2 className="mt-1 text-xl font-bold text-gray-900">{details.supply.crop_name}{details.supply.variety ? ` · ${details.supply.variety}` : ""}</h2><p className="mt-1 text-sm text-gray-600">Lý do ghép: {selectedMatch.reason}</p></div><StatusTag tone={connected ? "green" : selectedMatch.status === "declined" ? "red" : "amber"}>{transaction ? `Đã chốt · ${transaction.transaction_code}` : connected ? "Hai bên đã kết nối" : selectedMatch.status === "declined" ? "Đã từ chối" : "Chờ phản hồi"}</StatusTag></div>
            <div className="mt-5 grid gap-3 md:grid-cols-[1fr_36px_1fr]">
              <PartyCard title="Nhà vườn" name={profileName(selectedMatch.farmer_id)} icon={<Leaf className="h-5 w-5" />}><Fact label="Khu vực" value={locationLabel(details.supply)} /><Fact label="Nguồn hàng" value={`${details.supply.sellable_tons} tấn muốn bán${details.supply.quantity_is_estimated ? " · dự kiến" : ""}`} /><Fact label="Thu hoạch" value={`${dateText(details.supply.harvest_start)} – ${dateText(details.supply.harvest_end)}`} /><Fact label="Tiêu chuẩn" value={details.supply.quality_standard || "Chưa ghi rõ"} /></PartyCard>
              <div className="flex items-center justify-center text-emerald-700"><Handshake className="h-6 w-6" /></div>
              <PartyCard title="Doanh nghiệp thu mua" name={profileName(selectedMatch.business_id)} icon={<PackageCheck className="h-5 w-5" />}><Fact label="Khu vực" value={locationLabel(details.demand)} /><Fact label="Nhu cầu" value={`${details.demand.desired_tons} tấn`} /><Fact label="Thời gian cần" value={`${dateText(details.demand.needed_start)} – ${dateText(details.demand.needed_end)}`} /><Fact label="Giá dự kiến" value={priceLabel(details.demand)} /></PartyCard>
            </div>
            <div className="mt-4 flex flex-wrap gap-2"><StatusTag tone="green">Người phụ trách: {profileName(selectedMatch.admin_id)}</StatusTag><StatusTag tone={selectedMatch.farmer_response === "interested" ? "green" : selectedMatch.farmer_response === "declined" ? "red" : "amber"}>Nhà vườn: {responseLabel(selectedMatch.farmer_response)}</StatusTag><StatusTag tone={selectedMatch.business_response === "interested" ? "green" : selectedMatch.business_response === "declined" ? "red" : "amber"}>Doanh nghiệp: {responseLabel(selectedMatch.business_response)}</StatusTag></div>
            <div className="mt-5 grid grid-cols-2 gap-2 md:grid-cols-4">{["Admin mời", "Hai bên đồng ý", "Trao đổi & đề xuất", "Cùng xác nhận"].map((step, index) => { const done = [true, connected, details.proposals.length > 0, !!transaction][index]; const current = !done && (index === 1 ? selectedMatch.status === "invited" : index === 2 ? connected && !transaction : false); return <div key={step} className={`border-t-[3px] pt-2 text-xs ${done ? "border-emerald-500 font-semibold text-emerald-800" : current ? "border-amber-400 font-semibold text-amber-800" : "border-gray-200 text-gray-400"}`}>{index + 1}. {step}</div>; })}</div>
            {invitationPendingForUser && <div className="mt-5 rounded-xl border border-emerald-100 bg-emerald-50 p-4"><h3 className="font-bold text-gray-900">Bạn có muốn trao đổi với {counterpartName}?</h3><p className="mt-1 text-sm text-gray-600">Quan tâm chỉ mở kênh trao đổi, chưa phải cam kết giao dịch.</p><div className="mt-3 flex gap-2"><button disabled={busy} onClick={() => perform(() => respondToSeasonMatch(selectedMatch.id, "interested"), "Đã ghi nhận bạn quan tâm kết nối.")} className="rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white">Quan tâm kết nối</button><button disabled={busy} onClick={() => perform(() => respondToSeasonMatch(selectedMatch.id, "declined"), "Đã ghi nhận từ chối lời mời.")} className="rounded-lg border border-red-200 px-4 py-2.5 text-sm font-semibold text-red-700">Từ chối</button></div></div>}
            {admin && <p className="mt-4 rounded-lg bg-gray-50 p-3 text-xs text-gray-600">{assignedManager ? "Bạn là người phụ trách hồ sơ này và có thể phối hợp với hai bên qua chat; quyền đồng ý và xác nhận giao dịch vẫn thuộc về nhà vườn và doanh nghiệp." : "Bạn chỉ có quyền theo dõi hồ sơ này."}</p>}
          </section>

          {connected && <section className={`${cardClass} overflow-hidden`}>
            <div className="flex items-center justify-between border-b px-5 py-4"><div className="flex items-center gap-2"><MessageCircle className="h-5 w-5 text-emerald-700" /><div><h2 className="font-bold">Trao đổi giữa hai bên</h2><p className="text-xs text-gray-500">{admin ? assignedManager ? `Người phụ trách: ${profileName(user?.id)}` : "Admin chỉ theo dõi" : `Bạn đang trao đổi với ${counterpartName}`}</p></div></div><StatusTag tone="green">Đang mở</StatusTag></div>
            <div className="max-h-[520px] min-h-36 space-y-4 overflow-y-auto bg-gray-50 p-4">
              {details.messages.length ? details.messages.map((message) => {
                const mine = message.sender_id === user?.id;
                const sender = profileName(message.sender_id);
                const reactions = details.reactions.filter((reaction) => reaction.message_id === message.id);
                const counts = [...new Set(reactions.map((reaction) => reaction.emoji))].map((emoji) => ({ emoji, count: reactions.filter((reaction) => reaction.emoji === emoji).length, mine: reactions.some((reaction) => reaction.emoji === emoji && reaction.user_id === user?.id) }));
                return <div key={message.id} className={`max-w-[92%] sm:max-w-[85%] ${mine ? "ml-auto" : ""}`}>
                  <p className={`mb-1 text-[11px] text-gray-500 ${mine ? "text-right" : ""}`}>{sender} · {dateTime(message.created_at)}</p>
                  <div className={`space-y-2 rounded-xl px-3 py-2.5 text-sm ${mine ? "rounded-br-sm bg-emerald-100 text-gray-900" : "rounded-bl-sm bg-white text-gray-800 shadow-sm"}`}>
                    {message.body && <p className="whitespace-pre-wrap break-words">{message.body}</p>}
                    {message.attachment_url && (message.attachment_mime_type?.startsWith("video/")
                      ? <video controls preload="metadata" playsInline className="max-h-72 max-w-full rounded-lg"><source src={message.attachment_url} type={message.attachment_mime_type} />Trình duyệt không hỗ trợ phát video.</video>
                      : <a href={message.attachment_url} target="_blank" rel="noreferrer"><img src={message.attachment_url} alt={message.attachment_name || "Ảnh đính kèm"} loading="lazy" className="max-h-72 max-w-full rounded-lg object-contain" /></a>)}
                    {message.attachment_name && <p className="text-xs text-gray-500">{message.attachment_name}</p>}
                  </div>
                  <div className={`mt-1.5 flex flex-wrap items-center gap-1 ${mine ? "justify-end" : ""}`}>
            {counts.map(({ emoji, count, mine: reacted }) => <button type="button" key={emoji} disabled={admin && !assignedManager} onClick={() => handleReaction(message, emoji)} className={`rounded-full border px-2 py-0.5 text-xs ${reacted ? "border-emerald-400 bg-emerald-50" : "border-gray-200 bg-white"}`}>{emoji} {count}</button>)}
                    {canParticipateInChat && <details className="relative"><summary aria-label="Thả cảm xúc" className="list-none cursor-pointer rounded-full p-1 text-gray-500 hover:bg-white"><Smile className="h-4 w-4" /></summary><div className="absolute bottom-full left-0 z-10 flex gap-1 rounded-full border bg-white p-1 shadow-sm">{["👍", "❤️", "😂", "🙏", "🎉"].map((emoji) => <button type="button" key={emoji} onClick={() => handleReaction(message, emoji)} className="rounded-full p-1 hover:bg-emerald-50" aria-label={`Thả ${emoji}`}>{emoji}</button>)}</div></details>}
                  </div>
                </div>;
              }) : <p className="py-10 text-center text-sm text-gray-500">Chưa có tin nhắn. Hai bên có thể bắt đầu trao đổi.</p>}
            </div>
            {canParticipateInChat && <form onSubmit={handleSendMessage} className="space-y-2 border-t p-3">
              {messageFile && <div className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-600"><span className="truncate">{messageFile.name} · {(messageFile.size / 1024 / 1024).toFixed(1)} MB</span><button type="button" onClick={() => { setMessageFile(null); if (messageFileRef.current) messageFileRef.current.value = ""; }} aria-label="Bỏ tệp đính kèm"><X className="h-4 w-4" /></button></div>}
              <div className="flex gap-2"><input value={messageDraft} onChange={(e) => setMessageDraft(e.target.value)} maxLength={4000} className="min-w-0 flex-1 rounded-lg border px-3 py-2.5 text-sm outline-none focus:border-emerald-600" placeholder="Trao đổi về mùa vụ, chất lượng, giao nhận..." /><input ref={messageFileRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/quicktime" className="hidden" onChange={(event) => setMessageFile(event.target.files?.[0] ?? null)} /><button type="button" onClick={() => messageFileRef.current?.click()} aria-label="Đính kèm ảnh hoặc video" title="Đính kèm ảnh/video" className="rounded-lg border px-3 text-emerald-800 hover:bg-emerald-50"><ImagePlus className="h-5 w-5" /></button><button disabled={uploading || (!messageDraft.trim() && !messageFile)} className="inline-flex items-center gap-2 rounded-lg bg-emerald-700 px-4 font-semibold text-white disabled:opacity-50">{uploading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}<span className="hidden sm:inline">{uploading ? "Đang gửi" : "Gửi"}</span></button></div>
              <p className="text-xs text-gray-500">Ảnh/video tối đa 20 MB mỗi tệp. Chỉ hai bên trong hồ sơ mới xem được.</p>
            </form>}
          </section>}

          {connected && <section className={`${cardClass} p-5 md:p-6`}><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-lg font-bold">Phiếu thỏa thuận</h2><p className="text-sm text-gray-500">Một giao dịch chỉ được ghi nhận khi cùng xác nhận đúng một phiên bản.</p></div>{!admin && !transaction && <button onClick={() => setProposalOpen((v) => !v)} className="rounded-lg border border-emerald-700 px-3 py-2 text-sm font-semibold text-emerald-800">{currentProposal ? "Đề nghị chỉnh sửa / v mới" : "Tạo phiếu thỏa thuận"}</button>}</div>
            {proposalOpen && !transaction && !admin && <form onSubmit={handleProposal} className="mt-4 rounded-xl border border-emerald-100 bg-emerald-50/60 p-4"><div className="grid gap-3 sm:grid-cols-2"><Field label="Nông sản *"><input required name="crop_name" defaultValue={currentProposal?.crop_name ?? details.supply.crop_name} className={inputClass} /></Field><Field label="Sản lượng (tấn) *"><input required type="number" min="0.01" step="0.01" name="quantity_tons" defaultValue={currentProposal?.quantity_tons ?? details.supply.sellable_tons} className={inputClass} /></Field><Field label="Cách xác định giá *"><select name="price_mode" defaultValue={currentProposal?.price_mode ?? details.demand.price_mode} className={inputClass}><option value="negotiable">Hai bên thỏa thuận</option><option value="fixed">Giá cố định</option></select></Field><Field label="Giá cố định (đ/kg)"><input type="number" min="1" name="price_per_kg" defaultValue={currentProposal?.price_per_kg ?? details.demand.price_per_kg ?? ""} className={inputClass} /></Field><Field label="Ngày giao nhận *"><input required type="date" name="delivery_date" defaultValue={currentProposal?.delivery_date ?? details.supply.harvest_start} className={inputClass} /></Field><Field label="Địa điểm giao nhận *"><input required name="delivery_location" defaultValue={currentProposal?.delivery_location ?? `${details.supply.commune ? `${details.supply.commune}, ` : ""}${details.supply.province}`} className={inputClass} /></Field><Field label="Tiêu chuẩn chất lượng"><input name="quality_standard" defaultValue={currentProposal?.quality_standard ?? details.supply.quality_standard ?? details.demand.quality_standard ?? ""} className={inputClass} /></Field><Field label="Điều kiện thanh toán *"><input required name="payment_terms" defaultValue={currentProposal?.payment_terms ?? details.demand.payment_terms ?? "Hai bên thỏa thuận khi cân hàng"} className={inputClass} /></Field></div><Field label="Điều kiện khác"><textarea rows={2} name="other_terms" defaultValue={currentProposal?.other_terms ?? ""} className={inputClass} /></Field><p className="my-3 text-xs text-gray-600">Khi gửi, người tạo được ghi nhận đồng ý với phiên bản mới này. Phiên bản cũ sẽ mất hiệu lực và đối tác cần xem lại toàn bộ điều kiện.</p><div className="flex gap-2"><button disabled={busy} className="rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white">Gửi phiếu và đồng ý</button><button type="button" onClick={() => setProposalOpen(false)} className="rounded-lg border px-4 py-2.5 text-sm">Hủy</button></div></form>}
            {details.proposals.length ? <div className="mt-4 space-y-3">{details.proposals.map((proposal) => <article key={proposal.id} className={`rounded-xl border p-4 ${proposal.status === "pending" ? "border-emerald-300" : "border-gray-200"}`}><div className="flex flex-wrap items-center justify-between gap-2"><h3 className="font-bold">Phiếu thỏa thuận v{proposal.version}</h3><StatusTag tone={proposal.status === "accepted" ? "green" : proposal.status === "pending" ? "amber" : proposal.status === "rejected" ? "red" : "gray"}>{proposal.status === "accepted" ? "Hai bên đồng ý" : proposal.status === "pending" ? "Phiên bản hiện hành · chờ xác nhận" : proposal.status === "rejected" ? "Đã từ chối" : "Đã thay thế"}</StatusTag></div><div className="mt-3 grid gap-2 text-sm sm:grid-cols-2"><Fact label="Nông sản / sản lượng" value={`${proposal.crop_name} · ${proposal.quantity_tons} tấn`} /><Fact label="Giá" value={priceLabel(proposal)} /><Fact label="Giao nhận" value={`${dateText(proposal.delivery_date)} · ${proposal.delivery_location}`} /><Fact label="Chất lượng" value={proposal.quality_standard || "Chưa ghi rõ"} /><Fact label="Thanh toán" value={proposal.payment_terms} /><Fact label="Điều kiện khác" value={proposal.other_terms || "Không có"} /></div><div className="mt-3 flex flex-wrap gap-2"><StatusTag tone={proposal.farmer_confirmed_at ? "green" : "amber"}>Nhà vườn {proposal.farmer_confirmed_at ? "đã đồng ý" : "chờ xác nhận"}</StatusTag><StatusTag tone={proposal.business_confirmed_at ? "green" : "amber"}>Doanh nghiệp {proposal.business_confirmed_at ? "đã đồng ý" : "chờ xác nhận"}</StatusTag></div>{proposal.status === "pending" && !admin && !transaction && <div className="mt-3 flex flex-wrap gap-2"><button disabled={busy || (user?.id === selectedMatch.farmer_id ? !!proposal.farmer_confirmed_at : !!proposal.business_confirmed_at)} onClick={() => perform(async () => { const result = await confirmSeasonProposal(proposal.id); if (result) setNotice("Cả hai bên đã xác nhận cùng phiên bản; giao dịch được ghi nhận."); }, "Đã ghi nhận xác nhận của bạn. Giao dịch chỉ ghi nhận sau khi bên kia cùng xác nhận.")} className="inline-flex items-center gap-2 rounded-lg bg-emerald-700 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"><Check className="h-4 w-4" />{(user?.id === selectedMatch.farmer_id ? proposal.farmer_confirmed_at : proposal.business_confirmed_at) ? "Bạn đã đồng ý phiên bản này" : "Đồng ý phiếu này"}</button><button disabled={busy} onClick={() => perform(() => rejectSeasonProposal(proposal.id), "Đã từ chối phiếu. Các bên có thể trao đổi và gửi phiên bản mới.")} className="rounded-lg border border-red-200 px-3 py-2 text-sm font-semibold text-red-700">Từ chối phiếu</button></div>}</article>)}</div> : <EmptyState text="Hai bên đã kết nối; chưa có phiếu thỏa thuận." />}
            {transaction && <div className="mt-4 flex items-center gap-3 rounded-xl bg-emerald p-4 text-emerald-900"><CheckCheck className="h-6 w-6 shrink-0" /><div><b>Giao dịch đã được xác nhận: {transaction.transaction_code}</b><p className="mt-1 text-sm">Cả nhà vườn và doanh nghiệp đã xác nhận cùng một phiên bản phiếu.</p></div></div>}
          </section>}
        </div> : <div className={`${cardClass} flex min-h-64 items-center justify-center p-8 text-center`}><div><CircleHelp className="mx-auto h-9 w-9 text-gray-400" /><h2 className="mt-3 font-bold text-gray-800">Chưa có hồ sơ kết nối</h2><p className="mt-1 text-sm text-gray-500">{admin ? "Chọn nguồn cung và nhu cầu tại mục Ghép cặp & theo dõi." : "Hồ sơ sẽ xuất hiện khi Admin mời bạn kết nối."}</p></div></div>}
      </div>}
    </div>
  </div>;
}

function responseLabel(response) { return response === "interested" ? "đã quan tâm" : response === "declined" ? "đã từ chối" : "chưa phản hồi"; }
function EmptyState({ text }) { return <div className="rounded-xl bg-gray-50 px-4 py-8 text-center text-sm text-gray-500">{text}</div>; }
function Kpi({ label, value }) { return <div className={`${cardClass} p-4`}><p className="text-2xl font-bold text-emerald-800">{value}</p><p className="mt-1 text-sm text-gray-500">{label}</p></div>; }
function Fact({ label, value }) { return <div className="rounded-lg bg-gray-50 p-2.5"><p className="text-[11px] text-gray-500">{label}</p><p className="mt-0.5 text-sm font-semibold text-gray-800">{value || "Chưa ghi rõ"}</p></div>; }
function PartyCard({ title, name, children }) { return <div className="rounded-lg border border-gray-200 p-4"><div className="mb-3"><p className="text-xs text-gray-500">{title}</p><p className="font-bold text-gray-900">{name}</p></div><div className="grid gap-2 sm:grid-cols-2">{children}</div></div>; }
