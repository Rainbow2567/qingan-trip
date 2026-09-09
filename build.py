# -*- coding: utf-8 -*-
import json, io, os, subprocess
from coords import COORDS

KEY = "9c689d038b384beedbe123d5b42932a8"
SCODE = "f093fd0fa2fcb5305a4b01d76b29294e"

# 加密预算：用预算密码（仅 budget_secret.json 持有，已 gitignore）AES-256-GCM 加密 → budget.enc.json
budget_enc = "null"
if os.path.exists("budget_secret.json"):
    subprocess.run(["node", "encrypt_budget.js"], check=True)
    with io.open("budget.enc.json", encoding="utf-8") as f:
        budget_enc = f.read().strip()
else:
    print("提示：缺少 budget_secret.json，预算页将无法解锁")

with io.open("trip-data.json", encoding="utf-8") as f:
    data = json.load(f)

missing = []
total_stops = 0
for day in data["days"]:
    for s in day["stops"]:
        total_stops += 1
        if s["name"] not in COORDS:
            missing.append(s["name"])
            continue
        lng, lat = COORDS[s["name"]]
        s["lng"] = lng
        s["lat"] = lat

if missing:
    print("MISSING COORDS:", missing)
    raise SystemExit(1)

# 注入离线预计算的真实驾车路线折线（routes.json 由 fetch_routes.py 生成）
try:
    with io.open("routes.json", encoding="utf-8") as f:
        routes_data = json.load(f)
    data["routes"] = routes_data.get("routes", routes_data)
    data["segments"] = routes_data.get("segments", {})
    print("注入路线天数:", len(data["routes"]),
          "分段:", sum(len(v) for v in data["segments"].values()))
except IOError:
    data["routes"] = {}
    data["segments"] = {}
    print("无 routes.json，改用直线连接")

with io.open("template.html", encoding="utf-8") as f:
    html = f.read()

payload = json.dumps(data, ensure_ascii=False)
html = html.replace("__JSON_DATA__", payload)
html = html.replace("__BUDGET_ENC__", budget_enc)
html = html.replace("__KEY__", KEY)
html = html.replace("__SCODE__", SCODE)

with io.open("index.html", "w", encoding="utf-8") as f:
    f.write(html)

print("OK 生成 index.html")
print("天数:", len(data["days"]), "途经点总数:", total_stops)
print("JSON 注入大小: %d 字符" % len(payload))
