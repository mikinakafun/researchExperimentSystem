# MASTER — 研究プロジェクトの単一入口

- 作成日: 2026-07-16
- 目的: 分散した文書の「どれが正本で、どれが履歴か」を一枚で示し、決定すべき事項を優先順に集約する。
- 2026-07-16整理: 約80あった文書を38へ削減。正本から引用されていない中間検証ログ（v0.1.x、v0.2.3〜0.2.7、v0.2.8乾式、v0.2.9乾式）、レビューパケット、移行完了記録を削除した。以後、検証ログは「最終結果＋正本から引用されるもの」だけを残す。
- 運用ルール:
  1. **実験システムを規定する決定の正本は`core/00-decisions/decisions.md`、研究プロジェクト運営の決定の正本は`docs/project/decisions-active.md`、やることの正本は`core/00-decisions/tasks.md`だけ**。全DECの索引と運用規則は`core/00-decisions/README.md`。上書きされた決定は`core/00-decisions/decisions-archive.md`へ移す。本書は地図として更新する。
  2. 本書に事実の詳細を書かない。詳細は正本へのリンクで示す（同じ事実を二箇所に書くと必ず矛盾する）。
  3. 迷ったら本書→`core/00-decisions/tasks.md`（次に何をするか）→`core/00-decisions/README.md`（どの決定がどこにあるか）→`core/DESIGN.ja.md`（仕様）の順で読む。他の文書はここから辿る。
  4. `core/`は自己完結の再構築仕様であり、将来は別ディレクトリへ切り出して実験システムの土台にする。`core/`内の仕様と決定が食い違ったら決定が正。仕様書の中で新しい判断をせず、先にDECを起こす。

## 現在地（3行）

1. 研究: **二条件（Visual / Odor）**の質問焦点がLLM生成物語の本人評価（主=Perceived Memory-Likeness、他3軸は副）へ与える影響。被験者間、日本語基本。H1はOdor対Visualの差（DEC-041、2026-09-07にStandard条件を廃止）。
2. 実装: 質問はDEC-035・039による回答状態優先のv0.4.4、創作を許す最終文章はDEC-036によるv0.4.3。**いずれもまだ三条件前提のコード・仕様のまま**で、二条件化はTASK-023で未着手。
3. 律速: 二条件化を仕様と実装へ反映すること（TASK-023）と、倫理審査の申請（TASK-024、DEC-042で方針変更）。機械再評価はプロンプト変更ごとの常時運用へ移し、人間パイロットの前置ゲートにしない（DEC-044）。

## 文書地図

文書は用途ごとに配置する。正本・草案・履歴の状態は、以下の各一覧と文書内の状態表記で確認する。

| ディレクトリ | 文書の種類 |
| --- | --- |
| [project/](project/) | 意思決定・実装進捗 |
| [protocol/](protocol/) | 実験プロトコル・同意文・初期想起・操作確認 |
| [prompts/](prompts/) | プロンプトカタログ・Codex作業指示書 |
| [research/](research/) | 研究背景・研究計画とプロジェクト管理のレビュー |
| [archive/](archive/) | 旧仕様・旧システムの保全記録 |

プロジェクト直下の[core/](../core/)は2026-09-07に作成された**再構築仕様**（実装のための仕様であり、既存コードの説明ではない）。`core/00-decisions/`に、システムを規定する決定・タスク・履歴・引用原文を置く。同日にPROTOCOL.mdは退役し、`core/DESIGN.ja.md`へ一本化した。

実行時に読み込むプロンプト本文は、プロジェクト直下の[prompts/](../prompts/)で管理する。

### A. 正本（現行・これだけ維持更新する）

| ファイル | 役割 |
| --- | --- |
| [MASTER.md](MASTER.md)（本書） | 入口・地図 |
| [`core/00-decisions/README.md`](../core/00-decisions/README.md) | **全DECの索引と運用規則**。所在（core / docs）とリンク |
| [`core/00-decisions/decisions.md`](../core/00-decisions/decisions.md) | 実験システムを規定する有効な決定（32件。各決定に反映先モジュール付き） |
| [project/decisions-active.md](project/decisions-active.md) | 研究プロジェクト運営の有効な決定（7件: DEC-008、009、026、028、031、040、042） |
| [`core/00-decisions/tasks.md`](../core/00-decisions/tasks.md) | 未了作業の正本（一つの一覧） |
| [`core/00-decisions/decisions-archive.md`](../core/00-decisions/decisions-archive.md) | 上書き・却下された決定と旧本文。引用原文は同ディレクトリの`provenance.md`（凍結） |
| [`core/DESIGN.ja.md`](../core/DESIGN.ja.md) | 仕様の正本（旧PROTOCOL.mdを吸収）。英語版`DESIGN.md`と同内容 |
| [project/prototype-progress.md](project/prototype-progress.md) | 旧2実装と現行mockの進捗・判定の正本 |

### B. 仕様初稿（レビュー待ち）

| ファイル | 内容 | 状態 |
| --- | --- | --- |
| [protocol/consent-form-ja.md](protocol/consent-form-ja.md) | 参加者向け同意文 v0.2.0-draft（DEC-019、036） | 連絡先・所属機関窓口の記入と教員確認前 |
| [protocol/initial-recall-trigger.md](protocol/initial-recall-trigger.md) | 初期想起トリガー v0.1.2（DEC-015） | 指導教員レビュー・認知インタビュー前 |
| [protocol/manipulation-check.md](protocol/manipulation-check.md) + `experiment/manipulation-check.yaml` | Manipulation Check v0.2.0-draft（DEC-014、033） | 同上 |
| [archive/memory-experiment-system-archive.md](archive/memory-experiment-system-archive.md) | 削除した旧production candidateの履歴・再利用判断・検証結果 | 保全記録。仕様の正本ではない |
| [prompts/PROMPT_CATALOG_V0.4.1_DRAFT.md](prompts/PROMPT_CATALOG_V0.4.1_DRAFT.md) | Standard / Visual / Odor、共通ターン機能、証拠制約を定めた次期プロンプトカタログ | 旧版。質問はDEC-035、文章はDEC-036で更新 |
| [prompts/PROMPT_CATALOG_V0.4.2_DRAFT.md](prompts/PROMPT_CATALOG_V0.4.2_DRAFT.md) | DEC-035に基づく質問検証と生成方針 | 質問選択はDEC-039で更新。必須検証は継続 |
| [prompts/PROMPT_CATALOG_V0.4.3_DRAFT.md](prompts/PROMPT_CATALOG_V0.4.3_DRAFT.md) | DEC-036に基づく創作文章と作成記録 | DRAFT。出力品質評価前 |
| [prompts/PROMPT_CATALOG_V0.4.4_DRAFT.md](prompts/PROMPT_CATALOG_V0.4.4_DRAFT.md) | DEC-039に基づく回答状態優先の質問選択 | DRAFT。実API品質評価前 |
| `prompts/` | 現行質問は`v0.4.4-mock-draft`、文章はv0.4.3。旧版は比較用 | 編集後にサーバー再起動 |

### C. 履歴・旧仕様（読む必要なし。削除もしない）

| ファイル | 上書き理由 |
| --- | --- |
| [protocol/PROTOCOL.md](protocol/PROTOCOL.md) | 2026-09-07に退役。`core/DESIGN.ja.md`へ一本化。承認ゲートG1〜G5はDEC-040/041/043/044で廃止。旧本文はgit履歴 |
| [archive/condition-question-matrix.md](archive/condition-question-matrix.md)、`experiment/conditions.yaml` | 固定質問方式v0.1.0。DEC-029（生成質問）で上書き。決定記録が参照するため保持 |
| [archive/memory-experiment-system-archive.md](archive/memory-experiment-system-archive.md) | 旧v0.2.9/v0.3.0候補の履歴を要約保全 |
| [prompts/codex-prompt-production-build.md](prompts/codex-prompt-production-build.md) | memoryExperimentSystem構築指示。DEC-031で役割終了。PHASE0_AUDITが参照するため保持 |

### D. 背景・レビュー記録（参照のみ。更新しない）

| ファイル | 内容 |
| --- | --- |
| [research/research-context.md](research/research-context.md) | ChatGPTプロジェクト移行時の統合コンテキスト（2026-07-10時点。以降はdecisions-active.mdが優先） |
| [research/research-plan-review.md](research/research-plan-review.md) | 暫定研究計画書PDF（2026-06-22版）のレビュー |
| [research/pm-review-2026-07-15.md](research/pm-review-2026-07-15.md) | プロジェクトマネジメント・レビュー |
| [prompts/codex-prompt-persona-batch.md](prompts/codex-prompt-persona-batch.md) | 合成バッチをペルソナ回答方式へ変更する作業指示書 |
| [archive/memory-experiment-system-archive.md](archive/memory-experiment-system-archive.md) | 旧production candidateの設計反省、ADR、運用、readiness、未決定事項を要約保全 |
| `expTest1/artifacts/prompt-pilot/`（6件: 最終report 3件＋Fableレビュー3件） | 決定記録が引用する検証証跡のみ残存。中間版ログは2026-07-16に削除済み |
| [archive/memory-experiment-system-archive.md](archive/memory-experiment-system-archive.md) | v0.3.0乾式・旧実API検証・未解決リスクの結果を要約保全 |
| `mockExperimentSystem/README.md` | 現行mockの範囲、起動、バッチ検証手順、利用禁止範囲 |
| `mockExperimentSystem/artifacts/prompt-eval-2026-07-25/` | v0.3.0実API評価とv0.4.0対照評価。旧方針の評価履歴 |

## 確定事項の要約（詳細は`core/00-decisions/decisions.md`）

- 実匂い刺激は使わず質問操作のみ（DEC-001）。**二条件（Visual / Odor）・被験者間**（DEC-041がDEC-002を更新）。ブロック無作為化＋割付ログ（DEC-003、運用値未定・二群として決め直す）。
- 本人評価が主要な研究結果（DEC-004）。主評価軸=Perceived Memory-Likeness（記憶様感）、副評価軸=Scene Construction Rating（情景構成感）、Narrative Vividness（叙述鮮明性）、Emotional Reliving（感情再体験感）。4軸は合算しない（DEC-010/011）。
- 生成文は「断片からの物語文章」と説明し「記憶の再構築」と言わない（DEC-005）。Manipulation Check実施・除外には使わない（DEC-006、DEC-014方針）。
- 共通の初期想起トリガーを使う（DEC-007）。初期断片は**一文の自由記述**（DEC-015追記、2026-07-16。仕様v0.1.1）。
- 日本語基本・英語版併設だが、**パイロット版は日本語のみ**（DEC-016追記、2026-07-16）。英語データは当面探索的。
- 追質問は条件制約付きLLM生成、全条件同一ターン数で、**パイロット版は6ターンを暫定採用**（DEC-029。理由: 最終文章の情報量確保。DEC-043により正式承認は取らない）。試行上限＋固定フォールバック＋全ログ（DEC-030。逐次3試行はDEC-045で並列候補生成＋修復パスへ）。
- 生成質問は初期記憶断片を入力に、出来事に関連した記憶を掘り出す方向で生成する（DEC-025 note追記）。ターン数・モデル・温度・プロンプト版・検査閾値・フォールバック規則は、設計上一箇所の変数として設置し操作可能にする（DEC-030追記）。
- 条件はVisualとOdorの二つ。独立変数は質問焦点（視覚、匂い）の二水準。Odor対Visualが唯一の計画対比であり、「匂い対非嗅覚感覚全般」とは解釈しない（DEC-041がDEC-033を更新）。Standard条件は生成の安定性を理由に廃止した（実測: 棄却6/6、フォールバック2/6ターン）。Odor条件では「何の匂いだったか」を尋ねてよく、禁じるのは原因の説明と発生源の推測の要求だけ（DEC-049）。
- 最終文章は初期断片と回答を素材とするAIの創作を許す。全条件で共通の生成処理と説明を使い、質問から創作を含む読後反応までの処理全体を比較する。作成記録は素材参照と追加の自己申告とする（DEC-036）。
- expTest1は技術デモ（DEC-009）。旧APIキー失効済み（DEC-026）。**倫理審査を行う**（DEC-042がDEC-027を上書き）。入試は8月5-6日（DEC-028）。
- 指導教員確認を承認ゲートに置かない（DEC-040）。生成パラメータの正式値を事前に固定せず最終値を論文へ記載（DEC-043）。機械再評価と人間パイロットは並行（DEC-044）。
- Manipulation Checkは操作確認2件（MC-ODOR / MC-VISUAL）＋診断4件。対比係数は`[-1, +1]`（DEC-047がDEC-014を更新）。

## 決定すべき事項

この一覧は[`core/00-decisions/tasks.md`](../core/00-decisions/tasks.md)へ移した。以前は同じ「やること」が`decisions.md`の「未決定事項」表と本書のTier 0〜2表に二重に書かれ、表現がずれていた。**作業一覧は`core/00-decisions/tasks.md`だけを更新する。**

| いま見るもの | 場所 |
| --- | --- |
| 最優先（他を塞いでいる作業） | [tasks.md 最優先](../core/00-decisions/tasks.md#最優先) — TASK-023（二条件化の反映）、TASK-024（倫理審査の申請） |
| 高 | [tasks.md 高](../core/00-decisions/tasks.md#高) — TASK-009、010、012、016 |
| 中 | [tasks.md 中](../core/00-decisions/tasks.md#中) — TASK-015、017、018 |
| 終わったこと（完了・中止） | [tasks.md 完了・中止](../core/00-decisions/tasks.md#完了中止) |

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
| 2026-09-07 | `project/decisions.md`を3文書（decisions-active / decisions-archive / tasks）へ分割。本書の「決定すべき事項」Tier 0〜2表を`project/tasks.md`へ統合し、作業一覧の二重管理を解消。決定内容は変更していない。 |
| 2026-09-07 | 決定・タスクを`core/00-decisions/`へ移動。システムを規定する32件を`decisions.md`（反映先付き・出典1行の書式）、運営の7件を`docs/project/decisions-active.md`に分け、引用原文を`provenance.md`に凍結。PROTOCOL.mdを退役し`core/DESIGN.ja.md`へ一本化。core本文の決定との食い違い4件（割付方式、保持・削除、初期想起の条件、正式題名）を修正し、manifestのdesignDecisionsをDEC番号へ紐付け。TASK-025・026を完了。 |
| 2026-09-07 | tasks.mdへの研究者追記を反映。Standard条件の廃止（DEC-041）、倫理審査の実施（DEC-042）、指導教員確認を承認ゲートにしない方針（DEC-040）、機械ゲートの前置廃止（DEC-044）を現在地・確定事項の要約へ同期。`core/`を再構築仕様として地図へ暫定的に追加した（分類はTASK-026）。 |
