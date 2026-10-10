import { useState } from "react";
import type { FormEvent } from "react";
import { AlertTriangle, BookOpen, LoaderCircle, Send } from "lucide-react";
import { supabase } from "../../lib/supabase/supabase";

interface AdvisorSource {
  source_name: string;
  source_section: string;
  source_locator: string;
  similarity: number;
}

interface AdvisorResponse {
  answer?: string;
  sources?: AdvisorSource[];
  error?: string;
}

function renderInlineMarkdown(text: string, keyPrefix: string) {
  const tokens = text.split(/(\*\*[^*]+?\*\*|\*[^*]+?\*|`[^`]+`|\[Nguồn\s+\d+\])/g);

  return tokens.map((token, index) => {
    const key = `${keyPrefix}-${index}`;
    if (token.startsWith("**") && token.endsWith("**")) {
      return <strong key={key}>{token.slice(2, -2)}</strong>;
    }
    if (token.startsWith("*") && token.endsWith("*")) {
      return <em key={key}>{token.slice(1, -1)}</em>;
    }
    if (token.startsWith("`") && token.endsWith("`")) {
      return <code key={key} className="rounded bg-gray-100 px-1 py-0.5 text-[0.9em]">{token.slice(1, -1)}</code>;
    }
    if (/^\[Nguồn\s+\d+\]$/.test(token)) {
      return <span key={key} className="font-semibold text-emerald-800">{token}</span>;
    }
    return token;
  });
}

function MarkdownAnswer({ content }: { content: string }) {
  return <div className="space-y-2 text-sm leading-6 text-gray-800">
    {content.split(/\r?\n/).map((line, index) => {
      const key = `answer-line-${index}`;
      const trimmed = line.trim();
      if (!trimmed) return <div key={key} className="h-1" aria-hidden="true" />;

      const heading = trimmed.match(/^#{1,3}\s+(.+)$/);
      if (heading) return <h4 key={key} className="pt-2 font-bold text-gray-900">{renderInlineMarkdown(heading[1], key)}</h4>;

      const numbered = trimmed.match(/^(\d+)\.\s+(.+)$/);
      if (numbered) return <div key={key} className="mt-3 flex gap-2 first:mt-0">
        <span className="shrink-0 font-semibold text-emerald-800">{numbered[1]}.</span>
        <div>{renderInlineMarkdown(numbered[2], key)}</div>
      </div>;

      const bullet = trimmed.match(/^[-*]\s+(.+)$/);
      if (bullet) return <div key={key} className="ml-4 flex gap-2">
        <span className="shrink-0 text-emerald-700" aria-hidden="true">•</span>
        <div>{renderInlineMarkdown(bullet[1], key)}</div>
      </div>;

      return <p key={key}>{renderInlineMarkdown(trimmed, key)}</p>;
    })}
  </div>;
}

export function AgronomyAdvisor() {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [sources, setSources] = useState<AdvisorSource[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const ask = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const cleanQuestion = question.trim();
    if (!cleanQuestion || loading) return;

    setLoading(true);
    setError("");
    setAnswer("");
    setSources([]);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error("Vui lòng đăng nhập lại để sử dụng tư vấn.");
      const response = await fetch("/api/agronomy-advisor", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ question: cleanQuestion }),
      });
      const data = await response.json() as AdvisorResponse;
      if (!response.ok) throw new Error(data.error || "Không thể tạo khuyến nghị.");
      setAnswer(data.answer || "Chưa có câu trả lời.");
      setSources(data.sources || []);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Không thể kết nối dịch vụ tư vấn.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="rounded-2xl border border-emerald bg-white p-4 text-gray-900 shadow-sm md:p-6" aria-labelledby="agronomy-advisor-title">
      <div className="mb-4 flex items-start gap-3">
        {/* <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700"><Sprout className="h-5 w-5" /></span> */}
        <div>
          <h2 id="agronomy-advisor-title" className="text-lg font-bold">Hỏi đáp khuyến nghị canh tác</h2>
          <p className="mt-1 text-sm text-gray-600">Lưu ý từ người phát triển phần mềm: Groq Free hiện giới hạn tối đa 1.000 request/ngày (30 request/phút). Model đang sử dụng: openai/gpt-oss-120b.</p>
        </div>
      </div>

      <form onSubmit={ask} className="space-y-3">
        <label htmlFor="agronomy-question" className="sr-only">Câu hỏi về cây trồng</label>
        <textarea
          id="agronomy-question"
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          maxLength={2000}
          rows={3}
          placeholder="Ví dụ: Sầu riêng đang ra đọt non, nước tưới có dấu hiệu nhiễm mặn thì tôi nên kiểm tra và xử lý thế nào?"
          className="w-full resize-y rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
        />
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs text-gray-500">Không nhập thông tin riêng tư hoặc dữ liệu người khác.</span>
          <button type="submit" disabled={loading || question.trim().length < 8} className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-emerald-700 bg-white px-4 py-2 text-sm font-semibold text-emerald-800 transition hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-50">
            {loading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            {loading ? "Đang tra cứu…" : "Hỏi đáp"}
          </button>
        </div>
      </form>

      {error && <p role="alert" className="mt-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />{error}</p>}
      {answer && <div className="mt-5 rounded-xl p-4">
        <h3 className="font-semibold text-gray-900">Khuyến nghị</h3>
        <div className="mt-2"><MarkdownAnswer content={answer} /></div>
        {sources.length > 0 && <div className="mt-4 border-t border-emerald-200 pt-3">
          <h4 className="flex items-center gap-2 text-sm font-semibold text-gray-800"><BookOpen className="h-4 w-4 text-emerald-700" />Nguồn đã truy xuất</h4>
          <ul className="mt-2 space-y-2">
            {sources.map((source, index) => <li key={`${source.source_name}-${source.source_locator}`} className="text-xs leading-5 text-gray-700">
              <span className="font-semibold">[Nguồn {index + 1}] {source.source_section}</span>
              <span className="block">{source.source_name} · {source.source_locator}</span>
            </li>)}
          </ul>
        </div>}
        <p className="mt-3 text-xs leading-5 text-gray-500">Khuyến nghị chỉ nhằm tham khảo, không thay thế chẩn đoán tại vườn hoặc tư vấn của cán bộ nông nghiệp. Hãy xác minh số liệu và điều kiện địa phương trước khi áp dụng.</p>
      </div>}
    </section>
  );
}
