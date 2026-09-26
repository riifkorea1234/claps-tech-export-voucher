"""Reproduce Phase 6 report rendering and three document checks (Python-Markdown required)."""
from pathlib import Path
from html.parser import HTMLParser
import re
import markdown

root = Path(__file__).resolve().parents[3]
md = root / 'md/phase6-result.md'
html = md.with_suffix('.html')
css = '''body{margin:0;background:#f3f5f8;color:#182235;font:16px/1.65 system-ui,sans-serif}main{max-width:1060px;margin:32px auto;padding:40px;background:white;border-radius:18px}h1{font-size:1.9rem;line-height:1.35}h2{margin-top:2rem;border-bottom:1px solid #dce3ee;padding-bottom:.4rem}table{width:100%;border-collapse:collapse;display:block;overflow-x:auto;margin:18px 0}th,td{border:1px solid #dce3ee;padding:10px 12px;text-align:left;vertical-align:top}th{background:#edf2f8}a{color:#245bc4}code{background:#edf2f8;padding:2px 4px;overflow-wrap:anywhere}li{margin-bottom:.45rem}@media(max-width:640px){main{margin:0;padding:20px;border-radius:0}h1{font-size:1.4rem}table{font-size:.85rem}}@media print{body{background:white}main{margin:0;padding:0;max-width:none}a{color:inherit}h2{break-after:avoid}tr{break-inside:avoid}table{display:table;font-size:9pt}}'''
body = markdown.markdown(md.read_text(), extensions=['tables', 'fenced_code'])
if '--render' in __import__('sys').argv:
    html.write_text('<!doctype html>\n<html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Phase 6 결과 보고서</title><style>' + css + '</style></head><body><main>' + body + '</main></body></html>\n')

def valid_link(base, href):
    if href.startswith(('https://', 'http://', '#', 'mailto:')):
        return
    assert (base / href.split('#')[0]).exists(), href

links = 0
for name in ['phase6-plan.md', 'phase6-test-checklist.md', 'phase6-result.md', 'phase7-plan.md']:
    source = root / 'md' / name
    for href in re.findall(r'\[[^\]]+\]\(([^)]+)\)', source.read_text()):
        valid_link(source.parent, href)
        links += 1
print(f'PASS 1: Markdown local links ({links})')

class Document(HTMLParser):
    def __init__(self):
        super().__init__()
        self.stack = []
        self.links = 0
        self.tables = 0
    def handle_starttag(self, tag, attrs):
        assert tag not in ['script', 'iframe'], tag
        attrs = dict(attrs)
        if tag == 'a':
            valid_link(html.parent, attrs['href'])
            self.links += 1
        if tag == 'table': self.tables += 1
        if tag not in ['meta', 'link', 'br', 'hr', 'img', 'input']: self.stack.append(tag)
    def handle_endtag(self, tag):
        assert self.stack and self.stack.pop() == tag, tag

text = html.read_text()
doc = Document()
doc.feed(text)
assert not doc.stack
assert '@media print' in text and '@media(max-width:640px)' in text and 'name="viewport"' in text
print(f'PASS 2: standalone HTML structure ({doc.tables} tables, {doc.links} links)')
assert text.split('<main>', 1)[1].split('</main>', 1)[0] == body
for phrase in ['COMPLETED', '142', '111', '31', '741', 'PROVIDER_UNKNOWN', '6 기존 warnings']:
    assert phrase in md.read_text() and phrase in text, phrase
print('PASS 3: MD/HTML exact rendered body and completion facts')
