# ResearchPilotSystem

既存のNext.js実験システムに、二条件（Visual / Odor）の研究仕様を適用していくための研究用mockです。仕様・制約・未実装差分は [`docs/SPEC.md`](docs/SPEC.md)、このREADMEはセットアップ・操作・オフライン検証・保存先検証の正本です。現状は仕様に未達の三条件mockであり、参加者募集や実収集には使用できません。

## 前提と安全上の注意

- 指導教員のapproval gateは置きません。ただし倫理審査と、参加者収集を開始してよいという研究上の条件は別途満たす必要があります。
- API秘密値・参加者データ・収録素材を文書やGitへ記載・追加しません。APIキーはサーバ側の環境変数だけに置きます。
- `prompts/` は現行runtime assetです。`core/02-generation/prompts/` の保存プロンプトへ勝手に差し替えません。
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
# 既定値は csv。クラウド検証時だけ supabase
RESULT_STORAGE=csv
```

開発サーバー:

```bash
npm run dev
# http://localhost:3000
```

キー未設定時に自動でmockへフォールバックしません。Responses APIの疎通確認は次の一回だけです。

```bash
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

これはAPIを呼ばず、10 personasと予定セッションを検証します。プロンプト、validator、候補戦略を変更した場合は、仕様上の常時運用としてハーネスを再実行します。実APIバッチは次で、現行は10 personas × 3条件の30セッション相当です。基準約390 API calls（追質問180、模擬回答約180、物語30。再試行分は追加）を行い、課金と合成結果保存を伴う任意操作です。二条件化後は呼出し数が変わるため、この値を二条件の見積りとして扱いません。

```bash
npm run run:persona-batch
```

フォールバック・棄却・中立遷移は条件別に記述報告します。これらを除外基準や共変量にはしません。

## ローカル保存

`RESULT_STORAGE` 未設定または `csv` では `data/results-v0.4.3-bilingual-schema-v2.csv` に追記します。既存CSVは移行・上書きしません。完了セッションは一行のschema v2で、6質問・6回答・生成履歴・文章・評定・MC/DQを含みます。`data/*.csv` はGit管理外です。

保存には安定したsession ID、同一内容の冪等再送、同一IDで内容が違う場合の競合拒否、同意した保存先との一致確認が必要です。保存先が変わった場合にCSVとSupabase間で自動フォールバックしてはいけません。詳細な契約と保持・撤回・削除は [`docs/SPEC.md`](docs/SPEC.md) を参照してください。

## Supabase保存先検証

開発用プロジェクトは `26labResearch` です。次の環境変数を `.env.local` に置きます。Secret keyはサーバ側だけに置き、値そのものを文書へ転記しません。

```dotenv
RESULT_STORAGE=supabase
SUPABASE_URL=https://<project>.supabase.co
SUPABASE_SECRET_KEY=<server-only-secret>
```

1. Supabase SQL Editorで [`supabase/migrations/202609030001_experiment_results.sql`](supabase/migrations/202609030001_experiment_results.sql) を新規テーブルとして一度だけ実行します。既存テーブルを削除して再作成しません。
2. `npm run check:supabase` を実行します。OpenAI APIは呼ばず、合成行の保存、同一内容の再送、異内容の競合、読み戻し、CSV出力を確認します。実行ごとに `batch_synthetic` の検証行が残ります。
3. `npm run dev` を再起動し、画面の保存先表示がSupabaseになっていることを確認します。
4. 収集停止中に `npm run export:supabase` を実行します。合成行を含める場合は `--record-type all`、指定ファイルへ新規出力する場合は `--record-type batch_synthetic --output data/synthetic-export.csv` を使います。既存ファイルは上書きしません。

Dockerとローカルの `postgres:16.6` イメージがある場合は、実クラウドとは別に次を実行できます。

```bash
npm run check:result-schema
```

これはSQL、主キー、schema制約、RLS、匿名ロール拒否、service role権限をネットワークなしで確認します。Dockerがない場合は未実施として扱い、成功とみなしません。

## 参照先

- 仕様・設計・制約・未実装差分・実装順序・受け入れ条件: [`docs/SPEC.md`](docs/SPEC.md)
- 保存資産（プロンプト、18評価項目、想起トリガー、fallback、validator、10 personas）: `core/`
- 凍結レポート・生成記録・検証証跡: `artifacts/`、`core/05-verification/evidence/`
