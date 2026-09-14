# ResearchPilotSystem

既存のNext.js実験システムに、二条件（Visual / Odor）の研究仕様を適用していくための研究用mockです。仕様・制約・未実装差分は [`docs/SPEC.md`](docs/SPEC.md)、このREADMEはセットアップ・操作・オフライン検証・保存先検証の正本です。現状は仕様に未達の二条件mockであり、参加者募集や実収集には使用できません。

## 前提と安全上の注意

- 指導教員のapproval gateは置きません。ただし倫理審査と、参加者収集を開始してよいという研究上の条件は別途満たす必要があります。
- API秘密値・参加者データ・収録素材を文書やGitへ記載・追加しません。APIキーはサーバ側の環境変数だけに置きます。
- モデルAPI呼出しは `store: false` を指定しますが、入力内容自体は外部APIへ送信されます。同意文と実運用のデータ取扱いはこの事実を前提にします。
- `prompts/` が実行時プロンプト本文の唯一の正本です。旧版と変更理由はgit履歴から追跡します。
- `scripts/run-persona-batch.mjs` が `core/05-verification/personas.mjs` をimportする構造を維持します。

## セットアップ

```bash
npm ci
cp .env.example .env.local
```

`.env.local` にサーバ側だけで使う値を設定します。

```dotenv
OPENAI_API_KEY=your_api_key_here
OPENAI_MODEL=gpt-4o-mini
# true enables fixed question fallback; false returns a generation error after retries
ALLOW_FALLBACK=true
# 既定値は csv。クラウド検証時だけ supabase
RESULT_STORAGE=csv
```

開発サーバー:

```bash
npm run dev
# http://localhost:3000
```

開発者が条件割付、現在の設定、質問のmetadata、生成試行・棄却、fallback理由、物語生成記録を確認するときは、明示的に `http://localhost:3000/?developer=1` を開きます。開発者パネルは表示専用で、通常URLでは表示されず、API入力・質問文・保存結果には追加されません。実験参加者にはこのURLを案内しないでください。

キー未設定時に自動でmockへフォールバックしません。Responses APIの疎通確認は次の一回だけです。

```bash
# dev serverを起動したまま、別ターミナルで実行
npm run check:api
```

これは実APIを呼び、課金対象になり得ます。不要な実行を避け、秘密値をログ・文書・コミットへ出さないでください。

## オフライン検証

通常の文書変更ではアプリケーションテストは必須ではありません。コード変更時の標準順序は次です。

```bash
npm test
npm run typecheck
npm run build
```

ブラウザのオフラインfixtureは、アプリを3200番ポートで起動したあと、別ターミナルでfixtureを3100番ポートに起動します。API応答はfixtureが置き換え、保存はメモリ内なので外部API・研究データ保存を行いません。

```bash
npm run build
npm run start -- -p 3200
# 別ターミナル
node tests/ui-fixture-server.cjs
# http://127.0.0.1:3100
```

合成ペルソナの確認:

```bash
npm run run:persona-batch -- --dry-run
```

これはAPIを呼ばず、10 personasと予定セッションを検証します。プロンプト、validator、候補戦略を変更した場合は、仕様上の常時運用としてハーネスを再実行します。実APIバッチは次で、現行は10 personas × 2条件の20セッション相当です。基準約260 API calls（追質問120、模擬回答120、物語20。各処理の再試行分は追加）を行い、課金と合成結果保存を伴う任意操作です。

```bash
npm run run:persona-batch
```

フォールバック・棄却・中立遷移は条件別に記述報告します。これらを除外基準や共変量にはしません。

## ローカル保存

`RESULT_STORAGE` 未設定または `csv` では新規の `data/results-v0.4.4-bilingual-two-condition-schema-v3.csv` に追記します。旧schema v2のCSVは読み替え・追記・移行せず保持します。header/versionが期待値と異なるCSVへの追記は拒否します。完了セッションは一行のschema v3で、6質問・6回答・生成履歴・文章・評定・MC/DQを含みます。`data/*.csv` はGit管理外です。

現行の `record_type` は `participant` と `batch_synthetic` です。participantは12評価項目と6 checksの完全な既定ID集合、および各値1〜7の整数を要求します。batch_syntheticはevaluationとchecksがともに空、またはともに全項目を含む場合だけ許容し、片方だけの部分入力は拒否します。両record typeとも、各質問・物語のgeneration recordにmodel、request ID、prompt version、settings、attempts、rejectionsを保存し、fallback時はfallbackReasonも必須です。

現行prompt versionは質問が `prompt-catalog-v0.4.4-mock-draft`、物語が `prompt-catalog-v0.4.3-mock-draft` です。既存結果を比較するときは、質問のgeneration record内にあるversionで区別します。`attempts` は並列候補とrepairを含む、その生成API呼出しの全試行数です。`source=generated` は検証済み候補を採用、`source=fallback` は候補とrepairを全て棄却して固定質問へ置換したことを意味します。fallbackでは `model=fallback`、`requestId=null`、`fallbackReason`（`generation_rejected` / `non_recall` / `insufficient_evidence`）を保存します。`diagnostics.rejections` には候補またはrepairごとのstage、違反フラグ、候補情報、応答時のmodel/request IDを保存します。

質問fallbackはサーバー環境変数`ALLOW_FALLBACK`で切り替えられます。未設定または`true`では固定fallbackを使い、`false`では候補とrepairをすべて棄却した後に生成エラーとして終了します。

APIのlanguageは `ja` / `en` で、未指定は既存クライアント互換のため `ja`、その他の値は拒否します。言語を質問開始後に変更すると現行UIは同意画面へ戻り、初期断片を保持します。質問開始後は言語を固定します。JSON key、ID、enum値は言語間で不変で、100文字上限も両言語同じです。

保存には安定したsession ID、同一内容の冪等再送、同一IDで内容が違う場合の競合拒否、同意した保存先との一致確認が必要です。保存先が変わった場合にCSVとSupabase間で自動フォールバックしてはいけません。詳細な契約と保持・撤回・削除は [`docs/SPEC.md`](docs/SPEC.md) を参照してください。

## Supabase保存先検証

開発用プロジェクトは `26labResearch` です。次の環境変数を `.env.local` に置きます。Secret keyはサーバ側だけに置き、値そのものを文書へ転記しません。

```dotenv
RESULT_STORAGE=supabase
SUPABASE_URL=https://<project>.supabase.co
SUPABASE_SECRET_KEY=<server-only-secret>
```

1. [`202609030001_experiment_results.sql`](supabase/migrations/202609030001_experiment_results.sql) は履歴として旧三条件/schema v2を作成し、[`202609110001_experiment_results_v3.sql`](supabase/migrations/202609110001_experiment_results_v3.sql) を続けて適用してv3の二条件を追加します。既存v2行は保持し、既存テーブルを削除・再作成しません。実環境への適用状態は未確認です。
2. `npm run check:supabase` を実行します。OpenAI APIは呼ばず、合成行の保存、同一内容の再送、異内容の競合、読み戻し、CSV出力を確認します。実行ごとに `batch_synthetic` の検証行が残ります。
3. `npm run dev` を再起動し、画面の保存先表示がSupabaseになっていることを確認します。
4. 収集停止中にexportします。既定はparticipantだけです。全行は `npm run export:supabase -- --record-type all`、合成行を指定ファイルへ新規出力する場合は `npm run export:supabase -- --record-type batch_synthetic --output data/synthetic-export.csv` を実行します。既存ファイルは上書きしません。

Dockerとローカルの `postgres:16.6` イメージがある場合は、実クラウドとは別に次を実行できます。

```bash
npm run check:result-schema
```

これはSQL、主キー、schema制約、RLS、匿名ロール拒否、service role権限をネットワークなしで確認します。Dockerがない場合は未実施として扱い、成功とみなしません。

## 参照先

- 仕様・設計・制約・未実装差分・実装順序・受け入れ条件: [`docs/SPEC.md`](docs/SPEC.md)
- 実行資産: `prompts/`、`app/experiment.tsx`、`app/api/fallback-questions.ts`、`app/api/question-validation.ts`、`lib/survey.ts`、`lib/ui-language.ts`
- 10 personas: `core/05-verification/personas.mjs`
- 凍結レポート・生成記録・検証証跡: `artifacts/`、`core/05-verification/evidence/`
