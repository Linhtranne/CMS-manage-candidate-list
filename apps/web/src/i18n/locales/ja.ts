import type { DeepMessageShape } from '../types';
import type { vi } from './vi';

export const ja = {
  common: {
    brand: {
      name: 'Candidate Supply',
      cmsName: 'Candidate Supply CMS'
    },
    metadata: {
      description: '日本向け人材採用・供給を管理する社内CMS'
    },
    a11y: {
      skipToContent: 'メインコンテンツへ移動'
    },
    actions: {
      save: '保存',
      cancel: 'キャンセル',
      close: '閉じる',
      retry: '再試行',
      addCandidate: '候補者を追加',
      logout: 'ログアウト'
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
    },
    user: {
      internalStaff: '社内スタッフ'
    },
    search: {
      label: 'CMS全体を検索',
      placeholder: '候補者、取引先、求人票を検索',
      results: '検索結果',
      loading: '検索中',
      empty: '該当する結果がありません'
    },
    notifications: {
      title: '通知',
      hasNew: '新しい通知があります',
      list: '通知一覧',
      markRead: '既読にする',
      tones: {
        danger: '要確認',
        warning: '期限間近',
        info: '新着'
      },
      items: {
        scheduleTitle: '候補者の日程確認が必要です',
        scheduleDetail: '{name} · 15分以内',
        emailTitle: '未紐付けの新着メール',
        emailDetail: '共有メールボックスに1件 · 本日',
        journeyTitle: '供給プロセスのマイルストーンが期限間近です',
        journeyDetail: '{name} · 明日'
      }
    }
  },
  auth: {
    login: {
      title: 'CMSにログイン',
      staffOnly: '社内スタッフ専用です。',
      email: '業務用メール',
      password: 'パスワード',
      submitting: 'ログイン中…',
      submit: 'ログイン',
      connectionError: 'システムに接続できません。もう一度お試しください。'
    },
    sessionExpired: {
      title: 'セッションの有効期限が切れました',
      description: '候補者管理を続けるには再度ログインしてください。',
      loginAgain: '再ログイン'
    },
    forbidden: {
      title: 'アクセス権限がありません',
      description: '追加の権限が必要な場合はシステム管理者にお問い合わせください。',
      backToWork: 'マイタスクへ戻る'
    },
    checkingSession: 'セッションを確認しています',
    sessionUnavailable: 'セッションを利用できません。再ログインするか、もう一度お試しください。'
  },
  navigation: {
    ariaLabel: 'CMSナビゲーション',
    internalCms: '社内CMS',
    openMobile: 'ナビゲーションを開く',
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
