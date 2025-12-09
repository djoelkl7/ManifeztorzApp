export enum AppMode {
  DASHBOARD = 'DASHBOARD',
  LIVE_CONVERSATION = 'LIVE_CONVERSATION',
  SMART_SEARCH = 'SMART_SEARCH',
  FAST_CHAT = 'FAST_CHAT',
  TRANSCRIBER = 'TRANSCRIBER',
  TEXT_TO_SPEECH = 'TEXT_TO_SPEECH',
  IMAGE_EDITOR = 'IMAGE_EDITOR'
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
  isThinking?: boolean;
}

export interface SearchResult {
  text: string;
  sources: Array<{
    title?: string;
    uri: string;
  }>;
}

export interface VoiceOption {
  name: string;
  value: string;
}

export const VOICE_OPTIONS: VoiceOption[] = [
  { name: 'Kore', value: 'Kore' },
  { name: 'Puck', value: 'Puck' },
  { name: 'Charon', value: 'Charon' },
  { name: 'Fenrir', value: 'Fenrir' },
  { name: 'Zephyr', value: 'Zephyr' },
];