from __future__ import annotations

import json
import re
from pathlib import Path
from urllib.request import urlopen


ROOT = Path(r"D:\final app\final app")
BASE = "https://raw.githubusercontent.com/dvhcvn/20250701/main"
DEST = ROOT / "public" / "data" / "vietnam-admin-2025.json"
LICENSE = ROOT / "public" / "data" / "dvhcvn-20250701-LICENSE.txt"

with urlopen(f"{BASE}/input/docs/1027_CTK-CSCL.md", timeout=30) as response:
    source = response.read().decode("utf-8")

pattern = re.compile(
    r"^\|\s*(\d+)\s*\|\s*(\d+)\s*\|\s*(.+?)\s*\|\s*(Tỉnh|Thành phố|Tp)\s+(.+?)\s*\|\s*$"
)
provinces: dict[str, dict] = {}
unparsed_rows: list[str] = []
for line in source.splitlines():
    normalized_line = line.replace("<br>", " ")
    match = pattern.match(normalized_line)
    if not match:
        if re.match(r"^\|\s*\d+\s*\|", line):
            unparsed_rows.append(line)
        continue
    row_no, code, unit_name, province_kind, province_name = match.groups()
    province_name = re.sub(r"\s+", " ", province_name.replace("<br>", " ")).strip()
    province_kind = "Thành phố" if province_kind.lower() == "tp" else province_kind
    unit_name = re.sub(r"\s+", " ", unit_name.replace("<br>", " ")).strip()
    prefixes = ("Đặc khu", "Phường", "Xã", "Thị trấn", "Thành phố", "Thị xã")
    kind = next((prefix for prefix in prefixes if unit_name.startswith(prefix + " ")), "")
    if not kind:
        kind = unit_name.split(" ", 1)[0]
    name = unit_name[len(kind):].strip()
    province = provinces.setdefault(
        province_name,
        {"name": province_name, "type": province_kind, "code": "", "communes": []},
    )
    commune = {"code": code, "name": f"{kind} {name.strip()}", "type": kind}
    if not any(existing["code"] == code for existing in province["communes"]):
        province["communes"].append(commune)

if len(provinces) != 34:
    print("Province labels:", sorted(provinces))
    raise RuntimeError(f"Expected 34 provinces/cities, parsed {len(provinces)}")
commune_count = sum(len(p["communes"]) for p in provinces.values())
if commune_count != 3321:
    print("Unparsed numeric rows:", len(unparsed_rows), unparsed_rows[:20])
    raise RuntimeError(f"Expected 3321 communes, parsed {commune_count}")

payload = {
    "effectiveDate": "2025-07-01",
    "source": "DVHCVN 20250701, sourced from official 2025 commune-level administrative code list",
    "sourceUrl": "https://github.com/dvhcvn/20250701",
    "license": "MIT",
    # Stable unique UI keys. The administrative code table assigns codes to
    # commune-level units; province codes are not needed by this selector.
    "provinces": [
        {**province, "code": f"p{index:02d}"}
        for index, province in enumerate(sorted(provinces.values(), key=lambda p: p["name"]))
    ],
}
DEST.write_text(json.dumps(payload, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")

with urlopen(f"{BASE}/LICENSE", timeout=30) as response:
    license_text = response.read().decode("utf-8")
LICENSE.write_text(license_text, encoding="utf-8")

print(f"Wrote {DEST} with {len(provinces)} provinces and {commune_count} communes")
print(f"Wrote {LICENSE}")
