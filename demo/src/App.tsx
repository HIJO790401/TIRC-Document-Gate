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
  const zh = lang === 'zh-TW';
  const t = zh ? {
    title: 'V1 Local Edition 操作台',
    sections: ['1. 身份流程','2. 匯入文件','3. 文件列表','4. 三層解釋權設定','5. 操作送審','6. 判定結果','7. 審計紀錄','8. 本地模型狀態'],
    desc: {
      identity: '請先選擇目前操作者與文件 owner。後續匯入、設定權限與送審都會使用此身份。',
      import: '可貼上文字匯入，或上傳 TXT、Markdown、PDF、DOCX 檔案。文件只保存在本地環境。',
      list: '選擇一份文件後，才能設定三層解釋權或提出送審。',
      policy: '勾選哪些使用者可以移交、內部解釋、最終交付此文件。',
      request: '選擇文件操作，並填寫主體、邊界、因果、回放、修復、責任。',
      result: '系統會依 ICC 規則引擎判定本次操作可達到哪一層。',
      audit: '每次送審都會留下紀錄，並串接 hash-chain 供事後驗證。',
      model: '本地模型只用於抽取與整理，不負責最終判定。'
    },
    labels: {
      load: '重新載入', bind: '綁定此文件', actor: '目前操作者', owner: '文件 owner', selectedDoc: '目前綁定文件',
      title: '文件名稱', content: '文件內容', importText: '匯入文字文件', upload: '上傳檔案',
      docId: '文件 ID', docTitle: '文件名稱', docOwner: '文件 owner', status: '狀態', policyStatus: '權限設定狀態',
      policyFlags: '政策旗標', allowLocalAi: '允許本地 AI 讀取', allowExternalShare: '允許對外分享', requireNda: '需要 NDA 或正式授權',
      extRecipients: '允許之外部接收者（每行一位）', blockedNote: '封鎖區段備註', setPolicy: '儲存三層政策',
      action: '操作', submit: '送審', verify: '驗證 hash-chain', exportJson: '匯出 JSON',
      decision: '判定結果', requested: '需求層級', access: '可用層級', gaps: '缺口標記', auditId: '審計 ID',
      auditCols: ['審計 ID','文件','操作者','操作','需求層級','判定結果','缺口','時間','文件 hash','紀錄 hash'],
      actorFilter: '操作者篩選', docFilter: '文件篩選',
      verifyOk: '審計鏈完整，尚未偵測到斷鏈。', verifyBad: '審計鏈異常，斷點位置：',
      noGaps: '本次未偵測到主要缺口。', advanced: '進階資料（Raw JSON）',
      modelTitle: '本地模型狀態', modelSource: '狀態來源：後端 /health', modelStatus: '目前狀態', modelOn: '已啟用', modelOff: '未啟用',
      modelNote: '本地模型只用於抽取與整理主體、邊界、因果、回放、修復、責任。最終 T1 / T2 / T3 / HOLD / VOID 判定仍由 ICC 規則引擎決定。本頁不修改 docker 環境變數，若需啟用本地模型，請用 LOCAL_LLM_ENABLED=true 啟動。'
    },
    actions: { transfer: '移交', summarize: '摘要', 'ask local AI': '詢問本地模型', export: '匯出', 'share external': '對外分享', 'final delivery': '最終交付' } as Record<string, string>,
    fields: {
      subject: ['主體', '誰要做這件事？誰主張這次操作？'],
      boundary: ['邊界', '這次操作只在哪個範圍成立？不能外推到哪裡？'],
      cause: ['因果', '為什麼需要這次操作？它要解決什麼問題？'],
      replay: ['回放', '事後怎麼查證這次操作？紀錄在哪裡？'],
      repair: ['修復', '如果錯了，誰修？怎麼修？'],
      responsibility: ['責任', '這次操作造成後果，誰承擔？']
    } as Record<string, [string, string]>
  } : {
    title: 'V1 Local Edition Console',
    sections: ['1. Identity Flow','2. Import Document','3. Document List','4. Three-Level Policy','5. Submit Review','6. Decision Result','7. Audit Log','8. Local Model Status'],
    desc: {
      identity: 'Select current actor and document owner first. This identity is used across import, policy, and review.',
      import: 'Paste text or upload TXT/Markdown/PDF/DOCX. Documents stay in your local environment.',
      list: 'Select one document before configuring policy or submitting a review request.',
      policy: 'Choose which users can transfer, interpret internally, or deliver this document.',
      request: 'Pick an action and fill subject, boundary, cause, replay, repair, and responsibility.',
      result: 'ICC rule engine decides the allowed interpretation level for this action.',
      audit: 'Every review is recorded and chained for hash-chain verification.',
      model: 'Local model supports extraction only and does not make final decisions.'
    },
    labels: {
      load: 'Reload', bind: 'Bind document', actor: 'Current actor', owner: 'Document owner', selectedDoc: 'Bound document',
      title: 'Document title', content: 'Document content', importText: 'Import text document', upload: 'Upload file',
      docId: 'Document ID', docTitle: 'Title', docOwner: 'Owner', status: 'Status', policyStatus: 'Policy status',
      policyFlags: 'Policy flags', allowLocalAi: 'Allow local AI read', allowExternalShare: 'Allow external share', requireNda: 'Require NDA or formal authorization',
      extRecipients: 'Allowed external recipients (one per line)', blockedNote: 'Blocked sections note', setPolicy: 'Save three-level policy',
      action: 'Action', submit: 'Submit review', verify: 'Verify hash-chain', exportJson: 'Export JSON',
      decision: 'Decision', requested: 'Requested level', access: 'Accessible level', gaps: 'Gaps', auditId: 'Audit ID',
      auditCols: ['Audit ID','Document','Actor','Action','Requested level','Decision','Gaps','Time','Document hash','Entry hash'],
      actorFilter: 'Actor filter', docFilter: 'Document filter',
      verifyOk: 'Audit chain is valid and no break is detected.', verifyBad: 'Audit chain is broken at index: ',
      noGaps: 'No major gaps detected in this request.', advanced: 'Advanced data (Raw JSON)',
      modelTitle: 'Local model status', modelSource: 'Source: backend /health', modelStatus: 'Current status', modelOn: 'Enabled', modelOff: 'Disabled',
      modelNote: 'Local model is used only to extract and organize subject, boundary, cause, replay, repair, and responsibility. Final T1 / T2 / T3 / HOLD / VOID decisions are still made by the ICC rule engine. This page does not modify docker environment variables; to enable local model, start with LOCAL_LLM_ENABLED=true.'
    },
    actions: { transfer: 'Transfer', summarize: 'Summarize', 'ask local AI': 'Ask local AI', export: 'Export', 'share external': 'Share external', 'final delivery': 'Final delivery' } as Record<string, string>,
    fields: {
      subject: ['Subject', 'Who performs this action and who claims it?'],
      boundary: ['Boundary', 'Where does this action apply, and where does it not?'],
      cause: ['Cause', 'Why is this action needed and what problem does it solve?'],
      replay: ['Replay', 'How can this action be verified later and where is the record?'],
      repair: ['Repair', 'If wrong, who fixes it and how?'],
      responsibility: ['Responsibility', 'Who takes responsibility for outcomes?']
    } as Record<string, [string, string]>
  };

  const [users, setUsers] = useState<any[]>([]); const [docs, setDocs] = useState<any[]>([]); const [audits, setAudits] = useState<any[]>([]);
  const [actor, setActor] = useState('user1'); const [owner, setOwner] = useState('owner1'); const [selectedDoc, setSelectedDoc] = useState('');
  const [title, setTitle] = useState(''); const [content, setContent] = useState('');
  const [policy, setPolicy] = useState<any>({ t1_transfer_only_actors: [], t2_middle_interpretation_actors: [], t3_final_delivery_actors: [], allow_local_ai: true, allow_external_share: false, require_nda: true, external_allowed_recipients: [], blocked_sections_note: '' });
  const [recipientsText, setRecipientsText] = useState('');
  const [action, setAction] = useState('transfer'); const [form, setForm] = useState({ subject: '', boundary: '', cause: '', replay: '', repair: '', responsibility: '' });
  const [reqResult, setReqResult] = useState<any>(null); const [verifyResult, setVerifyResult] = useState<any>(null);
  const [auditActorFilter, setAuditActorFilter] = useState(''); const [auditDocFilter, setAuditDocFilter] = useState(''); const [health, setHealth] = useState<any>(null);

  const fetchUsers = async () => setUsers(await (await fetch(`${api}/users`)).json());
  const fetchDocs = async () => setDocs(await (await fetch(`${api}/documents`)).json());
  const fetchHealth = async () => setHealth(await (await fetch(`${api}/health`)).json());
  const fetchAudit = async () => { const q = new URLSearchParams(); if (auditActorFilter) q.set('actor', auditActorFilter); if (auditDocFilter) q.set('document_id', auditDocFilter); setAudits(await (await fetch(`${api}/audit?${q.toString()}`)).json()); };
  const bindDocOwner = async (documentId: string) => {
    setSelectedDoc(documentId);
    const d = await (await fetch(`${api}/documents/${documentId}`)).json(); setOwner(d.owner);
    const p = await (await fetch(`${api}/documents/${documentId}/policy`)).json();
    if (p && Object.keys(p).length) { setPolicy(p); setRecipientsText((p.external_allowed_recipients || []).join('\n')); }
    else { const empty = { t1_transfer_only_actors: [], t2_middle_interpretation_actors: [], t3_final_delivery_actors: [], allow_local_ai: true, allow_external_share: false, require_nda: true, external_allowed_recipients: [], blocked_sections_note: '' }; setPolicy(empty); setRecipientsText(''); }
  };
  const importText = async () => { await fetch(`${api}/documents/import_text`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title, content, classification_level: 'Internal', owner, status: 'active' }) }); await fetchDocs(); };
  const uploadFile = async (e: any) => { const f = e.target.files?.[0]; if (!f) return; const fd = new FormData(); fd.append('file', f); fd.append('owner', owner); fd.append('classification_level', 'Internal'); fd.append('status', 'active'); await fetch(`${api}/documents/upload`, { method: 'POST', body: fd }); await fetchDocs(); };
  const savePolicyApi = async () => { if (!selectedDoc) return; await fetch(`${api}/documents/${selectedDoc}/policy?actor=${encodeURIComponent(owner)}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...policy, external_allowed_recipients: recipientsText.split('\n').map((x) => x.trim()).filter(Boolean) }) }); };
  const submitRequest = async () => { const r = await fetch(`${api}/access/request`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ document_id: selectedDoc, actor, action, ...form }) }); setReqResult(await r.json()); await fetchAudit(); };
  const verify = async () => setVerifyResult(await (await fetch(`${api}/audit/verify`)).json());

  const toggleActor = (k: 't1_transfer_only_actors' | 't2_middle_interpretation_actors' | 't3_final_delivery_actors', u: string) => setPolicy((p: any) => ({ ...p, [k]: p[k].includes(u) ? p[k].filter((x: string) => x !== u) : [...p[k], u] }));
  const levelMap: Record<string, string> = zh ? { T1_TRANSFER_ONLY: '第一層｜只允許移交', T2_MIDDLE_INTERPRETATION: '第二層｜中層解釋權', T3_FINAL_DELIVERY: '第三層｜最終交付權', HOLD_REVIEW: '需人工審查', VOID_INTERPRETATION: '解釋無效' } : { T1_TRANSFER_ONLY: 'Level 1 | Transfer Only', T2_MIDDLE_INTERPRETATION: 'Level 2 | Middle Interpretation', T3_FINAL_DELIVERY: 'Level 3 | Final Delivery', HOLD_REVIEW: 'Hold review', VOID_INTERPRETATION: 'Void interpretation' };
  const humanDecision = (d: string) => zh ? (d === 'ALLOW' ? '允許' : d === 'HOLD' ? '暫停審查' : d === 'VOID' ? '阻斷' : d) : d;
  const humanGap = (g: string) => ({ actor_not_allowed_by_policy: zh ? '目前身份不在此文件的授權名單中。' : 'Current identity is not in this document authorization list.', external_share_not_allowed: zh ? '此文件的權限設定不允許對外分享。' : 'External sharing is not allowed by policy.', nda_context_missing: zh ? '此文件需要 NDA 或正式授權邊界，但本次送審未確認。' : 'NDA or formal authorization boundary is required but not confirmed.', t3_closure_incomplete: zh ? '最終交付需要完整回放、修復與責任說明。' : 'Final delivery requires complete replay, repair, and responsibility.', subject_missing: zh ? '缺少主體說明。' : 'Missing subject.', boundary_missing: zh ? '缺少邊界說明。' : 'Missing boundary.', cause_missing: zh ? '缺少因果說明。' : 'Missing cause.', replay_missing: zh ? '缺少回放說明。' : 'Missing replay.', repair_missing: zh ? '缺少修復說明。' : 'Missing repair.', responsibility_missing: zh ? '缺少責任說明。' : 'Missing responsibility.', responsibility_weak: zh ? '責任說明不足。' : 'Responsibility is weak.', boundary_weak: zh ? '邊界說明不足。' : 'Boundary is weak.', replay_weak: zh ? '回放說明不足。' : 'Replay is weak.', repair_weak: zh ? '修復說明不足。' : 'Repair is weak.' } as any)[g] || g;
  const shortHash = (h?: string) => (h ? h.slice(0, 12) : '-');

  return <section className='card'><h2>{t.title}</h2><div className='v1-grid'>
    <div className='mini'><h3>{t.sections[0]}</h3><p>{t.desc.identity}</p><button className='btn' onClick={async () => { await fetchUsers(); await fetchHealth(); }}>{t.labels.load}</button><label>{t.labels.actor}<select value={actor} onChange={e => setActor(e.target.value)}>{users.map(u => <option key={u.username} value={u.username}>{u.username} ({u.role})</option>)}</select></label><label>{t.labels.owner}<select value={owner} onChange={e => setOwner(e.target.value)}>{users.filter(u => ['owner', 'admin'].includes(u.role)).map(u => <option key={u.username} value={u.username}>{u.username} ({u.role})</option>)}</select></label></div>
    <div className='mini'><h3>{t.sections[1]}</h3><p>{t.desc.import}</p><input placeholder={t.labels.title} value={title} onChange={e => setTitle(e.target.value)} /><textarea placeholder={t.labels.content} value={content} onChange={e => setContent(e.target.value)} /><div className='btn-row'><button className='btn' onClick={importText}>{t.labels.importText}</button><label className='btn'>{t.labels.upload}<input type='file' style={{ display: 'none' }} onChange={uploadFile} /></label></div></div>
    <div className='mini'><h3>{t.sections[2]}</h3><p>{t.desc.list}</p><button className='btn' onClick={fetchDocs}>{t.labels.load}</button><table><thead><tr><th>{t.labels.docId}</th><th>{t.labels.docTitle}</th><th>{t.labels.docOwner}</th><th>{t.labels.status}</th><th>{t.labels.policyStatus}</th><th></th></tr></thead><tbody>{docs.map(d => <tr key={d.document_id}><td>{d.document_id}</td><td>{d.title}</td><td>{d.owner}</td><td>{d.status}</td><td>{d.policy_status}</td><td><button className='btn' onClick={() => bindDocOwner(d.document_id)}>{t.labels.bind}</button></td></tr>)}</tbody></table><p><b>{t.labels.selectedDoc}：</b>{selectedDoc || '-'}</p></div>
    <div className='mini'><h3>{t.sections[3]}</h3><p>{t.desc.policy}</p><p>T1（T1_TRANSFER_ONLY）</p>{users.map(u => <label key={`t1-${u.username}`}><input type='checkbox' checked={policy.t1_transfer_only_actors.includes(u.username)} onChange={() => toggleActor('t1_transfer_only_actors', u.username)} />{u.username}</label>)}<p>T2（T2_MIDDLE_INTERPRETATION）</p>{users.map(u => <label key={`t2-${u.username}`}><input type='checkbox' checked={policy.t2_middle_interpretation_actors.includes(u.username)} onChange={() => toggleActor('t2_middle_interpretation_actors', u.username)} />{u.username}</label>)}<p>T3（T3_FINAL_DELIVERY）</p>{users.map(u => <label key={`t3-${u.username}`}><input type='checkbox' checked={policy.t3_final_delivery_actors.includes(u.username)} onChange={() => toggleActor('t3_final_delivery_actors', u.username)} />{u.username}</label>)}<p>{t.labels.policyFlags}</p><label><input type='checkbox' checked={policy.allow_local_ai} onChange={e => setPolicy({ ...policy, allow_local_ai: e.target.checked })} />{t.labels.allowLocalAi}</label><label><input type='checkbox' checked={policy.allow_external_share} onChange={e => setPolicy({ ...policy, allow_external_share: e.target.checked })} />{t.labels.allowExternalShare}</label><label><input type='checkbox' checked={policy.require_nda} onChange={e => setPolicy({ ...policy, require_nda: e.target.checked })} />{t.labels.requireNda}</label><label>{t.labels.extRecipients}<textarea value={recipientsText} onChange={e => setRecipientsText(e.target.value)} /></label><label>{t.labels.blockedNote}<input value={policy.blocked_sections_note} onChange={e => setPolicy({ ...policy, blocked_sections_note: e.target.value })} /></label><button className='btn primary' onClick={savePolicyApi}>{t.labels.setPolicy}</button></div>
    <div className='mini'><h3>{t.sections[4]}</h3><p>{t.desc.request}</p><label>{t.labels.action}<select value={action} onChange={e => setAction(e.target.value)}>{Object.keys(t.actions).map(k => <option key={k} value={k}>{t.actions[k]}</option>)}</select></label>{Object.keys(form).map(k => <label key={k}>{t.fields[k][0]}<small>{t.fields[k][1]}</small><input value={(form as any)[k]} onChange={e => setForm({ ...form, [k]: e.target.value })} /></label>)}<button className='btn primary' onClick={submitRequest}>{t.labels.submit}</button></div>
    <div className='mini'><h3>{t.sections[5]}</h3><p>{t.desc.result}</p>{reqResult ? <><div className='result-card'><p><b>{t.labels.decision}：</b>{humanDecision(reqResult.decision)} {zh ? `（${reqResult.decision}）` : ''}</p><p><b>{t.labels.requested}：</b>{levelMap[reqResult.requested_level] || reqResult.requested_level}</p><p><b>{t.labels.access}：</b>{levelMap[reqResult.access_level] || reqResult.access_level}</p><p><b>{t.labels.gaps}：</b>{reqResult.gaps?.length ? reqResult.gaps.map(humanGap).join('、') : t.labels.noGaps}</p><p><b>{t.labels.auditId}：</b>{reqResult.audit_id}</p></div><details className='advanced'><summary>{t.labels.advanced}</summary><pre>{JSON.stringify(reqResult, null, 2)}</pre></details></> : '-'}</div>
    <div className='mini'><h3>{t.sections[6]}</h3><p>{t.desc.audit}</p><label>{t.labels.actorFilter}<input value={auditActorFilter} onChange={e => setAuditActorFilter(e.target.value)} /></label><label>{t.labels.docFilter}<input value={auditDocFilter} onChange={e => setAuditDocFilter(e.target.value)} /></label><div className='btn-row'><button className='btn' onClick={fetchAudit}>{t.labels.load}</button><button className='btn' onClick={verify}>{t.labels.verify}</button><button className='btn' onClick={() => { const blob = new Blob([JSON.stringify(audits, null, 2)], { type: 'application/json' }); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'audit-log.json'; a.click(); }}>{t.labels.exportJson}</button></div>{verifyResult && <p>{verifyResult.valid ? t.labels.verifyOk : `${t.labels.verifyBad}${verifyResult.broken_index}`}</p>}<table><thead><tr>{t.labels.auditCols.map((c)=> <th key={c}>{c}</th>)}</tr></thead><tbody>{audits.slice(0, 20).map((a: any) => <tr key={a.audit_id}><td>{a.audit_id}</td><td>{a.document_id}</td><td>{a.actor}</td><td>{t.actions[a.action] || a.action}</td><td>{levelMap[a.requested_level] || a.requested_level}</td><td>{levelMap[a.decision] || humanDecision(a.decision)}</td><td>{a.gaps?.length ? a.gaps.map(humanGap).join('、') : t.labels.noGaps}</td><td>{a.timestamp}</td><td>{shortHash(a.document_hash)}</td><td>{shortHash(a.entry_hash)}</td></tr>)}</tbody></table></div>
    <div className='mini'><h3>{t.sections[7]}</h3><p>{t.desc.model}</p><div className='btn-row'><button className='btn' onClick={fetchHealth}>{t.labels.load}</button></div><p>{t.labels.modelSource}</p><p>{t.labels.modelStatus}：{health?.local_llm_enabled ? t.labels.modelOn : t.labels.modelOff}</p><p>{t.labels.modelNote}</p></div>
  </div></section>;
}
