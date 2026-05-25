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
    sections: ['1) 身份流程','2) 匯入文件','3) 文件列表','4) 三層解釋權設定','5) 送審','6) 判定結果','7) 審計紀錄','8) 本地模型狀態'],
    load: '重新載入', bind: '綁定此文件', actor: '目前操作者', owner: '文件 owner', selectedDoc: '目前綁定文件',
    importText: '匯入文字文件', upload: '上傳檔案', titleInput: '文件標題', contentInput: '文件內容',
    setPolicy: '儲存三層政策', submit: '送審', verify: '驗證 hash-chain', exportJson: '匯出 JSON',
    verifyOk: '驗證成功：hash-chain 完整', verifyBad: '驗證失敗：hash-chain 斷裂',
    modelOn: '已啟用', modelOff: '未啟用',
    action: '送審操作',
    actions: { transfer: '移交', summarize: '摘要', 'ask local AI': '詢問本地模型', export: '匯出', 'share external': '對外分享', 'final delivery': '最終交付' } as Record<string, string>,
    fields: { subject: '主體', boundary: '邊界', cause: '因果', replay: '回放', repair: '修復', responsibility: '責任' } as Record<string,string>,
    decision: '判定', access: '權限層級', requested: '需求層級', gaps: '缺口', auditId: '審計 ID',
    policyFlags: '政策旗標', extRecipients: '允許之外部接收者（每行一位）', blockedNote: '封鎖區段備註',
    auditActor: 'actor 篩選', auditDoc: '文件篩選',
    auditHumanDecision: '判定結果', time: '時間',
    explainModel: '狀態來源：後端 GET /health。此區僅顯示狀態，不在前端修改 env。'
  } : {
    title: 'V1 Local Edition Console',
    sections: ['1) Identity Flow','2) Import Document','3) Document List','4) Three-Level Policy','5) Submit Review','6) Decision Result','7) Audit Log','8) Local Model Status'],
    load: 'Reload', bind: 'Bind this document', actor: 'Current actor', owner: 'Document owner', selectedDoc: 'Bound document',
    importText: 'Import text document', upload: 'Upload file', titleInput: 'Document title', contentInput: 'Document content',
    setPolicy: 'Save policy', submit: 'Submit review', verify: 'Verify hash-chain', exportJson: 'Export JSON',
    verifyOk: 'Verification passed: hash-chain intact', verifyBad: 'Verification failed: hash-chain broken',
    modelOn: 'Enabled', modelOff: 'Disabled',
    action: 'Review action',
    actions: { transfer: 'Transfer', summarize: 'Summarize', 'ask local AI': 'Ask local AI', export: 'Export', 'share external': 'Share external', 'final delivery': 'Final delivery' } as Record<string, string>,
    fields: { subject: 'Subject', boundary: 'Boundary', cause: 'Cause', replay: 'Replay', repair: 'Repair', responsibility: 'Responsibility' } as Record<string,string>,
    decision: 'Decision', access: 'Access level', requested: 'Requested level', gaps: 'Gaps', auditId: 'Audit ID',
    policyFlags: 'Policy flags', extRecipients: 'Allowed external recipients (one per line)', blockedNote: 'Blocked sections note',
    auditActor: 'actor filter', auditDoc: 'document filter',
    auditHumanDecision: 'Decision', time: 'Time',
    explainModel: 'Source: backend GET /health. Status only; env values are not edited in frontend.'
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
  const humanDecision = (d: string) => zh ? (d === 'ALLOW' ? '允許' : d === 'HOLD' ? '需人工審查' : d === 'VOID' ? '解釋無效' : d) : d;
  const humanGap = (g: string) => ({ subject_missing: zh ? '主體未填' : 'Missing subject', boundary_missing: zh ? '邊界未填' : 'Missing boundary', cause_missing: zh ? '因果未填' : 'Missing cause', replay_missing: zh ? '回放未填' : 'Missing replay', repair_missing: zh ? '修復未填' : 'Missing repair', responsibility_missing: zh ? '責任未填' : 'Missing responsibility', t3_closure_incomplete: zh ? '第三層責任閉環不完整' : 'T3 closure incomplete', nda_context_missing: zh ? '缺 NDA 情境' : 'NDA context missing', external_share_not_allowed: zh ? '政策禁止對外分享' : 'External share not allowed', actor_not_allowed_by_policy: zh ? '角色不在政策允許清單' : 'Actor not allowed by policy' } as any)[g] || g;

  return <section className='card'><h2>{t.title}</h2><div className='v1-grid'>
    <div className='mini'><h3>{t.sections[0]}</h3><button className='btn' onClick={async () => { await fetchUsers(); await fetchHealth(); }}>{t.load}</button><label>{t.actor}<select value={actor} onChange={e => setActor(e.target.value)}>{users.map(u => <option key={u.username} value={u.username}>{u.username} ({u.role})</option>)}</select></label><label>{t.owner}<select value={owner} onChange={e => setOwner(e.target.value)}>{users.filter(u => ['owner', 'admin'].includes(u.role)).map(u => <option key={u.username} value={u.username}>{u.username} ({u.role})</option>)}</select></label></div>
    <div className='mini'><h3>{t.sections[1]}</h3><input placeholder={t.titleInput} value={title} onChange={e => setTitle(e.target.value)} /><textarea placeholder={t.contentInput} value={content} onChange={e => setContent(e.target.value)} /><div className='btn-row'><button className='btn' onClick={importText}>{t.importText}</button><label className='btn'>{t.upload}<input type='file' style={{ display: 'none' }} onChange={uploadFile} /></label></div></div>
    <div className='mini'><h3>{t.sections[2]}</h3><button className='btn' onClick={fetchDocs}>{t.load}</button><table><thead><tr><th>ID</th><th>Title</th><th>Owner</th><th>Status</th><th>Policy</th><th></th></tr></thead><tbody>{docs.map(d => <tr key={d.document_id}><td>{d.document_id}</td><td>{d.title}</td><td>{d.owner}</td><td>{d.status}</td><td>{d.policy_status}</td><td><button className='btn' onClick={() => bindDocOwner(d.document_id)}>{t.bind}</button></td></tr>)}</tbody></table><p><b>{t.selectedDoc}：</b>{selectedDoc || '-'}</p></div>
    <div className='mini'><h3>{t.sections[3]}</h3><p>T1</p>{users.map(u => <label key={`t1-${u.username}`}><input type='checkbox' checked={policy.t1_transfer_only_actors.includes(u.username)} onChange={() => toggleActor('t1_transfer_only_actors', u.username)} />{u.username}</label>)}<p>T2</p>{users.map(u => <label key={`t2-${u.username}`}><input type='checkbox' checked={policy.t2_middle_interpretation_actors.includes(u.username)} onChange={() => toggleActor('t2_middle_interpretation_actors', u.username)} />{u.username}</label>)}<p>T3</p>{users.map(u => <label key={`t3-${u.username}`}><input type='checkbox' checked={policy.t3_final_delivery_actors.includes(u.username)} onChange={() => toggleActor('t3_final_delivery_actors', u.username)} />{u.username}</label>)}<p>{t.policyFlags}</p><label><input type='checkbox' checked={policy.allow_local_ai} onChange={e => setPolicy({ ...policy, allow_local_ai: e.target.checked })} />allow_local_ai</label><label><input type='checkbox' checked={policy.allow_external_share} onChange={e => setPolicy({ ...policy, allow_external_share: e.target.checked })} />allow_external_share</label><label><input type='checkbox' checked={policy.require_nda} onChange={e => setPolicy({ ...policy, require_nda: e.target.checked })} />require_nda</label><label>{t.extRecipients}<textarea value={recipientsText} onChange={e => setRecipientsText(e.target.value)} /></label><label>{t.blockedNote}<input value={policy.blocked_sections_note} onChange={e => setPolicy({ ...policy, blocked_sections_note: e.target.value })} /></label><button className='btn primary' onClick={savePolicyApi}>{t.setPolicy}</button></div>
    <div className='mini'><h3>{t.sections[4]}</h3><label>{t.action}<select value={action} onChange={e => setAction(e.target.value)}>{Object.keys(t.actions).map(k => <option key={k} value={k}>{t.actions[k]}</option>)}</select></label>{Object.keys(form).map(k => <label key={k}>{t.fields[k]}<input value={(form as any)[k]} onChange={e => setForm({ ...form, [k]: e.target.value })} /></label>)}<button className='btn primary' onClick={submitRequest}>{t.submit}</button></div>
    <div className='mini'><h3>{t.sections[5]}</h3>{reqResult ? <div className='result-card'><p><b>{t.decision}：</b>{humanDecision(reqResult.decision)}</p><p><b>{t.access}：</b>{reqResult.access_level}</p><p><b>{t.requested}：</b>{reqResult.requested_level}</p><p><b>{t.gaps}：</b>{reqResult.gaps?.length ? reqResult.gaps.map(humanGap).join('、') : '-'}</p><p><b>{t.auditId}：</b>{reqResult.audit_id}</p></div> : '-'}</div>
    <div className='mini'><h3>{t.sections[6]}</h3><label>{t.auditActor}<input value={auditActorFilter} onChange={e => setAuditActorFilter(e.target.value)} /></label><label>{t.auditDoc}<input value={auditDocFilter} onChange={e => setAuditDocFilter(e.target.value)} /></label><div className='btn-row'><button className='btn' onClick={fetchAudit}>{t.load}</button><button className='btn' onClick={verify}>{t.verify}</button><button className='btn' onClick={() => { const blob = new Blob([JSON.stringify(audits, null, 2)], { type: 'application/json' }); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'audit-log.json'; a.click(); }}>{t.exportJson}</button></div>{verifyResult && <p>{verifyResult.valid ? t.verifyOk : t.verifyBad}</p>}<table><thead><tr><th>audit_id</th><th>doc</th><th>actor</th><th>action</th><th>{t.auditHumanDecision}</th><th>{t.time}</th></tr></thead><tbody>{audits.slice(0, 20).map((a: any) => <tr key={a.audit_id}><td>{a.audit_id}</td><td>{a.document_id}</td><td>{a.actor}</td><td>{t.actions[a.action] || a.action}</td><td>{humanDecision(a.decision)}</td><td>{a.timestamp}</td></tr>)}</tbody></table></div>
    <div className='mini'><h3>{t.sections[7]}</h3><div className='btn-row'><button className='btn' onClick={fetchHealth}>{t.load}</button></div><p>API: {api}</p><p>LOCAL_LLM_ENABLED: {health?.local_llm_enabled ? t.modelOn : t.modelOff}</p><p>{t.explainModel}</p></div>
  </div></section>;
}
