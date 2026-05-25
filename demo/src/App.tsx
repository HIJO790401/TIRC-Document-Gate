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

  const required = useMemo(() => {
    const action = selectedCase.actionKey;
    if (action.includes('final') || action.includes('external')) return 'T3_FINAL_DELIVERY';
    if (action.includes('summarize') || action.includes('ask')) return 'T2_MIDDLE_INTERPRETATION';
    return 'T1_TRANSFER_ONLY';
  }, [selectedCase.actionKey]);

  const runDemo = (form: FormFields) => {
    const res = evaluateInterpretation({ documentId: selectedCase.docId, action: selectedCase.actionKey, language: lang, ...form });
    setResult(res);
    const logs = load<InterpretationResult[]>('audit', []);
    save('audit', [res, ...logs].slice(0, 20));
  };

  return <div className='page'>
    <header className='hero card'>
      <div className='lang-wrap'><button className='lang-btn' onClick={() => { const n: Language = lang === 'zh-TW' ? 'en' : 'zh-TW'; setLang(n); save('lang', n); }}>{c.langSwitch}</button></div>
      <h1>{c.heroTitleEn}<br />{c.heroTitleZh}</h1>
      <p>{c.heroSubtitle}</p><p>{c.heroNote}</p>
      <div className='btn-row'><a className='btn primary' href='https://hijo790401.github.io/shen-yao-portal/' target='_blank' rel='noreferrer'>{c.portal}</a><a className='btn' href='https://github.com/HIJO790401/TIRC-Document-Gate' target='_blank' rel='noreferrer'>{c.repo}</a></div>
    </header>

    <section className='card'><h2>{c.whyTitle}</h2><p>{c.why1}</p><p>{c.why2}</p><p>{c.why3}</p></section>

    <section className='card'><h2>{c.rightsTitle}</h2><div className='grid3'>
      <article className='mini'><h3>{c.lv1}</h3><p><b>Code:</b> T1_TRANSFER_ONLY</p><p>{c.lv1d}</p></article>
      <article className='mini'><h3>{c.lv2}</h3><p><b>Code:</b> T2_MIDDLE_INTERPRETATION</p><p>{c.lv2d}</p></article>
      <article className='mini'><h3>{c.lv3}</h3><p><b>Code:</b> T3_FINAL_DELIVERY</p><p>{c.lv3d}</p></article>
    </div><div className='status-row'><span>{c.hold}</span><small>(HOLD_REVIEW)</small><span>{c.void}</span><small>(VOID_INTERPRETATION)</small></div></section>

    <section className='card'>
      <h2>{c.fixedDemo}</h2><p>{c.selectCase}</p>
      <div className='case-grid'>{demoCases.map((item, i) => <button key={item.id} className={`case-btn ${item.id === selectedCase.id ? 'active' : ''}`} onClick={() => setSelectedCase(item)}>{(lang==='zh-TW'?item.zh.btn:item.en.btn) || c.caseNames[i]}</button>)}</div>
      <div className='mini'>
        <p><b>{c.doc}：</b>{active.doc}</p><p><b>{c.action}：</b>{active.action}</p><p><b>{c.expected}：</b>{active.expected}</p><h3>{c.closureTitle}</h3>
        {(Object.keys(active.form) as FieldKey[]).map((k)=><p key={k}><b>{c.fieldLabels[k]}：</b>{active.form[k]}</p>)}
      </div>
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

    <footer className='card footer'><div className='btn-row'><a className='btn primary' href='https://hijo790401.github.io/shen-yao-portal/' target='_blank' rel='noreferrer'>{c.portal}</a><a className='btn' href='https://github.com/HIJO790401/TIRC-Document-Gate' target='_blank' rel='noreferrer'>{c.footerRepo}</a></div><p>Wen-Yao Hsu / Shen-Yao 888π</p><p>許文耀／沈耀888π</p><p>{c.founder}</p></footer>
  </div>;
}
