/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck - season-connection RPC is introduced by Supabase migration 050.
import { useEffect, useState } from "react";
import { CheckCircle2, ChevronDown, ChevronUp } from "lucide-react";
import { supabase } from "../../lib/supabase/supabase";

export function SuccessfulSeasonTransactions() {
  const [transactions, setTransactions] = useState([]);
  const [totalMatches, setTotalMatches] = useState(0);
  const [expanded, setExpanded] = useState(false);
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

  return <section className="rounded-xl border border-gray-200 bg-white p-4 text-gray-900 md:p-5">
    <button type="button" onClick={() => setExpanded((value) => !value)} className="w-full text-left" aria-expanded={expanded}>
      <div className="flex items-center justify-between gap-3">
        <div><h2 className="text-base font-bold">Mã giao dịch kết nối đã thành công</h2><p className="mt-1 text-sm text-gray-600">{loading ? "Đang tải số liệu..." : loadError ? "Chưa tải được số liệu kết nối." : `${transactions.length} mã giao dịch đã chốt trên ${totalMatches} hồ sơ kết nối`}</p></div>
        {expanded ? <ChevronUp className="h-5 w-5 shrink-0" /> : <ChevronDown className="h-5 w-5 shrink-0" />}
      </div>
      <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-gray-200"><div className="h-full rounded-full bg-emerald-600 transition-all duration-500" style={{ width: `${completion}%` }} /></div>
      <p className="mt-1 text-right text-xs text-gray-600">{completion}%</p>
    </button>
    {expanded && <div className="mt-4 space-y-2 border-t border-gray-200 pt-3">
      {loading ? <p className="py-2 text-sm text-gray-600">Đang tải danh sách mã...</p> : loadError ? <p className="py-2 text-sm text-red-700">Không thể tải danh sách. Hãy kiểm tra migration 050 đã được áp dụng.</p> : !transactions.length ? <p className="py-2 text-sm text-gray-600">Chưa có giao dịch kết nối nào được hai bên xác nhận.</p> : transactions.map((transaction) => <div key={transaction.transaction_code} className="flex items-center justify-between gap-3 rounded-lg border border-gray-200 bg-white px-3 py-2.5">
        <span><span className="block font-semibold text-emerald-800">{transaction.transaction_code}</span><span className="mt-0.5 block text-xs text-gray-600">Đã xác nhận {new Date(transaction.confirmed_at).toLocaleDateString("vi-VN")}</span></span>
        <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
      </div>)}
    </div>}
  </section>;
}
