# Memory Experiment Mock Copy

`mockExperimentSystem` を2026-09-02に複製した独立版です。実行用プロンプトはこのリポジトリ内の `prompts/` に同梱し、親ディレクトリや `PROMPT_DIR` は参照しません。参照用の `docs/` と `experiment/` も同梱しています。これらの資料内の元プロジェクト名や過去のパスは、複製時点の記録です。

ローカルのコピーには元の `.env.local`、実行データ、収録素材を保持しています。GitHubにはAPIキー、`data/` の実行データ、収録素材、評価のJSON出力を含めません。クローンした環境では `.env.example` を `.env.local` にコピーし、APIキーを設定してください。

`docs/protocol/PROTOCOL.md` v0.4.0-draftとPrompt Catalog v0.4.3を参照した、参加者フロー確認用のローカルmockです。質問生成と最終文章生成に実際のOpenAI Responses APIを使用できます。

現行の質問生成版は `prompts/v0.4.2-mock-draft/` です。文章生成には `v0.4.3-mock-draft/narrative.{ja,en}.txt` を使用し、入力を素材とする創作を許可します（DEC-036）。主仮説と主対比を維持し、質問から創作を含む読後反応までの処理全体を比較します。
質問の長さ、疑問符数、冒頭の定型、必須語、証拠中の語彙、ターン機能の順序を採用条件にはしません。条件外の語彙チェックは補助的なものであり、意味的な条件適合を保証しません。詳細はDEC-035と`docs/prompts/PROMPT_CATALOG_V0.4.2_DRAFT.md`を参照してください。
2026-07-25の旧版評価では、質問の条件整合性と当時の証拠忠実性に不合格事項が見つかっています。新方針では創作自体を不合格とせず、入力との矛盾、読みやすさ、作成記録の正確性、条件別の創作傾向を確認します。旧版の評価は新方針の検証実績ではありません。
実行条件はStandard / Visual / Odorです。質問の必須検証は条件外誘導、実験情報の開示、出力形式、重複に限定し、最終文章は初期断片と回答を素材に創作し、文ごとの`sourceIds`と`containsCreativeAddition`を保存します。これらは素材参照と追加の自己申告であり、事実の証明や検証済みの創作判定ではありません。実APIによる機械再評価と指導教員承認は未了であり、このmockを人間パイロットや参加者募集に使用できる状態ではありません。

## 範囲

- 同意 → 初期想起（一文・100文字） → 条件非表示の3条件 mock 割付
- 条件別の追質問6ターン
- 条件外誘導・実験情報開示・出力形式・重複の検証、最大3試行、条件別固定フォールバック
- 初期断片と回答を素材、提示質問を文脈とする1〜10文の創作文章。全条件で共通の生成処理を使用
- 文章は番号なしの段落として提示し、最終説明画面を表示
- 情動的に中立な調査票UI（無彩色背景・青一色の操作色・ゴシック体・刺激の無装飾提示）
- 4評価軸×3項目の7件法、Manipulation Check 3項目、品質診断3項目
- 評価中に文章を、質問の確認中に6つの提示質問と文章をボタンで見返せる。参照欄はスクロールに追従し、開閉しても選択済みの点数を保持
- 完了時に1実施1行で `data/results-v0.4.3-bilingual.csv` へ追記（複数結果対応）
- 想起不能の1回再試行、中止、未回答の送信防止

SQLite、管理者画面、本番用の実験データ管理はありません。mockでは完了した結果をローカルの `data/results-v0.4.3-bilingual.csv` に追記します。APIリクエストには `store: false` を指定していますが、入力内容は外部APIへ送信されます。研究実施や参加者募集には使わないでください。条件名は参加者画面に出しません。mock のため、割付は有効な初期断片の送信時にクライアント側で行われます。本番実験のサーバー側割付ではありません。

CSVはUTF-8の横持ち形式です。`session_id`、`record_type`、`condition`、`initial_fragment`、`question_1`〜`question_6`、`answer_1`〜`answer_6`、`final_result`、作成記録JSON（`narrative_annotations_json`）、評価値JSON、MC/DQ値JSONを含み、1回の完了ごとに1行が追加されます。`data/*.csv` は `.gitignore` で除外しています。

## 起動

```bash
cd mockExperimentSystem-copy
npm ci
```

リポジトリ直下に `.env.local` を作成します。

```bash
OPENAI_API_KEY=your_api_key_here
OPENAI_MODEL=gpt-4o-mini
```

開発サーバーを起動し、`http://localhost:3000` を開きます。

```bash
npm run dev
```

キーが未設定の場合、API処理はエラーになり、mockへ自動フォールバックしません。
API疎通の確認は開発サーバー起動中に実行します。

```bash
npm run check:api
```

`check:api` は質問生成APIを1回呼び出すため、課金対象になり得ます。
`npm test`、`npm run typecheck`、`npm run build` で検証できます。

## 条件別バッチ出力

Fable等で条件差を確認するため、個人情報を含まない固定の合成断片10件を各条件へ入力し、計30セッションを実APIで生成・保存できます。

```bash
npm run run:persona-batch
```

この処理は、追質問180回、模擬回答約180回、最終文章30回の計約390回を基準に、再生成や模擬回答の再試行分を加えたAPI呼び出しを行います。
2026-07-25の実行実績は約433回でした。
結果は`record_type=batch_synthetic`として`data/results-v0.4.3-bilingual.csv`へ追記します。
通常の画面完走による行は`record_type=participant`です。

APIを呼び出さず、合成ペルソナと予定セッションだけを検証する場合は次を実行します。

```bash
npm run run:persona-batch -- --dry-run
```

評価結果と採否判断は `artifacts/prompt-eval-2026-07-25/report.md` と `artifacts/prompt-eval-2026-07-25/v040-decision.md` を参照してください。

## Language selection (Japanese / English)

- Use the Japanese / English controls above the participant flow. Japanese is the default; the selected preference is kept in browser storage when available.
- One language controls all UI text, survey items, reference panels, API instructions, generated questions, fallback questions, and narrative text. Existing participant input is not translated or overwritten.
- Select the language before the first question. It stays fixed from question generation through saving; end the session and return to the start to change it. Changing language after consent returns to the consent screen while preserving the initial fragment.
- All three API routes accept `language: "ja" | "en"`. Omission defaults to Japanese for existing clients; other values return HTTP 400. JSON keys, enum values, source IDs, and rating IDs stay the same across languages.
- New results use `data/results-v0.4.3-bilingual.csv` with a `language` column. The older `data/results-v0.4.3.csv` is left untouched. A mismatched CSV header is rejected instead of appending incompatible rows.
- English scale wording is a draft translation, not a validated equivalent of the Japanese scales. Do not pool results across languages without evaluating equivalence. The existing 100-character initial-fragment limit is unchanged in both languages.
- Output-language checks are lightweight script checks, not semantic language or condition classifiers. Live-model quality and cross-language equivalence still need evaluation.

`npm test` includes offline coverage of both languages, prompt branches, retries, fallback, narrative punctuation, CSV schema, and backward-compatible requests.
For a browser smoke test without external API calls or study-data writes, build and start the app on port 3200, then run `node tests/ui-fixture-server.cjs` and open `http://127.0.0.1:3100`. The fixture replaces API responses and keeps synthetic saves in memory only; it is not a live-model test.
