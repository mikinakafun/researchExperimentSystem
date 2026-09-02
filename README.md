# Memory Experiment Mock Copy

`mockExperimentSystem` を2026-09-02に複製した独立版です。実行用プロンプトはこのリポジトリ内の `prompts/` に同梱し、親ディレクトリや `PROMPT_DIR` は参照しません。参照用の `docs/` と `experiment/` も同梱しています。これらの資料内の元プロジェクト名や過去のパスは、複製時点の記録です。

ローカルのコピーには元の `.env.local`、実行データ、収録素材を保持しています。GitHubにはAPIキー、`data/` の実行データ、収録素材、評価のJSON出力を含めません。クローンした環境では `.env.example` を `.env.local` にコピーし、APIキーを設定してください。

`docs/protocol/PROTOCOL.md` v0.3.0-draftとPrompt Catalog v0.4.1を参照した、参加者フロー確認用のローカルmockです。質問生成と最終文章生成に実際のOpenAI Responses APIを使用できます。

現行の実行版は `prompts/v0.4.1-mock-draft/` です。
2026-07-25の合成データ30セッションによる実API評価では、質問の条件整合性と最終文章の証拠忠実性に不合格事項が見つかっています。
実行条件はStandard / Visual / Odorです。質問出力のターン機能、焦点、証拠ID、非想起・証拠不足分岐を検査し、最終文章は初期断片と回答だけを証拠として文ごとの`evidenceIds`を保存します。実APIによる機械再評価と指導教員承認は未了であり、このmockを人間パイロットや参加者募集に使用できる状態ではありません。

## 範囲

- 同意 → 初期想起（一文・100文字） → 条件非表示の3条件 mock 割付
- 条件別の追質問6ターン
- ターン別焦点の自動検証、最大3試行、条件別固定フォールバック
- 証拠（初期断片・提示質問・回答）を渡す8〜10文のAPI生成文章
- 文章は番号なしの段落として提示し、最終説明画面を表示
- 情動的に中立な調査票UI（無彩色背景・青一色の操作色・ゴシック体・刺激の無装飾提示）
- 4評価軸×3項目の7件法、Manipulation Check 3項目、品質診断3項目
- 完了時に1実施1行で `data/results-v0.4.1.csv` へ追記（複数結果対応）
- 想起不能の1回再試行、中止、未回答の送信防止

SQLite、管理者画面、本番用の実験データ管理はありません。mockでは完了した結果をローカルの `data/results-v0.4.1.csv` に追記します。APIリクエストには `store: false` を指定していますが、入力内容は外部APIへ送信されます。研究実施や参加者募集には使わないでください。条件名は参加者画面に出しません。mock のため、割付は有効な初期断片の送信時にクライアント側で行われます。本番実験のサーバー側割付ではありません。

CSVはUTF-8の横持ち形式です。`session_id`、`record_type`、`condition`、`initial_fragment`、`question_1`〜`question_6`、`answer_1`〜`answer_6`、`final_result`、評価値JSON、MC/DQ値JSONを含み、1回の完了ごとに1行が追加されます。`data/*.csv` は `.gitignore` で除外しています。

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
`npm run typecheck` と `npm run build` で検証できます。

## 条件別バッチ出力

Fable等で条件差を確認するため、個人情報を含まない固定の合成断片10件を各条件へ入力し、計30セッションを実APIで生成・保存できます。

```bash
npm run run:persona-batch
```

この処理は、追質問180回、模擬回答約180回、最終文章30回の計約390回を基準に、再生成や模擬回答の再試行分を加えたAPI呼び出しを行います。
2026-07-25の実行実績は約433回でした。
結果は`record_type=batch_synthetic`として`data/results-v0.4.1.csv`へ追記します。
通常の画面完走による行は`record_type=participant`です。

APIを呼び出さず、合成ペルソナと予定セッションだけを検証する場合は次を実行します。

```bash
npm run run:persona-batch -- --dry-run
```

評価結果と採否判断は `artifacts/prompt-eval-2026-07-25/report.md` と `artifacts/prompt-eval-2026-07-25/v040-decision.md` を参照してください。
