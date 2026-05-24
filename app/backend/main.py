from fastapi import FastAPI
from pydantic import BaseModel
from pathlib import Path
import json, datetime

app = FastAPI(title='TIRC Document Gate Backend')
DATA = Path('/data')
DATA.mkdir(parents=True, exist_ok=True)
AUDIT = DATA / 'audit_log.jsonl'

class InterpretationInput(BaseModel):
    documentId:str; action:str; subject:str=''; boundary:str=''; cause:str=''; replay:str=''; repair:str=''; responsibility:str=''; language:str='en'

def score(v:str)->int:
    vague=['maybe','probably','depends','not sure','for reference only','可能','應該','看情況','不確定']
    if not v.strip(): return 0
    if len(v.strip())<8: return 30
    if any(x in v.lower() for x in vague): return 40
    return 100

def evaluate(i:InterpretationInput):
    s={k:score(getattr(i,k)) for k in ['subject','boundary','cause','replay','repair','responsibility']}
    gaps=[f'{k}_missing' for k,v in s.items() if v==0] + [f'{k}_weak' for k,v in s.items() if 0<v<60]
    decision='ALLOW'; access='T2_MIDDLE_INTERPRETATION'
    if s['subject']==0 or s['boundary']==0 or (s['subject']<60 and s['responsibility']==0): decision,access='VOID','VOID_INTERPRETATION'
    elif ('share external' in i.action.lower() or 'final delivery' in i.action.lower()) and (s['responsibility']<60 or s['repair']<60): decision,access='HOLD','HOLD_REVIEW'
    elif all(v>=60 for v in s.values()): decision,access='ALLOW','T3_FINAL_DELIVERY'
    elif list(v>=60 for v in s.values()).count(True)<=2: decision,access='HOLD','T1_TRANSFER_ONLY'
    res={'decision':decision,'accessLevel':access,'scores':s,'gaps':gaps,'explanation':'Deterministic ICC rule engine result.','auditId':f"AUD-{int(datetime.datetime.now().timestamp()*1000)}",'timestamp':datetime.datetime.utcnow().isoformat()+'Z'}
    with AUDIT.open('a',encoding='utf-8') as f: f.write(json.dumps({'documentId':i.documentId,'action':i.action,**res},ensure_ascii=False)+'\n')
    return res

@app.get('/health')
def health(): return {'status':'ok'}
@app.post('/documents/register')
def register(payload:dict): return {'status':'registered','payload':payload}
@app.post('/documents/{id}/policy')
def policy(id:str,payload:dict): return {'status':'policy_saved','document_id':id,'payload':payload}
@app.post('/access/request')
def access(payload:dict): return {'status':'received','payload':payload}
@app.post('/interpretation/evaluate')
def eval_api(input:InterpretationInput): return evaluate(input)
@app.get('/audit')
def audit(): return [json.loads(x) for x in AUDIT.read_text(encoding='utf-8').splitlines()] if AUDIT.exists() else []
@app.get('/audit/{document_id}')
def audit_doc(document_id:str): return [x for x in audit() if x.get('documentId')==document_id]
