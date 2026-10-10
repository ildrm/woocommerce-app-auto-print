"""Fetch pinned OFL fonts; record SHA-256 for deterministic document rendering."""
from pathlib import Path
from urllib.parse import quote
import hashlib, json, subprocess

COMMIT = 'bd8f81ddb5c74d5c8897b36ad88b440266245103'
FAMILIES = {
    'notosans': 'NotoSans[wdth,wght].ttf',
    'notosansarabic': 'NotoSansArabic[wdth,wght].ttf',
    'notosansdevanagari': 'NotoSansDevanagari[wdth,wght].ttf',
    'notosanssc': 'NotoSansSC[wght].ttf',
    'notosanstc': 'NotoSansTC[wght].ttf',
    'notosansjp': 'NotoSansJP[wght].ttf',
    'notosanskr': 'NotoSansKR[wght].ttf',
}
destination = Path(__file__).resolve().parents[1] / 'assets/fonts'
destination.mkdir(parents=True, exist_ok=True)
manifest = []
for family, name in FAMILIES.items():
    for file in [name, 'OFL.txt']:
        url = f'https://raw.githubusercontent.com/google/fonts/{COMMIT}/ofl/{family}/{quote(file)}'
        out = destination / (name if file != 'OFL.txt' else family + '-OFL.txt')
        if not out.exists():
            subprocess.run(['curl', '--proto', '=https', '--tlsv1.2', '-fsSL', '--connect-timeout', '15', '--max-time', '120', url, '-o', str(out)], check=True)
            if out.stat().st_size > 32 * 1024 * 1024:
                out.unlink()
                raise ValueError('Font exceeds size limit')
        manifest.append({'file': out.name, 'source': url, 'sha256': hashlib.sha256(out.read_bytes()).hexdigest(), 'license': 'OFL-1.1'})
    print(f'Fetched {family}', flush=True)
(destination / 'manifest.json').write_text(json.dumps(manifest, indent=2) + '\n')
