/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck - season-connection tables are introduced by Supabase migration 046.
import { useEffect, useState } from "react";
import { CheckCircle2, ChevronDown, ChevronUp } from "lucide-react";
import { supabase } from "../../lib/supabase/supabase";

export function SuccessfulSeasonTransactions() {
  const [transactions, setTransactions] = useState([]);
  const [profiles, setProfiles] = useState({});
  const [totalMatches, setTotalMatches] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const [selected, setSelected] = useState(null);
  const [details, setDetails] = useState(null);

  useEffect(() => {
    let active = true;
    Promise.all([
      supabase.from("season_transactions").select("id, transaction_code, match_id, farmer_id, business_id, supply_id, demand_id, proposal_id, quantity_tons, confirmed_at").order("confirmed_at", { ascending: false }),
      supabase.from("season_matches").select("id", { count: "exact", head: true }),
    ]).then(async ([transactionsResult, matchesResult]) => {
      if (!active) return;
      if (transactionsResult.error || matchesResult.error) return;
      const rows = transactionsResult.data ?? [];
      setTransactions(rows);
      setTotalMatches(matchesResult.count ?? rows.length);
      const ids = [...new Set(rows.flatMap((row) => [row.farmer_id, row.business_id]))];
      if (!ids.length) return;
      const profileResult = await supabase.from("profiles").select("id, username").in("id", ids);
      if (active && !profileResult.error) setProfiles(Object.fromEntries((profileResult.data ?? []).map((profile) => [profile.id, profile.username])));
    });
    return () => { active = false; };
  }, []);

  const completion = totalMatches ? Math.min(100, Math.round(transactions.length / totalMatches * 100)) : 0;
  const openDetails = async (transaction) => {
    if (selected?.id === transaction.id) {
      setSelected(null);
      setDetails(null);
      return;
    }
    setSelected(transaction);
    setDetails(null);
    const [supplyResult, demandResult, proposalResult] = await Promise.all([
      supabase.from("season_supplies").select("crop_name, variety, province, commune").eq("id", transaction.supply_id).maybeSingle(),
      supabase.from("season_demands").select("province, commune").eq("id", transaction.demand_id).maybeSingle(),
      supabase.from("season_proposals").select("crop_name, quantity_tons, price_mode, price_per_kg, quality_standard, delivery_date, delivery_location, payment_terms, version").eq("id", transaction.proposal_id).maybeSingle(),
    ]);
    setDetails({ supply: supplyResult.data, demand: demandResult.data, proposal: proposalResult.data });
  };

  return <section className="rounded-xl border border-gray-200 bg-white p-4 text-gray-900 md:p-5">
    <button type="button" onClick={() => setExpanded((value) => !value)} className="w-full text-left">
      <div className="flex items-center justify-between gap-3">
        <div><h2 className="text-base font-bold">Mã giao dịch kết nối đã thành công</h2><p className="mt-1 text-sm text-gray-600">{transactions.length} / {totalMatches} hồ sơ đã chốt điều kiện</p></div>
        {expanded ? <ChevronUp className="h-5 w-5 shrink-0" /> : <ChevronDown className="h-5 w-5 shrink-0" />}
      </div>
      <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-gray-200"><div className="h-full rounded-full bg-emerald-600 transition-all duration-500" style={{ width: `${completion}%` }} /></div>
      <p className="mt-1 text-right text-xs text-gray-600">{completion}%</p>
    </button>
    {expanded && <div className="mt-4 space-y-2 border-t border-white/20 pt-3">
      {!transactions.length ? <p className="py-2 text-sm text-gray-600">Chưa có giao dịch kết nối nào được hai bên xác nhận.</p> : transactions.map((transaction) => <div key={transaction.id}>
        <button type="button" onClick={() => openDetails(transaction)} className="flex w-full items-center justify-between gap-3 rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-left hover:bg-gray-50">
          <span><span className="block font-semibold text-emerald-800">{transaction.transaction_code}</span><span className="mt-0.5 block text-xs text-gray-600">{profiles[transaction.farmer_id] ?? "Nhà vườn"} ↔ {profiles[transaction.business_id] ?? "Doanh nghiệp"}</span></span>
          <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
        </button>
        {selected?.id === transaction.id && <div className="mt-2 rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm text-gray-800">
          {!details ? <p>Đang tải hồ sơ...</p> : <><p><b>Mã:</b> {transaction.transaction_code}</p><p><b>Nông sản:</b> {details.proposal?.crop_name ?? details.supply?.crop_name ?? "—"}{details.supply?.variety ? ` · ${details.supply.variety}` : ""}</p><p><b>Sản lượng chốt:</b> {details.proposal?.quantity_tons ?? transaction.quantity_tons} tấn</p><p><b>Khu vực vườn:</b> {[details.supply?.commune, details.supply?.province].filter(Boolean).join(", ") || "—"}</p><p><b>Khu vực thu mua:</b> {[details.demand?.commune, details.demand?.province].filter(Boolean).join(", ") || "—"}</p><p><b>Ngày xác nhận:</b> {new Date(transaction.confirmed_at).toLocaleDateString("vi-VN")}</p>{details.proposal?.price_mode === "fixed" && <p><b>Giá chốt:</b> {Number(details.proposal.price_per_kg).toLocaleString("vi-VN")} đ/kg</p>}{details.proposal?.quality_standard && <p><b>Tiêu chuẩn:</b> {details.proposal.quality_standard}</p>}{details.proposal?.delivery_date && <p><b>Ngày giao nhận:</b> {new Date(`${details.proposal.delivery_date}T00:00:00`).toLocaleDateString("vi-VN")}</p>}{details.proposal?.delivery_location && <p><b>Địa điểm giao nhận:</b> {details.proposal.delivery_location}</p>}{details.proposal?.payment_terms && <p><b>Thanh toán:</b> {details.proposal.payment_terms}</p>}</>}
        </div>}
      </div>)}
    </div>}
  </section>;
}
