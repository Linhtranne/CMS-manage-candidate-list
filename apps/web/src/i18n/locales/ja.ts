import type { DeepMessageShape } from '../types';
import { vi } from './vi';

const jaBase = {
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
      logout: 'ログアウト',
      continueEditing: '編集を続ける',
      discardChanges: '変更を破棄'
    },
    greeting: '{name}さん、こんにちは',
    files: {
      one: '{count} 件のファイル',
      other: '{count} 件のファイル'
    },
    fallbackOnly: 'フォールバック内容',
    states: {
      loading: 'データを読み込んでいます',
      noResults: '該当する結果がありません',
      emptyTitle: 'データがありません',
      emptyDescription: 'フィルターを調整するか、新しいレコードを追加してください。'
    },
    errors: {
      loadFailed: 'データを読み込めません。もう一度お試しください。'
    },
    dialog: {
      closeLabel: '{title}を閉じる',
      unsavedTitle: '未保存の変更があります',
      unsavedMessage: '未保存の変更があります。このウィンドウを閉じて変更を破棄しますか？'
    },
    savedViews: {
      name: 'ビュー名',
      saved: '保存済みビュー',
      chooseSaved: '保存済みビューを選択',
      saveView: 'ビューを保存',
      scope: 'ビューの共有範囲',
      private: '個人用',
      team: 'チーム共有',
      saving: '保存中',
      savedConfirmation: 'ビューを保存しました',
      nameRequired: '保存する前にビュー名を入力してください。'
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
  validation: { departurePlan: '出国計画情報（任意）', departureDate: '出国予定日', airport: '空港 / 出発地点', airportAria: '空港または出発地点', note: 'メモ', noteAria: '出国メモ', runtime: { mswError: 'モック環境を初期化できません。', mswLoadError: '作業環境を初期化できません。ページを再読み込みしてください。', mswLoading: '作業環境を初期化しています', applicationLoadError: '応募プロフィールを読み込めません。', orderLoadError: '求人票プロフィールを読み込めません。', replyConflict: '新しい返信があります。送信前にメールスレッドを再読み込みしてください。' }, import: { missingFields: '{fields} が不足しています' }, interview: { scheduledAt: '面接日時を選択してください', timeZone: 'タイムゾーンを選択してください', participants: '参加者を1名以上選択してください', invalidUrl: '面接室 URL が正しくありません', location: '面接場所を入力してください', rescheduleReason: '再調整の理由を入力してください' }, interviewResult: { feedback: '面接コメントを入力してください', feedbackTooLong: 'コメントは5,000文字以内で入力してください', recordedAt: '記録日時がありません' }, journey: { waiveReason: '免除理由を入力してください', approver: '承認者を選択してください' }, orders: { closeReason: '求人票を終了する理由を選択してください', candidateRequired: '候補者を1名以上選択してください' } },
  work: {
    eyebrow: '対応キュー', title: 'マイタスク', description: '期限、SLA、次の業務ステップに基づいて対応を優先します。', sourceTypes: { interviewResultDue: '面接結果が未入力', interviewScheduled: '本日の面接', candidateEmailReply: '候補者がメールに返信', milestoneBlocked: '供給マイルストーンがブロック中' }, openCandidates: '候補者一覧を開く', searchLabel: '業務を検索', searchPlaceholder: '候補者、取引先、業務名', viewLabel: 'ビュー', viewAria: '業務ビュー',
    views: { actionable: '対応が必要', today: '今日', sevenDays: '7日以内', overdue: '期限超過', waitingReply: '返信待ち', assignedToMe: '自分の担当', following: 'フォロー中', team: 'チーム' },
    errors: { queue: '対応キューを読み込めません。', detail: '業務詳細を読み込めません。', create: '業務を作成できません。' }, empty: '該当する業務がありません',
    summary: { aria: '業務指標', overdue: '期限超過', interviewsToday: '本日の面接', waitingReply: '返信待ち', unresolvedEmail: '未処理メール', journeyRisk: '供給プロセスのリスク' },
    table: { priority: '優先度', dueAt: '期限', task: '業務', candidate: '候補者', order: '求人票', client: '取引先', status: 'ステータス', assignee: '担当者', lastActivity: '最終活動', priorities: { urgent: '緊急', high: '高', normal: '通常' }, statuses: { todo: '未着手', inProgress: '対応中', waitingReply: '返信待ち', done: '完了' } },
    drawer: { title: '業務詳細', source: '作成元 / ルール', sourceCode: '作成元コード:', candidate: '候補者', order: '求人票', dueAt: '期限', assignee: '担当者', recentActivity: '最近の活動', noActivity: '活動はありません', conflict: 'データが更新されました', reload: '再読み込み', completed: '業務を完了しました', waiting: '対応待ち', version: 'バージョン' },
    actions: { complete: '完了にする', email: 'メールを送信', changeDue: '期限を変更', changeAssignee: '担当者を変更' },
    create: { title: '候補者の業務を作成', description: '業務は社内キューに表示され、現在のプロフィールに紐付けられます。', closeConfirmation: '未保存の変更があります。このフォームを閉じますか？', titleLabel: '業務名', titlePlaceholder: '例：日本語資格を追加', priority: '優先度', dueAt: '期限', notes: 'メモ', create: '業務を作成', creating: '作成中…', linkedRecord: '求人票または取引先が未紐付けです' },
    edit: { dueTitle: '期限を変更', assigneeTitle: '担当者を変更', dueDescription: '期限を更新し、新しい業務バージョンを記録します。', assigneeDescription: 'この業務を担当する社内スタッフを選択してください。', dueLabel: '新しい期限', assigneeLabel: '新しい担当者', saveChanges: '変更を保存' }
  },
  clients: { ...vi.clients, list: { ...vi.clients.list, eyebrow: '組織ディレクトリ', title: '取引先', description: '売上CRMに広げず、受け入れ組織の業務コンテキストを管理します。', add: '取引先を追加', searchLabel: '取引先を検索', searchPlaceholder: '名称、コード、業種', statusLabel: 'ステータス', all: 'すべて', active: '協業中', prospect: '見込み', paused: '停止', loadError: '取引先一覧を読み込めません。', empty: '該当する取引先がありません' }, table: { ...vi.clients.table, code: '取引先コード', name: '組織名', type: '組織種別', industry: '業種', owner: '社内担当者', activeOrders: '募集中の求人票', target: '募集人数', passed: '合格', status: 'ステータス', lastActivity: '最終活動', activeStatus: '協業中', prospectStatus: '見込み' }, drawer: { ...vi.clients.drawer, title: '取引先プロフィール', loading: '取引先を読み込んでいます', loadError: '取引先詳細を読み込めません。' }, form: { ...vi.clients.form, createTitle: '取引先を追加', createDescription: '求人票で使う多業種の受け入れコンテキストを作成します。', editTitle: '取引先を編集', editDescription: '受け入れ情報を更新し、変更履歴を保持します。', name: '取引先名', nameAria: '取引先名', organizationType: '組織種別', organizationTypeAria: '組織種別', receiver: '受け入れ企業', supervisor: '監督団体 / 組織', recruiter: '採用パートナー', training: '教育機関', industry: '主な業種', industryAria: '主な業種', chooseIndustry: '業種を選択', it: '情報技術', nursing: '介護・看護', mechanical: '機械', manufacturing: '製造', hospitality: '宿泊サービス', region: '日本の地域', regionAria: '日本の地域', regionPlaceholder: '東京、大阪…', status: 'ステータス', statusAria: '取引先ステータス', prospect: '見込み', active: '協業中', paused: '停止', inactive: '終了', contact: '主担当者', contactAria: '主担当者', notes: '運用メモ', notesAria: '運用メモ', cancel: 'キャンセル', close: '閉じる', save: '取引先を保存', saveChanges: '変更を保存', saving: '保存中…', created: '取引先 {code} を作成しました。', requiredName: '取引先名を入力してください。', requiredIndustry: '少なくとも 1 つの業種を選択してください。', requiredRegion: '受け入れ地域を入力してください。', requiredAll: '名前、業種、地域を入力してください。' }, profile: { ...vi.clients.profile, back: '一覧に戻る', title: '取引先プロフィール', organization: '組織情報', code: '取引先コード', type: '組織種別', industry: '業種', region: '地域', owner: '社内担当者', contact: '主連絡先', notUpdated: '未更新', supply: '供給概要', activeOrders: '募集中の求人票', target: '募集人数', passed: '合格', lastActivity: '最終活動', followUp: 'フォローアップ', followUpActive: 'この取引先の募集中求人票 {count} 件を引き続き確認します。', noActiveOrders: '募集中の求人票はありません。', notes: '運用メモ', noNotes: 'この取引先のメモはありません。', edit: '編集', tracking: '追跡中', demand: '供給需要', totalPassed: '合格合計', rate: '合格率', comparedTarget: '募集人数比', tabsLabel: '取引先プロフィールのセクション', tabs: { overview: '概要', orders: '求人票', candidates: '供給候補者', contacts: '連絡先', files: 'ファイルとメモ', history: '変更履歴' }, ordersActive: '募集中の求人票', filteredOrders: '下記はこの取引先で絞り込んだ一覧です。', loadingOrders: '求人票を読み込んでいます', deadline: '期限 {date}', recruiting: '募集中', passedSupplied: '{passed} 合格 · {supplied} 供給済み', noOrders: '求人票はありません', noOrdersDescription: '該当する求人票はありません。', candidatesPassed: 'この取引先で合格した候補者', applicationsSource: 'この取引先の応募データから取得しています。', loadingCandidates: '候補者を読み込んでいます', noCandidates: '候補者はありません', noCandidatesDescription: '該当する応募はありません。', candidate: '候補者', order: '求人票', status: 'ステータス', updated: '更新', primaryContact: '主連絡先', channel: '連絡チャネル', channelAria: '連絡チャネル', channelPlaceholder: 'メール、電話、LINE…', channelHint: 'デモでは連絡チャネルをローカル保存し、バックエンドでは取引先単位で監査します。', filesTitle: 'メモとファイル', addFile: 'ファイルを追加', addFileAria: '取引先ファイルを追加', pendingFile: 'ファイル保存待ち', noFiles: '添付ファイルはありません。契約、要件、連絡資料を追加してください。', recentActivity: '最近の活動', updatedClient: '取引先情報を更新', noActivityDescription: '活動の詳細はありません。', noFileNote: 'メモはありません。', tabStatus: '取引先プロフィールのセクション' } },
  orders: { ...vi.orders, list: { ...vi.orders.list, eyebrow: '採用需要', title: '求人票', description: '業種ごとの募集人数、応募パイプライン、供給進捗を追跡します。', add: '求人票を作成', searchLabel: '求人票を検索', searchPlaceholder: 'コード、職種、取引先', industryLabel: '業種', allIndustries: 'すべての業種', loadError: '求人票一覧を読み込めません。', empty: '該当する求人票がありません' }, table: { ...vi.orders.table, code: '求人票コード', position: '職種', client: '取引先', industry: '業種', location: '勤務地', target: '募集人数', active: '対応中', passed: '合格', supplied: '供給済み', deadline: '募集期限', health: '求人票の状態', status: 'ステータス', underTarget: '候補者不足', interviewDelay: '面接遅延', expiring: '期限間近', recruiting: '募集中' }, drawer: { ...vi.orders.drawer, title: '求人票プロフィール', loading: '求人票を読み込んでいます', loadError: '求人票詳細を読み込めません。' }, form: { ...vi.orders.form, createTitle: '求人票を作成', createDescription: '業種、職種、供給ルート別に採用需要を登録します。', name: '募集職種', nameAria: '募集職種', client: '取引先', clientAria: '求人票の取引先', chooseClient: '取引先を選択', industry: '業種', industryAria: '求人票の業種', chooseIndustry: '業種を選択', it: '情報技術', mechanical: '機械', nursing: '介護・看護', manufacturing: '製造', hospitality: '宿泊サービス', occupation: '職種', occupationAria: '職種', location: '勤務地', locationAria: '勤務地', target: '募集人数', targetAria: '募集人数', deadline: '募集期限', deadlineAria: '募集期限', salary: '給与', salaryAria: '給与', contract: '契約種別', contractAria: '契約種別', japanese: '日本語', japaneseAria: '必要な日本語レベル', undefined: '未指定', criteria: '採用条件', criteriaAria: '採用条件', criteriaPlaceholder: '条件をカンマで区切って入力', cancel: 'キャンセル', close: '閉じる', save: '求人票を保存', saving: '保存中…', created: '求人票 {code} を下書きとして作成しました。', required: '必須項目をすべて入力してください。', loadingClients: '取引先を読み込んでいます' }, status: { ...vi.orders.status, label: 'ステータス', aria: 'ステータス', draft: '下書き', recruiting: '募集中', paused: '一時停止', filled: '充足', closed: '終了', invalid: 'このステータスは求人票の流れでは無効です。順番に進めてください。', invalidOption: '無効', closeOnlyFilled: '募集人数を満たしてから終了してください。キャンセルや差し替えは例外操作です。', autoReason: '需要完了の理由は履歴に自動記録されます。', validation: '入力内容を確認してください。', saveError: '求人票のステータスを保存できません。', save: '変更を保存', saving: '保存中' }, addCandidates: { ...vi.orders.addCandidates, title: '求人票に候補者を追加', description: '既存プロフィールから透明に絞り込み、AIで自動順位付けはしません。', cancel: 'キャンセル', add: '求人票に追加', search: '候補者を検索', searchAria: '候補者を検索', searchPlaceholder: 'コード、氏名、職種…', industry: '業種', industryAria: '求人票内の候補者業種', japanese: '日本語', japaneseAria: '求人票内の候補者日本語', occupation: '職種', occupationAria: '求人票内の候補者職種', occupationPlaceholder: '例: QA…', skill: 'スキル', skillAria: '求人票内の候補者スキル', skillPlaceholder: '例: React…', readiness: '準備状況', readinessAria: '求人票内の候補者準備状況', journey: '供給プロセス', journeyAria: '候補者の現在のプロセス', all: 'すべて', allIndustries: 'すべての業種', it: '情報技術', nursing: '介護・看護', mechanical: '機械製造', n2: 'N2', n3: 'N3', n4: 'N4', readyInterview: '面接準備完了', completeProfile: 'プロフィール完備', noJourney: 'プロセスなし', activeJourney: 'プロセス進行中', select: '選択', candidate: '候補者', industryOccupation: '業種 / 職種', japaneseLevel: '日本語', note: '注意', inOrder: '追加済み', supplying: '供給プロセス中', selectable: '選択可能', notFound: '該当するプロフィールがありませんか？', createCandidate: '候補者を作成', chooseCandidate: '{name} を選択', validation: '候補者を選択してください' }, profile: { ...vi.orders.profile, tabs: { overview: '概要', criteria: '採用条件', candidates: '候補者パイプライン', interviews: '面接結果', journey: '供給進捗', files: 'ファイルとメモ', history: '変更履歴' }, tabsAria: '求人票プロフィールのセクション', addCandidates: '候補者を追加', deadline: '期限 {date}', metrics: { target: '募集人数', active: '対応中', passed: '合格', supplied: '供給済み' }, health: { underTarget: '候補者不足', interviewDelay: '面接遅延', expiring: '期限間近' }, owner: '担当者', criteriaTitle: '採用条件', contract: '契約種別', salary: '給与', japanese: '日本語', occupation: '職種', statusTitle: '求人票ステータス', saved: '変更を保存しました', tabsFiles: 'ファイルとメモ', addFile: 'ファイルを追加', addFileAria: '求人票ファイルを追加', note: '求人票メモ', noteAria: '求人票メモ', notePlaceholder: '社内運用メモ', pendingFile: 'ファイル保存待ち', noFiles: '添付ファイルはありません。契約、要件、連絡資料を追加してください。', currentCriteria: '現在の条件:', noCriteria: '未指定', historyTitle: '変更履歴', created: '求人票を作成', versionOwner: 'データバージョン {version} · 担当者 {owner}', statusUpdated: '現在のステータスを更新', candidate: '候補者', stage: '段階', interview: '面接', updated: '更新', rounds: '{count} 回', noCandidates: 'パイプラインに候補者はいません', noCandidatesDescription: '候補者を追加してパイプラインを開始してください。', noInterviews: '面接はありません', noInterviewsDescription: '候補者の面接がここに表示されます。', online: 'オンライン', inPerson: '対面', result: '結果: {value}', noResult: '未記録', pass: '合格', fail: '不合格', noJourney: '供給プロセスはありません', noJourneyDescription: 'この求人票の候補者が合格すると供給プロセスが表示されます。', journeyProgress: '進捗 {completed}/{applicable} マイルストーン' } },
  candidates: {
    ...vi.candidates,
    list: { ...vi.candidates.list, eyebrow: '候補者マスタ', title: '候補者', description: '複数業種の候補者プロフィール、連絡状況、供給フェーズを求人票で重複させずに管理します。', viewDescription: '権限と現在のフィルターに基づいて表示しています。', searchLabel: '候補者を検索', searchPlaceholder: '氏名、コード、業種、職種', tabListLabel: '候補者ビュー', industryLabel: '業種', allIndustries: 'すべての業種', readinessLabel: 'プロフィール', contactabilityLabel: '連絡状況', japaneseLabel: '日本語', ownerLabel: '担当者', recordLabel: 'アーカイブ', experienceLabel: '経験年数', occupationLabel: '職種', skillLabel: 'スキル', locationLabel: '希望地域', sourceLabel: '登録元', import: '候補者をインポート', duplicateReview: '重複を確認', add: '候補者を追加', noEmail: 'メールなし', noPhone: '電話番号なし', loadingError: '候補者一覧を読み込めません。', empty: '該当する候補者がありません', all: 'すべて', active: '有効', archived: 'アーカイブ済み', years02: '0〜2年', years35: '3〜5年', years6: '6年以上' },
    views: { ...vi.candidates.views, all: 'すべて', potential: '候補者', newUnassigned: '新規 / 未担当', readyToMatch: '紐付け準備完了', applying: '応募中', passed: '合格', supplying: '供給中', supplied: '供給済み', paused: '一時停止', archived: 'アーカイブ済み', missingContact: '連絡先不足', missingDocuments: '書類不足', duplicates: '重複候補' },
    filters: { readiness: { notReady: 'プロフィール不足', review: '確認待ち', interview: '面接準備完了' }, contactability: { contactable: '連絡可能', unknown: '未確認', doNotContact: '連絡不可' }, japanese: { all: 'すべて', n2: 'N2', n3: 'N3', n4: 'N4' } },
    table: { ...vi.candidates.table, code: 'コード', candidate: '候補者', industry: '業種 / 職種', japanese: '日本語', phase: 'フェーズ', readiness: '準備状況', contactability: '連絡状況', nextAction: '次の対応', owner: '担当者', lastActivity: '最終更新', noEmail: 'メールなし', noPhone: '電話番号なし', phasePotential: '候補', phaseApplying: '応募中', phasePassed: '合格', phaseSupplying: '供給中', phaseSupplied: '供給済み', readinessNotReady: 'プロフィール不足', readinessReview: '確認待ち', readinessInterview: '面接準備完了', contactable: '連絡可能', doNotContact: '連絡不可', contactUnknown: '未確認' },
    drawer: { ...vi.candidates.drawer, title: '候補者プロフィール', loading: '候補者プロフィールを読み込んでいます', loadError: '候補者プロフィールを読み込めません。', owner: '担当者', actionsLabel: '候補者の操作', email: 'メールを送信', addToOrder: '求人票に追加', createWork: '業務を作成', contact: '連絡先', phone: '電話番号', japanese: '日本語', source: '登録元', processing: '対応状況', applicationCount: '応募数', emailCount: '記録済みメール', nextAction: '次の対応', skills: '職種とスキル', years: '{count}年の経験', noSkills: 'スキル未登録', context: '一覧の文脈を保ったまま、この詳細レイヤーで関連情報を確認できます', contactable: '連絡可能', doNotContact: '連絡不可', contactUnknown: '連絡状況未確認', notUpdated: '未更新' },
    detail: { ...vi.candidates.detail, loading: '候補者プロフィールを読み込んでいます', loadError: '候補者プロフィールを読み込めません。', phasePotential: '候補者', active: '有効', archived: 'アーカイブ済み', edit: 'プロフィールを編集', lastUpdated: '最終更新', applicationsCount: '応募', emailsCount: '記録済みメール', profiles: '職種プロフィール', nextAction: '次の対応', tabLabel: '候補者プロフィールのセクション', tabs: { overview: '概要', applications: '応募', journeys: '供給プロセス', work: '業務とメモ', email: 'メール', files: 'ファイルとメモ', history: '履歴' }, overview: { ...vi.candidates.detail.overview, profile: 'プロフィール情報', code: '候補者コード', name: '氏名', industry: '業種', occupation: '主な職種', japanese: '日本語', source: '登録元', contactOwner: '連絡先と担当者', area: '地域', multiIndustry: '複数業種プロフィール', years: '{count}年の経験', noSkills: 'スキル未登録', next: '次の対応' }, applications: { ...vi.candidates.detail.applications, emptyTitle: '応募はありません', emptyDescription: 'この候補者はまだ求人票に追加されていません。', owner: '担当者', lastUpdated: '最終更新', passed: '合格', interviewing: '面接中', matched: '新規紐付け' }, journeys: { ...vi.candidates.detail.journeys, emptyTitle: '供給プロセスはありません', emptyDescription: '応募が合格になると供給プロセスが表示されます。', progress: '{completed}/{applicable} マイルストーン', owner: '担当者' }, work: { ...vi.candidates.detail.work, title: '社内業務とメモ', description: '次の対応: {action}。', addNote: 'メモを追加', emptyTitle: 'メモはありません', emptyDescription: '社内メモを追加して担当者間で引き継ぎます。', noteTitle: '候補者メモを追加', noteDescription: 'メモは社内スタッフのみ閲覧できます。', content: '内容', contentAria: '候補者メモの内容', save: 'メモを保存' }, email: { title: 'メール履歴', description: '共有メールボックスに{count}件のメールを記録しています。', open: '候補者でメールボックスを絞り込む' }, files: { title: '添付ファイル', add: 'ファイルを追加', addAria: '候補者ファイルを追加', safe: '安全確認済み', checking: '確認中', download: 'ダウンロード', empty: '添付ファイルはありません', notes: '社内メモ', noNotes: 'メモはありません。' }, history: { title: 'プロフィール履歴' } },
    form: { ...vi.candidates.form, createTitle: '候補者を追加', createDescription: '求人票と供給プロセスで使うマスタープロフィールを1件作成します。', editTitle: '候補者プロフィールを編集', editDescription: '{code} · 業務履歴を保持したままプロフィールを更新します。', close: '閉じる', cancel: 'キャンセル', save: '候補者を保存', saveChanges: '変更を保存', saving: '保存中…', name: '氏名', industry: '業種', chooseIndustry: '業種を選択', occupation: '主な職種', japanese: '日本語レベル', source: '登録元', email: 'メール', phone: '電話番号', requiredHint: '必須項目を入力すると重複プロフィールを作らずに選考を開始できます。', created: '候補者プロフィール {code} を作成しました', missingName: '氏名を入力してください', missingIndustry: '業種を選択してください', missingOccupation: '主な職種を入力してください', missingRequired: '氏名、業種、主な職種を入力してください' },
    import: { ...vi.candidates.import, title: '候補者をインポート', description: '表計算ファイルをアップロードし、警告を確認してからマスター一覧に追加します。', file: '候補者ファイル', preview: 'インポート確認', valid: '{count}行が有効', invalid: '{count}行が無効', duplicate: '{count}行が重複', fileName: 'ファイル: {name}', row: '行', name: '氏名', status: 'ステータス', validStatus: '有効', duplicateStatus: '重複候補', noRows: 'データ行がありません。ヘッダー name、industry、occupation を確認してください。', chooseHint: 'CSVを選択するとインポート前にマッピングと警告を確認できます。', csvOnly: 'プレビューは現在CSVに対応しています。ExcelはCSVで保存して確認してください。', chooseFile: '有効な行を1行以上含むCSVを選択してください。', checking: '確認中…', confirm: 'インポートを確定', imported: '{count}件の候補者プロフィールをインポートしました' },
    duplicate: { ...vi.candidates.duplicate, title: '重複候補を確認', description: '明確な結果を選択してください。プロフィールを自動削除・統合することはありません。', close: '閉じる', cancel: 'キャンセル', save: '結果を記録', saving: '保存中…', reviewed: '確認済みにする', result: '結果', reviewedOption: '確認済み', keepSeparate: '分けて保持', merge: '別プロフィールへ統合', target: '統合先プロフィール', chooseTarget: '統合先を選択', reason: '理由', reasonPlaceholder: '理由と確認根拠を入力…', processing: '処理中のプロフィール', source: '登録元', owner: '担当者', contact: '連絡先', noContact: 'なし', empty: '確認待ちのプロフィールはありません。', keepHistory: '候補者の履歴は保持されます。', saved: '重複確認の結果を記録しました', hint: 'デモでは統合の判断のみ記録し、応募、供給プロセス、メール、ファイルは削除しません。' }
  },
  applications: { ...vi.applications, list: { ...vi.applications.list, eyebrow: '社内対応パイプライン', title: '応募・面接', description: '面接、結果、判断から導かれるステージで応募を追跡し、求人票と取引先の文脈を保ちます。', add: '候補者を追加', searchLabel: '応募を検索', searchPlaceholder: '氏名、候補者コード、求人票、取引先', stageLabel: 'ステージ', stageAria: '応募ステージ', tabLabel: '応募ビュー', loadError: '応募一覧を読み込めません。', empty: '該当する応募がありません' }, views: { ...vi.applications.views, screening: '新規スクリーニング', waitingInterview: '面接待ち', interviewed: '面接済み', waitingResult: '結果待ち', passed: '合格', failed: '不合格', withdrawn: '辞退', closed: '終了', overdue: '期限超過' }, table: { ...vi.applications.table, candidate: '候補者', order: '求人票', client: '取引先', round: '回', stage: 'ステージ', schedule: '直近の日程', lastActivity: '最終活動', nextAction: '次の対応', owner: '担当者', noSchedule: '未設定', roundLabel: '{round}回目', noInterview: '面接なし', stageNew: '新規紐付け', stageWaitingInterview: '面接待ち', stageWaitingResult: '結果待ち', stageInterviewed: '面接済み', stagePassed: '合格', stageFailed: '不合格', stageWithdrawn: '辞退', actionSchedule: '1回目を予約', actionResult: '結果を入力', actionFollow: '日程を確認', actionJourney: 'プロセスを開始', actionReview: 'プロフィールを確認' }, drawer: { ...vi.applications.drawer, title: '応募プロフィール', loading: '応募を読み込んでいます', loadError: '応募を読み込めません。' }, decision: { ...vi.applications.decision, title: '応募の判断', withdraw: '辞退を確認', failed: '不合格を確認', passed: '合格を確認', reason: '終了理由（不合格・辞退時は必須）', reasonAria: '終了理由', note: 'メモ', noteAria: '判断メモ', interviewRequired: '合格を確認する前に面接結果を入力してください。', interviewNotPassed: '面接結果が合格の確認条件を満たしていません。', reasonRequired: '終了理由を入力してください。', saveError: '判断を保存できません。' }, journey: { ...vi.applications.journey, title: '供給プロセスを開始', close: '閉じる', cancel: 'キャンセル', confirm: '開始を確定', starting: '開始中…', checking: '条件を確認中…', checkError: '開始条件を確認できません。', notEligible: '開始条件を満たしていません。', template: 'プロセステンプレート', owner: '担当者', startDate: '開始日', required: 'テンプレート、担当者、開始日を選択してください。', createError: 'プロセスを開始できません。' }, add: { ...vi.applications.add, title: '候補者をパイプラインに追加', description: '求人票を選び、応募を作成する候補者プロフィールを選択します。', cancel: 'キャンセル', chooseCandidates: '候補者を選択', order: '求人票', chooseOrder: '募集中の求人票を選択', loadingOrders: '求人票を読み込んでいます', candidate: '候補者', selectAll: 'すべて選択', confirm: '応募を作成', creating: '作成中…', noCandidates: '該当する候補者がいません' }, profile: { ...vi.applications.profile, tabs: { overview: '概要', interviews: '面接日程', result: '結果と判断', files: 'ファイルとメモ', history: '履歴' }, tabLabel: '応募プロフィールのセクション', error: '応募を読み込めません。', overview: '応募情報', candidateCode: '候補者コード', candidate: '候補者', order: '求人票', client: '取引先', source: '登録元', owner: '担当者', progress: '対応状況', interviews: '{count}回の面接', appliedAt: '紐付け日', lastActivity: '最終活動', dueAt: '期限', version: 'バージョン', noDue: 'なし', next: '次のステップ', noInterviews: '面接はありません', scheduleFirst: '最初の面接を予約して応募処理を開始します。', round: '{round}回目', scheduled: '予約済み', completed: '完了', cancelled: 'キャンセル済み', noShow: '不参加', pending: '結果待ち', pass: '合格', fail: '不合格', reschedule: '日程変更', cancelInterview: '面接をキャンセル', markNoShow: '不参加にする', online: 'オンライン', inPerson: '対面', mode: '形式', timeZone: 'タイムゾーン', participants: '参加者', filesTitle: '応募ファイル', addFile: 'ファイルを追加', checking: '確認中', noFiles: '添付ファイルはありません', notes: '社内メモ', addNote: 'メモを追加', noNotes: 'メモはありません。', noteTitle: '応募メモを追加', noteDescription: 'メモは社内スタッフのみ閲覧できます。', noteContent: 'メモの内容', saveNote: 'メモを保存', resultTitle: '結果と判断', resultDescription: '各回の結果は面接日程に紐付き、最終判断には実行者、日時、理由を記録します。', reasonLabel: '理由', historyTitle: '対応履歴', history: '履歴', schedule: '面接を予約', enterResult: '結果を入力', decision: '判断', startJourney: '供給プロセスを開始' }, interview: { ...vi.applications.interview, scheduleTitle: '{round}回目を予約', rescheduleTitle: '面接日程を変更', oldSchedule: '以前の日程: {date}', time: '日時', timeZone: 'タイムゾーン', chooseTimeZone: 'タイムゾーンを選択', vn: 'GMT+7 · ベトナム', jp: 'GMT+9 · 日本', mode: '形式', online: 'オンライン', inPerson: '対面', meetingUrl: '面接ルームURL', location: '場所', participants: '参加者', participantsPlaceholder: 'u-recruiter, u-manager…', participantsHint: 'スタッフIDをカンマ区切りで入力してください。', reason: '変更理由', cancel: 'キャンセル', save: '面接日程を保存', confirmReschedule: '変更を確定', invalidTimeZone: 'タイムゾーンを選択してください', invalidUrl: '', httpsPlaceholder: 'https://…', attendanceCancelTitle: '面接をキャンセル', attendanceNoShowTitle: '不参加にする', cancelReason: 'キャンセル理由', noShowReason: '不参加の理由', confirm: '確認', cancelReasonRequired: 'キャンセル理由を入力してください', noShowReasonRequired: '不参加の理由を入力してください', statusUpdateError: '日程ステータスを更新できません。', resultTitle: '{round}回目の結果を入力', interviewLabel: '面接: {date}', result: '結果', resultAria: '面接結果', feedback: 'コメント', feedbackAria: '面接コメント', strengths: '強み', strengthsAria: '強み', strengthsPlaceholder: 'コミュニケーション、専門性', concerns: '注意点', concernsAria: '注意点', nextStep: '次の対応', nextStepAria: '次の対応', resultSave: '結果を保存', resultRequired: '面接完了後に結果を記録してください。', resultError: '結果を保存できません。' } },
  journeys: { ...vi.journeys, list: { ...vi.journeys.list, eyebrow: '合格後の供給プロセス', title: '供給プロセス', description: '入社承諾から日本の受け入れ企業まで、人材供給のマイルストーンを追跡します。出国情報は任意のマイルストーンです。', searchLabel: 'プロセスを検索', searchPlaceholder: '候補者、求人票、取引先', scope: '現在の権限範囲で表示しています。', tabLabel: 'プロセスビュー', loadError: 'プロセス一覧を読み込めません。', empty: '該当するプロセスがありません' }, views: { ...vi.journeys.views, all: 'すべて', active: '供給中', onHold: '一時停止', atRisk: 'リスクあり', overdue: '期限超過', waitingCandidate: '候補者待ち', waitingExternal: 'パートナー待ち', nearComplete: '完了間近', completed: '完了', cancelled: 'キャンセル済み' }, table: { ...vi.journeys.table, candidate: '候補者', order: '求人票', client: '取引先', template: 'プロセステンプレート', milestone: '現在のマイルストーン', due: '最短期限', progress: '{completed}/{applicable} マイルストーン', health: '状態', owner: '担当者', onTrack: '順調', overdue: '期限超過', atRisk: 'リスクあり', completed: '完了' }, detail: { ...vi.journeys.detail, back: '一覧に戻る', loading: 'プロセス詳細を読み込んでいます。', loadError: 'プロセス詳細を読み込めません。', tabsLabel: 'プロセスのタブ', tabs: { progress: '進捗', documents: '書類', tasks: '業務', email: 'メール', history: '履歴' }, health: { atRisk: 'リスクあり', overdue: '期限超過', completed: '完了', onTrack: '順調' }, owner: '担当者', template: 'プロセステンプレート', version: 'バージョン {version}', currentMilestone: '現在のマイルストーン', progress: '進捗', progressCount: '進捗 {completed}/{applicable} マイルストーン（{percent}%）', nearestDue: '最短期限', noDue: '期限なし', milestonesTitle: '供給マイルストーン', milestonesDescription: '依存関係に従ってマイルストーンを開き、待機状態はブロックしている側から推定します。', addNote: 'メモを追加', notesTitle: 'セッションメモ', noteEmpty: 'メモはありません。社内のみ閲覧できます。', internalNote: '社内メモ', noteDateBy: '{date} · {name}', noteModalTitle: 'プロセスメモを追加', noteModalDescription: '社内メモはデモのブラウザーに保存されます。', noteContent: 'メモ内容', noteContentAria: 'プロセスメモの内容', saveNote: 'メモを保存', documentsTitle: '書類と証跡', documentsDescription: '新しいファイルはバックエンドの安全スキャンが完了するまで確認中です。', addFile: 'ファイルを追加', addFileAria: 'プロセスファイルを追加', uploadedBy: '{name} がアップロード · {date}', download: 'ダウンロード', pendingFile: 'ファイル保存待ち', noEvidence: '証跡はありません。ファイルを追加してプロセスに紐付けてください。', scan: { safe: '安全確認済み', quarantined: '隔離済み', rejected: '拒否', pending: '確認中' }, tasksTitle: '関連業務', tasksDescription: '業務は開いているマイルストーンから推定され、手動追加もできます。', addTask: '業務を追加', taskAria: '{title} を完了にする', taskDue: '期限 {date}', done: '完了', todo: '対応が必要', noTasks: 'このプロセスに未完了の業務はありません。', taskModalTitle: 'プロセス業務を追加', taskModalDescription: '候補者、求人票、取引先に紐付く社内キューへ追加します。', taskName: '業務名', taskNameAria: '業務名', taskPlaceholder: '例: 就労許可を確認', dueAt: '期限', dueAtAria: '期限', creating: '作成中…', createError: '業務を作成できません。', emailTitle: '関連メール', emailDescription: '共有メールボックスで候補者に紐付くスレッド全体を確認します。', openMailbox: '共有メールボックスを開く', historyTitle: '変更履歴', noHistory: '変更履歴はありません。', title: '供給プロセス詳細', currentUser: 'あなた', cancel: 'キャンセル', close: '閉じる' }, milestone: { ...vi.journeys.milestone, listAria: 'プロセスマイルストーン一覧', countLabel: 'マイルストーン {sequence}', update: 'マイルストーンを更新', closeUpdate: '更新を閉じる', waive: '免除', updated: 'マイルストーンを更新しました', due: '期限', noDue: '期限なし', evidence: '証跡', evidenceCount: '{completed}/{required} ファイル', owner: '担当者', waiverPrefix: '免除: ', blockerPrefix: 'ブロック: ', formTitle: 'マイルストーンを更新: {name}', formVersion: 'マイルストーン {sequence} · データバージョン {version}', status: 'ステータス', statusAria: 'マイルストーンステータス', blockerParty: 'ブロックしている側', blockerPartyAria: 'ブロックしている側', chooseParty: '側を選択', blockerReason: 'ブロック理由', naReason: '非適用理由', evidenceIds: '添付証跡', evidenceIdsAria: '証跡 ID', evidencePlaceholder: 'evidence-id-1, evidence-id-2', requiredFiles: '必須: {count} ファイル', save: 'マイルストーンを保存', validation: '入力内容を確認してください。', insufficientEvidence: '必須の証跡が不足しています。', blockerRequired: 'ブロックしている側と理由を入力してください。', naRequired: '非適用理由を入力してください。', updateError: 'マイルストーンを更新できません', partyCandidate: '候補者', partyClient: 'パートナー / 取引先', partyInternal: '社内', partyOther: 'その他', parties: { candidate: '候補者', client: 'パートナー / 取引先', internal: '社内', other: 'その他' }, statuses: { notStarted: '未開始', inProgress: '対応中', completed: '完了', blocked: 'ブロック中', waived: '免除済み', notApplicable: '非適用' }, waiting: { candidate: '候補者待ち', external: 'パートナー待ち', blocked: 'ブロック中' }, waiveTitle: '免除を確認', waiveReason: '免除理由', approver: '承認者', approverAria: '承認者', confirmWaive: '免除を確認', saving: '保存中…', waiveError: 'マイルストーンを免除できません', approvers: { manager: 'Lê Thu Hà', coordinator: 'Trần Quốc Huy' } } },
  mailbox: {
    ...vi.mailbox,
    page: { ...vi.mailbox.page, eyebrow: '公式メールボックス', title: '共有メールボックス', description: '送受信履歴、候補者の返信、添付ファイルを保持します。メールが業務ステータスを自動変更することはありません。', search: 'メールを検索', searchAria: 'メールを検索', searchPlaceholder: '件名、アドレス、候補者', defaultFrom: '既定の From: ungvien@company.vn', viewsLabel: 'メールボックスビュー', chooseConversation: '表示するメールスレッドを選択', modalHint: '一覧の文脈を保つため、詳細はモーダルで開きます。', loading: 'メールスレッドを読み込んでいます', loadError: 'メールスレッドを読み込めません。' },
    views: { ...vi.mailbox.views, all: 'すべて', needsAction: '対応が必要', unmatched: '未紐付け', waitingCandidate: '候補者待ち', waitingInternal: '社内対応待ち', sent: '送信済み', received: '受信済み', completed: '完了', failed: '送信失敗' },
    list: { ...vi.mailbox.list, subject: '件名', status: 'ステータス', messageCount: 'メール数', lastActivity: '最終活動', empty: '該当するメールがありません' },
    attachment: { ...vi.mailbox.attachment, download: 'ダウンロード', quarantined: '隔離済み', unavailable: '利用できません' },
    context: { ...vi.mailbox.context, aria: 'メール業務コンテキスト', title: '業務コンテキスト', candidate: '候補者', application: '応募', journey: '供給プロセス', unlinked: '未リンク' },
    thread: { ...vi.mailbox.thread, mailboxCount: '共有メールボックス · {count} 通', updated: '更新 {date} · バージョン {version}', link: '候補者をリンク', reply: '返信', attachments: '添付ファイル', notes: '社内メモ', inbound: '受信', outbound: '送信' },
    modal: { ...vi.mailbox.modal, aria: '共有メールボックス詳細', eyebrow: '共有メールボックス', title: 'メールスレッド詳細', description: '改ざん防止履歴と業務コンテキスト', closeAria: 'メール詳細を閉じる', close: '閉じる' },
    composer: { ...vi.mailbox.composer, eyebrow: '候補者への返信', title: '返信メールを作成', from: 'From: ungvien@company.vn · 送信内容は記録されます', closeAria: '返信ウィンドウを閉じる', close: '閉じる', recipient: '宛先', recipientAria: '宛先', cc: 'Cc', ccAria: 'Cc メール', ccPlaceholder: '任意', subject: '件名', subjectAria: 'メール件名', preview: 'プレビュー', edit: '内容を編集', noSubject: '件名なし', content: '本文', contentAria: 'メール本文', noContent: '本文なし', files: '添付ファイル', filesAria: '添付ファイル', draftSaved: 'ブラウザーに下書きを保存しました · {time}', saveDraft: '下書きを保存', sending: '送信中', send: 'メールを送信', result: '送信結果', recorded: 'メールを履歴に記録しました（ID: {id}）。', sentNotEditable: 'From: ungvien@company.vn · 送信済みメールは編集できません。', missingInterviewTime: '面接時間が未入力です', required: '宛先、件名、本文を入力してください。', sendError: 'メールを送信キューに追加できません。', unsaved: '未保存の変更があります。返信ウィンドウを閉じますか？' },
    link: { ...vi.mailbox.link, title: '候補者をリンク', cancel: 'キャンセル', confirm: 'リンクを確定', description: 'このメールは自動で紐付けられませんでした。候補者を選択して監査ログに記録します。', candidate: '候補者', candidateAria: 'リンクする候補者', choose: '候補者を選択' },
    template: { ...vi.mailbox.template, label: 'メールテンプレート', aria: 'メールテンプレート', none: 'テンプレートなし', interview: '面接案内', documents: '追加書類の依頼', result: '結果通知' },
    send: { ...vi.mailbox.send, queued: '送信待ち', sending: '送信中', sent: '送信済み', failed: '送信失敗', bounced: 'バウンス' },
    emailStatus: {
      received: '受信済み',
      queued: '送信待ち',
      sending: '送信中',
      sent: '送信済み',
      failed: '送信失敗',
      bounced: 'バウンス'
    },
    conversationStatus: {
      needsAction: '対応が必要',
      matched: '紐付け済み',
      unmatched: '未紐付け',
      sent: '送信済み',
      received: '受信済み',
      closed: 'クローズ済み'
    }
  },
  reports: { ...vi.reports, page: { ...vi.reports.page, eyebrow: '運用管理', title: 'レポート', description: '採用ファネル、ソース品質、供給パフォーマンス、共有メールボックス SLA を追跡します。', loading: 'レポートを集計しています', loadError: '現在のフィルターでレポートを読み込めません。', updatedAt: 'データ更新日時', timeZone: 'タイムゾーン', noData: 'レポートデータはありません', noDataDescription: '期間を広げるかフィルターを変更してください。', funnel: '採用ファネル', funnelDescription: '候補者と応募の分母を分け、誤った率の解釈を防ぎます。', sourceQuality: 'ソース品質', sourceDescription: '選択期間におけるソース別の合格率。', clients: '取引先と求人票', clientsDescription: '募集中の求人票と充足状況を追跡します。', journeys: '供給プロセス', journeysDescription: '合格判断から日本への人材供給完了までを追跡します。', mailbox: '共有メールボックスと SLA', mailboxDescription: '公式返信、未紐付けメール、処理量を測定します。', workload: '作業量', workloadDescription: '当日の運用上のボトルネック。', dataQuality: 'データ品質', dataQualityDescription: '自動化前に整理が必要なレコード。' }, filters: { ...vi.reports.filters, from: '開始日', fromAria: '開始日', to: '終了日', toAria: '終了日', team: 'チーム', teamAria: 'レポートチーム', allTeams: 'すべてのチーム', recruiting: '採用', coordination: '調整', business: '営業', owner: '担当者', ownerAria: 'レポート担当者', ownerPlaceholder: 'ユーザー ID', client: '取引先', clientAria: 'レポート取引先', allClients: 'すべての取引先', order: '求人票', orderAria: 'レポート求人票', allOrders: 'すべての求人票', industry: '業種', industryAria: 'レポート業種', allIndustries: 'すべての業種', it: '情報技術', care: '介護', logistics: '物流', source: 'ソース', sourceAria: '候補者ソース', allSources: 'すべてのソース', referral: '紹介', manual: '手動検索', import: 'インポート', export: 'レポートを出力', hint: '分母は選択した権限範囲と期間に従います' }, funnel: { ...vi.reports.funnel, title: '採用ファネル', description: '各段階は固有の分母を使用します。件数を選択するとソース一覧を開きます。', stage: '段階', count: '件数', rate: '率', updated: '現在のフィルターに基づく' }, export: { ...vi.reports.export, title: 'レポートを出力', description: '権限範囲内の項目だけを含むバックグラウンド出力を作成します。', cancel: 'キャンセル', queue: '出力をキューに追加', create: '出力ファイルを作成', eyebrow: '運用レポート', format: '形式', formatAria: 'ファイル形式', xlsx: 'Excel (.xlsx)', csv: 'CSV (.csv)', auditHint: '現在のフィルターと出力要求を監査ログに記録します。', createError: '出力を作成できません。' }, job: { ...vi.reports.job, created: '出力を作成しました', expiresAt: 'リンクの有効期限', unknown: '不明', download: 'ファイルをダウンロード', expired: '出力リンクの有効期限が切れました。新しい要求を作成してください。', queued: '処理待ち', creating: 'ファイルを作成中', auditHint: '要求は監査ログに記録されています。レポート画面はロックされません。' }, empty: { ...vi.reports.empty, title: 'レポートデータはありません', description: '期間を広げるかフィルターを変更してください。' } },
  admin: { ...vi.admin, nav: { ...vi.admin.nav, users: 'ユーザーと権限', catalogs: 'マスターデータ', templates: 'テンプレート', mailbox: 'メールボックス', audit: '監査ログ', aria: '管理エリア' }, audit: { ...vi.admin.audit, loading: '監査ログを読み込んでいます', loadError: '監査ログを読み込めません。', eyebrow: '改ざん防止トレース', title: '監査ログ', description: 'サーバーが権限で絞り込み、機密情報をマスクします。記録の編集・削除はできません。', from: '開始日', fromAria: '監査開始日', to: '終了日', toAria: '監査終了日', actor: '実行者', actorAria: '監査実行者', allActors: 'すべての実行者', resource: 'リソース ID', resourceAria: 'リソース ID', action: '操作', actionAria: '監査操作', time: '時刻', source: '発生元', summary: '概要', empty: '監査記録はありません', emptyDescription: 'フィルターを広げるか、操作が記録されてから再度確認してください。' }, catalogs: { ...vi.admin.catalogs, eyebrow: 'バージョン管理マスター', title: '業種・職種・候補者ソース', description: '履歴で使用された値は終了扱いにするだけで、削除しません。', add: '値を追加', type: '種別', code: 'コード', label: 'ラベル', usage: '使用数', status: 'ステータス', actions: '操作', active: '有効', retired: '終了', retire: '終了にする', noAction: '操作なし', empty: 'マスター値はありません', emptyDescription: '業務フォームで使う最初の値を作成してください。', addTitle: 'マスター値を追加', addDescription: '新しい値はバージョン 1 で作成され、監査ログに記録されます。', cancel: 'キャンセル', save: '値を保存', typeAria: 'マスター種別', codeAria: 'マスターコード', labelAria: 'マスターラベル', industry: '業種', occupation: '職種', visaRoute: '在留資格ルート', source: '候補者ソース', retireTitle: 'マスター値を終了しますか？', retireDescription: '履歴データからは削除されません。', confirmRetire: '終了を確認', required: 'コードとラベルを入力してください。', loadError: 'マスターを読み込めません。', loading: 'マスターを読み込んでいます' }, invite: { ...vi.admin.invite, title: 'ユーザーを招待', description: '社内 CMS への招待を作成し、初期ロールを付与します。', close: '閉じる', cancel: 'キャンセル', send: '招待を送信', sending: '送信中…', created: '{email} 宛ての招待を作成しました。', name: '氏名', nameAria: 'ユーザー氏名', email: '会社メール', emailAria: 'ユーザーメール', team: 'チーム', teamAria: 'ユーザーチーム', recruiting: '採用', coordination: '調整', platform: 'プラットフォーム運用', compliance: 'コンプライアンス', role: 'ロール', roleAria: 'ユーザーロール', required: '招待情報をすべて入力してください。' } },
  adminExtra: { ...vi.adminExtra,
    mailbox: { ...vi.adminExtra.mailbox, eyebrow: '共有メールボックス接続', title: 'メールボックスの状態', description: '資格情報を公開せず、運用状態と設定を管理します。', edit: '設定を編集', address: 'アドレス', senderName: '送信者名', adapter: 'アダプター', maxAttachment: '添付上限', folders: '受信 / 送信フォルダー', retryAlert: '再試行 / アラート', health: '状態', lastChecked: '最終確認', healthy: '正常', degraded: '低下', disconnected: '接続なし', credential: '資格情報:', credentialConfigured: '設定済み（マスクされ、再表示できません）。', credentialMissing: '未設定。', editTitle: 'メールボックスを編集', editDescription: '資格情報はこのフォームに表示・保存されません。', cancel: 'キャンセル', saving: '保存中…', save: '設定を保存', saveError: 'メールボックス設定を保存できません。', senderNameAria: 'メールボックス送信者名', adapterAria: 'メールボックスアダプター', maxAttachmentAria: 'メールボックス添付上限', signature: 'メール署名', signatureAria: 'メールボックス署名', receiveFolder: '受信フォルダー', receiveFolderAria: 'メールボックス受信フォルダー', sentFolder: '送信フォルダー', sentFolderAria: 'メールボックス送信フォルダー', retryLimit: '再試行回数', retryLimitAria: 'メールボックス再試行回数', alertAddress: 'アラートアドレス', alertAddressAria: 'メールボックスアラートアドレス' },
    templates: { ...vi.adminExtra.templates, eyebrow: 'バージョン管理テンプレート', title: '供給プロセスとメールのテンプレート', description: '監査と過去コンテンツの再現のため、すべてのバージョンを保持します。', create: 'テンプレートを作成', active: '有効', retired: '終了', draft: '下書き', usedBy: '{count} 件のレコードで使用', retire: '終了', empty: 'テンプレートはありません', emptyDescription: 'メール内容とプロセスのマイルストーンを標準化する最初のテンプレートを作成してください。', createTitle: 'テンプレートを作成', createDescription: '新しいテンプレートは公開前の確認用に下書きで作成されます。', cancel: 'キャンセル', createDraft: '下書きを作成', type: 'テンプレート種別', typeAria: 'テンプレート種別', journey: '供給プロセス', email: 'メール', name: 'テンプレート名', nameAria: 'テンプレート名', preview: 'プレビュー内容', previewAria: 'プレビュー内容', subject: 'メール件名', subjectAria: 'テンプレートのメール件名', notes: '運用メモ', notesAria: 'テンプレート運用メモ', body: 'メール本文', bodyAria: 'テンプレートのメール本文', milestones: 'プロセスのマイルストーン', milestonesAria: 'テンプレートのマイルストーン', variables: 'テンプレート変数', variablesAria: 'テンプレート変数', journeyPlaceholder: '1 行に 1 マイルストーン…', emailPlaceholder: '{{candidate.name}} さん、…', variablesPlaceholder: 'candidate.name, order.code…', retireTitle: 'テンプレートを終了しますか？', retireDescription: '新しいバージョンだけに適用され、旧バージョンの履歴は保持されます。', confirmRetire: '終了を確認', requiredName: '名前とプレビュー内容を入力してください。', requiredEmail: 'メールテンプレートには件名と本文が必要です。', requiredJourney: 'プロセステンプレートには少なくとも 1 つのマイルストーンが必要です。', loadError: 'テンプレートを読み込めません。', loading: 'テンプレートを読み込んでいます' },
    users: { ...vi.adminExtra.users, eyebrow: 'ID とアクセス', title: 'ユーザーと権限', description: 'アカウントのロック、アクセスの取り消し、ロールのスコープを管理します。最終的な強制は API が担います。', invite: 'ユーザーを招待', loading: 'ユーザーと権限を読み込んでいます', error: 'ユーザー設定を読み込めません。', user: 'ユーザー', team: 'チーム', role: 'ロール', status: 'ステータス', lastActive: '最終活動', actions: '操作', active: '有効', locked: 'ロック済み', invited: '招待中', notLoggedIn: '未ログイン', unlockLabel: '{name} のロックを解除', lockLabel: '{name} をロック', unlockTitle: 'アカウントのロックを解除しますか？', lockTitle: 'アカウントをロックしますか？', confirmUnlock: 'ロック解除', confirmLock: 'アカウントをロック', confirmDescription: 'この操作は監査ログに記録され、アクセスに直ちに影響する場合があります。', cancel: 'キャンセル', confirm: '確認', configuringRole: '設定中のロール', configuringRoleAria: '設定中のロール' }
  },
  adminExtraNames: { ...vi.adminExtraNames },
  adminExtraValues: { ...vi.adminExtraValues },
  catalog: { industry: { it: '情報技術', nursing: '介護', mechanical: '機械製造', manufacturing: '製造', hospitality: '宿泊・サービス', services: 'サービス' }, japanese: { n5: 'N5', n4: 'N4', n3: 'N3', n2: 'N2', n1: 'N1', unknown: '未指定' }, source: { manual: '手動入力', referral: '社内紹介', import: 'スプレッドシート取込', partner: '採用パートナー', direct: '直接応募' }, occupation: { softwareDevelopment: 'ソフトウェア開発', softwareEngineer: 'ソフトウェアエンジニア', mechanicalTechnician: '機械技術者', machining: '機械加工', nursing: '介護', elderlyCare: '高齢者介護', machineOperator: '機械オペレーター', qaEngineer: 'QA エンジニア', frontendDeveloper: 'フロントエンド開発者', brse: 'BrSE' }, milestone: { offerAccepted: '内定承諾', coeApplication: 'COE 申請', visaApplication: 'ビザ申請', departurePlan: '出国計画', clientReceived: '受入企業への引き渡し', statusChange: '転職手続き完了', documentSupplement: '追加書類', contractChange: '新しい契約', statusChangeInJapan: '在留資格変更', handover: '引き継ぎ', completed: '供給完了' }, template: { supplyFromVietnam: 'ベトナムからの人材供給', transferInJapan: '日本国内の転職' }, nextAction: { review: 'プロフィールを確認', reviewImport: '取込プロフィールを確認', screen: 'プロフィールを選考', followInterview: '面接日程をフォロー', followJourney: '供給プロセスをフォロー', followOnboarding: '受入後をフォロー', supplementCoe: 'COE書類を補完', supplementPhone: '電話番号を追加', archived: 'アーカイブ済み' }, workTask: { interviewResult: '面接結果を入力', interviewSchedule: '面接日程を確認', emailReply: '候補者メールを処理', documentDue: '期限前に書類を追加' }, organization: { receiver: '受入企業' } },
  adminRoleNames: { ...vi.adminRoleNames, recruiter: '採用担当', business: '営業', coordinator: '日本調整担当', manager: 'マネージャー', 'config-admin': '設定管理者', auditor: '監査担当' },
  adminRoleDescriptions: { ...vi.adminRoleDescriptions, recruiter: 'チーム内の候補者、求人票、連絡業務を処理します。', business: '部門内の取引先、求人票、採用パイプラインを管理します。', coordinator: '合格後の候補者書類と供給プロセスを追跡します。', manager: 'レポート、承認、部門単位の運用を確認します。', 'config-admin': '業務コンテンツへの既定アクセスなしでシステム設定を管理します。', auditor: '許可された監査と運用データを読み取り専用で確認します。' },
  adminTeamNames: { ...vi.adminTeamNames, 'team-recruiting': '採用', 'team-coordination': '調整', 'team-platform': 'プラットフォーム運用', 'team-compliance': 'コンプライアンス' },
  templateNames: { ...vi.templateNames, supplyToJapan: '日本向け人材供給', careSupply: '介護人材供給' },
  systemLabels: { ...vi.systemLabels, journeyReasonNotPassed: '応募はまだ合格ステータスではありません。', journeyReasonActiveJourney: '候補者には有効な供給プロセスがあります。' },
  reportMetrics: { ...vi.reportMetrics, candidates: '期間内の候補者', applications: '応募', passed: '合格', journeyCompletion: '供給完了', referral: '社内紹介', manual: '手動検索', import: 'データ取込', activeOrders: '募集中の求人票', filledOrders: '充足済み求人票', atRiskJourneys: 'リスクのある供給プロセス', averageJourneyDays: '平均供給期間', replySla: 'SLA 内返信', unmatched: '未紐付けメール', overdueTasks: '期限超過タスク', averageReplyMinutes: '平均返信時間', missingPhone: '電話番号未登録', duplicateCandidates: '重複候補者' },
  reportFunnelStages: { ...vi.reportFunnelStages, candidates: '候補者', applications: '応募', interviewed: '面接済み', passed: '合格', supplied: '供給完了' },
  metrics: { days: '日', minutes: '分' }
} as const;

export const ja = {
  ...jaBase,
  applications: {
    ...jaBase.applications,
    journey: { ...jaBase.applications.journey, templateAria: '供給プロセステンプレート', chooseTemplate: '供給プロセステンプレートを選択', ownerAria: '供給プロセス担当者', startDateAria: '供給プロセス開始日' },
    add: { ...jaBase.applications.add, orderAria: '応募先求人票' },
    profile: { ...jaBase.applications.profile, nextDescription: '段階は応募ステータスとすべての面接から算出されます。段階ラベルを直接編集しないでください。', filesDescription: '履歴書、面接記録、関連書類はこの応募に紐付けて保持します。', filesHint: '履歴書、面接記録、または関連書類を追加してください。', addFileAria: '応募ファイルを追加', noteAria: '応募メモの内容' },
    interview: { ...jaBase.applications.interview, invalidUrl: '面接ルーム URL が正しくありません', timeAria: '面接日時', timeZoneAria: '面接のタイムゾーン', modeAria: '面接形式', meetingUrlAria: '面接ルーム URL', locationAria: '面接場所', participantsAria: '面接参加者', participantsPlaceholder: 'u-recruiter, u-manager…', reasonAria: '日程変更理由', httpsPlaceholder: 'https://…' }
  },
  work: { ...jaBase.work, viewLabel: '表示' },
  clients: {
    ...jaBase.clients,
    list: { ...jaBase.clients.list, searchAria: '取引先を検索', statusAria: '取引先ステータス' },
    form: { ...jaBase.clients.form, regionPlaceholder: '東京、大阪…' }
  },
  orders: {
    ...jaBase.orders,
    list: { ...jaBase.orders.list, searchAria: '求人票を検索', industryAria: '求人票の業種' }
  },
  candidates: {
    ...jaBase.candidates,
    list: { ...jaBase.candidates.list, industryAria: '候補者の業種', readinessAria: 'プロフィールの準備状況', contactabilityAria: '候補者への連絡状況', japaneseAria: '日本語レベル', ownerAria: '候補者の担当者', recordAria: '候補者のアーカイブ状態', experienceAria: '経験年数', occupationAria: '職種フィルター', occupationPlaceholder: '例：エンジニア…', skillAria: 'スキルフィルター', skillPlaceholder: '例：React…', locationAria: '希望勤務地', locationPlaceholder: '東京…', sourceAria: '候補者ソース', sourcePlaceholder: 'ソース…' },
    form: { ...jaBase.candidates.form, nameAria: '候補者氏名', industryAria: '候補者の業種', occupationAria: '主な職種', japaneseAria: '日本語レベル', sourceAria: '候補者ソース' },
    import: { ...jaBase.candidates.import, fileAria: '候補者インポートファイル' },
    duplicate: { ...jaBase.candidates.duplicate, resultAria: '重複確認の結果', targetAria: '統合先候補者', reasonAria: '重複確認の理由' }
  },
  journeys: { ...jaBase.journeys, list: { ...jaBase.journeys.list, searchAria: '供給プロセスを検索' } },
  mailbox: { ...jaBase.mailbox, composer: { ...jaBase.mailbox.composer, cc: 'Cc', ccAria: 'Cc メール' } },
  admin: {
    ...jaBase.admin,
    mailbox: { ...jaBase.admin.mailbox, eyebrow: '共有メールボックス接続', title: 'メールボックスの状態', description: '資格情報を公開せず、運用状態と設定を管理します。', edit: '設定を編集', address: 'アドレス', senderName: '送信者名', adapter: 'アダプター', maxAttachment: '添付上限', folders: '受信 / 送信フォルダー', retryAlert: '再試行 / アラート', health: '状態', lastChecked: '最終確認', healthy: '正常', degraded: '低下', disconnected: '接続なし', credential: '資格情報:', credentialConfigured: '設定済み（マスクされ、再表示できません）。', credentialMissing: '未設定。', editTitle: 'メールボックスを編集', editDescription: '資格情報はこのフォームに表示・保存されません。', cancel: 'キャンセル', saving: '保存中…', save: '設定を保存', saveError: 'メールボックス設定を保存できません。', senderNameAria: 'メールボックス送信者名', adapterAria: 'メールボックスアダプター', maxAttachmentAria: 'メールボックス添付上限', signature: 'メール署名', signatureAria: 'メールボックス署名', receiveFolder: '受信フォルダー', receiveFolderAria: 'メールボックス受信フォルダー', sentFolder: '送信フォルダー', sentFolderAria: 'メールボックス送信フォルダー', retryLimit: '再試行回数', retryLimitAria: 'メールボックス再試行回数', alertAddress: 'アラートアドレス', alertAddressAria: 'メールボックスアラートアドレス' },
    matrix: {
      ...jaBase.admin.matrix,
      title: '権限マトリクス · {role}', description: '権限ごとに範囲とデータの機密度を設定します。初期状態は拒否で、機密権限には承認と理由を求められます。', granted: '{count} 件の権限を付与', approvals: '{count} 件は承認が必要', warning: '設定管理者に候補者、書類、メール本文の閲覧権限を付与しないでください。設定権限と業務権限を分離します。', permission: '権限', scope: '範囲', data: 'データ', controls: '制御', approval: '承認が必要', reasonRequired: '理由が必要', noReason: '理由不要', saved: '権限を保存し、変更を監査ログに記録しました。', dirty: '未保存の変更があります。', clean: '変更はありません。', save: '権限を保存', saving: '権限を保存中', saveError: '権限の変更を保存できません。',
      groups: { candidates: '候補者', clientsOrders: '取引先と求人票', applications: '応募と面接', journeys: '供給プロセス', documents: '書類', mailbox: '共有メールボックス', reports: 'レポートと統制', config: 'システム設定' },
      scopes: { self: '自分', team: 'チーム', department: '部門', all: '全社' },
      sensitivities: { normal: '通常', personal: '個人データ', highlySensitive: '非常に機密' },
      permissions: { candidateView: '基本プロフィールを閲覧', candidateViewHint: '氏名、連絡先、運用ステータス', candidateCreate: '基本プロフィールを作成・更新', candidateCreateHint: '機密識別情報は含みません', candidateSensitive: '個人データを閲覧', candidateSensitiveHint: '電話、住所、本人確認情報', candidateMerge: '重複候補者を統合', candidateMergeHint: '理由と承認が必要', orderView: '取引先と求人票を閲覧', orderViewHint: '範囲内の採用コンテキスト', orderCreate: '求人票を作成・更新', orderCreateHint: 'Business/Manager ロールの既定権限', applicationCreate: '応募を作成・更新', applicationCreateHint: '候補者を求人票に紐付け', interviewSchedule: '面接を予約', interviewScheduleHint: '範囲内で日程を作成・変更', interviewResult: '面接結果を記録', interviewResultHint: '結果、コメント、次の対応', journeyView: '供給プロセスを閲覧', journeyViewHint: 'マイルストーン、進捗、ステータス', journeyUpdate: 'マイルストーンを更新', journeyUpdateHint: '完了、ブロック、非適用', journeyWaive: 'マイルストーンを免除', journeyWaiveHint: '理由と承認者が必須', documentDownload: '機密書類をダウンロード', documentDownloadHint: 'パスポート、COE、ビザ、関連書類', emailRead: 'メール本文を閲覧', emailReadHint: '本文、宛先、添付ファイル', emailSend: '公式メールを送信', emailSendHint: '共有メールボックスから送信し監査記録を残す', emailLink: 'メールを手動リンク', emailLinkHint: '未紐付けメールをリンク', reportView: 'レポートを閲覧', reportViewHint: 'データ範囲内の KPI', reportExport: 'レポートを出力', reportExportHint: 'PII を含む可能性があり監査が必要', auditView: '監査ログを閲覧', auditViewHint: '実行者、操作、リソースの履歴', catalogManage: 'マスターを管理', catalogManageHint: '業種、職種、在留資格ルート、ソース', templateManage: 'テンプレートを管理', templateManageHint: 'バージョン管理されたプロセスとメールテンプレート', mailboxConfigure: 'メールボックスを設定', mailboxConfigureHint: '本文を読まずにアダプターを接続', userManage: 'ユーザーを管理', userManageHint: '招待、ロック、セッション取消', iamConfigure: 'IAM を設定', iamConfigureHint: 'ロール、範囲、アクセス方針' }
    }
  },
  adminExtra: { ...jaBase.adminExtra, mailbox: { ...jaBase.adminExtra.mailbox, defaultReceiveFolder: '受信トレイ', defaultSentFolder: '送信済み' } }
} as const satisfies DeepMessageShape<typeof vi>;
