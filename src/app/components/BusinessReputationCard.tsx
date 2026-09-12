import { useEffect, useState } from "react";
import { BadgeCheck, Building2, ShieldCheck, Star, Target } from "lucide-react";
import { getBusinessReputation, getBusinessReviews } from "../../lib/procurement/procurement.service";
import type { BusinessReputation, BusinessReview } from "../../lib/procurement/types";

interface Props { businessId: string; compact?: boolean; }

const tierStyle = {
  "Top Partner": "bg-amber-100 text-amber-800",
  "Verified Buyer": "bg-blue-100 text-blue-800",
  "New Member": "bg-gray-100 text-gray-700",
};

export function BusinessReputationCard({ businessId, compact = false }: Props) {
  const [score, setScore] = useState<BusinessReputation | null>(null);
  const [reviews, setReviews] = useState<BusinessReview[]>([]);

  useEffect(() => {
    getBusinessReputation(businessId).then(({ reputation }) => setScore(reputation));
    if (!compact) getBusinessReviews(businessId).then((result) => setReviews(result.reviews));
  }, [businessId, compact]);

  if (!score) return null;
  return <div className="rounded-xl border border-emerald-200 bg-white p-4">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-2"><Building2 className="h-5 w-5 text-emerald-700" /><div><p className="font-bold text-gray-900">{score.username} {score.verified_id && <span className="text-blue-600">(Verified) <BadgeCheck className="inline h-4 w-4" /></span>}</p><p className="flex items-center gap-1 text-sm text-gray-600"><Star className="h-4 w-4 fill-amber-400 text-amber-400" /> {Number(score.star_rating).toFixed(1)} / 5.0 · {score.review_count} đánh giá</p></div></div>
      <span className={`rounded-full px-3 py-1 text-xs font-semibold ${tierStyle[score.tier]}`}>{score.tier === "Top Partner" ? "🥇" : score.tier === "Verified Buyer" ? "🥈" : "🥉"} {score.tier}</span>
    </div>
    <div className="mt-3 flex items-start gap-2 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-900"><Target className="mt-0.5 h-4 w-4" /><span>Đã thu mua thành công: <strong>{score.successful_lots} lô</strong> ({Number(score.total_tons).toLocaleString("vi-VN")} tấn nông sản)</span></div>
    {!compact && <>
      <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs"><div className="rounded-lg bg-gray-50 p-2"><strong className="block text-lg text-blue-700">{score.transaction_score}</strong>Giao dịch /40</div><div className="rounded-lg bg-gray-50 p-2"><strong className="block text-lg text-blue-700">{score.review_score}</strong>Đánh giá /40</div><div className="rounded-lg bg-gray-50 p-2"><strong className="block text-lg text-blue-700">{score.legal_score}</strong>Pháp lý /20</div></div>
      <div className="mt-3 flex items-center justify-between border-t pt-3"><span className="flex items-center gap-1 text-sm font-medium"><ShieldCheck className="h-4 w-4 text-blue-600" /> Điểm uy tín</span><strong className="text-xl text-blue-700">{score.total_score}/100</strong></div>
      {reviews.length > 0 && <div className="mt-4 border-t pt-4"><h4 className="mb-2 text-sm font-semibold">Đánh giá từ nông dân</h4><div className="max-h-52 space-y-2 overflow-y-auto">{reviews.map((review) => <div key={review.id} className="rounded-lg bg-gray-50 p-3 text-sm"><div className="flex justify-between"><strong>{review.farmer_username}</strong><span className="text-amber-600">★ {(((review.price_integrity + review.punctuality_care + review.transparency_attitude) / 3)).toFixed(1)}</span></div>{review.comment && <p className="mt-1 text-gray-600">{review.comment}</p>}</div>)}</div></div>}
    </>}
  </div>;
}
