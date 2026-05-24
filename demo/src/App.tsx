import { NavLink, Route, Routes } from 'react-router-dom';
import { useMemo, useState } from 'react';
import { actions, documents } from './data/sampleData';
import { evaluateInterpretation } from './lib/iccEngine';
import { Language, InterpretationInput, InterpretationResult } from './lib/types';
import { t, texts } from './lib/i18n';

const load = <T,>(k: string, d: T): T => JSON.parse(localStorage.getItem(k) || JSON.stringify(d));
const save = (k: string, v: unknown) => localStorage.setItem(k, JSON.stringify(v));

export function App() {
  const [lang, setLang] = useState<Language>(load('lang', 'zh-TW'));
  const [policy, setPolicy] = useState(load('policy', { classification: 'Internal', allowLocalAI: true, allowExternalShare: false, requireNda: true }));
  const [logs, setLogs] = useState<InterpretationResult[]>(load('audit', []));
  const [docId, setDocId] = useState(documents[0].id);
  const [action, setAction] = useState(actions[0]);
  const [form, setForm] = useState<Omit<InterpretationInput, 'documentId'|'action'|'language'>>({ subject:'', boundary:'', cause:'', replay:'', repair:'', responsibility:''});
  const [result, setResult] = useState<InterpretationResult | null>(null);
  const required = useMemo(()=> action.includes('delivery')||action.includes('external')?'T3_FINAL_DELIVERY': action.includes('summarize')||action.includes('AI')?'T2_MIDDLE_INTERPRETATION':'T1_TRANSFER_ONLY', [action]);
  const evaluate = () => {
    const res = evaluateInterpretation({ documentId: docId, action, language: lang, ...form });
    setResult(res); const next=[res,...logs]; setLogs(next); save('audit',next);
  };
  const link = (to:string, label:string)=> <NavLink to={to} className='nav'>{label}</NavLink>;
  return <div className='layout'><header><h1>{t(texts.appName,lang)}</h1><p>{t(texts.tagline,lang)}</p><button onClick={()=>{const n=lang==='zh-TW'?'en':'zh-TW'; setLang(n); save('lang',n);}}>{lang==='zh-TW'?'English':'繁體中文'}</button></header><nav>{link('/',t(texts.nav.home,lang))}{link('/concept',t(texts.nav.concept,lang))}{link('/demo',t(texts.nav.demo,lang))}{link('/policy',t(texts.nav.policy,lang))}{link('/audit',t(texts.nav.audit,lang))}{link('/local',t(texts.nav.local,lang))}</nav><Routes>
  <Route path='/' element={<section className='card'><h2>{t(texts.appName,lang)}</h2><p>{t(texts.tagline,lang)}</p><ul><li>TIRC: Triple Interpretation Rights Chain</li><li>ICC: Interpretation Closure Core</li><li>RCK: Responsibility-Cognition Key</li></ul></section>} />
  <Route path='/concept' element={<section className='card'><h2>Concept</h2><p>Traditional ACL asks read/open. TIRC checks transfer, interpretation, final delivery rights.</p><p>T1/T2/T3 + HOLD/VOID with closure-based ICC.</p></section>} />
  <Route path='/demo' element={<section className='card'><h2>Demo Flow</h2><label>Document<select value={docId} onChange={e=>setDocId(e.target.value)}>{documents.map(d=><option key={d.id} value={d.id}>{d.name}</option>)}</select></label><label>Action<select value={action} onChange={e=>setAction(e.target.value)}>{actions.map(a=><option key={a}>{a}</option>)}</select></label><p>Required Level: <b>{required}</b></p>{Object.keys(form).map((k)=><label key={k}>{k}<input value={(form as any)[k]} onChange={e=>setForm({...form,[k]:e.target.value})}/></label>)}<button onClick={evaluate}>Evaluate ICC</button>{result&&<div><p>Decision: <span className={result.accessLevel}>{result.accessLevel}</span></p><p>{result.explanation}</p><pre>{JSON.stringify(result,null,2)}</pre></div>}</section>} />
  <Route path='/policy' element={<section className='card'><h2>Policy Builder</h2><label>Classification<select value={policy.classification} onChange={e=>setPolicy({...policy,classification:e.target.value})}><option>Public</option><option>Internal</option><option>Confidential</option><option>Secret</option><option>Core</option></select></label><label><input type='checkbox' checked={policy.allowLocalAI} onChange={e=>setPolicy({...policy,allowLocalAI:e.target.checked})}/>allow local AI</label><label><input type='checkbox' checked={policy.allowExternalShare} onChange={e=>setPolicy({...policy,allowExternalShare:e.target.checked})}/>allow external share</label><label><input type='checkbox' checked={policy.requireNda} onChange={e=>setPolicy({...policy,requireNda:e.target.checked})}/>require NDA</label><button onClick={()=>save('policy',policy)}>save</button><button onClick={()=>{const p={classification:'Internal',allowLocalAI:true,allowExternalShare:false,requireNda:true}; setPolicy(p); save('policy',p);}}>reset sample policy</button></section>} />
  <Route path='/audit' element={<section className='card'><h2>Audit Log</h2><button onClick={()=>{const blob=new Blob([JSON.stringify(logs,null,2)]);const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='audit.json';a.click();}}>Export JSON</button><table><thead><tr><th>timestamp</th><th>action</th><th>requested_level</th><th>decision</th><th>gaps</th><th>audit_id</th></tr></thead><tbody>{logs.map((l)=><tr key={l.auditId}><td>{l.timestamp}</td><td>{action}</td><td>{required}</td><td>{l.accessLevel}</td><td>{l.gaps.join(',')}</td><td>{l.auditId}</td></tr>)}</tbody></table></section>} />
  <Route path='/local' element={<section className='card'><h2>Local Deployment</h2><p>npm install && npm run dev, or docker compose up. Optional local model via Ollama/local API; fallback deterministic extractor; no outbound default.</p></section>} />
  </Routes></div>;
}
