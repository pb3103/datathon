"""Read-only XLSX audit using ZIP/XML; no third-party dependencies. Run from repo root."""
import collections, hashlib, json, pathlib, re, xml.etree.ElementTree as ET
N = {'m': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
import zipfile

def read_book(path):
    with zipfile.ZipFile(path) as z:
        ss = [''.join(t.text or '' for t in e.findall('.//m:t', N)) for e in ET.fromstring(z.read('xl/sharedStrings.xml')).findall('m:si', N)] if 'xl/sharedStrings.xml' in z.namelist() else []
        names = [s.attrib['name'] for s in ET.fromstring(z.read('xl/workbook.xml')).findall('m:sheets/m:sheet', N)]
        rels = {r.attrib['Id']: r.attrib['Target'] for r in ET.fromstring(z.read('xl/_rels/workbook.xml.rels'))}
        sheets = ET.fromstring(z.read('xl/workbook.xml')).findall('m:sheets/m:sheet', N)
        for name, sheet in zip(names, sheets):
            target = rels[sheet.attrib['{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id']]
            root = ET.fromstring(z.read(target.lstrip('/') if target.startswith('/') else 'xl/' + target))
            rows, formulas, errors = [], [], []
            for row in root.findall('m:sheetData/m:row', N):
                vals = {}
                for c in row.findall('m:c', N):
                    v = c.find('m:v', N)
                    value = v.text if v is not None else ''.join(t.text or '' for t in c.findall('.//m:t', N))
                    if c.get('t') == 's': value = ss[int(value)]
                    elif c.get('t') not in ('inlineStr','str','e') and value not in ('',None): value = float(value)
                    vals[re.sub(r'\d','',c.attrib['r'])] = value
                    if c.find('m:f',N) is not None: formulas.append(c.attrib['r'])
                    if c.get('t') == 'e': errors.append([c.attrib['r'],value])
                if any(v not in ('',None) for v in vals.values()): rows.append((int(row.attrib['r']),vals))
            yield name, rows, formulas, errors

def key(r):
    import unicodedata
    return tuple(unicodedata.normalize('NFC', re.sub(r'^\d+\.\s*','',str(r.get(c,''))).strip()).casefold() for c in ('A','B'))

def main():
    manifest=[]; report={}; keys={}; populations={}
    for path in sorted(pathlib.Path('podaci').glob('*/*')):
        if path.suffix not in ('.xlsx','.pdf'): continue
        manifest.append({'path':str(path),'year':int(path.parent.name),'bytes':path.stat().st_size,'sha256':hashlib.sha256(path.read_bytes()).hexdigest(),'publisher':None,'catalog_url':None,'resource_url':None,'license':None,'downloaded_at':None})
        if path.suffix != '.xlsx': continue
        year=path.parent.name; report[year]=[]
        for idx,(name,rows,formulas,errors) in enumerate(read_book(path)):
            head=rows[0][1]; data=rows[1:]; cols=[c for c,v in head.items() if v not in ("",None)]; head={c:head[c] for c in cols}
            counts=collections.Counter(key(r) for _,r in data)
            s={'sheet':name,'rows':len(data),'headers':head,'missing':{c:sum(r.get(c) in ('',None) for _,r in data) for c in cols},'zeros':{c:sum(r.get(c)==0 for _,r in data) for c in cols},'non_numeric':{c:sum(not isinstance(r.get(c),(int,float)) and r.get(c) not in ('',None) for _,r in data) for c in cols},'ranges':{c:[min(v),max(v)] for c in cols if (v:=[r[c] for _,r in data if isinstance(r.get(c),(int,float))])},'unique_jls':len(counts),'duplicate_jls_keys':sum(v-1 for v in counts.values()),'formula_count':len(formulas),'excel_errors':errors}
            if idx==0:
                keys[year]=set(counts); populations[year]={key(r):r.get('E') for _,r in data}
                issues=[]; deltas=[]; kg=[]; rate_inconsistent=[]; kg_inconsistent=[]
                for rn,r in data:
                    if r.get('B')=='Bjelovar':s['bjelovar']={'row':rn,**r}
                    for c in 'CDEFG':
                        if isinstance(r.get(c),(int,float)) and r[c]<0:issues.append([rn,r['B'],'negative',c,r[c]])
                    if all(isinstance(r.get(c),(int,float)) for c in 'CDEFG'):
                        t,m,p,f,g=(r[c] for c in 'CDEFG')
                        if year=='2022': g *= 100
                        if m>t:issues.append([rn,r['B'],'mixed_gt_total'])
                        if not 0<=g<=100:issues.append([rn,r['B'],'rate_out_of_range'])
                        if p<=0:issues.append([rn,r['B'],'nonpositive_population'])
                        mass_half=0.5 if year in ('2021','2022') else 0.005
                        kg_half=0.005 if year=='2024' else 0.5
                        rate_half=0.5 if year=='2022' else 0.05 if year=='2021' else 0.005
                        if p>0 and not 1000*(t-mass_half)/p-kg_half-1e-8 <= f <= 1000*(t+mass_half)/p+kg_half+1e-8:
                            kg_inconsistent.append({'row':rn,'jls':r['B'],'county':r['A'],'total_t':t,'mixed_t':m,'population':p,'published':f,'derived':1000*t/p})
                        if t>mass_half and not 100*(1-(m+mass_half)/(t-mass_half))-rate_half-1e-8 <= g <= 100*(1-(m-mass_half)/(t+mass_half))+rate_half+1e-8:
                            rate_inconsistent.append({'row':rn,'jls':r['B'],'published_pp':g,'derived_pp':100*(t-m)/t})
                        if t>0:deltas.append([abs(100*(t-m)/t-g),rn,r['B'],100*(t-m)/t,g])
                        if p>0:kg.append([abs(1000*t/p-f),rn,r['B'],1000*t/p,f])
                s.update(issues=issues,rate_normalization_multiplier=100 if year=='2022' else 1,rate_inconsistent=rate_inconsistent,kg_inconsistent=kg_inconsistent,rate_delta_max=sorted(deltas,reverse=True)[:10],kg_delta_max=sorted(kg,reverse=True)[:10],sums={c:sum(r.get(c,0) for _,r in data if isinstance(r.get(c),(int,float))) for c in 'CDE'},rate_delta_over_005=sum(d[0]>.05+1e-9 for d in deltas),kg_delta_over_05=sum(d[0]>.5+1e-9 for d in kg))
            elif idx==1:s['keys_vs_main']={'only_material':sorted(set(counts)-keys[year]),'only_main':sorted(keys[year]-set(counts))}
            report[year].append(s)
    pairs={}
    years=sorted(keys)
    for a,b in zip(years,years[1:]):
        pairs[a+'-'+b]={'only_previous':sorted(keys[a]-keys[b]),'only_next':sorted(keys[b]-keys[a]),'population_changed':sum(populations[a][k]!=populations[b][k] for k in keys[a]&keys[b]),'population_change_examples':[[k,populations[a][k],populations[b][k]] for k in sorted(keys[a]&keys[b]) if populations[a][k]!=populations[b][k]][:15]}
    pathlib.Path('docs/data_audit_details.json').write_text(json.dumps({'years':report,'comparability':pairs},ensure_ascii=False,indent=2)+'\n')
    pathlib.Path('data/manifests/source_files.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
    print(json.dumps({'years':report,'comparability':pairs},ensure_ascii=False,indent=2))
if __name__=='__main__':main()
