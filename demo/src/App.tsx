import { useMemo, useState } from 'react';
import { evaluateInterpretation } from './lib/iccEngine';
import { InterpretationInput, InterpretationResult, Language } from './lib/types';
import { FieldKey, tx } from './lib/i18n';

type FormFields = Omit<InterpretationInput, 'documentId' | 'action' | 'language'>;
type CaseContent = { doc: string; action: string; expected: string; form: FormFields; btn: string };
type DemoCase = { id: string; level: InterpretationResult['accessLevel']; zh: CaseContent; en: CaseContent; docId: string; actionKey: string };

const load = <T,>(k: string, d: T): T => JSON.parse(localStorage.getItem(k) || JSON.stringify(d));
const save = (k: string, v: unknown) => localStorage.setItem(k, JSON.stringify(v));

const demoCases: DemoCase[] = [
  { id: 'case1', level: 'T1_TRANSFER_ONLY', docId: 'bank-policy', actionKey: 'transfer', zh: { btn: '案例一｜只允許移交', doc: '銀行風控文件', action: '移交', expected: '第一層｜只允許移交，或第二層｜中層解釋權', form: { subject: '風控團隊將此文件移交給內部合規審查人員。', boundary: '僅限內部審查，不得對外揭露。', cause: '合規單位需要確認文件分類與使用邊界。', replay: '移交紀錄需包含文件雜湊、接收者與時間戳。', repair: '若誤交給錯誤對象，需撤銷權限並通知文件 owner。', responsibility: '風控團隊 owner 承擔移交責任。' } }, en: { btn: 'Case 1 | Transfer Only', doc: 'Bank Risk Policy', action: 'transfer', expected: 'T1_TRANSFER_ONLY or T2_MIDDLE_INTERPRETATION', form: { subject: 'Risk team transfers this document to an internal compliance reviewer.', boundary: 'Internal review only; no external disclosure.', cause: 'Compliance needs to confirm document classification and usage scope.', replay: 'Transfer record includes file hash, recipient, and timestamp.', repair: 'If sent to a wrong recipient, revoke access and notify the document owner.', responsibility: 'Risk team owner is responsible for this transfer.' } } },
  { id: 'case2', level: 'T2_MIDDLE_INTERPRETATION', docId: 'patch-report', actionKey: 'summarize', zh: { btn: '案例二｜中層解釋權', doc: '資安補丁報告', action: '摘要', expected: '第二層｜中層解釋權', form: { subject: '資安工程師為內部工程團隊整理補丁影響摘要。', boundary: '僅限內部工程使用，不得對外分享漏洞細節。', cause: '工程團隊需要理解受影響模組與修補優先順序。', replay: '摘要需回連原始補丁報告與審計紀錄。', repair: '若邊界描述錯誤，由資安 owner 修正內容。', responsibility: '資安 owner 與工程主管共同承擔責任。' } }, en: { btn: 'Case 2 | Middle Interpretation', doc: 'Security Patch Report', action: 'summarize', expected: 'T2_MIDDLE_INTERPRETATION', form: { subject: 'Security engineer summarizes patch impact for internal engineering.', boundary: 'For internal engineering only; no exploit details externally.', cause: 'Engineering needs to understand affected modules.', replay: 'Summary links back to patch report and audit log.', repair: 'Security owner corrects summary when boundary is incorrect.', responsibility: 'Security owner and engineering lead share responsibility.' } } },
  { id: 'case3', level: 'T3_FINAL_DELIVERY', docId: 'poc-nda', actionKey: 'final delivery', zh: { btn: '案例三｜最終交付權', doc: 'NDA PoC 報告', action: '最終交付', expected: '第三層｜最終交付權', form: { subject: '專案 owner 將 NDA 核准版本的 PoC 報告交付給指定合作夥伴。', boundary: '僅可交付 NDA 核准版本，內部規則表不得外流。', cause: '合作夥伴完成 NDA 審查後，需要核准的 PoC 套件。', replay: '交付紀錄需包含版本雜湊、接收者、時間戳與核准註記。', repair: '若被誤用，專案 owner 啟動下架、更正與法務追蹤。', responsibility: '專案 owner 承擔最終交付責任。' } }, en: { btn: 'Case 3 | Final Delivery', doc: 'NDA PoC Report', action: 'final delivery', expected: 'T3_FINAL_DELIVERY', form: { subject: 'Project owner delivers NDA-approved PoC report to the named partner.', boundary: 'Only NDA-approved version may be delivered; internal rule tables are excluded.', cause: 'Partner completed NDA review and needs approved PoC package.', replay: 'Delivery record includes version hash, recipient, timestamp, and approval note.', repair: 'If misused, project owner triggers takedown, correction, and legal follow-up.', responsibility: 'Project owner accepts final delivery responsibility.' } } },
  { id: 'case4', level: 'HOLD_REVIEW', docId: 'strategy-memo', actionKey: 'share external', zh: { btn: '案例四｜需人工審查', doc: '內部策略文件', action: '對外分享', expected: '需人工審查', form: { subject: '團隊成員想要向外部聯絡人分享摘要。', boundary: '可能只分享高層資訊，但核准版本尚不明確。', cause: '外部聯絡人可能需要背景脈絡。', replay: '目前無法確認將送出的版本。', repair: '需要主管確認後才能處理。', responsibility: '責任歸屬尚未明確指定。' } }, en: { btn: 'Case 4 | Hold Review', doc: 'Internal Strategy Memo', action: 'share external', expected: 'HOLD_REVIEW', form: { subject: 'Team member wants to share a summary with an outside contact.', boundary: 'Maybe only high-level content, but approved version is unclear.', cause: 'The outside contact may need context.', replay: 'Not sure which version will be sent.', repair: 'Manager confirmation is required.', responsibility: 'Responsibility owner is not clearly assigned.' } } },
  { id: 'case5', level: 'VOID_INTERPRETATION', docId: 'bank-policy', actionKey: 'share external', zh: { btn: '案例五｜解釋無效', doc: '銀行風控文件', action: '對外分享', expected: '解釋無效', form: { subject: '大家都說這份文件可以分享。', boundary: '沒有清楚邊界。', cause: '可能有幫助。', replay: '沒有回放。', repair: '不確定。', responsibility: '僅供參考。' } }, en: { btn: 'Case 5 | Void Interpretation', doc: 'Bank Risk Policy', action: 'share external', expected: 'VOID_INTERPRETATION', form: { subject: 'Everyone says this is safe to share.', boundary: 'No clear boundary.', cause: 'Probably useful.', replay: 'No replay.', repair: 'Not sure.', responsibility: 'For reference only.' } } }
];
const emptyForm: FormFields = { subject: '', boundary: '', cause: '', replay: '', repair: '', responsibility: '' };

export function App() {
  const [lang, setLang] = useState<Language>(load('lang', 'zh-TW'));
  const [selectedCase, setSelectedCase] = useState(demoCases[0]);
  const [advancedForm, setAdvancedForm] = useState<FormFields>(load('advanced-form', emptyForm));
  const [result, setResult] = useState<InterpretationResult | null>(null);
  const c = tx(lang);
  const active = lang === 'zh-TW' ? selectedCase.zh : selectedCase.en;
  const required = useMemo(() => selectedCase.actionKey.includes('final') || selectedCase.actionKey.includes('external') ? 'T3_FINAL_DELIVERY' : selectedCase.actionKey.includes('summarize') || selectedCase.actionKey.includes('ask') ? 'T2_MIDDLE_INTERPRETATION' : 'T1_TRANSFER_ONLY', [selectedCase.actionKey]);
  const runDemo = (form: FormFields) => {
    const res = evaluateInterpretation({ documentId: selectedCase.docId, action: selectedCase.actionKey, language: lang, ...form });
    setResult(res); const logs = load<InterpretationResult[]>('audit', []); save('audit', [res, ...logs].slice(0, 20));
  };

  return <div className='page'>
    <header className='hero card'><div className='lang-wrap'><button className='lang-btn' onClick={() => { const n: Language = lang === 'zh-TW' ? 'en' : 'zh-TW'; setLang(n); save('lang', n); }}>{c.langSwitch}</button></div>
      <h1>{c.heroTitleEn}<br />{c.heroTitleZh}</h1><p>{c.heroSubtitle}</p><p>{c.heroNote}</p>
      <div className='btn-row'><a className='btn primary' href='https://hijo790401.github.io/shen-yao-portal/' target='_blank' rel='noreferrer'>{c.portal}</a><a className='btn' href='https://github.com/HIJO790401/TIRC-Document-Gate' target='_blank' rel='noreferrer'>{c.repo}</a></div>
    </header>
    <section className='card'><h2>{c.whyTitle}</h2><p>{c.why1}</p><p>{c.why2}</p><p>{c.why3}</p></section>
    <section className='card'><h2>{c.rightsTitle}</h2><div className='grid3'><article className='mini'><h3>{c.lv1}</h3><p><b>Code:</b> T1_TRANSFER_ONLY</p><p>{c.lv1d}</p></article><article className='mini'><h3>{c.lv2}</h3><p><b>Code:</b> T2_MIDDLE_INTERPRETATION</p><p>{c.lv2d}</p></article><article className='mini'><h3>{c.lv3}</h3><p><b>Code:</b> T3_FINAL_DELIVERY</p><p>{c.lv3d}</p></article></div><div className='status-row'><span>{c.hold}</span><small>(HOLD_REVIEW)</small><span>{c.void}</span><small>(VOID_INTERPRETATION)</small></div></section>
    <section className='card'><h2>{c.fixedDemo}</h2><p>{c.selectCase}</p><div className='case-grid'>{demoCases.map((item) => <button key={item.id} className={`case-btn ${item.id === selectedCase.id ? 'active' : ''}`} onClick={() => setSelectedCase(item)}>{lang==='zh-TW'?item.zh.btn:item.en.btn}</button>)}</div>
      <div className='mini'><p><b>{c.doc}：</b>{active.doc}</p><p><b>{c.action}：</b>{active.action}</p><p><b>{c.expected}：</b>{active.expected}</p><h3>{c.closureTitle}</h3>{(Object.keys(active.form) as FieldKey[]).map((k)=><p key={k}><b>{c.fieldLabels[k]}：</b>{active.form[k]}</p>)}</div>
      <button className='btn primary' onClick={() => runDemo(active.form)}>{c.runDemo}</button>
      {result && <div className='result'><p><b>{c.result.required}：</b>{required}</p><p><b>{c.result.decision}：</b>{result.decision} / {result.accessLevel}</p><p><b>{c.result.scores}：</b>{Object.entries(result.scores).map(([k,v])=>`${k}:${v}`).join(' | ')}</p><p><b>{c.result.gaps}：</b>{result.gaps.length ? result.gaps.join(', ') : (lang==='zh-TW'?'無':'none')}</p><p><b>{c.result.explanation}：</b>{result.explanation}</p><p><b>{c.result.audit}：</b>{result.auditId}</p></div>}
      <details className='advanced'><summary>{c.advanced}</summary>{(Object.keys(emptyForm) as FieldKey[]).map((k)=><label key={k}>{c.fieldLabels[k]}<input value={advancedForm[k]} onChange={(e)=>{const n={...advancedForm,[k]:e.target.value};setAdvancedForm(n);save('advanced-form',n);}} /></label>)}<button className='btn' onClick={()=>runDemo(advancedForm)}>{c.runDemo}</button></details>
    </section>
    <section className='card'><h2>{c.flowTitle}</h2><p className='flow'>{c.flow}</p></section>
    <section className='card'><h2>{c.depTitle}</h2><h3>{c.depA}</h3><p>{c.depAText}</p><h3>{c.depB}</h3><pre>git clone https://github.com/HIJO790401/TIRC-Document-Gate.git
cd TIRC-Document-Gate/demo
npm install
npm run dev</pre><h3>{c.depC}</h3><p>{c.depCText}</p><pre>docker compose up --build</pre><h3>{c.depD}</h3><pre>cd demo
npm run build:pages</pre><p>{c.ghSetting}</p></section>
    <LocalEdition lang={lang} />
    <footer className='card footer'><div className='btn-row'><a className='btn primary' href='https://hijo790401.github.io/shen-yao-portal/' target='_blank' rel='noreferrer'>{c.portal}</a><a className='btn' href='https://github.com/HIJO790401/TIRC-Document-Gate' target='_blank' rel='noreferrer'>{c.footerRepo}</a></div><p>Wen-Yao Hsu / Shen-Yao 888π</p><p>許文耀／沈耀888π</p><p>{c.founder}</p></footer>
  </div>;
}

function LocalEdition({ lang }: { lang: Language }) {
  const api = (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:8000';
  const t = lang==='zh-TW' ? {
    title:'Local Edition 操作台',toggle:'啟用本地模式',dashboard:'總覽儀表板',docsTotal:'文件總數',todayReviews:'今日審查數',hold:'HOLD 數',void:'VOID 數',chain:'Audit Chain 狀態',llm:'本地模型狀態',
    users:'本地帳號與角色',actor:'目前身份',docMgmt:'文件管理',importText:'文字匯入',upload:'上傳檔案',titleLabel:'標題',level:'機密等級',owner:'擁有者',
    docs:'文件列表',policy:'三層解釋權設定',savePolicy:'保存設定',review:'操作送審',audit:'審計紀錄',verify:'驗證 Audit Chain',load:'重新載入',
    action:'操作',nda:'NDA 情境',autoExtract:'啟用本地模型自動抽取',submit:'送出審查',filterDoc:'依文件篩選',filterActor:'依身份篩選',exportJson:'匯出 JSON',
    fields:{subject:'主體',boundary:'邊界',cause:'因果',replay:'回放',repair:'修復',responsibility:'責任'}
  } : {
    title:'Local Edition Console',toggle:'Enable Local Mode',dashboard:'Dashboard',docsTotal:'Documents',todayReviews:'Today Reviews',hold:'HOLD Count',void:'VOID Count',chain:'Audit Chain',llm:'Local Model Status',
    users:'Local Users & Roles',actor:'Current Actor',docMgmt:'Document Management',importText:'Import Text',upload:'Upload File',titleLabel:'Title',level:'Classification Level',owner:'Owner',
    docs:'Documents',policy:'Three-Level Policy',savePolicy:'Save Policy',review:'Access Review',audit:'Audit Log',verify:'Verify Audit Chain',load:'Reload',
    action:'Action',nda:'NDA Context',autoExtract:'Auto extract with local model',submit:'Submit Request',filterDoc:'Filter by Document',filterActor:'Filter by Actor',exportJson:'Export JSON',
    fields:{subject:'Subject',boundary:'Boundary',cause:'Cause',replay:'Replay',repair:'Repair',responsibility:'Responsibility'}
  };

  const [localMode, setLocalMode] = useState(false);
  const [users, setUsers] = useState<any[]>([]); const [actor, setActor] = useState('user1');
  const [docs, setDocs] = useState<any[]>([]); const [audits, setAudits] = useState<any[]>([]);
  const [selectedDoc, setSelectedDoc] = useState(''); const [classification, setClassification] = useState('Internal');
  const [policy, setPolicy] = useState({t1_transfer_only_actors:'',t2_middle_interpretation_actors:'',t3_final_delivery_actors:'',allow_local_ai:true,allow_external_share:false,require_nda:true,external_allowed_recipients:'',blocked_sections_note:''});
  const [title, setTitle] = useState(''); const [content, setContent] = useState('');
  const [action, setAction] = useState('transfer'); const [llmEnabled, setLlmEnabled] = useState(false);
  const [form, setForm] = useState({subject:'',boundary:'',cause:'',replay:'',repair:'',responsibility:''}); const [reqResult, setReqResult] = useState<any>(null);
  const [verifyResult, setVerifyResult] = useState<any>(null); const [docFilter, setDocFilter]=useState(''); const [actorFilter,setActorFilter]=useState('');

  const fetchUsers=async()=>setUsers(await (await fetch(`${api}/users`)).json());
  const fetchDocs=async()=>setDocs(await (await fetch(`${api}/documents`)).json());
  const fetchAudit=async()=>setAudits(await (await fetch(`${api}/audit`)).json());
  const refreshAll=async()=>{await Promise.all([fetchUsers(),fetchDocs(),fetchAudit()]);};
  const importText=async()=>{await fetch(`${api}/documents/import_text`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({title,content,classification_level:classification,owner:actor,status:'active'})}); await fetchDocs();};
  const uploadFile=async(e:any)=>{const f=e.target.files?.[0]; if(!f) return; const fd=new FormData(); fd.append('file',f); fd.append('owner',actor); fd.append('classification_level',classification); fd.append('status','active'); await fetch(`${api}/documents/upload`,{method:'POST',body:fd}); await fetchDocs();};
  const savePolicyApi=async()=>{if(!selectedDoc) return; await fetch(`${api}/documents/${selectedDoc}/policy?actor=${encodeURIComponent(actor)}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...policy,t1_transfer_only_actors:policy.t1_transfer_only_actors.split(',').map(s=>s.trim()).filter(Boolean),t2_middle_interpretation_actors:policy.t2_middle_interpretation_actors.split(',').map(s=>s.trim()).filter(Boolean),t3_final_delivery_actors:policy.t3_final_delivery_actors.split(',').map(s=>s.trim()).filter(Boolean),external_allowed_recipients:policy.external_allowed_recipients.split(',').map(s=>s.trim()).filter(Boolean)})});};
  const submitRequest=async()=>{const r=await fetch(`${api}/access/request`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({document_id:selectedDoc,actor,action,nda_context:policy.require_nda,auto_extract_with_local_llm:llmEnabled,...form})}); setReqResult(await r.json()); await fetchAudit();};
  const verify=async()=>setVerifyResult(await (await fetch(`${api}/audit/verify`)).json());
  const exportJson=()=>{const blob=new Blob([JSON.stringify(filteredAudit,null,2)],{type:'application/json'}); const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='audit.json'; a.click();};

  const today = new Date().toISOString().slice(0,10);
  const filteredAudit = audits.filter(a => (!docFilter || a.document_id===docFilter) && (!actorFilter || a.actor===actorFilter));
  const todayReviews = audits.filter(a => (a.timestamp||'').startsWith(today)).length;
  const holdCount = audits.filter(a => (a.decision||'').includes('HOLD')).length;
  const voidCount = audits.filter(a => (a.decision||'').includes('VOID')).length;

  return <section className='card'><h2>{t.title}</h2><button className='btn' onClick={()=>setLocalMode(!localMode)}>{t.toggle}: {localMode?'ON':'OFF'}</button>
    {localMode && <>
      <div className='mini'><h3>{t.dashboard}</h3><div className='panel-grid'><p>{t.docsTotal}: {docs.length}</p><p>{t.todayReviews}: {todayReviews}</p><p>{t.hold}: {holdCount}</p><p>{t.void}: {voidCount}</p><p>{t.chain}: {verifyResult?.valid===false?'BROKEN':'VALID/UNKNOWN'}</p><p>{t.llm}: {llmEnabled?'Enabled':'Disabled'}</p></div></div>
      <div className='panel-grid'>
        <div className='mini'><h3>{t.users}</h3><button className='btn' onClick={refreshAll}>{t.load}</button><p>{t.actor}<select value={actor} onChange={e=>setActor(e.target.value)}>{users.map(u=><option key={u.username} value={u.username}>{u.username} ({u.role})</option>)}</select></p></div>
        <div className='mini'><h3>{t.docMgmt}</h3><input placeholder={t.titleLabel} value={title} onChange={e=>setTitle(e.target.value)} /><input placeholder={t.level} value={classification} onChange={e=>setClassification(e.target.value)} /><textarea placeholder='content_text' value={content} onChange={e=>setContent(e.target.value)} /><div className='btn-row'><button className='btn' onClick={importText}>{t.importText}</button><label className='btn'>{t.upload}<input type='file' style={{display:'none'}} onChange={uploadFile} /></label></div></div>
      </div>
      <div className='mini'><h3>{t.docs}</h3><button className='btn' onClick={fetchDocs}>{t.load}</button><table><thead><tr><th>{t.titleLabel}</th><th>{t.level}</th><th>{t.owner}</th><th>created_at</th><th>hash12</th><th>policy</th></tr></thead><tbody>{docs.map(d=><tr key={d.document_id} onClick={()=>setSelectedDoc(d.document_id)}><td>{d.title}</td><td>{d.classification_level}</td><td>{d.owner}</td><td>{d.created_at}</td><td>{d.hash_12}</td><td>{d.policy_status}</td></tr>)}</tbody></table></div>
      <div className='panel-grid'>
        <div className='mini'><h3>{t.policy}</h3><p>document_id: {selectedDoc||'-'}</p><input placeholder='T1 actors' value={policy.t1_transfer_only_actors} onChange={e=>setPolicy({...policy,t1_transfer_only_actors:e.target.value})} /><input placeholder='T2 actors' value={policy.t2_middle_interpretation_actors} onChange={e=>setPolicy({...policy,t2_middle_interpretation_actors:e.target.value})} /><input placeholder='T3 actors' value={policy.t3_final_delivery_actors} onChange={e=>setPolicy({...policy,t3_final_delivery_actors:e.target.value})} /><label><input type='checkbox' checked={policy.allow_local_ai} onChange={e=>setPolicy({...policy,allow_local_ai:e.target.checked})}/>allow_local_ai</label><label><input type='checkbox' checked={policy.allow_external_share} onChange={e=>setPolicy({...policy,allow_external_share:e.target.checked})}/>allow_external_share</label><label><input type='checkbox' checked={policy.require_nda} onChange={e=>setPolicy({...policy,require_nda:e.target.checked})}/>require_nda</label><input placeholder='external_allowed_recipients' value={policy.external_allowed_recipients} onChange={e=>setPolicy({...policy,external_allowed_recipients:e.target.value})} /><input placeholder='blocked_sections_note' value={policy.blocked_sections_note} onChange={e=>setPolicy({...policy,blocked_sections_note:e.target.value})} /><button className='btn primary' onClick={savePolicyApi}>{t.savePolicy}</button></div>
        <div className='mini'><h3>{t.review}</h3><p>{t.action}<select value={action} onChange={e=>setAction(e.target.value)}><option>transfer</option><option>summarize</option><option>ask local AI</option><option>export</option><option>share external</option><option>final delivery</option></select></p><label><input type='checkbox' checked={llmEnabled} onChange={e=>setLlmEnabled(e.target.checked)} />{t.autoExtract}</label>{Object.keys(form).map(k=><label key={k}>{(t.fields as any)[k]}<input value={(form as any)[k]} onChange={e=>setForm({...form,[k]:e.target.value})} /></label>)}<button className='btn primary' onClick={submitRequest}>{t.submit}</button>{reqResult && <pre>{JSON.stringify(reqResult,null,2)}</pre>}</div>
      </div>
      <div className='mini'><h3>{t.audit}</h3><div className='btn-row'><button className='btn' onClick={fetchAudit}>{t.load}</button><button className='btn' onClick={verify}>{t.verify}</button><button className='btn' onClick={exportJson}>{t.exportJson}</button></div><div className='panel-grid'><div><label>{t.filterDoc}<input value={docFilter} onChange={e=>setDocFilter(e.target.value)} /></label></div><div><label>{t.filterActor}<input value={actorFilter} onChange={e=>setActorFilter(e.target.value)} /></label></div></div>{verifyResult && <pre>{JSON.stringify(verifyResult,null,2)}</pre>}<pre>{JSON.stringify(filteredAudit.slice(0,50),null,2)}</pre></div>
    </>}
  </section>;
}
