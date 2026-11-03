"""Offline preparation of the separately licensed OSM supplement (stdlib only).
Run after fetching the source files documented in dodatni_izvori/README.md.
Never changes portal source records or fills their missing coordinates.
"""
import collections
import csv
import difflib
import hashlib
import json
import math
import re
import unicodedata
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DIR = ROOT / 'podaci/reciklazna_dvorista/dodatni_izvori'
FRONT = ROOT / 'frontend/src/data'

def norm(s):
    return re.sub(r'[^a-z0-9]', '', unicodedata.normalize('NFD', s.lower().replace('đ','d')).encode('ascii','ignore').decode())

def clean_name(s):
    return re.sub(r'^(?:grad|općina|opcina|opicina)\s+', '', s, flags=re.I).strip()

def polys(geom):
    return geom['coordinates'] if geom['type']=='MultiPolygon' else [geom['coordinates']]

def bounds(geom):
    pts=[p for poly in polys(geom) for ring in poly for p in ring]
    return [min(p[0] for p in pts),min(p[1] for p in pts),max(p[0] for p in pts),max(p[1] for p in pts)]

def ring_contains(ring,x,y):
    inside=False
    xj,yj=ring[-1][:2]
    for p in ring:
        xi,yi=p[:2]
        if (yi>y)!=(yj>y) and x < (xj-xi)*(y-yi)/(yj-yi)+xi: inside=not inside
        xj,yj=xi,yi
    return inside

def contains(geom,x,y):
    return any(ring_contains(poly[0],x,y) and not any(ring_contains(h,x,y) for h in poly[1:]) for poly in polys(geom))

def feature_contains(f,x,y):
    a,b,c,d=f['_bounds']
    return a<=x<=c and b<=y<=d and contains(f['geometry'],x,y)

def dist(a,b):
    r=math.pi/180
    dy=(a['lat']-b['lat'])*r;dx=(a['lon']-b['lon'])*r
    h=math.sin(dy/2)**2+math.cos(a['lat']*r)*math.cos(b['lat']*r)*math.sin(dx/2)**2
    return 6371000*2*math.asin(min(1,math.sqrt(h)))

registry=json.loads((ROOT/'data/manifests/historical_verification.json').read_text())['2017']['rows']
areas={r['municipality_id']:dict(id=r['municipality_id'],name=r['canonical_name'],county=r['county'],bounds=None) for r in registry}
index=collections.defaultdict(list)
for a in areas.values():index[norm(a['name'])].append(a)
features=json.loads((DIR/'osm-jls-codeforcroatia.geojson').read_text())['features']
features=[f for f in features if f.get('geometry') and f['geometry'].get('coordinates') and any(poly and poly[0] for poly in polys(f['geometry']))]
for f in features:f['_bounds']=bounds(f['geometry'])
country=next(f for f in features if f['properties']['admin_level']==2)
counties={str(f['properties']['osm_id']):f['properties'] for f in features if f['properties']['admin_level']==6}
spatial=[]; unmatched_boundaries=[]
for f in features:
    p=f['properties'];lev=p['admin_level']
    if lev!=7 and not (lev==6 and 'zagreb' in (p.get('local_name') or p['name']).lower() and 'županija' not in (p.get('local_name') or p['name']).lower()): continue
    boundary_name=clean_name(p.get('local_name') or p['name'])
    aliases={'Veliki Pisanica':'Velika Pisanica','Magdenovac':'Magadenovac','Donji Kukuzari':'Donji Kukuruzari'}
    boundary_name=aliases.get(boundary_name,boundary_name)
    candidates=list(index.get(norm(boundary_name),[]))
    candidates += [a for a in areas.values() if a not in candidates and (a['name'].startswith(boundary_name+' - ') or norm(a['name']).startswith(norm(boundary_name)) and ' - ' in a['name'])]
    parent=next((counties[v] for v in (p.get('parents') or '').split(',') if v in counties),None)
    if candidates and parent:
        county=norm((parent.get('local_name') or parent['name']).replace(' županija',''))
        candidates=[a for a in candidates if norm(a['county'])==county]
    if len(candidates)==1:
        a=candidates[0];a['bounds']=f['_bounds'];a['boundsSource']='Code for Croatia / OSM (archived boundaries)'
        f['_area']=a['id'];spatial.append(f)
    else:unmatched_boundaries.append(p.get('local_name') or p['name'])
# Use only recognisable canonical JLS from the older geoBoundaries snapshot.
# Island names and unmatched/misspelled units are deliberately ignored.
for f in json.loads((DIR/'geoboundaries-hrv-adm2.geojson').read_text())['features']:
    candidates=index.get(norm(clean_name(f['properties']['shapeName'])),[])
    if len(candidates)!=1 or candidates[0]['bounds']: continue
    a=candidates[0];f['_bounds']=bounds(f['geometry']);f['_area']=a['id'];spatial.append(f)
    a['bounds']=f['_bounds'];a['boundsSource']='geoBoundaries HRV ADM2 (2021)'

base=json.loads((FRONT/'recycling-locations.json').read_text())
portal=[]
for old in base['locations']:
    r=dict(old);candidates=index.get(norm(old['municipality']),[])
    if len(candidates)!=1:raise ValueError('Portal area is ambiguous: '+old['municipality'])
    r.update(areaId=candidates[0]['id'],county=candidates[0]['county'],sourceGroup='portal',sourceUrl='',importedAt='',positionMethod='source-coordinates',osmId='',website='')
    portal.append(r)
source=json.loads((DIR/'osm-recycling-bbox.raw.json').read_text())
imported=json.loads((DIR/'osm-download.metadata.json').read_text())['downloadedAt'][:10]
material_labels={'paper':'Papir','glass':'Staklo','plastic':'Plastika','plastic_packaging':'Plastična ambalaža','batteries':'Baterije','scrap_metal':'Metal','cans':'Limenke','clothes':'Odjeća','electrical_appliances':'Električni uređaji','small_appliances':'Mali električni uređaji','green_waste':'Zeleni otpad','garden_waste':'Vrtni otpad','tyres':'Gume','wood':'Drvo','engine_oil':'Motorno ulje'}
external=[];excluded=[];duplicates=[];nearby=[]
for e in source['elements']:
    t=e.get('tags',{});point=e.get('center',e)
    if 'lat' not in point:excluded.append(dict(id=f"{e['type']}/{e['id']}",reason='missing_coordinates'));continue
    x,y=point['lon'],point['lat'];oid=f"{e['type']}/{e['id']}"
    if not feature_contains(country,x,y):excluded.append(dict(id=oid,reason='outside_croatia'));continue
    if any(word in norm(t.get('name','')) for word in ['pakirnica','kompostana','sortirnica','odlagaliste','kaufland','povratboca','povratambalaze']) and 'dvorist' not in norm(t.get('name','')):
        excluded.append(dict(id=oid,reason='different_facility_type',tags=t));continue
    if t.get('access') in ('no','private') or any(t.get(k) in ('yes','recycling') for k in ['disused','abandoned','demolished','construction','proposed']):
        excluded.append(dict(id=oid,reason='restricted_or_inactive',tags=t));continue
    hits=[f for f in spatial if feature_contains(f,x,y)]
    # Prefer the municipality in the primary boundary set; identical IDs are one match.
    hitids=list(dict.fromkeys(f['_area'] for f in hits))
    if len(hitids)!=1:
        addr=index.get(norm(t.get('addr:city','')),[])
        if len(addr)==1:hitids=[addr[0]['id']]
    if len(hitids)!=1:
        excluded.append(dict(id=oid,reason='municipality_unresolved',lat=y,lon=x,tags=t));continue
    a=areas[hitids[0]]
    name=t.get('name:hr') or t.get('name') or 'Reciklažno dvorište (naziv nije naveden)'
    kind='mobile' if 'mobiln' in norm(name) else 'fixed' if ('dvorist' in norm(name) or 'nazivnijenaveden' in norm(name)) else 'collection'
    address=' '.join(filter(None,[t.get('addr:street'),t.get('addr:housenumber')]))
    if not address:address=t.get('addr:full','')
    if not address:address='Adresa nije navedena; položaj prema OpenStreetMapu'
    record=dict(id='osm:'+oid,name=name,areaId=a['id'],municipality=a['name'],county=a['county'],kind=kind,address=address,lat=y,lon=x,hours=t.get('opening_hours',''),phone=t.get('contact:phone') or t.get('phone',''),materials=[v for k,v in material_labels.items() if t.get('recycling:'+k)=='yes'],note='Zajednički uređivani podaci; aktualnost i uvjete predaje provjerite kod upravitelja.',source='OpenStreetMap',sourceGroup='osm',sourceUrl='https://www.openstreetmap.org/'+oid,osmId=oid,importedAt=imported,lastEdited=e.get('timestamp',''),positionMethod='osm-node' if e['type']=='node' else 'osm-bounds-centre',website=t.get('contact:website') or t.get('website',''),tags=t)
    nearest=min(portal+external,key=lambda p:dist(p,record)) if portal+external else None
    distance=dist(nearest,record) if nearest else float('inf')
    # Only deduplicate compatible centres, never a centre against a green island.
    def site_name(value):
        value=norm(value)
        for word in ['reciklaznodvoriste','mobilno','reciklaznodvoriste','mrd','rd']:
            value=value.replace(word,'')
        return value
    one,two=site_name(name),site_name(nearest['name']) if nearest else ''
    unnamed='nazivnijenaveden' in norm(name) or nearest and 'nazivnijenaveden' in norm(nearest['name'])
    same_name=(one==two or difflib.SequenceMatcher(None,one,two).ratio()>.88) and re.findall(r'\d+',one)==re.findall(r'\d+',two)
    if nearest and nearest['kind'] in ['fixed','mobile'] and (distance<=15 or distance<=60 and unnamed or distance<=120 and same_name):
        duplicates.append(dict(osmId=oid,keptId=nearest['id'],distanceMeters=round(distance,1),osmName=name,keptName=nearest['name']))
        continue
    if nearest and distance<300:nearby.append(dict(osmId=oid,nearId=nearest['id'],distanceMeters=round(distance,1)))
    external.append(record)

# Export the OSM supplement separately, without copying portal records into it.
(DIR/'reciklazna_dvorista_osm_hr.json').write_text(json.dumps(dict(importedAt=imported,license='ODbL-1.0',licenseUrl='https://www.openstreetmap.org/copyright',locations=external),ensure_ascii=False,indent=2)+'\n')
with (DIR/'reciklazna_dvorista_osm_hr.csv').open('w',encoding='utf-8-sig',newline='') as out:
    fields=['id','name','municipality','county','address','lat','lon','hours','phone','sourceUrl','importedAt','lastEdited','positionMethod','materials','website']
    writer=csv.DictWriter(out,fieldnames=fields,extrasaction='ignore');writer.writeheader()
    for record in external:writer.writerow({**record,'materials':'; '.join(record['materials'])})
all_locations=portal+[{k:v for k,v in r.items() if k!='tags'} for r in external]
all_unmapped=[]
for old in base['unmapped']:
    candidates=index[norm(old['municipality'])]
    all_unmapped.append({**old,'areaId':candidates[0]['id'],'sourceGroup':'portal'})
counts=collections.Counter(r['areaId'] for r in all_locations)
area_list=sorted([{**a,'count':counts[a['id']]} for a in areas.values()],key=lambda a:a['name'])
for a in area_list:a['bounds']=a['bounds'] or None
summary=dict(portal=len(portal),osm_added=len(external),total=len(all_locations),areas_with_locations=len(counts),searchable_areas=len(area_list),unmapped=len(all_unmapped),duplicates=len(duplicates),excluded=len(excluded),osm_base=source.get('osm3s',{}).get('timestamp_osm_base'),importedAt=imported)
(FRONT/'recycling-map.json').write_text(json.dumps(dict(locations=all_locations,unmapped=all_unmapped,areas=area_list,summary=summary),ensure_ascii=False,indent=2)+'\n')
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
audit=dict(summary=summary,duplicate_candidates=duplicates,nearby_distinct=nearby,excluded=excluded,unmatched_boundaries=unmatched_boundaries,areas_without_bounds=[a['name'] for a in area_list if not a['bounds']],sourceChecksums={p.name:sha(p) for p in [DIR/'osm-recycling-bbox.raw.json',DIR/'osm-jls-codeforcroatia.geojson',DIR/'geoboundaries-hrv-adm2.geojson']})
(DIR/'audit.json').write_text(json.dumps(audit,ensure_ascii=False,indent=2)+'\n')
assert len(set(r['id'] for r in all_locations))==len(all_locations)
print(json.dumps(summary,indent=2,ensure_ascii=False));print('Unmatched boundaries:',unmatched_boundaries);print('Excluded:',collections.Counter(r['reason'] for r in excluded))

# Publish only the small, separately licensed supplement, never the boundary dumps.
import shutil
public=ROOT/'frontend/public/data'
public.mkdir(parents=True,exist_ok=True)
for filename in ['reciklazna_dvorista_osm_hr.csv','reciklazna_dvorista_osm_hr.json']:
    shutil.copyfile(DIR/filename,public/filename)
coverage=collections.Counter(r['municipality'] for r in external)
report=f'''# Dodatne lokacije za kartu — OpenStreetMap

Preuzeto: {imported}. Stanje OSM baze: {summary['osm_base']}.
Izvor: https://www.openstreetmap.org/ ; dohvat: https://overpass-api.de/api/interpreter .
Licencija: ODbL 1.0 — https://www.openstreetmap.org/copyright .
© OpenStreetMap suradnici. Dodatni skup nije preuzet s Google Mapsa.

## Rezultat

- Dodatnih OSM lokacija: {len(external)}.
- Postojećih točaka data.gov.hr: {len(portal)} (izvornici nisu izmijenjeni).
- Ukupno na karti: {len(all_locations)} u {len(counts)} područja.
- Pretraživo je 556 JLS iz postojećeg registra aplikacije; broj 0 znači da u ovom skupu nema lokacija, ne da objekti ne postoje.
- Postojećih zapisa bez koordinata: {len(all_unmapped)}; ne dobivaju izmišljene koordinate.
- Povezanih mogućih duplikata: {len(duplicates)}; detalji i udaljenosti su u audit.json.

## Datoteke i trag izvora

- reciklazna_dvorista_osm_hr.csv: zasebni dodatni skup za pregled u tabličnom programu.
- reciklazna_dvorista_osm_hr.json: isti dodani zapisi s izvornim OSM oznakama.
- osm-recycling-bbox.raw.json: cjelovit odgovor upita, bez nepotrebnih podataka o računima uređivača (user, uid, changeset). OSM ID, verzija i datum izmjene sačuvani su.
- osm-query.overpassql: stvarni upit za sve centre u pravokutniku Hrvatske; zato odgovor uključuje i susjedne države. Strane lokacije isključene su prostornom provjerom granice Hrvatske, ne samo pravokutnikom.
- osm-jls-codeforcroatia.geojson: arhivske OSM granice iz Code for Croatia, https://data.codeforcroatia.org/datasets/adm-granice-gradovi-opcine/ . Uspostavljanje područja koristi razinu 7, Zagreb na razini 6 i županije roditelje; ne razinu 8 (naselja).
- geoboundaries-hrv-adm2.geojson i metadata.json: stariji pomoćni sloj (2021.), https://www.geoboundaries.org/api/current/gbOpen/HRV/ADM2/ . Koriste se samo jednoznačno prepoznate JLS; otočne cjeline i nepoznati nazivi zanemareni su. Ostale preuzete geoBoundaries datoteke nisu ulaz u prikaz.
- audit.json: isključeni zapisi s razlogom, mogući duplikati i SHA-256 ulaznih datoteka.
- frontend/src/data/recycling-map.json: pripremljen prikaz oba sloja, s odvojenim sourceGroup i izvornim ID-jevima. Izvorni portalni skup ostaje u recycling-locations.json.

## Ograničenja i pravila čišćenja

Popis je nacionalni izvoz označenih objekata, a nije potpun službeni registar ni potvrda da objekt danas radi. OSM oznake mogu biti pogrešne ili stare. Zadnja izmjena OSM zapisa nije datum provjere dvorišta. Kod poligona je korišteno središte obuhvata objekta, koje nije nužno ulaz. To je označeno u CSV/JSON-u i oblačiću karte.

Izostavljeni su objekti izvan Hrvatske, izričito privatni/zatvoreni/neaktivni objekti te očito druge vrste objekata (npr. povrat boca, sortirnice i kompostane bez oznake dvorišta u nazivu). Nepovezive JLS evidentirane su u auditu. Objekti s nazivom operatera umjesto jasne oznake dvorišta prikazuju se kao ostale lokacije. Materijali se preuzimaju samo iz oznaka recycling:*=yes; nepoznata vrijednost ne znači zabranu predaje.

Spajanje duplikata daje prednost postojećem portalnom zapisu; ne mijenja mu vrstu, adresu ni koordinate. Blizina do 15 m ili do 60 m za neimenovan objekt smatra se kandidatom za istu lokaciju; do 120 m traži se sličan naziv i isti brojevi u nazivu. Različita dvorišta RD1 i RD2 ne spajaju se zbog same blizine. Povezani duplikati ostaju dostupni u izvornom odgovoru i auditu.

Granice su arhivske i služe orijentaciji/povezivanju, ne dokazivanju današnje teritorijalne nadležnosti. Za {sum(not a['bounds'] for a in area_list)} JLS nema pouzdanih granica u korištenim pomoćnim izvorima. Ako nema ni točaka, karta ne izmišlja središte. Nazivi i županije pretrage dolaze iz postojećeg registra aplikacije.

## Ponovna priprema

Iz korijena projekta: `python3 -m pipeline.prepare_recycling_external` (standardna biblioteka; bez mrežnih zahtjeva). Za osvježavanje sirovog OSM odgovora: `python3 -m pipeline.fetch_recycling_osm`; zatim ponovno pripremite skup. Za zadržavanje snimke najprije sačuvajte prethodne datoteke. Pomoćne granice imaju zasebne metapodatke i kontrolne sažetke.

## Dodane lokacije po području

| Područje | Dodani OSM zapisi |
| --- | ---: |
'''
report+=''.join(f'| {name} | {count} |\n' for name,count in sorted(coverage.items()))
(DIR/'README.md').write_text(report)
