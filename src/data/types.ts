import type { DomainId, ServiceId } from './categories.ts';

export interface Choice {
  key: string;
  text: string;
  /** 回答後にその選択肢の下に表示する、正解・不正解の理由 */
  note: string;
}

export interface Reference {
  title: string;
  url: string;
}

export interface Question {
  id: string;
  domain: DomainId;
  services: ServiceId[];
  type: 'single' | 'multiple';
  question: string;
  choices: Choice[];
  answer: string[];
  /** Markdown */
  explanation: string;
  /** Mermaid の記法 */
  diagram?: string;
  references: Reference[];
}
