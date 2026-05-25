import { useMemo, useState } from 'react';
import { evaluateInterpretation } from './lib/iccEngine';
import { InterpretationInput, InterpretationResult, Language } from './lib/types';

type FormFields = Omit<InterpretationInput, 'documentId' | 'action' | 'language'>;

type DemoCase = {
  id: string;
  level: 'T1_TRANSFER_ONLY' | 'T2_MIDDLE_INTERPRETATION' | 'T3_FINAL_DELIVERY' | 'HOLD_REVIEW' | 'VOID_INTERPRETATION';
  docId: string;
  action: string;
  form: FormFields;
  expected: string;
};

const load = <T,>(k: string, d: T): T => JSON.parse(localStorage.getItem(k) || JSON.stringify(d));
const save = (k: string, v: unknown) => localStorage.setItem(k, JSON.stringify(v));

const docs = {
  'bank-policy': { en: 'Bank Risk Policy', zh: '銀行風控文件' },
  'patch-report': { en: 'Security Patch Report', zh: '資安補丁報告' },
  'poc-nda': { en: 'NDA PoC Report', zh: 'NDA PoC 報告' },
  'strategy-memo': { en: 'Internal Strategy Memo', zh: '內部策略文件' }
} as const;

const demoCases: DemoCase[] = [
  {
    id: 'case1', level: 'T1_TRANSFER_ONLY', docId: 'bank-policy', action: 'transfer',
    form: {
      subject: 'Risk team transfers this document to internal compliance reviewer.',
      boundary: 'Internal review only; no external disclosure.',
      cause: 'Compliance needs to confirm document classification.',
      replay: 'Transfer is logged with document hash and recipient.',
      repair: 'If sent to wrong recipient, revoke access and notify owner.',
      responsibility: 'Risk team owner is responsible.'
    },
    expected: 'T1_TRANSFER_ONLY or T2_MIDDLE_INTERPRETATION'
  },
  {
    id: 'case2', level: 'T2_MIDDLE_INTERPRETATION', docId: 'patch-report', action: 'summarize',
    form: {
      subject: 'Security engineer summarizes the patch impact for internal engineering.',
      boundary: 'Internal engineering use only; no exploit details shared externally.',
      cause: 'Engineering needs to understand affected modules.',
      replay: 'Summary links back to patch report and audit log.',
      repair: 'Security owner corrects summary if boundary is wrong.',
      responsibility: 'Security owner and engineering lead share responsibility.'
    },
    expected: 'T2_MIDDLE_INTERPRETATION'
  },
  {
    id: 'case3', level: 'T3_FINAL_DELIVERY', docId: 'poc-nda', action: 'final delivery',
    form: {
      subject: 'Project owner delivers the NDA-approved PoC report to the named partner.',
      boundary: 'Only the NDA-approved version may be delivered; internal rule tables remain excluded.',
      cause: 'Partner has completed NDA review and needs the approved PoC package.',
      replay: 'Delivery record includes version hash, recipient, timestamp, and approval note.',
      repair: 'If misused, project owner triggers takedown, correction, and legal follow-up.',
      responsibility: 'Project owner accepts final delivery responsibility.'
    },
    expected: 'T3_FINAL_DELIVERY'
  },
  {
    id: 'case4', level: 'HOLD_REVIEW', docId: 'strategy-memo', action: 'share external',
    form: {
      subject: 'Team member wants to share a summary with an outside contact.',
      boundary: 'Maybe only high-level content, but the exact approved version is unclear.',
      cause: 'The outside contact may need context.',
      replay: 'Not sure which version will be sent.',
      repair: 'Need manager to confirm.',
      responsibility: 'Responsibility owner is not clearly assigned.'
    },
    expected: 'HOLD_REVIEW'
  },
  {
    id: 'case5', level: 'VOID_INTERPRETATION', docId: 'bank-policy', action: 'share external',
    form: {
      subject: 'Everyone says this is safe to share.',
      boundary: 'No clear boundary.',
      cause: 'Probably useful.',
      replay: 'No replay.',
      repair: 'Not sure.',
      responsibility: 'For reference only.'
    },
    expected: 'VOID_INTERPRETATION'
  }
];

const copy = {
  en: {
    portal: 'Official Portal', repo: 'Download Repo',
    heroSub: 'Protect confidential documents by checking who can transfer, interpret, and finally deliver their meaning.',
    heroSub2: 'Not only who can open a file, but who is qualified to transfer, interpret, and deliver its meaning.',
    why: 'Why',
    why1: 'Traditional ACL / SSO / MFA only answers whether someone can open a file.',
    why2: 'TIRC asks: can they transfer it, interpret it, and deliver it externally?',
    why3: 'This is an interpretation-rights and responsibility-chain layer on top of existing security controls.',
    rights: 'Three Interpretation Rights',
    live: 'Fixed Demo',
    pickCase: 'Pick a demo case',
    run: 'Run Demo',
    expected: 'Expected',
    doc: 'Document', action: 'Action', closure: 'Interpretation Closure Content',
    required: 'Required Level', decision: 'ICC Decision', scores: 'Closure Scores', gaps: 'Gap Tags', explanation: 'Why this result', audit: 'Audit ID',
    advanced: 'Advanced: try your own input',
    how: 'How it works',
    deploy: 'Deployment',
    aTitle: 'GitHub Pages Demo',
    aDesc: 'This page is a static frontend demo using sample data only.',
    bTitle: 'Download and run locally',
    cTitle: 'Local deployment for internal use',
    cDesc: 'For real confidential files, deploy this repository inside your own environment and connect your local or private model. Documents do not need to leave your environment.',
    dTitle: 'Manual GitHub Pages rebuild',
    dDesc: 'GitHub Settings → Pages → Deploy from branch → main / docs',
    footerRole: 'Founder of Semantic Firewall'
  },
  'zh-TW': {
    portal: '官方入口', repo: '下載 Repo',
    heroSub: '透過檢查誰能移交、解釋、最終交付文件意義，保護機密文件。',
    heroSub2: '不只檢查誰能打開文件，而是檢查誰有資格移交、解釋、最終交付文件意義。',
    why: 'Why',
    why1: '傳統 ACL / SSO / MFA 只回答能不能打開文件。',
    why2: 'TIRC 追問：能不能移交？能不能解釋？能不能最終對外交付？',
    why3: '這是加在既有安全框架上的「解釋權與責任鏈」層。',
    rights: '三重解釋權',
    live: '固定示範',
    pickCase: '選擇示範案例',
    run: '執行示範',
    expected: '預期',
    doc: '文件', action: '行為', closure: '解釋閉環內容',
    required: '需求層級', decision: '判定結果', scores: '閉環分數', gaps: '缺口標記', explanation: '判定說明', audit: '審計 ID',
    advanced: '進階：自行輸入測試',
    how: '運作流程',
    deploy: '部署說明',
    aTitle: 'GitHub Pages Demo',
    aDesc: '本頁是純前端靜態示範，只使用範例資料，不處理真實機密文件。',
    bTitle: 'Download and run locally',
    cTitle: 'Local deployment for internal use',
    cDesc: '真正機密文件請企業下載 Repo 後，部署在自己的內部環境，並可接本地模型或私有模型。資料不需要送到外部雲端。',
    dTitle: 'Manual GitHub Pages rebuild',
    dDesc: 'GitHub Settings → Pages → Deploy from branch → main / docs',
    footerRole: '語意防火牆創辦人'
  }
} as const;

const emptyForm: FormFields = { subject: '', boundary: '', cause: '', replay: '', repair: '', responsibility: '' };

export function App() {
  const [lang, setLang] = useState<Language>(load('lang', 'zh-TW'));
  const [selectedCase, setSelectedCase] = useState<DemoCase>(demoCases[0]);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [advancedForm, setAdvancedForm] = useState<FormFields>(load('advanced-form', emptyForm));
  const [result, setResult] = useState<InterpretationResult | null>(null);

  const c = copy[lang];
  const required = useMemo(() => {
    const action = selectedCase.action;
    if (action.includes('final') || action.includes('external')) return 'T3_FINAL_DELIVERY';
    if (action.includes('summarize') || action.includes('ask')) return 'T2_MIDDLE_INTERPRETATION';
    return 'T1_TRANSFER_ONLY';
  }, [selectedCase.action]);

  const runCase = () => {
    const res = evaluateInterpretation({ documentId: selectedCase.docId, action: selectedCase.action, language: lang, ...selectedCase.form });
    setResult(res);
    const logs = load<InterpretationResult[]>('audit', []);
    save('audit', [res, ...logs].slice(0, 20));
  };

  const runAdvanced = () => {
    const res = evaluateInterpretation({ documentId: selectedCase.docId, action: selectedCase.action, language: lang, ...advancedForm });
    setResult(res);
    const logs = load<InterpretationResult[]>('audit', []);
    save('audit', [res, ...logs].slice(0, 20));
  };

  return <div className='page'>
    <header className='hero card'>
      <div className='lang-wrap'><button className='lang-btn' onClick={() => { const n: Language = lang === 'zh-TW' ? 'en' : 'zh-TW'; setLang(n); save('lang', n); }}>{lang === 'zh-TW' ? 'English' : '繁體中文'}</button></div>
      <h1>TIRC Document Gate<br />三重解釋權文件防火牆</h1>
      <p>{c.heroSub}</p><p>{c.heroSub2}</p>
      <div className='btn-row'>
        <a className='btn primary' href='https://hijo790401.github.io/shen-yao-portal/' target='_blank' rel='noreferrer'>{c.portal}</a>
        <a className='btn' href='https://github.com/HIJO790401/TIRC-Document-Gate' target='_blank' rel='noreferrer'>{c.repo}</a>
      </div>
    </header>

    <section className='card'><h2>{c.why}</h2><p>{c.why1}</p><p>{c.why2}</p><p>{c.why3}</p></section>

    <section className='card'><h2>{c.rights}</h2><div className='grid3'>
      <article className='mini'><h3>T1_TRANSFER_ONLY</h3><p>{lang==='zh-TW'?'只允許移交，不允許解釋內容。':'Transfer only. No content interpretation.'}</p></article>
      <article className='mini'><h3>T2_MIDDLE_INTERPRETATION</h3><p>{lang==='zh-TW'?'允許內部摘要、協作、處理，不可對外交付。':'Internal summarize/collaboration allowed. No external final delivery.'}</p></article>
      <article className='mini'><h3>T3_FINAL_DELIVERY</h3><p>{lang==='zh-TW'?'允許最終交付，必須具備完整責任閉環。':'Final delivery allowed only with full responsibility closure.'}</p></article>
    </div><div className='status-row'><span>HOLD_REVIEW</span><small>{lang==='zh-TW'?'需人工審查':'Manual review required'}</small><span>VOID_INTERPRETATION</span><small>{lang==='zh-TW'?'解釋無效':'Interpretation invalid'}</small></div></section>

    <section className='card'>
      <h2>{c.live}</h2>
      <p>{c.pickCase}</p>
      <div className='case-row'>
        {demoCases.map((item, idx) => <button key={item.id} className={`case-btn ${item.id===selectedCase.id?'active':''}`} onClick={() => setSelectedCase(item)}>CASE {idx + 1}｜{item.level}</button>)}
      </div>
      <div className='mini'>
        <p><b>{c.doc}:</b> {docs[selectedCase.docId as keyof typeof docs][lang === 'zh-TW' ? 'zh' : 'en']}</p>
        <p><b>{c.action}:</b> {selectedCase.action}</p>
        <p><b>{c.expected}:</b> {selectedCase.expected}</p>
        <h3>{c.closure}</h3>
        {Object.entries(selectedCase.form).map(([k, v]) => <p key={k}><b>{k}:</b> {v}</p>)}
      </div>
      <button className='btn primary' onClick={runCase}>{c.run}</button>

      {result && <div className='result'>
        <p><b>{c.required}:</b> {required}</p>
        <p><b>{c.decision}:</b> {result.decision} / {result.accessLevel}</p>
        <p><b>{c.scores}:</b> {Object.entries(result.scores).map(([k,v]) => `${k}:${v}`).join(' | ')}</p>
        <p><b>{c.gaps}:</b> {result.gaps.length ? result.gaps.join(', ') : 'none'}</p>
        <p><b>{c.explanation}:</b> {result.explanation}</p>
        <p><b>{c.audit}:</b> {result.auditId}</p>
      </div>}

      <details className='advanced' open={advancedOpen} onToggle={(e) => setAdvancedOpen((e.target as HTMLDetailsElement).open)}>
        <summary>{c.advanced}</summary>
        {(['subject','boundary','cause','replay','repair','responsibility'] as (keyof FormFields)[]).map((k) => (
          <label key={k}>{k}<input value={advancedForm[k]} onChange={(e) => { const next = { ...advancedForm, [k]: e.target.value }; setAdvancedForm(next); save('advanced-form', next); }} /></label>
        ))}
        <button className='btn' onClick={runAdvanced}>{c.run}</button>
      </details>
    </section>

    <section className='card'><h2>{c.how}</h2><p className='flow'>File / 文件 → Existing access control / 既有權限 → TIRC interpretation rights / 三重解釋權 → ICC closure check / 解釋閉環檢查 → T1/T2/T3/HOLD/VOID → Audit log / 審計紀錄</p></section>

    <section className='card'>
      <h2>{c.deploy}</h2>
      <h3>A. {c.aTitle}</h3><p>{c.aDesc}</p>
      <h3>B. {c.bTitle}</h3><pre>git clone https://github.com/HIJO790401/TIRC-Document-Gate.git
cd TIRC-Document-Gate/demo
npm install
npm run dev</pre>
      <h3>C. {c.cTitle}</h3><p>{c.cDesc}</p><pre>docker compose up --build</pre>
      <h3>D. {c.dTitle}</h3><pre>cd demo
npm run build:pages</pre><p>{c.dDesc}</p>
    </section>

    <footer className='card footer'><div className='btn-row'><a className='btn primary' href='https://hijo790401.github.io/shen-yao-portal/' target='_blank' rel='noreferrer'>{c.portal}</a><a className='btn' href='https://github.com/HIJO790401/TIRC-Document-Gate' target='_blank' rel='noreferrer'>GitHub Repo</a></div><p>Wen-Yao Hsu / Shen-Yao 888π</p><p>Founder of Semantic Firewall</p><p>許文耀／沈耀888π</p><p>{c.footerRole}</p></footer>
  </div>;
}
