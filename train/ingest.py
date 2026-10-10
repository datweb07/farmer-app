"""Read a DOCX agronomy source, chunk it by headings, embed, and upsert into Supabase."""

from __future__ import annotations

import argparse
import os
import re
import sys
from pathlib import Path
from typing import Iterator

from docx import Document
from docx.table import Table
from docx.text.paragraph import Paragraph
from docx.oxml.table import CT_Tbl
from docx.oxml.text.paragraph import CT_P

from train.rag_core import IntegrationError, supabase_request


def iter_blocks(document: Document) -> Iterator[Paragraph | Table]:
    for child in document.element.body.iterchildren():
        if isinstance(child, CT_P):
            yield Paragraph(child, document)
        elif isinstance(child, CT_Tbl):
            yield Table(child, document)


def normalize(text: str) -> str:
    return re.sub(r"\s+", " ", text).strip()


def extract_blocks(path: Path) -> list[tuple[str, str]]:
    document = Document(path)
    section = "Tài liệu tổng hợp"
    records: list[tuple[str, str]] = []
    for block in iter_blocks(document):
        if isinstance(block, Paragraph):
            text = normalize(block.text)
            if not text:
                continue
            style = block.style.name if block.style else ""
            if style.startswith("Heading"):
                section = text[:220]
                records.append((section, text))
            else:
                records.append((section, text))
        else:
            for row in block.rows:
                cells = [normalize(cell.text) for cell in row.cells]
                line = " | ".join(value for value in cells if value)
                if line:
                    records.append((section, f"[Bảng] {line}"))
    return records


def make_chunks(records: list[tuple[str, str]], max_chars: int = 4200, overlap_chars: int = 350) -> list[dict[str, str]]:
    chunks: list[dict[str, str]] = []
    current_section = "Tài liệu tổng hợp"
    section_labels = [current_section]
    pieces: list[str] = []
    length = 0

    def flush() -> None:
        nonlocal pieces, length, section_labels
        content = "\n".join(pieces).strip()
        if content:
            source_section = (
                " · ".join(section_labels)
                if len(section_labels) <= 3
                else f"{section_labels[0]} … {section_labels[-1]}"
            )
            chunks.append({"source_section": source_section, "content": content})
        tail = content[-overlap_chars:] if overlap_chars and content else ""
        pieces = [tail] if tail else []
        length = len(tail)
        section_labels = [current_section]

    for section, text in records:
        current_section = section
        if section not in section_labels:
            section_labels.append(section)
        candidate_len = len(text) + 1
        if pieces and length + candidate_len > max_chars:
            flush()
            if section not in section_labels:
                section_labels.append(section)
        pieces.append(text)
        length += candidate_len
    if pieces:
        content = "\n".join(pieces).strip()
        if content:
            chunks.append({"source_section": current_section, "content": content})
    return chunks


def main() -> int:
    parser = argparse.ArgumentParser(description="Nạp tài liệu DOCX vào knowledge base RAG.")
    parser.add_argument("docx", type=Path, help="Đường dẫn file .docx nguồn")
    parser.add_argument("--document-key", default="champ-manh-chat-sau-rieng-can-tho")
    args = parser.parse_args()
    if not args.docx.is_file() or args.docx.suffix.lower() != ".docx":
        parser.error("Cần cung cấp một file .docx tồn tại.")
    if not os.getenv("SUPABASE_URL") or not os.getenv("SUPABASE_SERVICE_ROLE_KEY"):
        print("Thiếu SUPABASE_URL hoặc SUPABASE_SERVICE_ROLE_KEY.", file=sys.stderr)
        return 2

    try:
        chunks = make_chunks(extract_blocks(args.docx))
        if not chunks:
            print("Không tìm thấy văn bản trong tài liệu.", file=sys.stderr)
            return 2
        source_name = args.docx.name
        existing = supabase_request(
            f"agronomy_knowledge_chunks?select=chunk_index,source_name,source_section,source_locator,content&document_key=eq.{args.document_key}&limit=1000"
        ) or []
        current = {int(row["chunk_index"]): row for row in existing}
        pending_indices = []
        for index, item in enumerate(chunks):
            expected_locator = f"Mục: {item['source_section']} · đoạn {index + 1}"
            stored = current.get(index)
            if not stored or any((
                stored.get("source_name") != source_name,
                stored.get("source_section") != item["source_section"],
                stored.get("source_locator") != expected_locator,
                stored.get("content") != item["content"],
            )):
                pending_indices.append(index)

        print(f"Tài liệu có {len(chunks)} đoạn; {len(chunks) - len(pending_indices)} đoạn đã nạp đúng sẽ được giữ lại, cần xử lý {len(pending_indices)} đoạn.")
        for start in range(0, len(pending_indices), 100):
            indices = pending_indices[start:start + 100]
            batch = [chunks[index] for index in indices]
            rows = []
            for index, item in zip(indices, batch):
                rows.append({
                    "document_key": args.document_key,
                    "chunk_index": index,
                    "source_name": source_name,
                    "source_section": item["source_section"],
                    "source_locator": f"Mục: {item['source_section']} · đoạn {index + 1}",
                    "content": item["content"],
                })
            supabase_request("agronomy_knowledge_chunks?on_conflict=document_key,chunk_index",
                             method="POST", payload=rows, prefer="resolution=merge-duplicates")
            completed = min(start + len(batch), len(pending_indices))
            print(f"Đã xử lý {completed}/{len(pending_indices)} đoạn cần nạp; tổng corpus {len(chunks)} đoạn.")

        # Remove stale tail chunks from a prior version of this same corpus.
        supabase_request(
            f"agronomy_knowledge_chunks?document_key=eq.{args.document_key}&chunk_index=gte.{len(chunks)}",
            method="DELETE",
        )
        print("Hoàn tất nạp tài liệu vào Supabase pgvector.")
        print("Nguồn DOCX không lưu phân trang ổn định; trích dẫn được gắn theo mục và số thứ tự đoạn.")
        return 0
    except IntegrationError as exc:
        print(f"Không thể nạp tài liệu: {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
