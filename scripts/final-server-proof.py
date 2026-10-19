import subprocess, json, hashlib
from pathlib import Path
root=Path('/home/arcreation/deployments/claps')
backup=root/'backup/pre-evidence-v1-20261020'
manifest=json.loads((backup/'manifest.json').read_text())
for name,expected in manifest['sha256'].items():
    with (backup/name).open('rb') as f: actual=hashlib.file_digest(f,'sha256').hexdigest()
    if actual!=expected:raise RuntimeError('Backup checksum mismatch')
sql="SELECT md5(row(u.id,u.email,u.app_role,u.status,a.password)::text) FROM users u LEFT JOIN auth_accounts a ON a.user_id=u.id WHERE u.email='admin@claps.arcreation.work' ORDER BY u.id"
cmd=['docker','compose','exec','-T','db','sh','-c','exec psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Atc "$1"','sh',sql]
current=subprocess.run(cmd,cwd=root,check=True,capture_output=True,text=True).stdout
if current!=(root/'backup/evidence-baseline/existing-users.digest').read_text():raise RuntimeError('Existing administrator changed')
health=subprocess.run(['curl','-fsS','http://127.0.0.1:39081/api/health'],check=True,capture_output=True,text=True).stdout
services=json.loads(subprocess.run(['docker','compose','ps','--format','json'],cwd=root,check=True,capture_output=True,text=True).stdout.replace('}\n{','},{').join(['[',']']))
if any(s.get('Health')!='healthy' for s in services if s.get('Service') in ['web','worker','db']):raise RuntimeError('Unhealthy runtime')
result={'backupsChecksumsMatch':True,'existingAdministratorCredentialsRoleStatusPreserved':True,'health':json.loads(health),'services':[{'service':s['Service'],'image':s['Image'],'health':s.get('Health')} for s in services]}
(root/'releases/20261020-evidence-v1/final-server-proof.json').write_text(json.dumps(result,indent=2)+'\n')
print(json.dumps(result))
