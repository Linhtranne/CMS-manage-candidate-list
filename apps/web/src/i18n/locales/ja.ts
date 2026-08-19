import type { DeepMessageShape } from '../types';
import type { vi } from './vi';

export const ja = {
  common: {
    actions: {
      save: '保存',
      cancel: 'キャンセル',
      close: '閉じる',
      retry: '再試行',
      addCandidate: '候補者を追加'
    },
    greeting: '{name}さん、こんにちは',
    files: {
      one: '{count} 件のファイル',
      other: '{count} 件のファイル'
    },
    fallbackOnly: 'フォールバック内容',
    states: {
      loading: 'データを読み込んでいます',
      noResults: '該当する結果がありません'
    },
    language: {
      label: '言語'
    }
  },
  auth: {},
  navigation: {
    work: 'マイタスク',
    clients: '取引先',
    orders: '求人票',
    candidates: '候補者',
    applications: '応募・面接',
    journeys: '人材供給プロセス',
    mailbox: '共有メールボックス',
    reports: 'レポート',
    admin: '管理'
  },
  validation: {},
  work: {},
  clients: {},
  orders: {},
  candidates: {},
  applications: {},
  journeys: {},
  mailbox: {},
  reports: {},
  admin: {}
} as const satisfies DeepMessageShape<typeof vi>;
