from pypdf import PdfReader
from pathlib import Path
for p in [Path(r'D:\final app\final app\docs\[STARTUP ZONE 2026] YÊU CẦU NỘI DUNG FILE Ý TƯỞNG (1).pdf'), Path(r'D:\final app\final app\docs\Phần 5 - Dự kiến tài chính.pdf')]:
    r=PdfReader(str(p))
    print('\n###',p.name,'pages',len(r.pages),'fields',bool(r.get_fields()))
    for i,pg in enumerate(r.pages,1):
        txt=(pg.extract_text() or '').replace('\x00',' ')
        print(f'---PAGE {i}---')
        print(txt[:7000])
