# 実験システム進捗監査

- 初回監査日: 2026-07-10
- 最終照合日: 2026-09-06
- 対象: `expTest1`、削除済みの`memoryExperimentSystem`、現行の`mockExperimentSystem`
- 総合判定: **参加者フローを確認できるmockまでは完成しているが、人間パイロットと本実験には使用不可**
- 現在の阻害要因: DEC-039に基づき質問を回答状態優先のv0.4.4へ変更。文章はDEC-036によるv0.4.3を維持。新方針の出力品質と本人評価の確認は未了。詳細は末尾の追記を参照。

以下の過去の監査は履歴であり、現行実装の判定は末尾の2026-09-06追記を優先する。

## 検証結果

- `npm run lint -- --no-cache`: 成功
- `npx tsc --noEmit --incremental false`: 成功
- 一時コピー上での `npm run build`: 成功（Next.js 15.5.18、`/`、`/api/followup`、`/api/generate`を生成）
- 実APIを使うE2E試験: 未実施。課金を伴う外部送信と実参加者データ送信を、監査目的だけで行う根拠がないため。
- 自動テスト: テストコードとテスト用スクリプトを確認できない。

## 完成している範囲

### 1. 一連のUIフロー

記憶断片の入力、条件割付、3回の追質問、回想文生成、6項目の7件法評価、完了記録までの状態遷移が実装されている。

original_text — `type Phase = "initial" | "followup" | "generating" | "evaluation" | "complete";`

source — `/Users/miramiki/dev/labResearchProject/expTest1/app/page.tsx:7`

note — 画面フローの骨格は揃っている。研究仕様の妥当性が確定したことを意味しない。

### 2. 三条件と3回の追質問

`standard`、`odor`、`nonOdor`の三条件があり、セッション開始時にランダムまたは研究者の手動選択で割り付けられる。各条件の指示をLLMへ渡し、最大3問を生成する。

original_text — `const maxFollowups = 3;`

source — `/Users/miramiki/dev/labResearchProject/expTest1/app/page.tsx:75`

note — 回数は固定されているが、質問文はLLMによる動的生成であり、条件間の長さ・難易度・誘導性・回答量は統制されていない。

original_text — `return \`Ask about event-centered remembering such as what happened, where the participant was, who was present, what they were doing, where they were going, or what happened next. Do not focus on a sensory modality unless the participant has already introduced it.\`;`

source — `/Users/miramiki/dev/labResearchProject/expTest1/app/api/followup/route.ts:51`

note — 未確定だったStandard条件に実装上の暫定定義は存在する。ただし、これは研究上の確定仕様ではなく、質問全文・対応表・操作意図も未定義である。

### 3. 同一の回想文生成処理

全条件で、初期断片と追質問への回答から英語4〜6文の一人称回想文を生成する。生成APIでは条件値を検証・返却するが、条件別の生成指示には分岐していない。

original_text — `- Write 4 to 6 sentences.`

source — `/Users/miramiki/dev/labResearchProject/expTest1/app/api/generate/route.ts:104`

note — 質問操作だけを比較する設計には整合する。一方、「過度な創作を避ける」だけで、未提供事実の追加を禁止・検出する仕組みはない。

### 4. 評価・保存・出力

Scene Construction、Narrative Vividness、Affective Atmosphere、Memory-Likeness、Emotional Connection、System Preferenceの6項目を1〜7で保存する。質問、回答、対話ログ、生成文、評価値、時刻をブラウザの`localStorage`へ保存し、JSON出力できる。

original_text — `const storageKey = "odorMemoryPrototypeRecords";`

source — `/Users/miramiki/dev/labResearchProject/expTest1/app/page.tsx:76`

note — デモデータの確認には使えるが、参加者識別、サーバー側の安全な保存、バックアップ、アクセス制御、データ削除手続きはない。

## 研究実験として未完成の範囲

| 項目 | 現状 | 判定 |
|---|---|---|
| 条件割付 | `Math.random()`による単純割付、手動強制も可能 | 部分実装。均衡割付、割付ログ、再現性なし |
| 条件盲検化 | 条件選択カードと現在条件名を画面表示 | **未達。要求と実装が矛盾** |
| 条件別追質問 | 現行コードは動的生成。固定質問文v0.1.0はDEC-029により旧仕様 | 生成プロンプト・検査・ターン数の確定と実装が必要 |
| 質問の統制 | 条件制約付き生成＋検証器＋再生成上限＋フォールバックを実装（v0.2.2、コミット`e381dfc`） | パイロット検証合格。正式ターン数・プロンプト最終版・v0.2.2実API再実行・Fableレビューが未了 |
| 初期想起トリガー | 自由記述1欄 | 時期・出来事範囲・想起不能・センシティブ記憶対応なし |
| Manipulation Check | なし | 未実装 |
| 主要評価項目 | 6つの独自ラベルを同格で提示 | 未確定。既存尺度・主仮説との対応なし |
| 回答必須性 | スライダー初期値4のまま保存可能 | 未達。未回答と中立回答を区別不能 |
| LLM再現性 | 追質問生成は全試行・モデル・request ID・違反コード・提示元・フォールバックIDを記録（`e381dfc`） | 追質問側は改善。回想文生成側の再現性ログは未確認・未実装 |
| 事実追加防止 | `Avoid excessive fictionalization`のみ | 不十分。禁止・照合・フラグなし |
| エラー処理 | UI表示とHTTPエラー応答あり | リトライ、タイムアウト、復旧、失敗ログなし |
| 同意・倫理 | なし | 未実装 |
| 個人情報保護 | ブラウザ保存、OpenAI APIへ記憶本文を送信 | 本番利用不可 |
| データ管理 | localStorage、手動JSON出力・削除 | 本番利用不可 |
| 日本語対応 | UI・質問・生成文・臭気語検出が英語 | 日本語参加者を対象にするなら未実装 |
| 自動テスト | なし | 未実装 |

### 条件盲検化の矛盾

original_text — `The app randomly assigns one of three hidden systems: standard, odor-based, or non-odor sensory.`

source — `/Users/miramiki/dev/labResearchProject/expTest1/README.md:33`

note — READMEは「hidden」とするが、UIは条件カード、説明文、`Current: Odor-Based System`等を表示する。デモ動画でも参加者から条件が判別できる。期待効果と需要特性を持ち込むため、実験画面から研究者用UIを分離する必要がある。

### 評価尺度の問題

original_text — `const initialRatings: Ratings = { sceneConstruction: 4, narrativeVividness: 4, affectiveAtmosphere: 4, memoryLikeness: 4, emotionalConnection: 4, systemPreference: 4 };`

source — `/Users/miramiki/dev/labResearchProject/expTest1/app/page.tsx:138`

note — 全項目が初期値4で、操作しなくても送信できる。欠測ではなく中立回答として記録されるため、データ品質上の欠陥になる。また、主要評価項目とManipulation Checkが区別されていない。

### モデル・プロンプトの再現性

original_text — `model: process.env.OPENAI_MODEL || "gpt-4o-mini",`

source — `/Users/miramiki/dev/labResearchProject/expTest1/app/api/followup/route.ts:144`

note — 環境変数でモデルを変えられるが、実際に使ったモデル名を各記録へ保存しない。コードの温度とプロンプトもバージョン識別子がないため、実験後に生成条件を再構成できない。

### データ管理の限界

original_text — `This remains a prototype. It does not implement consent, participant identity management, secure server-side storage, counterbalancing, audit controls, or production data governance.`

source — `/Users/miramiki/dev/labResearchProject/expTest1/README.md:39`

note — README自身が本番実験に必要な基盤の欠如を認めている。ここを無視して参加者募集へ進むのは不適切である。

## セキュリティ進捗（2026-07-16更新）

前回監査で指摘された配布用`.env.example`の実キーは、プレースホルダーまたは空値へ変更されており改善済みである。ユーザーから、旧APIキーの失効操作と管理画面での目視確認が完了したとの報告を受けた。`.env.local`には非プレースホルダー値が残るが、値は記録へ転記せず、現行の秘密値として扱う。

2026-08-16時点で、`expTest1`はGitリポジトリであり、`.env.local`は`.gitignore`の対象、`.env.example`だけが追跡対象であることを確認した。
`mockExperimentSystem`にも`.env.local`が存在するが、値は本監査文書へ転記していない。
過去の共有、バックアップ、同期先への混入有無は、この確認だけでは判定できない。

original_text — `Set OPENAI_API_KEY in .env.local.`

source — `/Users/miramiki/dev/labResearchProject/expTest1/README.md:12`

note — 配布用設定ファイルの無害化と旧キーの失効操作・画面確認は完了扱いとする。ただし、秘密値を文書やチャットへ転記しない運用は継続する。

## 進捗の更新

以前「Next.jsで作成されたこと以外は不明」だった実装状況は、次のように更新する。

- **確認済み**: Next.js 15 / React 19、三条件、単純ランダム割付、条件別のLLM追質問、3回固定の対話、共通LLM回想文生成、6項目評価、対話・時刻ログ、localStorage保存、JSON出力、エラー表示、ビルド可能なコード、デモ動画、配布用`.env.example`のプレースホルダー化。
- **旧仕様・上書き**: Standard / Non-Odor / Odor-Oriented各5問の固定質問、日本語原版、英語対応版、固定順序、回答形式、文字数上限。現行方針はDEC-029の条件制約付きLLM生成質問。
- **仕様初稿作成済み・未実装**: 全条件共通の初期想起トリガー、日本語原版、英語対応版、2〜4文の回答、想起不能・回答拒否・中止・1回の再試行の扱い。
- **仕様初稿作成済み・未実装**: Manipulation Check 3項目、データ品質診断2項目、7件法、主要操作対比、成立判定、参加者除外に使わない方針。
- **部分実装**: 初期想起、条件割付、生成制約、再現性ログ、エラー処理、臭気語検出。
- **未実装または未確定**: 条件盲検化、Manipulation Check、4評価項目の正式尺度文、参加者設計、参加者同意、API送信説明、安全な保存、削除権、均衡割付、自動テスト、日本語対応、分析計画との接続。倫理審査は行わない決定だが、同意・個人情報保護の実装は未完了。

## 暫定研究計画書との整合性（2026-07-10更新）

`/Users/miramiki/Downloads/Form1_E_RPlan_1022170-2026-06-22.pdf`と実装を比較した。

| 計画書の要件 | expTest1 | 差分 |
|---|---|---|
| 三つの条件別質問 | 現行コードは動的生成。DEC-029で方向は一致したが、生成制約とログは未実装 | プロンプト・品質検査・ターン数の確定、実装、パイロットが必要 |
| 4評価項目 | 4項目に2項目を追加した6項目 | 追加2項目を外し、4項目の正式項目文・尺度を確定する必要 |
| 質問ログと生成文 | localStorageに保存 | 本番用データベースなし |
| 基本参加者情報 | 未実装 | 年齢、国籍、性別、文化的背景、言語の取得案あり |
| Manipulation Check | 未実装 | 計画書のログ分析だけでは自己報告操作確認にならない |
| 英語の記憶断片 | 英語UI・英語出力 | 対象者の英語能力と募集基準が未決定 |
| 人間評価をPrimary、テキスト分析をSecondary | 評価UIあり、分析処理なし | 統計計画・テキスト分析コードなし |

original_text — “The main tools will be a web-based prototype, an LLM API, a database for storing question logs and generated narratives, and an evaluation form for participant responses.”

source — `/Users/miramiki/Downloads/Form1_E_RPlan_1022170-2026-06-22.pdf`, p. 3, middle.

note — Web UIとLLM APIは技術デモとして実装済みだが、研究計画が要求するデータベースと評価仕様は未完成である。

## expTest1監査時点の作業順（上書き済み）

この順序は2026-07-10時点の記録である。
現行の優先順は末尾の`mockExperimentSystem`節を使う。

1. **APIキー失効操作・目視確認と`.env.example`無害化は完了。** 秘密値を共有しない運用を継続する。
2. `docs/project/tasks.md`で題名、4項目の統計的位置づけ、参加者言語、LLMモデル版、追質問数のルール、保存方針、主要対比、サンプルサイズを確定する。
3. 作成済みの`experiment/conditions.yaml` v0.1.0を指導教員レビューと認知インタビューで検証し、修正後に版を凍結する。
4. 参加者画面と研究者画面を分離し、条件名・説明・割付操作を参加者から隠す。
5. 作成済みの`docs/protocol/initial-recall-trigger.md` v0.1.0をレビュー・認知インタビューで検証し、初期想起トリガー、想起不能、センシティブ記憶、同意、API送信説明を実装する。
6. 評価項目を確定尺度へ置換し、未回答を検出し、`experiment/manipulation-check.yaml` v0.1.0をレビュー後に実装する。
7. prompt version、model、temperature、token usage、request ID、割付方法、失敗を各セッションに保存する。（追質問生成は`e381dfc`で対応済み。回想文生成側が残る。）
8. サーバー側保存、アクセス制御、保持・削除手続きを決めた後に実装する。
9. 大学院入試（2026年8月5日・6日）を外部予定として考慮し、単体・API・E2Eテストと三条件の内部試験を行い、その後に小規模パイロットへ進む。

## decisions.md追記後の進捗同期（2026-07-15）

### 反映された方針

- 評価画面の中心セットは4項目（Scene Construction、Narrative Vividness、Affective Atmosphere、Memory-Likeness）で整理された。現行コードの6項目はまだ削除・置換されていない。
- 指導教員の指示により、固定質問文v0.1.0ではなく、条件制約付きLLM生成質問へ方針変更した。全条件で同一ターン数を使う必要があるが、正式なターン数、生成プロンプト、品質検査、再生成・フォールバック規則は未確定である。
- UI・質問・生成文は参加者の使用言語に合わせて変更可能にする方向が示された。英語固定の実装は未達である。
- LLMは4o系統を採用する方向が決まったが、`gpt-4o-mini`を本実験の具体的モデルとして確定したわけではない。
- 研究題名の候補として「How Questioning Strategies Shape Autobiographical Narrative Reconstruction」が追加された。独立変数との整合性は改善するが、「reconstruction」の含意はDEC-005と再確認が必要である。

### DEC-011に関する重要な未解決点

ユーザー追記は「まずB（4項目すべてを主要評価項目）で結果を得て、その後Aへ変更する」案である。しかし、結果を見てから主要評価を変更すると確認的分析ではなくなる。したがって、本実験前にBを事前登録する、またはBを探索的パイロットとして扱い、Aを検証する独立データを別途収集する必要がある。

original_text — 「とりあえずBにして結果を得てからAとしてもいいと考える。」

source — [`docs/project/decisions-active.md`](decisions-active.md) DEC-011追記（2026-07-15確認）

note — これは実装の問題ではなく、主仮説・多重比較・サンプルサイズを先に固定する研究設計上の問題である。

## 生成質問パイロット検証の反映（2026-07-16）

Codexが再生成・フォールバック機構を実装し（コミット`e381dfc`）、パイロット検証に合格した。詳細と留保はDEC-030を参照。

- **実装済み・検証済み**: 初回＋最大2回再生成（合計3試行）、違反コード付き再生成プロンプト、条件・ターン・匂い非想起対応の固定フォールバック質問バンク、フォールバックへの同一検証器適用、有効フォールバック枯渇時のエラー停止、全試行・モデル・request ID・違反コード・提示元・フォールバックIDの参加者記録への保存。
- **検証結果**: 実API（v0.2.1）で54問中再生成7ターン・フォールバック0・最終違反0・会話エラー0。乾式強制試験（v0.2.2）でフォールバック2件・最終違反0。lint・build・匂い想起可否の分岐試験通過。
- **Fableレビュー第1回（2026-07-16）**: High 2件・Medium 6件・Low 3件・研究判断2件。Codexがコミット`6848520`で反映し、v0.2.4実APIまで再実行済み。詳細は `expTest1/artifacts/prompt-pilot/fable-review-2026-07-16.md`。
- **Fableレビュー第2回（2026-07-16、v0.2.4対象）**: 第1回指摘の修正を確認。ただし新規High 1件（Standard条件への「雰囲気」「look like」混入。二条件でほぼ同一質問が提示され条件対比が質問レベルで消失）、Medium 3件（初期断片既知情報の再質問、再試行7→15ターンへの倍増とフォールバック率上昇、存在前提の身体感覚質問）。判定は本番承認不可・v0.2.5で再実行。詳細は `expTest1/artifacts/prompt-pilot/fable-review-2026-07-16-r2.md`。
- **Fableレビュー第3回（2026-07-16、v0.2.8対象）**: 第2回High（Standard条件汚染）は解消を確認。独立変数整合ゲート新設・PASS。新規High 1件（視覚質問が「色」テンプレートへ収束し作話圧。検証器が顕著性ベースの自然な質問を棄却する選抜圧が原因）、Medium 3件（「役割」質問、フォーカス判定の偽陽性、条件相関のフォールバック率＝R-03新設）。判定は「条件純度合格、v0.2.9修正後に第4回簡易確認で打ち切り、人間パイロットへ移行推奨」。詳細は `expTest1/artifacts/prompt-pilot/fable-review-2026-07-16-r3.md`。
- **未了**: v0.2.9（H-01視覚質問の顕著性ベース化、H-02口語形、H-03判定正規化）と第4回簡易確認、R-01〜R-03の教員判断、正式ターン数・プロンプト最終版・品質検査閾値の確定、回想文生成側の再現性ログ、認知インタビューまたは小規模人間パイロット。

original_text — `Fallback deliveries: 0` / `Final validation flags: 0`

source — `/Users/miramiki/dev/labResearchProject/expTest1/artifacts/prompt-pilot/report.md:11`（11・13行）

note — 実APIではフォールバック経路が一度も踏まれていない。フォールバックの動作証拠は乾式強制試験のみである。

この結果はDEC-009の判定を変えない。「再生成・フォールバック機構のパイロット合格」であり、本番品質合格ではない。自動検査は条件語・形式の違反を検出するが、質問の意味的な自然さと回答可能性を保証しない。

## memoryExperimentSystem設計レトロスペクティブの反映（2026-07-16）

`memoryExperimentSystem`（production candidate）に対する設計レトロスペクティブが作成され、DEC-031として暫定方針を登録した。旧システムは削除し、履歴・再利用判断・検証結果を `docs/archive/memory-experiment-system-archive.md` に保全した。進捗上の意味は次のとおり。

- **判定**: `memoryExperimentSystem`は「コードが動かない」のではなく、研究プロトコル未確定のまま運用規模の大きい基盤（複数site、開始コード、割付、監査、export、backup）を先に作ったため、変更単位が大きくなり保守費用が研究上の利益を上回り始めた。機能追加は一旦停止する。
- **進捗としての位置づけ**: expTest1が「技術デモとしては完成、実験としては未完成」であるのと対で、memoryExperimentSystemは「基盤としては丁寧、卒業研究の道具としては過大」。どちらも本実験へ直接は進めない。
- **回収できる資産**: サーバー側の秘密・割付境界、参加者ブラインド、決定論的mock、SQLite保存、再現ログ設計、機械的検証と意味的妥当性の分離、DEC-030までのプロンプト・検証器の知見。これらは次期最小構成版へ引き継ぐ。
- **次期版の完成形**: `開始 → 同意 → 一文入力 → 6質問 → 文章生成 → 評価 → SQLite保存 → 完了`の一本を、実ブラウザ・実APIで妥当と確認するまで横方向の機能を足さない。
- **未了・保留**: 作り直しの正式決定（指導教員確認）、PROTOCOL.mdの確定、既存検証資産の移植範囲、入試日程（8月5日・6日）との工数整合。

original_text — 「このシステムは、コードが動かないから破綻し始めたのではない。」

source — `docs/archive/memory-experiment-system-archive.md`, 「保全対象の結論」

note — 進捗の後退ではなく、スコープ判断の記録である。実装能力の問題として扱わない。

original_text — 「この一本が実ブラウザと実APIで妥当と確認されるまで、複数site、複数provider、汎用export、削除監査、遠隔運用を追加しない。」

source — `docs/archive/memory-experiment-system-archive.md`, 「反省と作り直し方針」

note — 次期版の進捗判定は機能数ではなく、この縦一本の完走と人手レビュー結果で行う。

### 次の作業順への影響

既存の「次の作業順」2〜9は有効だが、着手順を修正する。システム実装（4〜8相当）は、`../protocol/PROTOCOL.md`一枚の確定と指導教員確認（DEC-031前提条件）より先に行わない。決めるより先に作ることが、expTest1とmemoryExperimentSystemに共通する失敗様式だったためである。

## 研究者追記の同期（2026-07-17）

2026-07-16付の研究者によるdecisions.md追記を反映した。

- **初期断片は一文**（DEC-015追記）: 旧2〜4文・500/1000字上限を失効。`docs/protocol/initial-recall-trigger.md`をv0.1.1へ改訂済み。一文の技術的上限は未決定。
- **6ターンを暫定決定**（DEC-029追記）: パイロット版から適用。理由は最終文章の情報量確保。正式値の承認と参加者負担の人間確認は残る。
- **パイロット版は日本語のみ**（DEC-016追記）: 英語版の実装・翻訳同等性検証はパイロットの要件から外れる。
- **生成パラメータの変数一元化**（DEC-030追記）: ターン数・モデル・温度・プロンプト版・検査閾値・フォールバック規則を一箇所の設定として操作可能にする。次期最小構成版の`lib/protocol.ts`集約方針（DESIGN_RETROSPECTIVE推奨アーキテクチャ）と同一の要求である。
- **生成質問の方向づけ**（DEC-025 note追記）: 初期記憶断片を入力として、出来事に関連した記憶を掘り出す質問を生成する。

整合上の注記: 一文の初期断片＋6ターンは、保全記録に残した v0.3.0 DRAFT パラメータと一致する。研究者追記はv0.3.0の形を暫定プロトコルとして追認したことになるが、v0.3.0自体はNOT FROZENであり、人手レビュー（Fable第4回相当）と指導教員承認は未了のままである。

original_text — `This version changes the protocol from three to six equal follow-up turns. It also changes the initial-fragment instruction to one sentence`

source — `docs/archive/memory-experiment-system-archive.md`, 「研究プロトコル候補」

note — 追記された暫定決定とv0.3.0 DRAFTは同一構成。プロトコル仕様の確定作業はこの版を土台にできる。

## mockExperimentSystemの現状（2026-08-16）

`mockExperimentSystem`は、`../protocol/PROTOCOL.md` v0.3.0-draftとPrompt Catalog v0.4.1-draftを参照するローカルの参加者フロー確認用mockである。
同意、一文の初期想起、条件を表示しない三条件割付、6回の追質問、最終文章生成、12評価項目、Manipulation Checkと品質診断、デブリーフィング、CSV保存までの縦一本が実装されている。
`npm run typecheck`と`npm run build`は2026-08-16に成功した。
ただし、Next.jsは上位ディレクトリにも`package-lock.json`があるためワークスペースルート推定の警告を出しており、ビルド失敗ではないものの設定は未整理である。

現行の実行版は`prompts/v0.4.1-mock-draft/`であり、条件はStandard / Visual / Odorである。
条件焦点、ターン機能、対象証拠ID、非想起・証拠不足分岐を質問出力へ含め、参加者へ返す前にサーバーで検査する。
最終文章は初期断片と参加者回答だけを証拠とし、最低文数を設けず、各文の`evidenceIds`について未知ID、空ID、非想起回答の参照を拒否する。
旧v0.3.0実行版と2026-07-25の評価結果は比較履歴として残す。
2026-07-25の実API評価では、180問すべてが実行時検証器を通過した一方、独立判定でStandard条件への感覚・感情混入、条件間で異なるターン機能、非対称な非想起処理を確認した。
最終文章では、全30セッションに証拠外の内容が含まれ、条件外の匂い語も4件あった。

original_text — 「30セッション全部で、証拠にない内容が事実として文章に入っている。」

source — `mockExperimentSystem/artifacts/prompt-eval-2026-07-25/report.md`, 「4. 最終文章の証拠逸脱」

note — 現行v0.3.0の形式検証合格は、意味的な証拠忠実性や独立変数の純度を保証していない。

同じ証拠を固定した対照評価では、v0.4.0の文章制約により証拠逸脱率が57.0%から2.5%へ下がり、ペルソナを外して結語を禁止した変種Cでは0.0%だった。
ただし、文数下限を外すと条件間の文章長が最大1.5倍に開き、質問側の証拠量差が新しい交絡になる。
この結果を踏まえ、DEC-033・034で三条件、ターン機能、全ターンの非想起処理、文章の証拠制約を採用した。ただし、この判断は旧v0.4.0全文の無修正採用ではない。

original_text — 「v0.4.0 §2 は狙いどおり効く。証拠逸脱を 57.0% から 2.5% へ、条件外の匂い語混入を4件から0件へ落とす。」

source — `mockExperimentSystem/artifacts/prompt-eval-2026-07-25/v040-decision.md`, 「1. 文章生成側の対照実験」

note — 効果は合成ペルソナ30セッションと単一のLLM判定者による結果であり、人間参加者での妥当性を示さない。

### 実装済み範囲と未達

| 項目 | 現状 | 判定 |
| --- | --- | --- |
| 参加者フロー | 同意からCSV保存まで実装。条件名は回答終了まで非表示 | mockの画面確認には使用可能 |
| 追質問 | Standard / Visual / Odor、日本語6ターン、共通ターン機能、毎ターン非想起検出、3試行、検証済みフォールバック | 実APIスモークは通過。Visualターン1とOdor非想起後でフォールバックを確認。30件再評価前 |
| 最終文章 | 条件盲検、初期断片と回答だけを証拠とする1〜10文、文ごとの`evidenceIds`検査、最大3試行 | 実APIスモークで3文生成と非想起回答IDの不使用を確認。意味的忠実性の30件再評価前 |
| 評価 | 4軸各3項目、MC 3項目、品質診断3項目。未回答送信を防止 | UI実装済み。項目の研究上の承認は未了 |
| 保存 | ローカル`data/results-v0.4.1.csv`へ質問メタデータと文章証拠IDを含めて追記し、session ID重複を拒否 | 旧データと分離。mock用途のみ。SQLite、撤回削除、アクセス制御なし |
| 割付 | 有効な初期断片の送信時にクライアントの`Math.random()`で割付 | 参加者からは非表示。本番要件のブロック無作為化と割付ログは未実装 |
| 再現ログ | バッチ側は試行数と棄却理由をJSONLへ保存 | 参加者CSVにはモデル、request ID、prompt version、temperature、token usage、失敗ログを保存しない |
| 自動テスト | `typecheck`、`build`、30セッション構成のdry-runが成功。実APIで3条件ターン1、Odor非想起ターン2、証拠ID付き文章を確認 | 単体テスト、ブラウザE2E、30セッション実API再評価は未実施 |
| データ保護 | API要求は`store: false`。APIキーはサーバー環境変数 | 入力は外部APIへ送信。研究用の保持、削除、匿名化手続きは未実装 |

### 現在の作業順

1. **完了**: DEC-033・034とPrompt Catalog v0.4.1-draftを、実行時プロンプト、条件型、検証器、フォールバック、MCへ同期する。
2. 同じ合成ペルソナ30件で再評価する。提示時違反、条件別非想起率、証拠量、文章長、証拠逸脱、条件外語彙、条件別フォールバック率をゲートにする。
3. 機械評価を通過した後に、小規模な人間パイロットで質問の自然さ、6ターンの負担、評価項目の理解、短文化後の評価レンジを確認する。
4. H1の検定法、多重比較、目標Nを確定し、`../protocol/PROTOCOL.md`を凍結する。
5. 本番用のサーバー側割付、SQLite保存、再現ログ、撤回削除、テストを実装する。

この順序を飛ばして現行mockで人間パイロットを行うと、参加者コストを既知のプロンプト欠陥の再確認に使うことになる。

## 2026-09-02 現行質問版v0.4.2

DEC-035に基づき、質問の必須検証を条件への適合、実験情報の非開示、出力形式、重複へ限定した。
文字数、疑問符数、接続語、顕著性語、初回の文型、必須語、証拠中の語彙、同じ証拠IDの再利用、ターン機能の順序を理由とする棄却を廃止した。
非想起の検出は補助情報とし、材料不足による中立質問への移行はどのターンでも許す。
旧版の質問プロンプトは比較用に残し、文章生成はv0.4.1を変更せず継続する。
保存先は`data/results-v0.4.2.csv`。

`npm test`の10件、型検査、ビルド、合成バッチdry-runが成功した。
最終コードの実APIスモークは三条件×2問の6問で、全問初回生成を採用し、固定質問への切替は0だった。
この6問から、全体の条件違反率やフォールバック率は推定しない。
実装中に実APIで発見した感情質問と発生源質問の見逃しは、条件制約として修正し回帰テストへ追加した。

original_text — `"generated": 6,` / `"fallback": 0,` / `"attempts": 6,`

source — `artifacts/validation-v042-2026-09-02/report.md`およびローカルの`live-results.json`。

note — 決定の正本はDEC-035。固定の言い回しを要求する検査は撤去したが、語彙チェックによる条件判定には誤検出と見逃しが残る。全条件30セッションの品質再評価は別途必要。


## 2026-09-02 創作を許す文章生成v0.4.3

DEC-036に基づき、主仮説と主対比を維持したまま、AIの創作を含む物語への読後反応を研究対象にした。
文章生成の証拠必須を廃止し、素材参照と創作追加の自己申告を保存する。
共通の参加者説明と同意文、Protocol v0.4.0、Prompt Catalog v0.4.3へ同期した。
結果は`data/results-v0.4.3.csv`へ保存し、旧版は履歴として保持する。

技術検証の結果は`../../artifacts/validation-v043-2026-09-02/report.md`を参照。
新方針の実APIによる出力品質評価と本人評価は未了であり、旧版の証拠逸脱率を新方針の合否として使わない。

## 2026-09-06 回答状態を優先する質問生成v0.4.4

DEC-039に基づき、ターン別の推奨順序を外し、初期断片と全質問・回答から対象ごとの既知・不明・既質問の内容を読んで次の一問を選ぶ指示へ変更した。質問本文は日本語・英語ともv0.4.4、文章生成はv0.4.3を維持する。固定フォールバックのターン依存と未確認対象を前提とする深掘りを外し、質問と文章の版を各生成記録で区別する。保存schema v2と既存結果は変更していない。

統合後に`npm test`（40件成功）→`npm run typecheck`→`npm run build`を順に実行し、すべて成功した。全履歴・古い回答ID・部分想起の受け渡し、ターン位置によらない機能選択、日英の固定フォールバック、従来の棄却と3試行、生成記録の版をオフラインで確認した。変更文書のMarkdown参照先と`git diff --check`も確認した。

READMEのオフラインfixtureを使い、Chromium（Chrome）の画面操作で日本語・英語×Standard・Visual・Odorの6セッションを実施した。各6問から文章表示、評価12項目、確認6項目、完了保存まで成功し、ブラウザ実行エラーは0件。保存はfixtureのメモリ内だけで行い、6件の質問生成記録がv0.4.4、文章生成記録がv0.4.3であることを検査した。両言語の質問6画面も画像で確認した。最初の画面確認は装飾されたradioのinputを直接クリックするテスト操作でタイムアウトしたため、表示されているlabelをクリックし選択状態を確認する操作に修正して再実行した。アプリ側の変更は不要だった。

実API・ペルソナバッチ・Supabase操作は実行していない。画面fixtureの質問は固定フォールバックであり、実モデルによる回答状態判断や質問の意味的品質を検証した結果ではない。固定フォールバックでは非想起の語彙ヒントを使うため、部分想起でも中立質問へ移る場合がある。新方針の出力品質と条件別の中立移行・フォールバック頻度は未評価。


## 2026-09-06 質問v0.4.4の限定実API検証

Lunaによる実行・解析と親による生ログ照合を行った。最初の54質問・9文章を主集計とし、固定フォールバックはStandard 6/18、Visual 0/18、Odor 1/18。非想起後の再追及、Standardでの条件外質問の通過、未報告の同行者の存在前提が確認された。文章にも、創作した詳細を本人の確かな想起として述べる懸念がある。

検証スクリプト側の再開不整合による400が2件、追加の重複実行が5質問・1文章あった。これらは記録を保持し主集計から分離した。具体・部分想起の模擬回答器に質問との不一致があり、履歴メタデータも実画面とは異なるため、自然な回答への適応性能を検証したとは扱わない。研究上の承認状態は変わらない。

詳細、集計定義、原文例、制約は[実API検証レポート](../../artifacts/validation-v044-live-2026-09-06/report.md)。質問・文章の生成モデルは既存設定の`gpt-4o-mini-2024-07-18`。実APIの追加検証は行ったが、プロンプトやアプリコードを今回の解析で修正していない。
