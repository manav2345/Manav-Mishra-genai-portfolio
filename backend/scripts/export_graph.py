import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.apps.text_to_sql import GRAPH

out = Path(__file__).resolve().parents[2] / "docs"
out.mkdir(parents=True, exist_ok=True)

g = GRAPH.get_graph()

(out / "text-to-sql-flow.mmd").write_text(g.draw_mermaid(), encoding="utf-8")

try:
    (out / "text-to-sql-flow.png").write_bytes(g.draw_mermaid_png())
    print("Wrote docs/text-to-sql-flow.png")
except Exception as error:
    print(
        "PNG failed (offline?). Paste docs/text-to-sql-flow.mmd into https://mermaid.live and export a PNG. Error:",
        error,
    )
