#!/usr/bin/env bash
set -euo pipefail

if [[ -z "${ROOT_DIR:-}" ]]; then
  if [[ -f "configs/tsdd.yaml" ]]; then
    ROOT_DIR="tsdddata"
  elif [[ -f "octo-server/configs/tsdd.yaml" ]]; then
    ROOT_DIR="octo-server/tsdddata"
  else
    ROOT_DIR="tsdddata"
  fi
fi
FILES_ROOT="${FILES_ROOT:-${ROOT_DIR}/files}"

python3 - "$FILES_ROOT" <<'PY'
import base64
import os
import sys
import textwrap
import zipfile

files_root = sys.argv[1]
demo_dir = os.path.join(files_root, "common", "documents", "demo")
os.makedirs(demo_dir, exist_ok=True)

def write(path, data):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "wb") as f:
        f.write(data)

def write_zip(path, entries):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with zipfile.ZipFile(path, "w", compression=zipfile.ZIP_DEFLATED) as zf:
        for name, body in entries.items():
            zf.writestr(name, body)

pdf = b"""%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>
endobj
4 0 obj
<< /Length 112 >>
stream
BT
/F1 18 Tf
72 720 Td
(Q3 Delivery Plan - Octo document demo) Tj
0 -32 Td
(Upload, preview and download acceptance file.) Tj
ET
endstream
endobj
5 0 obj
<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>
endobj
xref
0 6
0000000000 65535 f
0000000009 00000 n
0000000058 00000 n
0000000115 00000 n
0000000234 00000 n
0000000396 00000 n
trailer
<< /Size 6 /Root 1 0 R >>
startxref
466
%%EOF
"""
write(os.path.join(demo_dir, "q3-delivery-plan.pdf"), pdf)

xlsx_entries = {
    "[Content_Types].xml": """<?xml version="1.0" encoding="UTF-8"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
</Types>""",
    "_rels/.rels": """<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>""",
    "xl/_rels/workbook.xml.rels": """<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
</Relationships>""",
    "xl/workbook.xml": """<?xml version="1.0" encoding="UTF-8"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets><sheet name="需求清单" sheetId="1" r:id="rId1"/></sheets>
</workbook>""",
    "xl/worksheets/sheet1.xml": """<?xml version="1.0" encoding="UTF-8"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <sheetData>
    <row r="1"><c r="A1" t="inlineStr"><is><t>功能</t></is></c><c r="B1" t="inlineStr"><is><t>优先级</t></is></c></row>
    <row r="2"><c r="A2" t="inlineStr"><is><t>上传</t></is></c><c r="B2" t="inlineStr"><is><t>P0</t></is></c></row>
    <row r="3"><c r="A3" t="inlineStr"><is><t>预览</t></is></c><c r="B3" t="inlineStr"><is><t>P0</t></is></c></row>
    <row r="4"><c r="A4" t="inlineStr"><is><t>下载</t></is></c><c r="B4" t="inlineStr"><is><t>P0</t></is></c></row>
  </sheetData>
</worksheet>""",
}
write_zip(os.path.join(demo_dir, "octo-file-requirements.xlsx"), xlsx_entries)

def docx(title, body):
    return {
        "[Content_Types].xml": """<?xml version="1.0" encoding="UTF-8"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>""",
        "_rels/.rels": """<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>""",
        "word/document.xml": f"""<?xml version="1.0" encoding="UTF-8"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p><w:r><w:t>{title}</w:t></w:r></w:p>
    <w:p><w:r><w:t>{body}</w:t></w:r></w:p>
  </w:body>
</w:document>""",
    }

write_zip(os.path.join(demo_dir, "policy-update.docx"), docx("制度更新说明", "用于验证文档中心归档、预览兜底和下载。"))
write_zip(os.path.join(demo_dir, "customer-meeting.docx"), docx("客户现场会议纪要", "直接上传到产品部公共空间的验收文件。"))
write_zip(os.path.join(demo_dir, "old-policy.docx"), docx("旧版制度说明", "回收站验收文件。"))

png = base64.b64decode(
    "iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAIAAAAlC+aJAAAAeElEQVR4nO3QQQ3AIADAQMDwWf+G"
    "bQwJqC7YjJmZ2b0wzvJ6wN8GDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMD"
    "AwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDg4Ef2wIGt4j9uQAAAABJRU5ErkJggg=="
)
write(os.path.join(demo_dir, "account-confirm.png"), png)

write_zip(
    os.path.join(demo_dir, "offboarding.zip"),
    {"README.txt": "Octo offboarding package demo file for download acceptance.\n"},
)

print(f"document demo files ready: {demo_dir}")
PY
