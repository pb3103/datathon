"""Prepare map data from supplied sources. Run with Python and pypdf installed.
Originals remain unchanged; missing coordinates are retained in an unmapped list.
"""
import csv
import hashlib
import json
import re
from pathlib import Path
from collections import Counter
from pypdf import PdfReader

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'podaci/reciklazna_dvorista'
locations, unmapped, sources = [], [], []


def add(source, row, name, address, municipality, kind, lon=None, lat=None, **extra):
    record = dict(id=f'{source}:{row}', name=name.strip(), address=address.strip(),
                  municipality=municipality, kind=kind, source=source,
                  hours='', phone='', materials=[], note='', **{})
    record.update(extra)
    if not str(lon or '').strip() or not str(lat or '').strip():
        unmapped.append(record)
        return
    record.update(lon=float(lon), lat=float(lat))
    if not (13 < record['lon'] < 20 and 42 < record['lat'] < 47):
        raise ValueError(f'Coordinate outside Croatia bounds: {record}')
    locations.append(record)


geo = 'Geoportal_reciklazna_dvorista.geojson'
materials = {'PAPIR':'Papir', 'PLASTIKA':'Plastika', 'STAKLO':'Staklo',
             'METALNA_AM':'Metalna ambalaža', 'STARE_BATE':'Baterije',
             'BIOOTPAD':'Biootpad', 'OTPAD_GUME':'Gume', 'GRADJ_OTPA':'Građevni otpad',
             'ELEK_OTPAD':'Električni otpad'}
for f in json.loads((SOURCE / geo).read_text())['features']:
    p = f['properties']
    x, y = f['geometry']['coordinates']
    add(geo, p['OBJECTID_1'], p['NAZIV'], p['ADRESA_LOK'], 'Zagreb',
        'mobile' if 'MOBILNO' in p['VRSTA'] else 'fixed', x, y,
        hours=p['RADNO_VRIJ'], phone=p['TELEFON'], note=p['NAPOMENA'],
        materials=[v for k,v in materials.items() if p[k]=='DA'])

# Two supplied filenames are swapped; use content and coordinates rather than filename.
areas = {
 'reciklano-dvoriste-grad-hvar.csv': 'Hvar',
 'reciklazna_dvorista_velikaludina.csv': 'Velika Ludina',
 'reciklazna-dvorista-i-zeleni-otoci-okp.csv': 'Kloštar Podravski',
 'reciklazna-dvorista-i-zeleni-otoci-posedarje.csv': 'Sopje',
 'reciklano-dvoriste-opcina-bistra.csv': 'Bistra',
 'reciklazna-dvorista-i-zeleni-otoci-dugopolje.csv': 'Dugopolje',
 'zeleni-otoci-sopje.csv': 'Posedarje',
 'reciklazna-dvorista-i-zeleni-otoci-om.csv': 'Mikleuš',
}
for filename, area in areas.items():
    text = (SOURCE / filename).read_text(encoding='utf-8-sig')
    reader = csv.DictReader(text.splitlines(), delimiter=';' if ';' in text.splitlines()[0] else ',')
    for i, p in enumerate(reader, 2):
        name = p['NAZIV']
        kind = 'island' if 'otok' in name.lower() else 'mobile' if 'mobilno' in name.lower() else 'fixed'
        address = p.get('ADRESA') or ', '.join(filter(None, [p.get('ULICA_I_BROJ'),p.get('POSTA'),p.get('MJESTO')]))
        note = 'Izvor navodi dvorište Općine Bistra na adresi u Zaprešiću.' if area == 'Bistra' else ''
        add(filename,i,name,address,area,kind,p.get('LONGITUDE') or p.get('LONGITUD'),p.get('LATITUDE'),note=note)

filename = 'reciklazno_dvoriste_cernik.pdf'
text = PdfReader(SOURCE / filename).pages[0].extract_text()
m = re.search(r'(17\.\d+)\s+(45\.\d+)', text)
if not m: raise ValueError('Cernik coordinates missing')
add(filename,1,'Reciklažno dvorište Cernik','Cernik, Ulica Klačinac','Cernik','fixed',*m.groups())

filename = 'reciklazna_dvorista_velikarugvica.pdf'
text = PdfReader(SOURCE / filename).pages[0].extract_text(extraction_mode='layout')
add(filename,1,'Reciklažno dvorište Rugvica','Dugoselska ul. 1g','Rugvica','fixed')
for i, line in enumerate(text.splitlines(), 1):
    m = re.match(r'^(.+?)\s{2,}(.+?)\s{2,}(16\.\d+)\s+(45\.\d+)\s*$',line)
    if m:
        name,address,lon,lat = m.groups()
        add(filename,i,'Lokacija '+name,address+', '+name,'Rugvica','collection',lon,lat,
            note='Vrsta lokacije nije zasebno navedena u dostavljenoj tablici.')
if sum(r['municipality']=='Rugvica' for r in locations)!=18:
    raise ValueError('Expected 18 georeferenced Rugvica rows')

for filename in [geo,*areas,'reciklazno_dvoriste_cernik.pdf','reciklazna_dvorista_velikarugvica.pdf']:
    sources.append(dict(file=filename,sha256=hashlib.sha256((SOURCE/filename).read_bytes()).hexdigest()))
assert len({r['id'] for r in locations+unmapped}) == len(locations+unmapped)
assert len({(r['lat'],r['lon']) for r in locations})==len(locations)
output = dict(locations=locations,unmapped=unmapped,sources=sources,
              notes=['Datoteka s nazivom posedarje sadrži lokacije Sopja; zeleni-otoci-sopje.csv sadrži lokacije Posedarja.',
                     'Zagrebački CSV je kopija GeoJSON izvora i ne uvozi se ponovno.'])
(ROOT/'frontend/src/data/recycling-locations.json').write_text(json.dumps(output,ensure_ascii=False,indent=2)+'\n')
print(json.dumps(dict(mapped=len(locations),unmapped=len(unmapped),areas=dict(Counter(r['municipality'] for r in locations)),types=dict(Counter(r['kind'] for r in locations))),ensure_ascii=False,indent=2))
