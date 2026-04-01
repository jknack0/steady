
import pathlib

report = """PLACEHOLDER"""

p = pathlib.Path(r"C:\Dev\steady\docs\compliancepi-routes-middleware-audit.md")
p.write_text(report, encoding="utf-8")
print("done")
