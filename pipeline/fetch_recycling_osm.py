"""Explicit network refresh; prepares only raw OSM data, never modifies portal files."""
import hashlib
import json
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from pathlib import Path
DIR=Path(__file__).resolve().parents[1]/'podaci/reciklazna_dvorista/dodatni_izvori'
query='[out:json][timeout:60];nwr["amenity"="recycling"]["recycling_type"="centre"](42.3,13.4,46.6,19.5);out meta center;'
url='https://overpass-api.de/api/interpreter?'+urllib.parse.urlencode({'data':query})
request=urllib.request.Request(url,headers={'User-Agent':'WasteWise-datathon/0.1 (open-data research)'})
with urllib.request.urlopen(request,timeout=85) as response: raw=response.read()
data=json.loads(raw)
if data.get('remark') or not data.get('elements'):raise ValueError('Incomplete OSM response: '+str(data.get('remark')))
for item in data['elements']:
    for key in ['user','uid','changeset']:item.pop(key,None)
DIR.mkdir(exist_ok=True,parents=True)
(DIR/'osm-query.overpassql').write_text(query+'\n')
(DIR/'osm-recycling-bbox.raw.json').write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n')
(DIR/'osm-download.metadata.json').write_text(json.dumps(dict(url=url,downloadedAt=datetime.now(timezone.utc).isoformat(),originalResponseSha256=hashlib.sha256(raw).hexdigest(),license='ODbL-1.0',removedFields=['user','uid','changeset']),indent=2)+'\n')
print('Saved',len(data['elements']),'OSM elements. Run pipeline.prepare_recycling_external next.')
