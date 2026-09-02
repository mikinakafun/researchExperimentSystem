# MASTER — 研究プロジェクトの単一入口

- 作成日: 2026-07-16
- 目的: 分散した文書の「どれが正本で、どれが履歴か」を一枚で示し、決定すべき事項を優先順に集約する。
- 2026-07-16整理: 約80あった文書を38へ削減。正本から引用されていない中間検証ログ（v0.1.x、v0.2.3〜0.2.7、v0.2.8乾式、v0.2.9乾式）、レビューパケット、移行完了記録を削除した。以後、検証ログは「最終結果＋正本から引用されるもの」だけを残す。
- 運用ルール:
  1. **決定の正本は`docs/project/decisions.md`だけ**。新しい決定・変更はそこにのみ追記し、本書は地図として更新する。
  2. 本書に事実の詳細を書かない。詳細は正本へのリンクで示す（同じ事実を二箇所に書くと必ず矛盾する）。
  3. 迷ったら本書→`project/decisions.md`の順で読む。他の文書はこの二つから辿る。

## 現在地（3行）

1. 研究: 三条件（Standard / Visual / Odor）の質問焦点がLLM生成物語の本人評価（主=Perceived Memory-Likeness、他3軸は副）へ与える影響。被験者間、日本語基本。主たる計画対比はOdor対Visual。
2. 実装: 全体版はv0.4.3。質問はDEC-035、創作を許す最終文章はDEC-036に従う。30件再評価と本人評価の確認前。研究実施の承認状態は変更していない。
3. 律速: 同じ合成データ30件で機械再評価し、質問違反、条件別フォールバック率、入力量、文章長、入力との矛盾と創作追加の傾向を確認すること。その後に教員確認と小規模な人間パイロットへ進む。

## 文書地図

文書は用途ごとに配置する。正本・草案・履歴の状態は、以下の各一覧と文書内の状態表記で確認する。

| ディレクトリ | 文書の種類 |
| --- | --- |
| [project/](project/) | 意思決定・実装進捗 |
| [protocol/](protocol/) | 実験プロトコル・同意文・初期想起・操作確認 |
| [prompts/](prompts/) | プロンプトカタログ・Codex作業指示書 |
| [research/](research/) | 研究背景・研究計画とプロジェクト管理のレビュー |
| [archive/](archive/) | 旧仕様・旧システムの保全記録 |

実行時に読み込むプロンプト本文は、プロジェクト直下の[prompts/](../prompts/)で管理する。

### A. 正本（現行・これだけ維持更新する）

| ファイル | 役割 |
| --- | --- |
| [MASTER.md](MASTER.md)（本書） | 入口・地図・決定待ちリスト |
| [project/decisions.md](project/decisions.md) | 全決定の正本（DEC-001〜036、状態・根拠・履歴付き） |
| [project/prototype-progress.md](project/prototype-progress.md) | 旧2実装と現行mockの進捗・判定の正本 |

### B. 仕様初稿（レビュー待ち。承認されれば次期PROTOCOL.mdへ統合）

| ファイル | 内容 | 状態 |
| --- | --- | --- |
| [protocol/PROTOCOL.md](protocol/PROTOCOL.md) | パイロット実験プロトコル仕様 v0.4.0-draft。確定・暫定・未決定と承認ゲートG1〜G5を集約 | DRAFT。創作方針をmockへ同期。新方針の出力品質評価前 |
| [protocol/consent-form-ja.md](protocol/consent-form-ja.md) | 参加者向け同意文 v0.2.0-draft（DEC-019、036） | 連絡先・所属機関窓口の記入と教員確認前 |
| [protocol/initial-recall-trigger.md](protocol/initial-recall-trigger.md) | 初期想起トリガー v0.1.2（DEC-015） | 指導教員レビュー・認知インタビュー前 |
| [protocol/manipulation-check.md](protocol/manipulation-check.md) + `experiment/manipulation-check.yaml` | Manipulation Check v0.2.0-draft（DEC-014、033） | 同上 |
| [archive/memory-experiment-system-archive.md](archive/memory-experiment-system-archive.md) | 削除した旧production candidateの履歴・再利用判断・検証結果 | 保全記録。仕様の正本ではない |
| [prompts/PROMPT_CATALOG_V0.4.1_DRAFT.md](prompts/PROMPT_CATALOG_V0.4.1_DRAFT.md) | Standard / Visual / Odor、共通ターン機能、証拠制約を定めた次期プロンプトカタログ | 旧版。質問はDEC-035、文章はDEC-036で更新 |
| [prompts/PROMPT_CATALOG_V0.4.2_DRAFT.md](prompts/PROMPT_CATALOG_V0.4.2_DRAFT.md) | DEC-035に基づく現行質問検証と生成方針 | DRAFT。30件再評価前 |
| [prompts/PROMPT_CATALOG_V0.4.3_DRAFT.md](prompts/PROMPT_CATALOG_V0.4.3_DRAFT.md) | DEC-036に基づく創作文章と作成記録 | DRAFT。出力品質評価前 |
| `prompts/` | 現行質問は`v0.4.2-mock-draft`、文章はv0.4.3。旧版は比較用 | 編集後にサーバー再起動 |

### C. 履歴・旧仕様（読む必要なし。削除もしない）

| ファイル | 上書き理由 |
| --- | --- |
| [archive/condition-question-matrix.md](archive/condition-question-matrix.md)、`experiment/conditions.yaml` | 固定質問方式v0.1.0。DEC-029（生成質問）で上書き。decisions.mdが参照するため保持 |
| [archive/memory-experiment-system-archive.md](archive/memory-experiment-system-archive.md) | 旧v0.2.9/v0.3.0候補の履歴を要約保全 |
| [prompts/codex-prompt-production-build.md](prompts/codex-prompt-production-build.md) | memoryExperimentSystem構築指示。DEC-031で役割終了。PHASE0_AUDITが参照するため保持 |

### D. 背景・レビュー記録（参照のみ。更新しない）

| ファイル | 内容 |
| --- | --- |
| [research/research-context.md](research/research-context.md) | ChatGPTプロジェクト移行時の統合コンテキスト（2026-07-10時点。以降はdecisions.mdが優先） |
| [research/research-plan-review.md](research/research-plan-review.md) | 暫定研究計画書PDF（2026-06-22版）のレビュー |
| [research/pm-review-2026-07-15.md](research/pm-review-2026-07-15.md) | プロジェクトマネジメント・レビュー |
| [prompts/codex-prompt-persona-batch.md](prompts/codex-prompt-persona-batch.md) | 合成バッチをペルソナ回答方式へ変更する作業指示書 |
| [archive/memory-experiment-system-archive.md](archive/memory-experiment-system-archive.md) | 旧production candidateの設計反省、ADR、運用、readiness、未決定事項を要約保全 |
| `expTest1/artifacts/prompt-pilot/`（6件: 最終report 3件＋Fableレビュー3件） | decisions.mdが引用する検証証跡のみ残存。中間版ログは2026-07-16に削除済み |
| [archive/memory-experiment-system-archive.md](archive/memory-experiment-system-archive.md) | v0.3.0乾式・旧実API検証・未解決リスクの結果を要約保全 |
| `mockExperimentSystem/README.md` | 現行mockの範囲、起動、バッチ検証手順、利用禁止範囲 |
| `mockExperimentSystem/artifacts/prompt-eval-2026-07-25/` | v0.3.0実API評価とv0.4.0対照評価。旧方針の評価履歴 |

## 確定事項の要約（詳細は`docs/project/decisions.md`）

- 実匂い刺激は使わず質問操作のみ（DEC-001）。三条件・被験者間（DEC-002）。ブロック無作為化＋割付ログ（DEC-003、運用値未定）。
- 本人評価が主要な研究結果（DEC-004）。主評価軸=Perceived Memory-Likeness（記憶様感）、副評価軸=Scene Construction Rating（情景構成感）、Narrative Vividness（叙述鮮明性）、Emotional Reliving（感情再体験感）。4軸は合算しない（DEC-010/011）。
- 生成文は「断片からの物語文章」と説明し「記憶の再構築」と言わない（DEC-005）。Manipulation Check実施・除外には使わない（DEC-006、DEC-014方針）。
- 共通の初期想起トリガーを使う（DEC-007）。初期断片は**一文の自由記述**（DEC-015追記、2026-07-16。仕様v0.1.1）。
- 日本語基本・英語版併設だが、**パイロット版は日本語のみ**（DEC-016追記、2026-07-16）。英語データは当面探索的。
- 追質問は条件制約付きLLM生成、全条件同一ターン数で、**パイロット版は6ターンを暫定採用**（DEC-029追記。理由: 最終文章の情報量確保。正式値の承認は残る）。再生成上限3試行＋フォールバック＋全ログ（DEC-030、パイロット合格・本番承認未了）。
- 生成質問は初期記憶断片を入力に、出来事に関連した記憶を掘り出す方向で生成する（DEC-025 note追記）。ターン数・モデル・温度・プロンプト版・検査閾値・フォールバック規則は、設計上一箇所の変数として設置し操作可能にする（DEC-030追記）。
- 三条件はStandard、Visual、Odorとし、独立変数を質問焦点（出来事構造、視覚、匂い）の三水準とする。主たる計画対比はOdor対Visualであり、「匂い対非嗅覚感覚全般」とは解釈しない（DEC-033）。
- 最終文章は初期断片と回答を素材とするAIの創作を許す。全条件で共通の生成処理と説明を使い、質問から創作を含む読後反応までの処理全体を比較する。作成記録は素材参照と追加の自己申告とする（DEC-036）。
- expTest1は技術デモ（DEC-009）。旧APIキー失効済み（DEC-026）。倫理審査は行わない、ただし同意・説明は必須（DEC-027）。入試は8月5-6日（DEC-028）。

## 決定すべき事項（優先順・依存順）

**Tier 0 — 今すぐ・指導教員と（他の全てを塞いでいる）**

| # | 決めること | 対応ID |
| --- | --- | --- |
| 1 | 作り直しの確定 | DEC-031（確定） |
| 2 | 独立変数の正式表現（質問焦点の三水準として決定。指導教員確認が残る） | DEC-024, 033 / OD-001 |
| 3 | 質問ターン数の正式承認（6ターンはパイロット暫定採用。残る判断は参加者負担・完遂率の確認と正式値の承認） | DEC-029追記 / OD-002 |
| 4 | 2026-07-25評価の研究判断はDEC-033・034で決定。残る作業は仕様の実装、共通ターン機能・全ターン分岐・条件別フォールバック率の機械再評価、指導教員確認 | DEC-029〜034 / OD-006, 022 |
| 5 | 承認した修正版を同じ合成データで再評価し、機械ゲート通過後に小規模な人間パイロットを実施する | DEC-030留保(4) / OD-016 |

**Tier 1 — PROTOCOL.mdを構成する研究仕様（コードを書く前に全て確定）**

| # | 決めること | 対応ID |
| --- | --- | --- |
| 6 | 初期想起トリガー最終文言（一文・100文字暫定は反映済み・仕様v0.1.2。残: 「1週間前」の妥当性、上限の正式承認、センシティブ対応の教員確認） | DEC-015 / OD-007 |
| 7 | Prompt Catalog v0.4.3-draftを同一合成データで再検証し、本人評価の確認を経て凍結する | DEC-012, 029〜034 / OD-006 |
| 8 | モデル版・temperature・再試行上限の正式値（4o系は方向のみ。`gpt-4o-mini`は未確定） | DEC-018 / OD-004, 005 |
| 9 | 4評価軸の項目文・尺度・得点化の最終化（日本語原案は作成済み。項目理解・妥当性・7件法は未承認） | DEC-010 / OD-009 |
| 10 | H1と主対比は決定済み。検定法・多重比較・除外規則を最終化する | DEC-011後半, 021 |
| 11 | Manipulation Check最終文言と英語版同等性 | DEC-014 / OD-010 |
| 12 | 同意文・API送信説明・撤回手続きの最終化（草案作成済み。連絡先・機関確認が残る） | DEC-019 / OD-008 |
| 13 | 保存項目・保持期間・削除方法（10年基準案は作成済み。所属機関規程・削除手順の確認が残る） | DEC-020 / OD-011 |
| 14 | DEC-036の創作方針で、入力との矛盾、文章量、条件別の追加内容を再評価する | DEC-032, 036 / OD-022 |

**Tier 2 — 募集・分析（Tier 1確定後、パイロット前）**

| # | 決めること | 対応ID |
| --- | --- | --- |
| 15 | 対象者・募集方法・除外基準 | DEC-017 |
| 16 | サンプルサイズと検出力、ブロックサイズ・割付seed | DEC-022, 003下位 / OD-003 |
| 17 | 事前登録の有無と登録先 | DEC-023 / OD-014 |
| 18 | 英語データの確認的分析への統合条件（パイロットは日本語のみ確定。本実験での英語版提供時期も要判断） | DEC-016下位 |

**判断不要（DEC-031により次期版のスコープ外）**: memoryExperimentSystemの`OPEN_DECISIONS.md`のうち工学項目（OD-012, 013, 017〜021, 023〜026: 認証、hosted DB、トランザクション設計、削除ledger、アクセシビリティ監査等）は、単一PC・単一run・単一SQLiteの制約下では要件が消えるか大幅に単純化される。作り直し確定まで凍結。

original_text — 「最大の誤りは、研究上の問いと運用形態が固まる前に「production candidate」を作ったことである。」

source — `docs/archive/memory-experiment-system-archive.md`, 「保全対象の結論」

note — `mockExperimentSystem`はこの順序より先に作られた検証用例外である。既知欠陥の修正と再評価が終わるまで、横方向の機能追加や本番実装への移植を行わない。

## 変更履歴

| 日付 | 変更 |
| --- | --- |
| 2026-07-16 | 初版。全文書を正本/初稿/履歴/証跡に分類し、DEC・ODを統合した決定待ちリストを作成。 |
| 2026-07-16 | 文書削減を実行。未引用の中間検証ログ約40件、レビューパケット、`CHATGPT_PROJECT_MIGRATION.md`、v0.2.9乾式ログを削除（80→38ファイル）。expTest1側はGit管理外のため復元不能、memoryExperimentSystem側は独立Git履歴に存在した。 |
| 2026-07-17 | 研究者によるdecisions.md追記を同期。初期断片は一文（DEC-015、仕様v0.1.1へ改訂）、6ターン暫定決定（DEC-029）、パイロット日本語のみ（DEC-016）、生成パラメータの変数一元化要件（DEC-030追記）。Tier 0 #3を「正式承認待ち」へ更新。 |
| 2026-07-17 | `docs/protocol/PROTOCOL.md` v0.1.0-draftを作成。DEC-031前提9項目を骨格に確定・暫定・未決定を集約し、承認ゲートG1〜G5（Tier 0対応）と残作業（研究者下書き可/教員承認要/人間確認要）を明示。 |
| 2026-07-17 | 作り直し方針、正式題名、3条件・被験者間・日本語パイロットを確定。6ターンはパイロット暫定採用、人間確認は小規模パイロットへ更新。独立変数の正式表現は未確定。 |
| 2026-07-17 | 評価体系を4評価軸へ更新。記憶様感を主評価軸、情景構成感・叙述鮮明性・感情再体験感を副評価軸とし、4軸を合算しない方針と、LLM再構成文への読後反応としての根拠をDEC-010/011へ反映。 |
| 2026-07-17 | DEC-032を反映。最終文章では初期断片・質問・参加者回答を証拠とし、未回答内容を除外。意味的な人間レビュー、短文化、作話発見後の特別処理は設定しない。 |
| 2026-07-17 | PROTOCOLをv0.2.0-draftへ。暫定値（初期断片100文字・最終文章10文・temperature 0.75継続）を正本と仕様v0.1.2へ同期。研究者下書きの残りは事実追加禁止規則と同意文の2点、他は教員承認と小規模パイロット確認待ちへ整理。 |
| 2026-07-17 | 参加者向け同意文草案`docs/protocol/consent-form-ja.md` v0.1.0-draftを作成。研究目的、手順、負担、外部API送信、保存、撤回・削除、連絡先、同意確認欄を含め、PROTOCOL・DEC-019・決定リストへ反映。 |
| 2026-07-17 | DEC-032（最終文章の証拠・レビュー規則）を同期。文書地図へ同意文草案とPROTOCOL v0.2.0を反映、Tier 1 #14をDEC-032決定済みへ更新し、教員への明示確認事項として意味的忠実性無保証の逸脱を登録。研究者下書きは全て完了。 |
| 2026-07-17 | DEC-032の決定理由（作話判定の原理的不可能性・叙述性喪失の実測）を正本へ記録し、測定のみの二対応を採用。DQ-UNSAID追加（MC v0.1.1）と証拠量対文章量比の診断指標（PROTOCOL v0.2.1-draft）。肉付けの条件相関を分析時に判別可能へ保つ。 |
| 2026-08-16 | 現行`mockExperimentSystem`と2026-07-25実API評価を同期。v0.3.0の不合格、v0.4.0の部分的な改善と未実装、READMEの正しいバッチ手順、機械再評価を人間パイロットより先に置く作業順を反映。 |
| 2026-08-16 | DEC-033・034を同期。三条件をStandard / Visual / Odor、主対比をOdor対Visualへ変更し、Prompt Catalog v0.4.1-draft、条件盲検の証拠制約付き文章生成、全ターンの非想起処理を次期仕様とした。コードは未変更。 |
| 2026-08-16 | Prompt Catalog v0.4.1-draftを`mockExperimentSystem`へ実装。三条件、共通ターン機能、全ターン非想起分岐、質問メタデータ検査、条件盲検の可変長文章、文別`evidenceIds`、v0.4.1専用CSVを反映。型検査・ビルド・実APIスモークは通過、30件再評価は未了。 |
| 2026-09-02 | 文書14件を用途別の5ディレクトリへ移動。MASTERを入口として維持し、文書間・タスク一覧・Obsidianの参照先を更新。 |
