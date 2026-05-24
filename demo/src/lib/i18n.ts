import { Language } from './types';

export const texts = {
  appName: { 'zh-TW': '三重解釋權文件防火牆', en: 'TIRC Document Gate' },
  tagline: {
    'zh-TW': '不只問能否讀取，而是是否有資格移交、解釋與最終交付意義。',
    en: 'Not only who can open a file, but who can transfer, interpret, and finally deliver its meaning.'
  },
  nav: {
    home: { 'zh-TW': '首頁', en: 'Home' },
    concept: { 'zh-TW': '概念', en: 'Concept' },
    demo: { 'zh-TW': '示範流程', en: 'Demo Flow' },
    policy: { 'zh-TW': '策略設定器', en: 'Policy Builder' },
    audit: { 'zh-TW': '審計紀錄', en: 'Audit Log' },
    local: { 'zh-TW': '本地部署', en: 'Local Deployment' }
  }
} as const;

export const t = (obj: Record<Language, string>, lang: Language) => obj[lang];
