/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck - season-connection RPC is introduced by Supabase migration 050.
import { useEffect, useState } from "react";
import { CheckCircle2, ChevronDown, ChevronUp } from "lucide-react";
import { supabase } from "../../lib/supabase/supabase";

export function SuccessfulSeasonTransactions() {
  const [transactions, setTransactions] = useState([]);
  const [totalMatches, setTotalMatches] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const [selectedCode, setSelectedCode] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    let active = true;
    supabase.rpc("get_public_season_transaction_summary").then(({ data, error }) => {
      if (!active) return;
      if (!error && data) {
        setTransactions(data.transactions ?? []);
        setTotalMatches(Number(data.total_matches ?? 0));
      } else setLoadError(true);
      setLoading(false);
    });
    return () => { active = false; };
  }, []);

  const completion = totalMatches ? Math.min(100, Math.round(transactions.length / totalMatches * 100)) : 0;

  return <section className="rounded-xl border border-emerald-800 bg-[#245f2f] p-4 text-white md:p-5">
    <button type="button" onClick={() => setExpanded((value) => !value)} className="w-full text-left" aria-expanded={expanded}>
      <div className="flex items-center justify-between gap-3">
        <div><h2 className="text-base font-bold text-white">Mã giao dịch kết nối đã thành công</h2><p className="mt-1 text-sm text-lime-100">{loading ? "Đang tải số liệu..." : loadError ? "Chưa tải được số liệu kết nối." : `${transactions.length} mã giao dịch đã chốt trên ${totalMatches} hồ sơ kết nối`}</p></div>
        {expanded ? <ChevronUp className="h-5 w-5 shrink-0" /> : <ChevronDown className="h-5 w-5 shrink-0" />}
      </div>
      <div className="mt-3 h-2.5 overflow-hidden rounded-full border border-white/70 bg-lime-600"><div className="h-full rounded-full bg-lime-300 transition-all duration-500" style={{ width: `${completion}%` }} /></div>
      <p className="mt-1 text-right text-xs text-lime-100">{completion}%</p>
    </button>
    {expanded && <div className="mt-4 space-y-2 border-t border-white/30 pt-3">
      {loading ? <p className="py-2 text-sm text-lime-100">Đang tải danh sách mã...</p> : loadError ? <p className="py-2 text-sm text-red-200">Không thể tải danh sách. Hãy kiểm tra migration 050 và 051 đã được áp dụng.</p> : !transactions.length ? <p className="py-2 text-sm text-lime-100">Chưa có giao dịch kết nối nào được hai bên xác nhận.</p> : transactions.map((transaction) => <div key={transaction.transaction_code}>
        <button type="button" onClick={() => setSelectedCode((current) => current === transaction.transaction_code ? null : transaction.transaction_code)} aria-expanded={selectedCode === transaction.transaction_code} className="flex w-full items-center justify-between gap-3 rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-left hover:bg-gray-50">
          <span><span className="block font-semibold text-emerald-800">{transaction.transaction_code}</span><span className="mt-0.5 block text-xs text-gray-600">Đã xác nhận {new Date(transaction.confirmed_at).toLocaleDateString("vi-VN")}</span></span>
          <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
        </button>
        {selectedCode === transaction.transaction_code && <div className="mt-2 p-3 text-sm text-white">
          <p className="mb-2 font-semibold text-white">Chi tiết giao dịch</p>
          <div className="grid gap-x-5 gap-y-1 sm:grid-cols-2">
            <p><b>Nông sản:</b> {transaction.crop_name || "—"}{transaction.variety ? ` · ${transaction.variety}` : ""}</p>
            <p><b>Sản lượng chốt:</b> {transaction.quantity_tons} tấn</p>
            <p><b>Nhà vườn:</b> {transaction.farmer_username || "Nhà vườn"}</p>
            <p><b>Doanh nghiệp:</b> {transaction.business_username || "Doanh nghiệp"}</p>
            <p><b>Khu vực vườn:</b> {transaction.supply_location || "—"}</p>
            <p><b>Khu vực thu mua:</b> {transaction.demand_location || "—"}</p>
            <p><b>Giá:</b> {transaction.price_mode === "fixed" && transaction.price_per_kg ? `${Number(transaction.price_per_kg).toLocaleString("vi-VN")} đ/kg` : "Hai bên thỏa thuận"}</p>
            <p><b>Ngày xác nhận:</b> {new Date(transaction.confirmed_at).toLocaleDateString("vi-VN")}</p>
            {transaction.quality_standard && <p><b>Tiêu chuẩn:</b> {transaction.quality_standard}</p>}
            {transaction.delivery_date && <p><b>Ngày giao nhận:</b> {new Date(`${transaction.delivery_date}T00:00:00`).toLocaleDateString("vi-VN")}</p>}
            {transaction.delivery_location && <p><b>Địa điểm giao nhận:</b> {transaction.delivery_location}</p>}
            {transaction.payment_terms && <p><b>Thanh toán:</b> {transaction.payment_terms}</p>}
            {transaction.other_terms && <p className="sm:col-span-2"><b>Điều kiện khác:</b> {transaction.other_terms}</p>}
          </div>
        </div>}
      </div>)}
    </div>}
  </section>;
}
