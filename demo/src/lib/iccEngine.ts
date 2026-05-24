import { InterpretationInput, InterpretationResult } from './types';

const vague = [/可能|應該|大概|大家都說|系統判定|平台說|先這樣|之後再說|看情況|不確定|僅供參考/, /maybe|probably|generally|everyone says|system says|later|depends|not sure|for reference only/i];
const scoreField = (v: string) => {
  if (!v?.trim()) return 0;
  if (v.trim().length < 8) return 30;
  if (vague.some((r) => r.test(v))) return 40;
  return 100;
};

export function evaluateInterpretation(input: InterpretationInput): InterpretationResult {
  const scores = {
    subject: scoreField(input.subject), boundary: scoreField(input.boundary), cause: scoreField(input.cause),
    replay: scoreField(input.replay), repair: scoreField(input.repair), responsibility: scoreField(input.responsibility)
  };
  const gaps: string[] = [];
  Object.entries(scores).forEach(([k, v]) => { if (v < 60) gaps.push(`${k}_weak`); if (v === 0) gaps.push(`${k}_missing`); });
  let accessLevel: InterpretationResult['accessLevel'] = 'T2_MIDDLE_INTERPRETATION';
  let decision: InterpretationResult['decision'] = 'ALLOW';
  if (scores.subject === 0 || (scores.subject < 60 && scores.responsibility === 0) || scores.boundary === 0 || Object.values(scores).filter((s) => s < 60).length >= 4) { accessLevel = 'VOID_INTERPRETATION'; decision = 'VOID'; }
  else if (input.action.match(/share external|final delivery/i) && (scores.responsibility < 60 || scores.repair < 60)) { accessLevel = 'HOLD_REVIEW'; decision = 'HOLD'; }
  else if (scores.boundary === 0) { accessLevel = 'T1_TRANSFER_ONLY'; decision = 'HOLD'; }
  else if (scores.responsibility < 60 || scores.replay < 60) { accessLevel = 'T2_MIDDLE_INTERPRETATION'; decision = 'HOLD'; }
  else if (Object.values(scores).every((s) => s >= 60)) { accessLevel = 'T3_FINAL_DELIVERY'; }
  else if (Object.values(scores).filter((s) => s >= 60).length <= 2) { accessLevel = 'T1_TRANSFER_ONLY'; }

  const timestamp = new Date().toISOString();
  return { decision, accessLevel, scores, gaps, explanation: `${decision} by deterministic ICC closure scoring.`, auditId: `AUD-${Date.now()}`, timestamp };
}
