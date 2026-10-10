"""Authenticated, source-grounded agronomy advice endpoint for Vercel."""

from __future__ import annotations

import json
import os
from http.server import BaseHTTPRequestHandler

from train.rag_core import IntegrationError, generate_answer, json_request, supabase_request


def _user_id(authorization: str) -> str | None:
    url = os.getenv("SUPABASE_URL", "").rstrip("/")
    anon_key = os.getenv("VITE_SUPABASE_ANON_KEY") or os.getenv("SUPABASE_ANON_KEY")
    if not url or not anon_key or not authorization.startswith("Bearer "):
        return None
    try:
        user = json_request(
            f"{url}/auth/v1/user", method="GET",
            headers={"apikey": anon_key, "Authorization": authorization}, timeout=15,
        )
        return user.get("id")
    except IntegrationError:
        return None


class handler(BaseHTTPRequestHandler):
    def _reply(self, status: int, payload: dict) -> None:
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Cache-Control", "no-store")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.end_headers()
        self.wfile.write(body)

    def do_OPTIONS(self) -> None:
        self.send_response(204)
        self.send_header("Allow", "POST, OPTIONS")
        self.end_headers()

    def do_POST(self) -> None:
        user_id = _user_id(self.headers.get("Authorization", ""))
        if not user_id:
            return self._reply(401, {"error": "Vui lòng đăng nhập để sử dụng tư vấn."})
        try:
            try:
                length = int(self.headers.get("Content-Length", "0"))
            except ValueError:
                return self._reply(400, {"error": "Kích thước yêu cầu không hợp lệ."})
            if length <= 0 or length > 12000:
                return self._reply(400, {"error": "Nội dung câu hỏi không hợp lệ."})
            body = json.loads(self.rfile.read(length).decode("utf-8"))
            if not isinstance(body, dict):
                return self._reply(400, {"error": "Yêu cầu phải có dạng đối tượng JSON."})
            question = str(body.get("question", "")).strip()
            context = str(body.get("context", "")).strip()[:1000]
            if len(question) < 8 or len(question) > 2000:
                return self._reply(400, {"error": "Câu hỏi cần dài từ 8 đến 2.000 ký tự."})

            matches = supabase_request("rpc/search_agronomy_knowledge", method="POST", payload={
                "query_text": question,
                "match_count": 5,
            }) or []
            if not matches:
                return self._reply(200, {
                    "answer": "Chưa tìm thấy đoạn tài liệu đủ liên quan để đưa ra khuyến nghị an toàn. Bạn có thể mô tả rõ cây trồng, giai đoạn sinh trưởng, triệu chứng và điều kiện nước/đất; hoặc hỏi cán bộ nông nghiệp địa phương.",
                    "sources": [],
                })
            answer = generate_answer(question, matches, context)
            sources = [{
                "source_name": item["source_name"],
                "source_section": item["source_section"],
                "source_locator": item["source_locator"],
                "similarity": round(float(item.get("similarity", 0)), 3),
            } for item in matches]
            return self._reply(200, {"answer": answer, "sources": sources})
        except (json.JSONDecodeError, UnicodeDecodeError):
            return self._reply(400, {"error": "Yêu cầu phải là JSON hợp lệ."})
        except IntegrationError as exc:
            print("Agronomy advisor integration error:", str(exc))
            return self._reply(503, {"error": "Dịch vụ tư vấn đang tạm thời chưa sẵn sàng. Vui lòng thử lại sau."})
        except Exception as exc:
            print("Agronomy advisor unexpected error:", repr(exc))
            return self._reply(500, {"error": "Đã có lỗi khi tạo khuyến nghị."})

    def log_message(self, format: str, *args: object) -> None:
        # Avoid logging question text or personal farming details.
        print("Agronomy advisor:", format % args)
