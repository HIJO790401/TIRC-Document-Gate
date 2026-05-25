from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from pydantic import BaseModel, Field
from pathlib import Path
from typing import Literal
import json, datetime, hashlib, uuid, os, sqlite3, urllib.request

from pypdf import PdfReader
from docx import Document as DocxDocument

app = FastAPI(title='TIRC Document Gate Local Edition')
DATA = Path('/data')
DOC_DIR = DATA / 'documents'
DATA.mkdir(parents=True, exist_ok=True)
DOC_DIR.mkdir(parents=True, exist_ok=True)
AUDIT = DATA / 'audit_log.jsonl'
DB = DATA / 'local_edition.db'

LOCAL_LLM_ENABLED = os.getenv('LOCAL_LLM_ENABLED', 'false').lower() == 'true'
OLLAMA_BASE_URL = os.getenv('OLLAMA_BASE_URL', 'http://ollama:11434')
LOCAL_LLM_MODEL = os.getenv('LOCAL_LLM_MODEL', 'llama3.1:8b')


def conn():
    c = sqlite3.connect(DB)
    c.row_factory = sqlite3.Row
    return c

def init_db():
    with conn() as c:
        c.executescript('''
        CREATE TABLE IF NOT EXISTS users(username TEXT PRIMARY KEY, role TEXT NOT NULL);
        CREATE TABLE IF NOT EXISTS documents(
          document_id TEXT PRIMARY KEY,title TEXT,classification_level TEXT,content_text TEXT,
          sha256_hash TEXT,created_at TEXT,owner TEXT,status TEXT
        );
        CREATE TABLE IF NOT EXISTS policies(
          document_id TEXT PRIMARY KEY,
          t1_transfer_only_actors TEXT,t2_middle_interpretation_actors TEXT,t3_final_delivery_actors TEXT,
          allow_local_ai INTEGER,allow_external_share INTEGER,require_nda INTEGER,
          external_allowed_recipients TEXT,blocked_sections_note TEXT
        );
        ''')
        if c.execute('SELECT COUNT(*) n FROM users').fetchone()['n'] == 0:
            c.executemany('INSERT INTO users(username,role) VALUES (?,?)', [
                ('admin','admin'),('owner1','owner'),('reviewer1','reviewer'),('user1','user')
            ])

init_db()

class InterpretationInput(BaseModel):
    documentId:str; action:str; subject:str=''; boundary:str=''; cause:str=''; replay:str=''; repair:str=''; responsibility:str=''; language:str='en'

class Policy(BaseModel):
    t1_transfer_only_actors: list[str] = Field(default_factory=list)
    t2_middle_interpretation_actors: list[str] = Field(default_factory=list)
    t3_final_delivery_actors: list[str] = Field(default_factory=list)
    allow_local_ai: bool = True
    allow_external_share: bool = False
    require_nda: bool = True
    external_allowed_recipients: list[str] = Field(default_factory=list)
    blocked_sections_note: str = ''

class AccessRequest(BaseModel):
    document_id: str; actor: str
    action: Literal['transfer','summarize','ask local AI','export','share external','final delivery']
    subject:str=''; boundary:str=''; cause:str=''; replay:str=''; repair:str=''; responsibility:str=''
    nda_context: bool = False
    auto_extract_with_local_llm: bool = False


def _now_iso(): return datetime.datetime.utcnow().isoformat() + 'Z'
def _hash(s: str): return hashlib.sha256(s.encode('utf-8')).hexdigest()
def _list_parse(v:str): return [x for x in (v or '').split(',') if x]
def _list_dump(v:list[str]): return ','.join(v)

def score(v:str)->int:
    vague=['maybe','probably','depends','not sure','for reference only','可能','應該','看情況','不確定','大家都說','僅供參考']
    if not v.strip(): return 0
    if len(v.strip())<8: return 30
    if any(x in v.lower() for x in vague): return 40
    return 100

def required_level(action: str) -> str:
    a=action.lower()
    if 'share external' in a or 'final delivery' in a: return 'T3_FINAL_DELIVERY'
    if 'summarize' in a or 'ask local ai' in a or 'export' in a: return 'T2_MIDDLE_INTERPRETATION'
    return 'T1_TRANSFER_ONLY'

def evaluate(i: InterpretationInput):
    s={k:score(getattr(i,k)) for k in ['subject','boundary','cause','replay','repair','responsibility']}
    gaps=[f'{k}_missing' for k,v in s.items() if v==0] + [f'{k}_weak' for k,v in s.items() if 0<v<60]
    decision='ALLOW'; access='T2_MIDDLE_INTERPRETATION'
    if s['subject']==0: decision,access='VOID','VOID_INTERPRETATION'
    elif s['boundary']==0: decision,access='VOID','VOID_INTERPRETATION'
    elif ('share external' in i.action.lower() or 'final delivery' in i.action.lower()) and (s['responsibility']<60 or s['repair']<60 or s['replay']<60):
        decision,access='HOLD','HOLD_REVIEW'
    elif list(v<60 for v in s.values()).count(True)>=4: decision,access='VOID','VOID_INTERPRETATION'
    elif all(v>=60 for v in s.values()): decision,access='ALLOW','T3_FINAL_DELIVERY'
    elif list(v>=60 for v in s.values()).count(True)<=2: decision,access='HOLD','T1_TRANSFER_ONLY'
    return {'requested_level': required_level(i.action),'decision':decision,'access_level':access,'scores':s,'gaps':gaps,'explanation':'Deterministic ICC rule engine result.','audit_id':f"AUD-{int(datetime.datetime.now().timestamp()*1000)}",'timestamp':_now_iso()}

def _extract_text(filename: str, b: bytes) -> str:
    n=filename.lower()
    if n.endswith('.txt') or n.endswith('.md'): return b.decode('utf-8', errors='ignore')
    if n.endswith('.pdf'):
        tmp=DATA/f'tmp-{uuid.uuid4().hex}.pdf'; tmp.write_bytes(b)
        try:
            r=PdfReader(str(tmp)); return '\n'.join([p.extract_text() or '' for p in r.pages]).strip()
        finally: tmp.unlink(missing_ok=True)
    if n.endswith('.docx'):
        tmp=DATA/f'tmp-{uuid.uuid4().hex}.docx'; tmp.write_bytes(b)
        try:
            d=DocxDocument(str(tmp)); return '\n'.join(p.text for p in d.paragraphs)
        finally: tmp.unlink(missing_ok=True)
    raise HTTPException(400,'Unsupported file type. Use TXT/MD/PDF/DOCX.')

def _llm_extract(content: str, req: AccessRequest):
    if not LOCAL_LLM_ENABLED: return {}
    prompt=f"Extract JSON keys subject,boundary,cause,replay,repair,responsibility.\nAction:{req.action}\nDocument:{content[:3000]}"
    body=json.dumps({'model':LOCAL_LLM_MODEL,'prompt':prompt,'stream':False}).encode()
    request=urllib.request.Request(f'{OLLAMA_BASE_URL}/api/generate', data=body, headers={'Content-Type':'application/json'})
    with urllib.request.urlopen(request, timeout=20) as resp: txt=json.loads(resp.read().decode()).get('response','')
    try: return json.loads(txt)
    except Exception: return {}

def _append_audit(entry: dict):
    prev='GENESIS'
    if AUDIT.exists():
        lines=AUDIT.read_text(encoding='utf-8').splitlines()
        if lines: prev=json.loads(lines[-1]).get('entry_hash','GENESIS')
    payload={k:entry[k] for k in entry if k not in ['previous_hash','entry_hash']}
    cur=_hash(prev + json.dumps(payload,ensure_ascii=False,sort_keys=True))
    entry['previous_hash']=prev; entry['entry_hash']=cur
    with AUDIT.open('a',encoding='utf-8') as f: f.write(json.dumps(entry,ensure_ascii=False)+'\n')

@app.get('/health')
def health(): return {'status':'ok','local_llm_enabled':LOCAL_LLM_ENABLED}

@app.get('/users')
def users():
    with conn() as c: return [dict(r) for r in c.execute('SELECT username,role FROM users')]

@app.post('/documents/import_text')
def import_text(payload: dict):
    title=payload.get('title','Untitled'); content=payload.get('content','').strip(); level=payload.get('classification_level','Internal'); owner=payload.get('owner','owner1'); status=payload.get('status','active')
    if not content: raise HTTPException(400,'content is required')
    did=f'DOC-{uuid.uuid4().hex[:10]}'; h=_hash(content); created=_now_iso()
    (DOC_DIR/f'{did}.txt').write_text(content,encoding='utf-8')
    with conn() as c:
        c.execute('INSERT INTO documents VALUES (?,?,?,?,?,?,?,?)',(did,title,level,content,h,created,owner,status))
    return {'document_id':did,'title':title,'classification_level':level,'content_text':content,'sha256_hash':h,'created_at':created,'owner':owner,'status':status}

@app.post('/documents/upload')
async def upload_document(owner: str = Form('owner1'), classification_level: str = Form('Internal'), status: str = Form('active'), file: UploadFile = File(...)):
    b=await file.read(); txt=_extract_text(file.filename,b)
    return import_text({'title':file.filename,'content':txt,'classification_level':classification_level,'owner':owner,'status':status})

@app.get('/documents')
def list_docs():
    with conn() as c:
        docs=[dict(r) for r in c.execute('SELECT document_id,title,classification_level,owner,created_at,sha256_hash,status FROM documents ORDER BY created_at DESC')]
    with conn() as c:
        pol={r['document_id']:dict(r) for r in c.execute('SELECT * FROM policies')}
    for d in docs: d['policy_status']='configured' if d['document_id'] in pol else 'not_configured'; d['hash_12']=d['sha256_hash'][:12]
    return docs

@app.get('/documents/{document_id}')
def get_doc(document_id: str):
    with conn() as c:
        r=c.execute('SELECT * FROM documents WHERE document_id=?',(document_id,)).fetchone()
    if not r: raise HTTPException(404,'document not found')
    return dict(r)

@app.post('/documents/{document_id}/policy')
def set_policy(document_id: str, payload: Policy, actor: str = 'admin'):
    d=get_doc(document_id)
    role={u['username']:u['role'] for u in users()}.get(actor,'user')
    if role not in ['admin','owner'] and actor != d['owner']: raise HTTPException(403,'not allowed')
    with conn() as c:
        c.execute('REPLACE INTO policies VALUES (?,?,?,?,?,?,?,?,?)',(
            document_id,_list_dump(payload.t1_transfer_only_actors),_list_dump(payload.t2_middle_interpretation_actors),_list_dump(payload.t3_final_delivery_actors),
            int(payload.allow_local_ai),int(payload.allow_external_share),int(payload.require_nda),_list_dump(payload.external_allowed_recipients),payload.blocked_sections_note
        ))
    return {'status':'policy_saved','document_id':document_id,'policy':payload.model_dump()}

@app.get('/documents/{document_id}/policy')
def get_policy(document_id: str):
    with conn() as c: r=c.execute('SELECT * FROM policies WHERE document_id=?',(document_id,)).fetchone()
    if not r: return {}
    x=dict(r)
    return {
      't1_transfer_only_actors':_list_parse(x['t1_transfer_only_actors']),
      't2_middle_interpretation_actors':_list_parse(x['t2_middle_interpretation_actors']),
      't3_final_delivery_actors':_list_parse(x['t3_final_delivery_actors']),
      'allow_local_ai':bool(x['allow_local_ai']),'allow_external_share':bool(x['allow_external_share']),'require_nda':bool(x['require_nda']),
      'external_allowed_recipients':_list_parse(x['external_allowed_recipients']),'blocked_sections_note':x['blocked_sections_note'] or ''
    }

@app.post('/local-llm/extract')
def local_extract(payload: dict):
    req=AccessRequest(document_id=payload.get('document_id',''), actor=payload.get('actor','user1'), action=payload.get('action','summarize'))
    return {'enabled':LOCAL_LLM_ENABLED,'model':LOCAL_LLM_MODEL,'result':_llm_extract(payload.get('content',''), req)}

@app.post('/access/request')
def access_request(req: AccessRequest):
    doc=get_doc(req.document_id); policy=get_policy(req.document_id)
    requested=required_level(req.action)
    actors={'T1_TRANSFER_ONLY':policy.get('t1_transfer_only_actors',[]),'T2_MIDDLE_INTERPRETATION':policy.get('t2_middle_interpretation_actors',[]),'T3_FINAL_DELIVERY':policy.get('t3_final_delivery_actors',[])}
    allowed=req.actor in actors.get(requested,[])
    fields={k:getattr(req,k) for k in ['subject','boundary','cause','replay','repair','responsibility']}
    if req.auto_extract_with_local_llm and LOCAL_LLM_ENABLED:
        ext=_llm_extract(doc['content_text'],req)
        for k in fields:
            if not fields[k].strip() and isinstance(ext.get(k),str): fields[k]=ext[k]
    out=evaluate(InterpretationInput(documentId=req.document_id, action=req.action, **fields))
    if requested=='T3_FINAL_DELIVERY' and (fields['responsibility'].strip()=='' or fields['repair'].strip()=='' or fields['replay'].strip()==''):
        out['decision']='HOLD'; out['access_level']='HOLD_REVIEW'; out['gaps'].append('t3_closure_incomplete')
    if req.action=='share external' and not policy.get('allow_external_share',False):
        out['decision']='HOLD'; out['access_level']='HOLD_REVIEW'; out['gaps'].append('external_share_not_allowed')
    if policy.get('require_nda',False) and requested=='T3_FINAL_DELIVERY' and not req.nda_context:
        out['decision']='HOLD'; out['access_level']='HOLD_REVIEW'; out['gaps'].append('nda_context_missing')
    if not allowed:
        out['decision']='HOLD'; out['access_level']='HOLD_REVIEW'; out['gaps'].append('actor_not_allowed_by_policy')

    audit={'audit_id':out['audit_id'],'document_id':req.document_id,'document_title':doc['title'],'actor':req.actor,'action':req.action,'requested_level':out['requested_level'],'decision':out['access_level'],'scores':out['scores'],'gaps':out['gaps'],'timestamp':out['timestamp'],'document_hash':doc['sha256_hash']}
    _append_audit(audit)
    return {**out,'policy_actor_allowed':allowed}

@app.post('/interpretation/evaluate')
def eval_api(input: InterpretationInput): return evaluate(input)

@app.get('/audit')
def audit(actor: str | None = None, document_id: str | None = None):
    if not AUDIT.exists(): return []
    rows=[json.loads(x) for x in AUDIT.read_text(encoding='utf-8').splitlines()]
    if actor: rows=[r for r in rows if r.get('actor')==actor]
    if document_id: rows=[r for r in rows if r.get('document_id')==document_id]
    return rows

@app.get('/audit/{document_id}')
def audit_doc(document_id: str): return audit(document_id=document_id)

@app.get('/audit/verify')
def audit_verify():
    rows=audit()
    prev='GENESIS'
    for i,r in enumerate(rows):
        payload={k:r[k] for k in r if k not in ['previous_hash','entry_hash']}
        if r.get('previous_hash')!=prev: return {'valid':False,'broken_index':i,'total_entries':len(rows)}
        cur=_hash(prev+json.dumps(payload,ensure_ascii=False,sort_keys=True))
        if cur!=r.get('entry_hash'): return {'valid':False,'broken_index':i,'total_entries':len(rows)}
        prev=cur
    return {'valid':True,'broken_index':None,'total_entries':len(rows)}
