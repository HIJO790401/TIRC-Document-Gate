import { useMemo, useState } from 'react';
import { actions, documents } from './data/sampleData';
import { evaluateInterpretation } from './lib/iccEngine';
import { InterpretationInput, InterpretationResult, Language } from './lib/types';

type FormFields = Omit<InterpretationInput, 'documentId' | 'action' | 'language'>;

const load = <T,>(k: string, d: T): T => JSON.parse(localStorage.getItem(k) || JSON.stringify(d));
const save = (k: string, v: unknown) => localStorage.setItem(k, JSON.stringify(v));

const copy = {
  en: {
    heroSub: 'Protect confidential documents by checking who can transfer, interpret, and finally deliver their meaning.',
    heroSub2: 'Not only who can open a file, but who is qualified to transfer, interpret, and deliver its meaning with accountability.',
    portal: 'Official Portal', repo: 'Download Repo',
    whyTitle: 'Why TIRC',
    why1: 'Traditional ACL / SSO / MFA answers only one question: can this person open the file?',
    why2: 'TIRC asks more: can this person transfer it? interpret it? deliver it externally?',
    why3: 'It is an interpretation-rights and responsibility-chain layer on top of existing security controls.',
    rightsTitle: 'Three Interpretation Rights',
    hold: 'HOLD_REVIEW', holdDesc: 'Manual review required before external impact.',
    void: 'VOID_INTERPRETATION', voidDesc: 'Interpretation is invalid and must not be delivered.',
    liveTitle: 'Live Demo', doc: 'Sample document', action: 'Action', form: 'Interpretation Closure Form', eval: 'Evaluate Interpretation Closure',
    required: 'Required Level', decision: 'Decision', scores: 'Scores', gaps: 'Gaps', explanation: 'Explanation', auditId: 'Audit ID',
    howTitle: 'How it works',
    localTitle: 'Local Deployment',
    local1: 'This demo is static and safe for GitHub Pages. For real confidential files, download the repo and deploy inside your own environment.',
    local2: '本頁只是前端示範。真正機密文件請下載 Repo，部署在自己的內部環境。',
    rebuild: 'To rebuild GitHub Pages docs:',
    footerRole: 'Founder of Semantic Firewall'
  },
  'zh-TW': {
    heroSub: '透過檢查誰能移交、解釋、最終交付文件意義，保護機密文件。',
    heroSub2: '不只檢查誰能打開文件，而是檢查誰有資格移交、解釋、最終交付文件意義。',
    portal: '官方入口', repo: '下載 Repo',
    whyTitle: '為什麼需要 TIRC',
    why1: '傳統 ACL / SSO / MFA 只回答一件事：這個人能不能打開文件。',
    why2: 'TIRC 會再追問：能不能移交？能不能解釋？能不能對外交付？',
    why3: '它是加在既有安全框架上的「解釋權與責任鏈」層。',
    rightsTitle: '三重解釋權',
    hold: 'HOLD_REVIEW', holdDesc: '涉及外部影響前，必須先人工審查。',
    void: 'VOID_INTERPRETATION', voidDesc: '解釋無效，不得交付。',
    liveTitle: '互動示範', doc: '選擇範例文件', action: '選擇行為', form: 'Interpretation Closure Form', eval: '評估解釋閉環',
    required: '需求層級', decision: '判定結果', scores: '分數', gaps: '缺口', explanation: '說明', auditId: '審計 ID',
    howTitle: '運作流程',
    localTitle: '本地部署',
    local1: 'This demo is static and safe for GitHub Pages. For real confidential files, download the repo and deploy inside your own environment.',
    local2: '本頁只是前端示範。真正機密文件請下載 Repo，部署在自己的內部環境。',
    rebuild: '如果要重新產生 GitHub Pages docs：',
    footerRole: '語意防火牆創辦人'
  }
} as const;

export function App() {
  const [lang, setLang] = useState<Language>(load('lang', 'zh-TW'));
  const [docId, setDocId] = useState(documents[0].id);
  const [action, setAction] = useState(actions[0]);
  const [form, setForm] = useState<FormFields>(load('closure-form', { subject: '', boundary: '', cause: '', replay: '', repair: '', responsibility: '' }));
  const [result, setResult] = useState<InterpretationResult | null>(null);

  const c = copy[lang];
  const required = useMemo(() => action.includes('final') || action.includes('external') ? 'T3_FINAL_DELIVERY' : action.includes('summarize') || action.includes('ask') ? 'T2_MIDDLE_INTERPRETATION' : 'T1_TRANSFER_ONLY', [action]);

  const update = (k: keyof FormFields, v: string) => {
    const next = { ...form, [k]: v };
    setForm(next);
    save('closure-form', next);
  };

  const evaluate = () => {
    const res = evaluateInterpretation({ documentId: docId, action, language: lang, ...form });
    setResult(res);
    const logs = load<InterpretationResult[]>('audit', []);
    save('audit', [res, ...logs].slice(0, 20));
  };

  return <div className='page'>
    <header className='hero card'>
      <div className='lang-wrap'><button className='lang-btn' onClick={() => { const n: Language = lang === 'zh-TW' ? 'en' : 'zh-TW'; setLang(n); save('lang', n); }}>{lang === 'zh-TW' ? 'English' : '繁體中文'}</button></div>
      <h1>TIRC Document Gate<br />三重解釋權文件防火牆</h1>
      <p>{c.heroSub}</p>
      <p>{c.heroSub2}</p>
      <div className='btn-row'>
        <a className='btn primary' href='https://hijo790401.github.io/shen-yao-portal/' target='_blank' rel='noreferrer'>{c.portal}</a>
        <a className='btn' href='https://github.com/HIJO790401/TIRC-Document-Gate' target='_blank' rel='noreferrer'>{c.repo}</a>
      </div>
    </header>

    <section className='card'><h2>{c.whyTitle}</h2><p>{c.why1}</p><p>{c.why2}</p><p>{c.why3}</p></section>

    <section className='card'><h2>{c.rightsTitle}</h2><div className='grid3'>
      <article className='mini'><h3>T1_TRANSFER_ONLY</h3><p>{lang==='zh-TW'?'只允許移交，不允許解釋內容。':'Transfer only. No content interpretation.'}</p></article>
      <article className='mini'><h3>T2_MIDDLE_INTERPRETATION</h3><p>{lang==='zh-TW'?'允許內部摘要、協作、處理，不可對外交付。':'Internal summarize/collaboration allowed. No external final delivery.'}</p></article>
      <article className='mini'><h3>T3_FINAL_DELIVERY</h3><p>{lang==='zh-TW'?'允許最終交付，必須具備完整責任閉環。':'Final delivery allowed only with full responsibility closure.'}</p></article>
    </div><div className='status-row'><span>{c.hold}</span><small>{c.holdDesc}</small><span>{c.void}</span><small>{c.voidDesc}</small></div></section>

    <section className='card'><h2>{c.liveTitle}</h2><div className='demo-grid'>
      <div><label>{c.doc}</label><select value={docId} onChange={e=>setDocId(e.target.value)}>{documents.map(d=><option key={d.id} value={d.id}>{lang==='zh-TW'?d.zh:d.en}</option>)}</select></div>
      <div><label>{c.action}</label><select value={action} onChange={e=>setAction(e.target.value)}>{actions.map(a=><option key={a}>{a}</option>)}</select></div>
      <div><h3>{c.form}</h3>{(['subject','boundary','cause','replay','repair','responsibility'] as (keyof FormFields)[]).map(k=><label key={k}>{k}<input value={form[k]} onChange={e=>update(k,e.target.value)} /></label>)}</div>
    </div><button className='btn primary' onClick={evaluate}>{c.eval}</button>
    {result && <div className='result'>
      <p><b>{c.required}:</b> {required}</p><p><b>{c.decision}:</b> {result.decision} / {result.accessLevel}</p>
      <p><b>{c.scores}:</b> {Object.entries(result.scores).map(([k,v])=>`${k}:${v}`).join(' | ')}</p>
      <p><b>{c.gaps}:</b> {result.gaps.length?result.gaps.join(', '):'None'}</p>
      <p><b>{c.explanation}:</b> {result.explanation}</p><p><b>{c.auditId}:</b> {result.auditId}</p>
    </div>}</section>

    <section className='card'><h2>{c.howTitle}</h2><p className='flow'>File / 文件 → Existing access control / 既有權限 → TIRC interpretation rights / 三重解釋權 → ICC closure check / 解釋閉環檢查 → T1/T2/T3/HOLD/VOID → Audit log / 審計紀錄</p></section>

    <section className='card'><h2>{c.localTitle}</h2><p>{c.local1}</p><p>{c.local2}</p><pre>git clone https://github.com/HIJO790401/TIRC-Document-Gate.git
cd TIRC-Document-Gate
cd demo
npm install
npm run dev</pre><p>{c.rebuild}</p><pre>npm run build:pages</pre><p>{lang==='zh-TW'?'本地部署：':'Local deployment:'}</p><pre>docker compose up --build</pre></section>

    <footer className='card footer'><div className='btn-row'><a className='btn primary' href='https://hijo790401.github.io/shen-yao-portal/' target='_blank' rel='noreferrer'>{c.portal}</a><a className='btn' href='https://github.com/HIJO790401/TIRC-Document-Gate' target='_blank' rel='noreferrer'>GitHub Repo</a></div><p>Wen-Yao Hsu / Shen-Yao 888π</p><p>{lang==='zh-TW'?'許文耀／沈耀888π':'Founder of Semantic Firewall'}</p><p>{c.footerRole}</p></footer>
  </div>;
}
