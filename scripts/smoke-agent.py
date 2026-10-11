"""Check a native printing engine using disposable data, without stores or printers."""
import argparse
import json
from pathlib import Path
import subprocess
import tempfile
import time
import urllib.request

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("--agent", required=True, type=Path)
parser.add_argument("--renderer", required=True, type=Path)
parser.add_argument("--fonts", required=True, type=Path)
args = parser.parse_args()
opener = urllib.request.build_opener(urllib.request.ProxyHandler({}))
agent, renderer, fonts = [path.resolve() for path in (args.agent, args.renderer, args.fonts)]
subprocess.run([str(renderer), "--version"], check=True)
with tempfile.TemporaryDirectory(prefix="autoprint-build-smoke-") as data:
    process = subprocess.Popen(
        [str(agent), "--data-dir", data, "--renderer", str(renderer), "--fonts", str(fonts)],
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )
    try:
        ipc = Path(data) / "ipc.json"
        for _ in range(200):
            if ipc.exists():
                break
            if process.poll() is not None:
                raise RuntimeError("Engine exited before becoming ready")
            time.sleep(0.1)
        endpoint = json.loads(ipc.read_text())
        base = "http://127.0.0.1:" + str(endpoint["port"])
        headers = {"Authorization": "Bearer " + endpoint["token"]}
        with opener.open(urllib.request.Request(base + "/health", headers=headers), timeout=5) as response:
            assert response.status == 200
        print("Engine authenticated health check passed")
        request = urllib.request.Request(base + "/shutdown", data=b"{}", headers={**headers, "Content-Type": "application/json"}, method="POST")
        with opener.open(request, timeout=5) as response:
            assert response.status == 200
        process.wait(timeout=10)
        if process.returncode != 0:
            raise RuntimeError("Engine shutdown returned a failure")
        print("Engine clean shutdown passed")
    finally:
        if process.poll() is None:
            process.terminate()
            try:
                process.wait(timeout=5)
            except subprocess.TimeoutExpired:
                process.kill()
                process.wait()
