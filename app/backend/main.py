from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from pathlib import Path
from typing import Literal
import json, datetime, hashlib, uuid, os

try:
    from pypdf import PdfReader
except Exception:
    PdfReader = None

import urllib.request, urllib.error

app = FastAPI(title='TIRC Document Gate Backend MVP')
DATA = Path('/data')
DOC_DIR = DATA / 'documents'
DATA.mkdir(parents=True, exist_ok=True)
DOC_DIR.mkdir(parents=True, exist_ok=True)
AUDIT = DATA / 'audit_log.jsonl'
INDEX = DATA / 'documents_index.json'
POLICIES = DATA / 'policies.json'

LOCAL_LLM_ENABLED = os.getenv('LOCAL_LLM_ENABLED', 'false').lower() == 'true'
OLLAMA_BASE_URL = os.getenv('OLLAMA_BASE_URL', 'http://ollama:11434')
LOCAL_LLM_MODEL = os.getenv('LOCAL_LLM_MODEL', 'llama3.1:8b')

class InterpretationInput(BaseModel):
    documentId:str; action:str; subject:str=''; boundary:str=''; cause:str=''; replay:str=''; repair:str=''; responsibility:str=''; language:str='en'

class Policy(BaseModel):
    t1_transfer_only_actors: list[str] = Field(default_factory=list)
    t2_middle_interpretation_actors: list[str] = Field(default_factory=list)
    t3_final_delivery_actors: list[str] = Field(default_factory=list)
    allow_local_ai: bool = True
    allow_external_share: bool = False
    require_nda: bool = True

class AccessRequest(BaseModel):
    document_id: str
    actor: str
    action: Literal['transfer','summarize','ask local AI','export','share external','final delivery']
    subject:str=''; boundary:str=''; cause:str=''; replay:str=''; repair:str=''; responsibility:str=''
    auto_extract_with_local_llm: bool = False


def _now_iso():
    return datetime.datetime.utcnow().isoformat() + 'Z'

def _read_json(path: Path, default):
    if not path.exists():
        return default
    return json.loads(path.read_text(encoding='utf-8'))

def _write_json(path: Path, data):
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding='utf-8')

def score(v:str)->int:
    vague=['maybe','probably','depends','not sure','for reference only','可能','應該','看情況','不確定','大家都說','僅供參考']
    if not v.strip(): return 0
    if len(v.strip())<8: return 30
    if any(x in v.lower() for x in vague): return 40
    return 100

def required_level(action: str) -> str:
    a = action.lower()
    if 'final delivery' in a or 'share external' in a:
        return 'T3_FINAL_DELIVERY'
    if 'summarize' in a or 'ask local ai' in a:
        return 'T2_MIDDLE_INTERPRETATION'
    return 'T1_TRANSFER_ONLY'

def evaluate(i:InterpretationInput):
    s={k:score(getattr(i,k)) for k in ['subject','boundary','cause','replay','repair','responsibility']}
    gaps=[f'{k}_missing' for k,v in s.items() if v==0] + [f'{k}_weak' for k,v in s.items() if 0<v<60]
    decision='ALLOW'; access='T2_MIDDLE_INTERPRETATION'
    if s['subject']==0 or s['boundary']==0 or (s['subject']<60 and s['responsibility']==0) or list(v < 60 for v in s.values()).count(True) >= 4:
        decision,access='VOID','VOID_INTERPRETATION'
    elif ('share external' in i.action.lower() or 'final delivery' in i.action.lower()) and (s['responsibility']<60 or s['repair']<60):
        decision,access='HOLD','HOLD_REVIEW'
    elif all(v>=60 for v in s.values()):
        decision,access='ALLOW','T3_FINAL_DELIVERY'
    elif list(v>=60 for v in s.values()).count(True)<=2:
        decision,access='HOLD','T1_TRANSFER_ONLY'
    elif s['responsibility']<60 or s['replay']<60:
        decision,access='HOLD','T2_MIDDLE_INTERPRETATION'
    return {'decision':decision,'accessLevel':access,'scores':s,'gaps':gaps,'explanation':'Deterministic ICC rule engine result.','auditId':f"AUD-{int(datetime.datetime.now().timestamp()*1000)}",'timestamp':_now_iso()}

def _document_hash(content: str) -> str:
    return hashlib.sha256(content.encode('utf-8')).hexdigest()

def _extract_text(filename: str, data: bytes) -> str:
    lower = filename.lower()
    if lower.endswith('.txt') or lower.endswith('.md'):
        return data.decode('utf-8', errors='ignore')
    if lower.endswith('.pdf'):
        if PdfReader is None:
            raise HTTPException(400, 'PDF support requires pypdf (not installed).')
        temp = DATA / f"tmp-{uuid.uuid4().hex}.pdf"
        temp.write_bytes(data)
        try:
            reader = PdfReader(str(temp))
            return '\n'.join([p.extract_text() or '' for p in reader.pages]).strip()
        finally:
            temp.unlink(missing_ok=True)
    raise HTTPException(400, 'Unsupported file type. Supported: .txt, .md, .pdf (DOCX next step).')

def _llm_extract(content: str, req: AccessRequest) -> dict:
    if not LOCAL_LLM_ENABLED:
        return {}
    prompt = f"""Extract JSON with keys subject,boundary,cause,replay,repair,responsibility.
Action: {req.action}\nActor: {req.actor}\nUserInput: {req.subject} {req.boundary} {req.cause} {req.replay} {req.repair} {req.responsibility}\nDocument:\n{content[:4000]}"""
    body = json.dumps({"model": LOCAL_LLM_MODEL, "prompt": prompt, "stream": False}).encode('utf-8')
    req_http = urllib.request.Request(f"{OLLAMA_BASE_URL}/api/generate", data=body, headers={'Content-Type':'application/json'})
    with urllib.request.urlopen(req_http, timeout=20) as resp:
        payload = json.loads(resp.read().decode('utf-8'))
    text = payload.get('response', '')
    try:
        return json.loads(text)
    except Exception:
        return {}

def _append_audit(entry: dict):
    with AUDIT.open('a',encoding='utf-8') as f:
        f.write(json.dumps(entry, ensure_ascii=False) + '\n')

@app.get('/health')
def health():
    return {'status':'ok', 'local_llm_enabled': LOCAL_LLM_ENABLED}

@app.post('/documents/import_text')
def import_text(payload: dict):
    title = payload.get('title', 'Untitled')
    content = payload.get('content', '')
    level = payload.get('classification_level', 'Internal')
    if not content.strip():
        raise HTTPException(400, 'content is required')
    doc_id = f"DOC-{uuid.uuid4().hex[:10]}"
    doc = {'document_id': doc_id, 'title': title, 'classification_level': level, 'content': content, 'sha256_hash': _document_hash(content), 'created_at': _now_iso()}
    (DOC_DIR / f"{doc_id}.json").write_text(json.dumps(doc, ensure_ascii=False, indent=2), encoding='utf-8')
    index = _read_json(INDEX, [])
    index.insert(0, {k: doc[k] for k in ['document_id','title','classification_level','sha256_hash','created_at']})
    _write_json(INDEX, index)
    return doc

@app.post('/documents/import_payload')
def import_payload(payload: dict):
    filename = payload.get('filename', 'document.txt')
    level = payload.get('classification_level', 'Internal')
    content = payload.get('content', '')
    if not content:
        raise HTTPException(400, 'content is required')
    # filename is used to determine parser behavior for txt/md/pdf source.
    parsed = _extract_text(filename, content.encode('utf-8')) if not filename.lower().endswith('.pdf') else _extract_text(filename, content.encode('latin1', errors='ignore'))
    return import_text({'title': filename, 'content': parsed, 'classification_level': level})

@app.get('/documents')
def list_docs():
    return _read_json(INDEX, [])

@app.get('/documents/{document_id}')
def get_doc(document_id: str):
    p = DOC_DIR / f"{document_id}.json"
    if not p.exists():
        raise HTTPException(404, 'document not found')
    return json.loads(p.read_text(encoding='utf-8'))

@app.post('/documents/{document_id}/policy')
def set_policy(document_id: str, payload: Policy):
    policies = _read_json(POLICIES, {})
    policies[document_id] = payload.model_dump()
    _write_json(POLICIES, policies)
    return {'status':'policy_saved','document_id':document_id,'policy':payload.model_dump()}

@app.get('/documents/{document_id}/policy')
def get_policy(document_id: str):
    return _read_json(POLICIES, {}).get(document_id, {})

@app.post('/access/request')
def access_request(req: AccessRequest):
    doc = get_doc(req.document_id)
    policy = _read_json(POLICIES, {}).get(req.document_id, {})
    requested = required_level(req.action)
    actors = {
        'T1_TRANSFER_ONLY': policy.get('t1_transfer_only_actors', []),
        'T2_MIDDLE_INTERPRETATION': policy.get('t2_middle_interpretation_actors', []),
        'T3_FINAL_DELIVERY': policy.get('t3_final_delivery_actors', []),
    }
    allowed_actor = req.actor in actors.get(requested, [])
    if req.action == 'ask local AI' and not policy.get('allow_local_ai', True):
        allowed_actor = False
    if req.action == 'share external' and not policy.get('allow_external_share', False):
        allowed_actor = False

    fields = {k: getattr(req, k) for k in ['subject','boundary','cause','replay','repair','responsibility']}
    if req.auto_extract_with_local_llm and LOCAL_LLM_ENABLED:
        extracted = _llm_extract(doc['content'], req)
        for k in fields:
            if not fields[k].strip() and isinstance(extracted.get(k), str):
                fields[k] = extracted[k]

    res = evaluate(InterpretationInput(documentId=req.document_id, action=req.action, **fields))
    if not allowed_actor and res['decision'] == 'ALLOW':
        res['decision'] = 'HOLD'
        res['accessLevel'] = 'HOLD_REVIEW'
        res['gaps'].append('actor_not_allowed_by_policy')

    audit_entry = {
        'audit_id': res['auditId'], 'document_id': req.document_id, 'actor': req.actor, 'action': req.action,
        'requested_level': requested, 'decision': res['accessLevel'], 'scores': res['scores'], 'gaps': res['gaps'],
        'timestamp': res['timestamp'], 'document_hash': doc['sha256_hash']
    }
    _append_audit(audit_entry)
    return {'document_id': req.document_id, 'requested_level': requested, 'policy_actor_allowed': allowed_actor, **res}

@app.post('/interpretation/evaluate')
def eval_api(input:InterpretationInput):
    return evaluate(input)

@app.get('/audit')
def audit():
    return [json.loads(x) for x in AUDIT.read_text(encoding='utf-8').splitlines()] if AUDIT.exists() else []
