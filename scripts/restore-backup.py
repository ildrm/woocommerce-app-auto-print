"""Offline restore with integrity checks and a preserved pre-restore recovery copy."""
import argparse, json, sqlite3, shutil, time
from pathlib import Path
from urllib.request import Request, urlopen

parser=argparse.ArgumentParser()
parser.add_argument('data_directory',type=Path)
parser.add_argument('backup',type=Path)
args=parser.parse_args()
data=args.data_directory.resolve();source=args.backup.resolve()
if not source.is_file() or source.stat().st_size>200*1024*1024:
    raise SystemExit('Backup missing or exceeds 200 MB')
ipc=data/'ipc.json'
if ipc.exists():
    try:
        endpoint=json.loads(ipc.read_text())
        request=Request(f'http://127.0.0.1:{int(endpoint["port"])}/health',headers={'Authorization':'Bearer '+endpoint['token']})
        with urlopen(request,timeout=2):
            raise SystemExit('Stop the printing engine before restoring a backup')
    except (OSError,ValueError):
        pass
with sqlite3.connect(f'file:{source}?mode=ro',uri=True) as original:
    if original.execute('PRAGMA integrity_check').fetchone()[0]!='ok':
        raise SystemExit('Backup integrity check failed')
    tables={r[0] for r in original.execute("SELECT name FROM sqlite_master WHERE type='table'")}
    if not {'stores','jobs','templates','_sqlx_migrations'}.issubset(tables):
        raise SystemExit('This is not an AutoPrint backup')
    target=data/'autoprint.sqlite';data.mkdir(parents=True,exist_ok=True)
    if target.exists():
        with sqlite3.connect(target) as current,sqlite3.connect(data/f'pre-restore-{int(time.time())}.sqlite') as recovery:
            current.backup(recovery)
    temporary=data/'restore.tmp.sqlite'
    if temporary.exists():raise SystemExit('A previous restore is incomplete; inspect restore.tmp.sqlite')
    with sqlite3.connect(temporary) as restored:original.backup(restored)
    temporary.chmod(0o600)
    for suffix in ['-wal','-shm']:
        sidecar=Path(str(target)+suffix)
        if sidecar.exists():sidecar.unlink()
    temporary.replace(target)
print('Restored database. Credentials remain in the OS vault; reconnect stores if needed. A pre-restore recovery copy was preserved.')
