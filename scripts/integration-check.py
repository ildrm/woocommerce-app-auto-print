"""Exercise the real agent with disposable fictional data, then terminate it cleanly."""
import json, re, shutil, struct, subprocess, tempfile, time
from pathlib import Path
from urllib.request import Request, urlopen
from urllib.error import HTTPError

root=Path(__file__).resolve().parents[1]
binary=root/'target/debug'/('autoprint-agent.exe' if __import__('os').name=='nt' else 'autoprint-agent')
with tempfile.TemporaryDirectory(prefix='autoprint-integration-') as temporary:
    data=Path(temporary)
    agent=subprocess.Popen([str(binary),'--data-dir',str(data)],cwd=root,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
    try:
        for _ in range(100):
            if (data/'ipc.json').exists():break
            time.sleep(.1)
        endpoint=json.loads((data/'ipc.json').read_text())
        base=f'http://127.0.0.1:{endpoint["port"]}'
        def request(path,method='GET',body=None,authorized=True,raw=False):
            headers={'Content-Type':'application/json'}
            if authorized:headers['Authorization']='Bearer '+endpoint['token']
            req=Request(base+path,data=None if body is None else json.dumps(body).encode(),headers=headers,method=method)
            with urlopen(req,timeout=70) as response:
                value=response.read()
                return value if raw else json.loads(value)
        try:request('/health',authorized=False);raise AssertionError('Unauthenticated IPC succeeded')
        except HTTPError as e:assert e.code==401
        state=request('/state');assert len(state['templates'])==13 and len(state['papers'])==19
        papers={p['name']:p for p in state['papers']}
        template=next(t for t in state['templates'] if t['id']=='builtin-2')
        printer={'id':'integration-pdf','name':'Integration PDF','transport':{'type':'pdf'},'paper':papers['80 mm roll'],'template_id':template['id'],'enabled':True,'locale':'en','copies':1}
        request('/configs/printers/integration-pdf','PUT',printer)
        duplicate=subprocess.run([str(binary),'--data-dir',str(data)],cwd=root,stdout=subprocess.DEVNULL,stderr=subprocess.PIPE,timeout=5)
        assert duplicate.returncode!=0,'Exclusive-instance lock failed'
        samples=root/'fixtures/rendered';samples.mkdir(parents=True,exist_ok=True)
        for locale in ['fa','ar','hi','zh-CN','ja','ko','ru']:
            localized={**template,'locale':locale,'direction':'rtl' if locale in ['fa','ar'] else 'ltr'}
            localized_printer={**printer,'locale':locale}
            result=request('/preview','POST',{'template':localized,'printer':localized_printer})
            pdf=request(result['pdf'],raw=True);png=request(result['pages'][0],raw=True)
            assert pdf.startswith(b'%PDF-') and png.startswith(b'\x89PNG')
            width,height=struct.unpack('>II',png[16:24]);assert width>0 and height>0
            (samples/f'{locale}-80mm.pdf').write_bytes(pdf)
            (samples/f'{locale}-80mm.png').write_bytes(png)
        a4={**printer,'paper':papers['A4']}
        rendered=request('/preview','POST',{'template':template,'printer':a4})
        pdf=request(rendered['pdf'],raw=True)
        box=re.search(rb'/MediaBox\s*\[\s*0(?:\.0)?\s+0(?:\.0)?\s+([\d.]+)\s+([\d.]+)',pdf)
        assert box,'PDF page geometry is missing'
        assert abs(float(box[1])-210/25.4*72)<.1 and abs(float(box[2])-297/25.4*72)<.1
        (samples/'a4-invoice.pdf').write_bytes(pdf)
        job=request('/test-print','POST',{'template':template,'printer':printer})['job_id']
        for _ in range(100):
            current=next(j for j in request('/state')['jobs'] if j['id']==job)
            if current['state']=='completed':break
            time.sleep(.2)
        assert current['state']=='completed',current['state']
        assert request(f'/jobs/{job}/attempts')['attempts'][0]['state']=='completed'
        backup=request('/backup','POST');assert backup['contains_credentials'] is False
        assert Path(backup['path']).exists()
        request('/shutdown','POST');agent.wait(timeout=10)
        agent=subprocess.Popen([str(binary),'--data-dir',str(data)],cwd=root,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
        for _ in range(100):
            if (data/'ipc.json').exists():
                try:
                    endpoint=json.loads((data/'ipc.json').read_text());base=f'http://127.0.0.1:{endpoint["port"]}';request('/health');break
                except (OSError,HTTPError):pass
            time.sleep(.1)
        recovered=next(j for j in request('/state')['jobs'] if j['id']==job)
        assert recovered['state']=='completed' and recovered['attempts']==1
        request('/shutdown','POST');agent.wait(timeout=10)
        print('PASS: IPC authentication, exclusive agent, 7 Unicode artifacts, exact A4 geometry, durable PDF job, attempt history, backup, restart without duplicate submission')
    finally:
        if agent.poll() is None:agent.terminate();agent.wait(timeout=10)
