# One-shot extractor: jsonl chat -> readable markdown. Not part of the Moodle plugin.
import json
import re
from pathlib import Path

src = Path(r"D:\Work\moodle-work\docs\session-export\raw\chat_history.jsonl")
out = Path(r"D:\Work\moodle-work\docs\session-export\CHAT-RECENT.md")

lines = []
lines.append("# Recent chat (this Grok session, after context compaction)")
lines.append("")
lines.append("Earlier turns are in `raw/compaction/segment_000.md`.")
lines.append("This file is only the **user questions** and **assistant replies** from the live jsonl.")
lines.append("Tool calls are omitted. Dates: 2026-08-19 to 2026-08-21.")
lines.append("")

user_n = 0
for raw in src.read_text(encoding="utf-8").splitlines():
    if not raw.strip():
        continue
    try:
        obj = json.loads(raw)
    except json.JSONDecodeError:
        continue
    kind = obj.get("type")
    if kind == "user":
        content = obj.get("content")
        text = ""
        if isinstance(content, str):
            text = content
        elif isinstance(content, list):
            parts = []
            for p in content:
                if isinstance(p, dict) and p.get("text"):
                    parts.append(p["text"])
                elif isinstance(p, str):
                    parts.append(p)
            text = "\n".join(parts)
        text = re.sub(r"(?s)<system-reminder>.*?</system-reminder>", "", text)
        m = re.search(r"<user_query>\s*(.*?)\s*</user_query>", text, re.S)
        if m:
            q = m.group(1).strip()
        else:
            if "This session is being continued" in text:
                q = "(session continued after context compaction — see HANDOFF.md and raw/compaction/segment_000.md)"
            elif "<user_info>" in text or "<git_status>" in text:
                continue
            else:
                q = text.strip()
                if len(q) > 4000:
                    q = q[:4000] + "\n\n[truncated]"
        if not q:
            continue
        user_n += 1
        lines.append(f"## User {user_n}")
        lines.append("")
        lines.append(q)
        lines.append("")
    elif kind == "assistant":
        c = obj.get("content") or ""
        if not str(c).strip():
            continue
        lines.append("### Assistant")
        lines.append("")
        lines.append(str(c).rstrip())
        lines.append("")

out.write_text("\n".join(lines) + "\n", encoding="utf-8")
print("wrote", out, "bytes", out.stat().st_size, "users", user_n)
