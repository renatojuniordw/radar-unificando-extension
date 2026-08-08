/** Mensagens trocadas entre side panel, content script e o service worker. */

export type ExtensionMessage =
  | { type: 'ANALYZE'; jobDescription: string }
  | { type: 'FEEDBACK'; rating: boolean; comment?: string }
  | { type: 'GET_STATUS' }
  | { type: 'CONNECT' }
  | { type: 'DISCONNECT' }
  | { type: 'GET_PAGE_TEXT' } // side panel → background → content
  | { type: 'PAGE_CHANGED' }; // content → side panel