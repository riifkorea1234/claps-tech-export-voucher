#!/usr/bin/env python3
"""Copy only evidence deliverables to the requested parent md directory."""
import os, json, hashlib, shutil, datetime, subprocess, base64
from pathlib import Path
repo=Path(__file__).resolve().parents[1]
source=repo/'md/evidence-full-process'
parent=Path('/mnt/f/claps-product')
target=parent/'md/evidence-full-process'
target.mkdir(parents=True,exist_ok=True)
ignore=parent/'.gitignore'
text=ignore.read_text()
for entry in ['/md/evidence-full-process/ACCOUNTS.md','/md/evidence-full-process/private-state.json']:
    if entry not in text.splitlines():text+='\n'+entry+'\n'
ignore.write_text(text)
copied=[]
for path in sorted(source.rglob('*')):
    if not path.is_file() or path.name in ['private-state.json','sync-receipt.json']:continue
    relative=path.relative_to(source)
    if any(part.startswith('previous-transfer-') for part in relative.parts):continue
    destination=target/relative
    if relative.as_posix() in ['WORK-BRIEF.md','BASELINE.json'] and destination.exists():
        if destination.read_bytes()!=path.read_bytes():continue
    destination.parent.mkdir(parents=True,exist_ok=True)
    if path.name=='ACCOUNTS.md':
        fd=os.open(destination,os.O_CREAT|os.O_WRONLY|os.O_TRUNC,0o600)
        with os.fdopen(fd,'wb') as output:output.write(path.read_bytes())
        os.chmod(destination,0o600)
    else:shutil.copy2(path,destination)
    digest=hashlib.sha256(path.read_bytes()).hexdigest()
    if hashlib.sha256(destination.read_bytes()).hexdigest()!=digest:raise RuntimeError('Transfer checksum mismatch: '+str(relative))
    copied.append({'file':relative.as_posix(),'sha256':digest})
mode=oct((target/'ACCOUNTS.md').stat().st_mode&0o777)
acl=None
if mode!='0o600':
    script=repo/'scripts/protect-evidence-accounts.ps1'
    encoded=base64.b64encode(script.read_text().encode('utf-16le')).decode('ascii')
    response=subprocess.run(['powershell.exe','-NoProfile','-NonInteractive','-ExecutionPolicy','Bypass','-EncodedCommand',encoded],capture_output=True,timeout=60)
    if response.returncode:raise RuntimeError(response.stderr.decode('utf-8',errors='replace'))
    acl=json.loads(response.stdout.decode('utf-8-sig').strip())
    if not acl.get('protected') or not acl.get('ownerOnlyWithSystem'):raise RuntimeError('Parent account ACL is not protected')
receipt={'target':str(target),'at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'files':len(copied),'checksumsMatch':True,'accountMode':mode,'accountWindowsAcl':acl,'privateStateCopied':False,'entries':copied}
(source/'sync-receipt.json').write_text(json.dumps(receipt,ensure_ascii=False,indent=2)+'\n')
shutil.copy2(source/'sync-receipt.json',target/'sync-receipt.json')
print(json.dumps({key:receipt[key] for key in ['target','files','checksumsMatch','accountMode','privateStateCopied']},ensure_ascii=False))
