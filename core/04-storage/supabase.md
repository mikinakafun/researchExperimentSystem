# Supabase接続検証（26labResearch）

対象は、ローカルアプリから開発用Supabaseへ完了結果を保存する検証です。
2026-09-03に、合成結果の実保存・同時再送時の重複防止・読み戻し・内容が違う再送の拒否・CSV出力を確認済みです。
以下は新規環境の設定と接続確認の手順です。

## 作業手順

1. Supabaseの管理画面で **26labResearch → SQL Editor** を開き、新しいクエリを作成します。
2. 下の「参照スキーマ」の全文を貼り付けて実行します。
   新規テーブルを作るSQLです。同名テーブルがある場合はエラーで停止します。再実行のために既存テーブルを削除しないでください。
3. プロジェクトのターミナルで、次を実行します。

   ```bash
   npm run check:supabase
   ```

   `PASS` が出れば、合成結果の保存・同時再送時の重複防止・読み戻し・内容が違う再送の拒否・CSV出力を確認できています。
   OpenAI APIは呼びません。
   実行ごとに `record_type=batch_synthetic`、`session_id=supabase-check-…` の1行をDBに残し、読み戻した結果を `data/supabase-check-….csv` に書き出します。
4. `.env.local` に次の行を追加します。既存行がある場合は置き換えます。

   ```dotenv
   RESULT_STORAGE=supabase
   ```

   既存の `SUPABASE_URL` と `SUPABASE_SECRET_KEY` はそのまま使います。
   `RESULT_STORAGE` 未設定、または `csv` の間はローカルCSVへ保存します。
5. 起動中の開発サーバーを止め、`npm run dev` で再起動します。
   ページを開き直し、日本語・英語とも参加前の説明に **Supabase** と表示されることを確認します。
   途中の入力はページ再読み込みで失われるため、新しい検証として開始します。

## 保存する内容

| 項目 | 実装 |
|---|---|
| テーブル | `public.experiment_results` |
| 1行の単位 | 完了した1セッション。`session_id` が主キー |
| 完全な結果 | `payload` にschema v2の結果・生成記録をJSONで保存 |
| 一覧用の列 | `record_type`、`condition`、`language`、各バージョンをJSONから自動生成 |
| 時刻 | `received_at` はDBの受信時刻、`payload.savedAt` はアプリの保存要求時刻 |
| 同じ結果の再送 | `savedAt` の差を除いて内容が一致すれば重複として成功を返す |
| 同じID・異なる内容 | HTTP 409。既存結果を更新しない |
| 通信・設定エラー | 保存エラーを返す。CSVへの自動切り替えは行わない |
| 画面の説明 | サーバーが選んだ保存先を表示。説明時と保存時の保存先が違えば拒否 |

保存APIの入力検証は `lib/result-validation.ts`、接続処理は `lib/server/supabase-result-store.ts` です。
ブラウザは既存の `/api/save-result` を呼び、SupabaseのSecret keyはサーバー内で使います。
現在の接続設定は `https://….supabase.co` と `sb_secret_…` の組み合わせに対応します。

## CSVの取り出し

```bash
# record_type=participant の行だけ
npm run export:supabase

# 合成結果も含めた全行
npm run export:supabase -- --record-type all

# 合成結果だけを指定した新規ファイルへ
npm run export:supabase -- --record-type batch_synthetic --output data/synthetic-export.csv
```

CSVはローカル保存と共通のschema v2で、生成情報のJSONも保持します。
複数ページを読み、指定した新規ファイルへ書き出します。既存ファイルは上書きしません。
取得途中の失敗時は不完全な出力ファイルを削除します。
実行中の追加保存を含む一貫したスナップショットは保証しないため、分析用の確定出力は保存処理を止めて行います。

## テーブル権限と公開までの残作業

このSQLはRLSを有効にし、`anon`・`authenticated` のテーブル権限を取り消します。
`service_role` には保存と読み出し用の `SELECT`・`INSERT` だけを付与し、公開ポリシーは作りません。
管理者による撤回・削除への対応は別途設計が必要です。

original_text — “Postgres evaluates table grants first, and only then applies Row Level Security.”

source — [Supabase公式：API keys](https://supabase.com/docs/guides/getting-started/api-keys#postgres-roles-and-row-level-security)

note — RLSの有効化に加え、テーブル権限を明示しています。Secret keyを使うアプリ側の認証は別の実装です。

参加者認証、サーバー側の条件割付、途中保存・再開は未実装です。
現在は認証なしの生成・保存APIを持つため、一般公開には使用しません。
Vercelでは `RESULT_STORAGE=csv` をエラーにしますが、これは参加者認証の代わりにはなりません。

## ローカルでの確認

```bash
npm test
npm run typecheck
npm run build
```

Dockerとローカルの `postgres:16.6` イメージがある場合は `npm run check:result-schema` でSQLも確認できます。
ネットワーク接続のない一時コンテナでテーブル作成・制約・ロール権限・RLSを検証し、コンテナを削除します。
このテストはSupabaseクラウドとの疎通確認を代替しません。

## 接続確認で見つかった不具合（修正済み）

初回の実接続では、保存済みの合成結果を読み出せず `SESSION_CONFLICT` と誤判定しました。
原因は、単純な等値検索とページ送りの値にJSONの引用符を追加していたことです。
`eq.<セッションID>` と `gt.<セッションID>` をURLパラメーターとして送るよう修正し、テスト用のDB応答も実際の挙動に合わせました。
修正後に `npm run check:supabase` と合成結果のCSV出力が成功しています。


---

## 参照スキーマ

クラウド保存を選ぶ場合の正本。Postgres/Supabase 固有の構文は一例であり、保存の実装は自由（[`../DESIGN.md`](../DESIGN.md) §10）。**移せないのは制約のほうである。**

とくに `session_id` の主キー制約は、[`recording-and-storage.md`](recording-and-storage.md) の冪等性が乗っている土台である。一意制約がなければ、同一IDの再送はエラーにならず二重に書かれ、「内容が同じなら成功、違えば競合」という判定そのものが成立しない。制約なしのテーブルを作ると、この壊れ方は保存が失敗するのではなく**静かに重複が入る**形で現れる。

生成列と `check` は、アプリ側の検証が抜けたときの第二の防壁として置いてある。`payload` はスキーマv2の結果1件で、行の単位は完了した1セッション。

```sql
-- 一度だけ実行する。参加者データは投入しない。
-- 同名テーブルがあれば失敗させる。非互換スキーマを黙って受け入れない。
begin;

create table public.experiment_results (
  session_id text primary key check (char_length(session_id) between 1 and 200),
  received_at timestamptz not null default now(),
  payload jsonb not null check (jsonb_typeof(payload) = 'object'),
  record_type text generated always as (payload ->> 'recordType') stored not null
    check (record_type in ('participant', 'batch_synthetic')),
  condition text generated always as (payload ->> 'condition') stored not null
    check (condition in ('visual', 'odor')),
  language text generated always as (payload ->> 'language') stored not null
    check (language in ('ja', 'en')),
  schema_version text generated always as (payload ->> 'schemaVersion') stored not null
    check (schema_version = '2'),
  protocol_version text generated always as (payload ->> 'protocolVersion') stored not null,
  prompt_version text generated always as (payload ->> 'narrativePromptVersion') stored not null,
  constraint payload_session_matches check ((payload ->> 'sessionId') is not null and payload ->> 'sessionId' = session_id),
  constraint payload_saved_at_exists check (jsonb_typeof(payload -> 'savedAt') is not distinct from 'string'),
  constraint six_questions check (jsonb_typeof(payload -> 'questions') is not distinct from 'array' and jsonb_array_length(payload -> 'questions') = 6),
  constraint six_answers check (jsonb_typeof(payload -> 'answers') is not distinct from 'array' and jsonb_array_length(payload -> 'answers') = 6),
  constraint six_generations check (jsonb_typeof(payload -> 'questionGeneration') is not distinct from 'array' and jsonb_array_length(payload -> 'questionGeneration') = 6),
  constraint narrative_generation_exists check (jsonb_typeof(payload -> 'narrativeGeneration') is not distinct from 'object')
);

alter table public.experiment_results enable row level security;
revoke all on table public.experiment_results from public, anon, authenticated, service_role;
grant select, insert on table public.experiment_results to service_role;
-- 匿名・認証ロールのポリシーは作らない。読み書きはサーバ経由に限る。
-- update / delete は完了結果ストアの操作として意図的に持たせない。
comment on table public.experiment_results is 'Completed research results, schema v2. Includes explicitly labelled synthetic checks.';

notify pgrst, 'reload schema';
commit;
```

### 移植するときに落としてはならないもの

| 制約 | 落とすとどうなるか |
| --- | --- |
| `session_id` 主キー | 再送が重複行になり、冪等な再送と内容不一致の競合を区別できなくなる |
| `record_type` の値域 | 合成セッションと参加者セッションを分析時に分離できなくなる |
| `condition` の値域 | 廃止した`standard`を含む不正な条件が黙って入る。二条件化に合わせて`visual`・`odor`のみとする |
| `schema_version = '2'` | 旧スキーマの結果が同じ表に混ざる |
| `payload_session_matches` | 行のIDと中身のIDが食い違ったまま保存される |
| 6件の配列チェック | ターン数の欠けた結果が保存され、分析時にしか気づけない |
| RLS＋`service_role`のみ | ブラウザの匿名キーから読める状態になり、同意した保存先の約束が破れる |
| `update` / `delete` を与えない | 完了結果が事後に書き換わりうる |

`condition` の値域は元実装の `('standard','visual','odor')` から**二条件へ狭めてある**。作り直しには古い行が存在しないため、廃止した条件を受け入れる理由がない。
