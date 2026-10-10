/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck - season connection tables are generated from Supabase migrations.
import { useEffect, useState } from "react";
import { Download, Handshake, MapPin, PackageCheck, Scale, Users } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis, LineChart, Line } from "recharts";
import { supabase } from "../../../lib/supabase/supabase";
import { exportToCSV, exportToExcel } from "../../../lib/analytics/analytics.service";

const dateLabel = (value) => new Date(`${value}T00:00:00`).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" });
const dateTime = (value) => new Date(value).toLocaleString("vi-VN", { dateStyle: "short", timeStyle: "short" });
const number = (value, digits = 0) => Number(value || 0).toLocaleString("vi-VN", { maximumFractionDigits: digits });

export function SeasonConnectionAnalytics() {
  const [period, setPeriod] = useState(30);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [transactions, setTransactions] = useState([]);
  const [supplies, setSupplies] = useState([]);
  const [profiles, setProfiles] = useState([]);

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      setError("");
      const start = new Date();
      start.setDate(start.getDate() - (period - 1));
      start.setHours(0, 0, 0, 0);
      const { data: rows, error: transactionError } = await supabase
        .from("season_transactions")
        .select("id, transaction_code, farmer_id, business_id, supply_id, demand_id, quantity_tons, confirmed_at")
        .gte("confirmed_at", start.toISOString())
        .order("confirmed_at", { ascending: false });
      if (!active) return;
      if (transactionError) {
        setError(transactionError.message || "Không tải được giao dịch kết nối.");
        setTransactions([]); setSupplies([]); setProfiles([]); setLoading(false);
        return;
      }
      const list = rows ?? [];
      const supplyIds = [...new Set(list.map((row) => row.supply_id))];
      const userIds = [...new Set(list.flatMap((row) => [row.farmer_id, row.business_id]))];
      const [supplyResult, profileResult] = await Promise.all([
        supplyIds.length ? supabase.from("season_supplies").select("id, crop_name, variety, province, district, commune, area_detail, address_detail").in("id", supplyIds) : Promise.resolve({ data: [], error: null }),
        userIds.length ? supabase.from("profiles").select("id, username").in("id", userIds) : Promise.resolve({ data: [], error: null }),
      ]);
      if (!active) return;
      if (supplyResult.error || profileResult.error) setError("Đã tải giao dịch nhưng chưa lấy đủ tên nông sản hoặc tài khoản.");
      setTransactions(list);
      setSupplies(supplyResult.data ?? []);
      setProfiles(profileResult.data ?? []);
      setLoading(false);
    };
    void load();
    return () => { active = false; };
  }, [period]);

  const supplyById = new Map(supplies.map((item) => [item.id, item]));
  const profileById = new Map(profiles.map((item) => [item.id, item]));
  const chartData = Array.from({ length: period }, (_, index) => {
    const date = new Date(); date.setDate(date.getDate() - (period - index - 1));
    const key = date.toISOString().slice(0, 10);
    const daily = transactions.filter((item) => item.confirmed_at.slice(0, 10) === key);
    return { date: key, label: dateLabel(key), transactions: daily.length, tons: daily.reduce((sum, item) => sum + Number(item.quantity_tons || 0), 0) };
  });
  const cropGroups = new Map();
  for (const transaction of transactions) {
    const crop = supplyById.get(transaction.supply_id)?.crop_name || "Chưa phân loại";
    const group = cropGroups.get(crop) || { crop, transactions: 0, tons: 0 };
    group.transactions += 1; group.tons += Number(transaction.quantity_tons || 0); cropGroups.set(crop, group);
  }
  const cropData = [...cropGroups.values()].sort((a, b) => b.transactions - a.transactions).slice(0, 8);
  const totalTons = transactions.reduce((sum, row) => sum + Number(row.quantity_tons || 0), 0);
  const farmerCount = new Set(transactions.map((row) => row.farmer_id)).size;
  const businessCount = new Set(transactions.map((row) => row.business_id)).size;
  const exportRows = transactions.map((row) => {
    const supply = supplyById.get(row.supply_id) || {};
    const farmer = profileById.get(row.farmer_id) || {};
    const business = profileById.get(row.business_id) || {};
    return {
      "Mã giao dịch": row.transaction_code,
      "Nông sản": [supply.crop_name, supply.variety].filter(Boolean).join(" · "),
      "Nhà vườn": farmer.username || "—",
      "Doanh nghiệp": business.username || "—",
      "Khu vực": [supply.commune, supply.district, supply.province].filter(Boolean).join(", "),
      "Sản lượng (tấn)": Number(row.quantity_tons),
      "Ngày xác nhận": dateTime(row.confirmed_at),
    };
  });
  const exportData = (format) => format === "csv" ? exportToCSV(exportRows, "giao_dich_ket_noi_thanh_cong") : exportToExcel(exportRows, "giao_dich_ket_noi_thanh_cong", "Giao dịch");

  if (loading) return <div className="flex h-64 items-center justify-center text-gray-600">Đang tải giao dịch thành công...</div>;

  return <div className="space-y-6">
    <div className="flex flex-wrap gap-2">{[7, 30, 90].map((days) => <button key={days} onClick={() => setPeriod(days)} className={`rounded-lg px-4 py-2 font-medium ${period === days ? "bg-green-600 text-white" : "bg-white text-gray-700 hover:bg-gray-100"}`}>{days} ngày</button>)}</div>
    {error && <div role="alert" className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">{error}</div>}
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
      {[
        { label: `Giao dịch thành công (${period} ngày)`, value: number(transactions.length), icon: Handshake, color: "text-emerald-700 bg-emerald-50" },
        { label: "Tổng sản lượng đã chốt", value: `${number(totalTons, 2)} tấn`, icon: Scale, color: "text-blue-700 bg-blue-50" },
        { label: "Nhà vườn tham gia", value: number(farmerCount), icon: Users, color: "text-amber-700 bg-amber-50" },
        { label: "Doanh nghiệp thu mua", value: number(businessCount), icon: PackageCheck, color: "text-purple-700 bg-purple-50" },
      ].map(({ label, value, icon: Icon, color }) => <div key={label} className="rounded-lg border border-gray-200 bg-white p-5"><div className="flex items-center gap-3"><div className={`rounded-lg p-2 ${color}`}><Icon className="h-6 w-6" /></div><div><p className="text-sm text-gray-600">{label}</p><p className="text-2xl font-bold text-gray-900">{value}</p></div></div></div>)}
    </div>
    <section className="rounded-lg border border-gray-200 bg-white p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-lg font-bold text-gray-900">Giao dịch hoàn tất theo ngày</h2><p className="text-sm text-gray-500">Chỉ tính giao dịch đã được cả hai bên xác nhận.</p></div><div className="flex gap-2"><button onClick={() => exportData("csv")} className="flex items-center gap-2 rounded bg-gray-100 px-3 py-1.5 text-sm hover:bg-gray-200"><Download className="h-4 w-4" />CSV</button><button onClick={() => exportData("excel")} className="flex items-center gap-2 rounded bg-gray-100 px-3 py-1.5 text-sm hover:bg-gray-200"><Download className="h-4 w-4" />Excel</button></div></div>
      <ResponsiveContainer width="100%" height={310}><LineChart data={chartData}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="label" minTickGap={22} /><YAxis yAxisId="left" allowDecimals={false} /><YAxis yAxisId="right" orientation="right" /><Tooltip /><Legend /><Line yAxisId="left" type="monotone" dataKey="transactions" name="Giao dịch" stroke="#059669" strokeWidth={2} /><Line yAxisId="right" type="monotone" dataKey="tons" name="Sản lượng (tấn)" stroke="#2563eb" strokeWidth={2} /></LineChart></ResponsiveContainer>
    </section>
    <section className="rounded-lg border border-gray-200 bg-white p-5"><h2 className="mb-4 text-lg font-bold text-gray-900">Sản lượng giao dịch theo nông sản</h2>{cropData.length ? <ResponsiveContainer width="100%" height={280}><BarChart data={cropData} margin={{ left: 4, right: 16 }}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="crop" /><YAxis /><Tooltip /><Legend /><Bar dataKey="tons" fill="#10b981" name="Sản lượng (tấn)" /><Bar dataKey="transactions" fill="#3b82f6" name="Số giao dịch" /></BarChart></ResponsiveContainer> : <p className="py-12 text-center text-sm text-gray-500">Chưa có giao dịch thành công trong khoảng thời gian này.</p>}</section>
    <section className="overflow-hidden rounded-lg border border-gray-200 bg-white"><div className="flex flex-wrap items-center justify-between gap-2 border-b p-5"><div><h2 className="text-lg font-bold text-gray-900">Giao dịch đã chốt ({transactions.length})</h2><p className="text-sm text-gray-500">Danh sách xác nhận từ hai bên nhà vườn và doanh nghiệp.</p></div><span className="inline-flex items-center gap-1 text-sm text-gray-500"><MapPin className="h-4 w-4" />Khu vực vườn</span></div><div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left"><thead className="bg-gray-50 text-xs uppercase text-gray-600"><tr>{["Mã / ngày", "Nông sản", "Nhà vườn", "Doanh nghiệp", "Khu vực", "Sản lượng"].map((title) => <th key={title} className="px-4 py-3">{title}</th>)}</tr></thead><tbody className="divide-y divide-gray-100 text-sm">{transactions.map((row) => { const supply = supplyById.get(row.supply_id) || {}; const farmer = profileById.get(row.farmer_id) || {}; const business = profileById.get(row.business_id) || {}; return <tr key={row.id} className="hover:bg-gray-50"><td className="px-4 py-3"><b>{row.transaction_code}</b><p className="text-xs text-gray-500">{dateTime(row.confirmed_at)}</p></td><td className="px-4 py-3">{[supply.crop_name, supply.variety].filter(Boolean).join(" · ") || "—"}</td><td className="px-4 py-3">{farmer.username || "—"}</td><td className="px-4 py-3">{business.username || "—"}</td><td className="px-4 py-3">{[supply.commune, supply.district, supply.province].filter(Boolean).join(", ") || "—"}</td><td className="px-4 py-3 font-medium">{number(row.quantity_tons, 2)} t</td></tr>; })}</tbody></table>{transactions.length === 0 && <p className="py-12 text-center text-sm text-gray-500">Chưa có giao dịch thành công trong khoảng thời gian này.</p>}</div></section>
  </div>;
}
