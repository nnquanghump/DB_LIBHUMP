"""Read cached Excel cell values with Python's standard library; no packages."""
import sys, json, zipfile, io, posixpath
from xml.etree import ElementTree as ET
N={'m':'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
R='http://schemas.openxmlformats.org/officeDocument/2006/relationships'
with zipfile.ZipFile(io.BytesIO(sys.stdin.buffer.read())) as z:
    wb=ET.fromstring(z.read('xl/workbook.xml'))
    sheet=next((s for s in wb.find('m:sheets',N) if s.attrib['name']==sys.argv[1]),None)
    if sheet is None: raise ValueError('Không tìm thấy sheet '+sys.argv[1])
    relationships=ET.fromstring(z.read('xl/_rels/workbook.xml.rels'))
    target=next(r.attrib['Target'] for r in relationships if r.attrib['Id']==sheet.attrib['{'+R+'}id'])
    path=target.lstrip('/') if target.startswith('/') else posixpath.normpath('xl/'+target)
    strings=[]
    if 'xl/sharedStrings.xml' in z.namelist():
        strings=[''.join(t.text or '' for t in e.iterfind('.//m:t',N)) for e in ET.fromstring(z.read('xl/sharedStrings.xml'))]
    rows=[]
    for row in ET.fromstring(z.read(path)).iterfind('.//m:sheetData/m:row',N):
        values=[]
        for c in row:
            ref=c.attrib.get('r',''); col=0
            for ch in ref:
                if ch.isalpha(): col=col*26+ord(ch.upper())-64
            while len(values)<col: values.append(None)
            t=c.attrib.get('t'); v=c.find('m:v',N); value=v.text if v is not None else None
            if t=='s' and value is not None: value=strings[int(value)]
            elif t=='inlineStr': value=''.join(x.text or '' for x in c.iterfind('.//m:t',N))
            elif t not in ('str','e','d','b') and value is not None:
                n=float(value); value=int(n) if n.is_integer() else n
            if col: values[col-1]=value
        rows.append(values)
    print(json.dumps(rows,ensure_ascii=False))
