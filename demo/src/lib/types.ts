export type Language = 'zh-TW' | 'en';
export type AccessLevel = 'T1_TRANSFER_ONLY' | 'T2_MIDDLE_INTERPRETATION' | 'T3_FINAL_DELIVERY' | 'HOLD_REVIEW' | 'VOID_INTERPRETATION';
export interface InterpretationInput {
  documentId: string;
  action: string;
  subject: string;
  boundary: string;
  cause: string;
  replay: string;
  repair: string;
  responsibility: string;
  language: Language;
}
export interface InterpretationResult {
  decision: 'ALLOW' | 'HOLD' | 'VOID';
  accessLevel: AccessLevel;
  scores: Record<string, number>;
  gaps: string[];
  explanation: string;
  auditId: string;
  timestamp: string;
}
