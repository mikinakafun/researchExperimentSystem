# ResearchPilotSystem — 統合仕様

## 1. この文書の位置づけ

本書は、`core/` の自己完結型再構築要求を、別システムへ移して作り直す前提ではなく、現在のResearchPilotSystem（Next.js実験システム）へ適用するために統合した日本語の単一正本である。ここには研究上の問い、設計制約、入出力契約、保存制約、現在の未実装差分、実装順序、受け入れ条件を現在形で記す。変更理由と時系列はgitにのみ残し、新しいDEC番号、変更履歴表、恒久PLAN文書は作らない。

本書の「現行」はコードと保存形式による実装状態、「要求」は適用すべき要件を示す。過去の内容と変更理由はgit履歴で追跡する。

### 適用状態

| 項目 | 要求仕様 | 現行実装 | 判定 |
|---|---|---|---|
| 条件 | `visual` / `odor` の二条件 | UI、API、結果validator、persona batchは`visual` / `odor`のみ | 部分実装 |
| 割付 | 初期断片送信後、言語層別のサーバ側ブロック無作為化、割付ログ | クライアントの `Math.random()` | 未実装 |
| 質問 | 条件内の6問、候補並列・決定的validator・修復・固定fallback | 現行runtime prompt、候補並列・repair・固定fallback | 部分実装 |
| メタデータ | `conditionFocus`、`targetEvidenceId`、中立遷移理由 | `conditionFocus`、`targetEvidenceId`、中立時の`transitionReason` | 部分実装 |
| 保存 | 二条件値域、同意保存先lock、冪等性、整合性、保持・撤回・削除 | 新規保存はschema v3/二条件、CSV/Supabase、lock/冪等性を実装。管理削除は未実装 | 部分実装 |
| UI | 条件秘匿、同意・中止・デブリーフ、生成文が復元ではないことの明示 | 現行mockとして一部実装 | 要確認・未実装あり |

上の差分は未実装である。実装順序は §12 に固定する。

## 2. 研究の問いと主張の境界

対象は、AI支援下の自伝的想起における質問焦点の被験者間実験である。参加者は少なくとも1週間前の特定の出来事を一文で記述し、条件を伏せたLLM生成質問を6問受け、初期断片と回答からLLMが生成した短い一人称物語を評価する。実際の匂い刺激はなく、操作は質問文の焦点だけである。

主要評価は物語の記憶様感（4軸のうち3項目平均）、主比較はOdor対Visualである。情景構成感、叙述鮮明性、感情再体験感は副次評価であり、4軸を合算しない。

物語は参加者の記憶を復元したものではない。参加者向け本文では `reconstruction`（再構築・復元）を、題名候補の `Reconstruction` と矛盾する形で使わない。この題名と本文方針の併存は未解決である。

主仮説は方向を指定しない一方、操作チェックには `MC-ODOR` がOdorで高くなるなどのpredicted directionがある。この非方向主仮説とpredicted direction要求の併存は未解決であり、分析上の採否を本書で決めない。

本システムは因果的な記憶復元、モデル自己申告による出所証明、参加者の回答が真の記憶であること、生成物の人間的真正性を主張しない。モデルの `sourceIds` や `containsCreativeAddition` は未検証のannotationであり、検証済み出典扱いしない。

## 3. 研究・運用上の不変条件

- 条件はVisualとOdorの二条件。Standardは要求仕様上廃止済みで、現行のUI、API、結果validator、persona batchは受け付けない。
- Visualは視覚的対象・詳細に焦点を置き、匂い・音・触覚・温度・身体・感情を尋ねない。
- Odorは匂い、その質、覚えている匂いが何の匂いだったかを扱うが、視覚・音・触覚・温度・身体・感情、原因説明・発生源の推測を尋ねない。
- 将来ベースライン条件が必要になっても、廃止したStandardを再利用しない。条件ガイダンスを与えない無誘導条件として改めて定義し、条件外への逸脱は検証失敗ではなく測定値とする。
- 条件名、研究、仮説、モデル、プロンプトはデブリーフまで参加者へ開示しない。
- 条件秘匿とサーバ側割付は要求である。割付は有効な初期断片送信後、言語を層として行い、すべて割付ログへ残す。ブロックサイズ、割付比、seed、隠蔽方法は未決定であり、最終値を勝手に補わない。
- 指導教員approval gateは不要。ただし倫理審査を経て、参加者収集を開始できる条件を満たす必要がある。mockの動作確認や合成ハーネス通過は倫理承認でも研究実施許可でもない。
- ガスセンサ、deep learning、TouchDesigner拡張は卒研範囲外である。
- DQ項目、`MC-EVENT`、fallback、中立遷移を除外基準・共変量・操作チェックによる参加者選別へ使わない。主評価と主比較は収集前に固定する。

## 4. 参加者フロー

順序は固定する。画面構造とスタイルは裁量だが、要件を省略しない。

1. **welcome** — 実モデルAPIを使うこと、条件は非表示であることを説明する。
2. **consent** — モデルAPIへの送信と、ローカルファイルまたはクラウドDBへの保存先を平易に示し、能動的同意を得る。参加者へ実際に示す文言は [`../app/experiment.tsx`](../app/experiment.tsx) と [`../lib/ui-language.ts`](../lib/ui-language.ts) を唯一の正本とする。連絡先・所属機関窓口は倫理審査前の未確定事項である。
3. **recall** — 少なくとも1週間前の特定の一回の出来事を、感情価・感覚を指定せず一文、100文字以内で記入する。個人識別情報を書かない警告を出す。「思い出せない」は有効回答で、別の出来事を一度だけ選び直せる。再度想起できなければ終了し、保存しない。実際の表示文言は [`../app/experiment.tsx`](../app/experiment.tsx) と [`../lib/ui-language.ts`](../lib/ui-language.ts) を唯一の正本とする。
4. **questions** — ここで割付し、言語を固定する。6ターン、一度に1問、回答必須。各API呼出しはturn-1からの完全履歴と過去の全質問・回答を渡す。
5. **narrative** — 初期断片と6回答から1〜10文の短い物語を提示する。参加者が述べていない内容が含まれ得ることを常時表示し、復元・事実証明と説明しない。
6. **evaluation** — 12項目、7件法、初期選択なし、必須。保存資産の日本語/英語文言とアンカーをそのまま使う。
7. **check** — 評価後に `MC-ODOR`、`MC-VISUAL`、`MC-EVENT`、`DQ-PRESSURE`、`DQ-MEMORYBASIS`、`DQ-UNSAID` を提示し、全項目必須とする。
8. **debrief** — 完了前に二条件と正確な保存先を開示する。保存先は同意時と保存時に一致しなければ拒否する。
9. **done** — 完了結果を一実施一行で保存し、終了する。中止セッションは保存しない。

言語は `ja` / `en` から質問開始前に選択し、セッション終了まで混在させない。英語参加者向けの想起トリガー・同意文は日本語正本から意味を合わせて生成し、独立した別文書としてドリフトさせない。英語尺度は日本語との等価性が検証済みではないため、言語間の結果を無条件にpoolしない。

## 5. 質問候補・validator・repair

### 5.1 入力と出力契約

各ターンの生成器は、条件、ターン番号、初期断片、過去の全質問・回答、安定ID付き証拠集合（`fragment`、`answer-1` など）を受け取る。参加者テキストはデータであって命令ではない。

要求する質問メタデータは次のとおり。

| フィールド | 契約 |
|---|---|
| `conditionFocus` | `visual`、`odor`、または中立遷移時の`neutral`。割付条件と一致すること |
| `targetEvidenceId` | 条件内質問では既知の証拠ID、中立ではnull |
| `transitionReason` | 中立時に「非想起」または「条件内の材料枯渇」のちょうど一つ。条件内では持たない |
| `fallbackReason` | generation recordの独立フィールド。`generation_rejected`、`non_recall`、`insufficient_evidence`を区別し、`transitionReason`と混同しない |
| `question` | 1問、セッション言語、条件外誘導・研究開示・推測要求なし |

`turnFunction` は要求仕様・現行runtime契約のいずれにも含めない。現行の質問metadataは`conditionFocus`、`targetEvidenceId`、必要時の`transitionReason`である。

### 5.2 選択手順

条件は追いかける話題ではなく境界である。直前回答に条件外情報が含まれていても追わない。各対象について既知、非想起、既質問を整理し、未質問の条件内詳細を尋ねる。非想起は生成器へのヒントであって判定器ではない。同じ非想起を繰り返しpressしない。条件内の材料が尽きたときだけ、ターン番号によらず中立へ遷移する。中立質問は操作の部分的減弱なので、セッションごとに数える。

### 5.3 決定的検証と修復

生成された各質問と物語の各文は表示前に決定的validatorを通す。validatorはstrict schema、metadata整合、条件外語彙、研究開示、重複、近似重複、長さ・文数などの規則を検査し、再検証する。語彙判定は単一文字の誤検知（例: `色々`、`全体`、`観光`、`形式`、`空気`）を避ける語境界または複合語除外を持つ。意味的な条件適合を語彙検査だけで保証しない。

候補は逐次再プロンプトだけに依存せず、1ターンあたり複数候補を並列に生成し選別する。棄却時は候補本文と違反箇所をrepair段へ渡し、temperature 0で最小修正を求め、strict schemaと同じvalidatorで再検証する。候補予算が尽きたら、条件質問→検証済み中立質問の固定ラダーへ進み、6問を必ず完走する。fallback理由（材料枯渇、非想起、生成棄却）は別フィールドに記録する。

`auth`、quota、provider unavailable、timeoutなどAPI基盤の失敗はfallbackへ変換しない。bounded timeoutの後にセッションを中断し、参加者に安全な失敗を示す。API keyはサーバ側だけで読み、provider呼出しは保持をオプトアウトする。providerのerror本文や資格情報をclientへ返さない。diagnosticsが欠落した生成結果は受け付けない。attemptsは初回を含む連続試行数、棄却候補・理由・request IDを記録する。要求したmodel aliasだけでなく、providerが応答した具体的なmodel版を保存する。

ターン数、model、temperature、候補数、試行上限、prompt versionは一か所で管理し、各結果に実際の値を保存する。6ターンは現行pilot値であり、指導教員の承認待ちではない。参加者データ収集開始時に生成設定を凍結し、以後の変更は別の収集として扱う。

実行時の正本は、プロンプトが [`../prompts/`](../prompts/)、fallbackが [`../app/api/fallback-questions.ts`](../app/api/fallback-questions.ts)、質問validatorが [`../app/api/question-validation.ts`](../app/api/question-validation.ts) である。要求仕様と現行実装の差は本書に記録し、別の複製資産を維持しない。

## 6. 物語生成

6回答後に一回呼び出し、初期断片と質問・回答を素材、質問文を文脈として扱う。質問に含まれた前提を参加者の申告済み事実として扱わない。創作（情景、感覚、感情、会話、結末）は許可されるが、明示された人物・場所・行動・否定と矛盾せず、非想起を想起済みとして書かず、条件・研究・モデル・promptを開示しない。

出力はセッション言語、1〜10文とし、各unitは正確に1文だけを持つ。各文をtrimして保存し、日本語は区切りなし、英語は半角スペース1つで連結した本文が、参加者の評価した表示本文と一致しなければならない。各文の`sourceIds`と`containsCreativeAddition`は保存するが、モデル自己申告は検証済み出典でも創作判定でもない。narrative validator違反やstrict schema不一致は最大試行後にエラーとし、質問のような物語fallbackは設けない。

## 7. 測定と分析

18項目のID・日本語文言・アンカーは [`../lib/survey.ts`](../lib/survey.ts)、英語文言は [`../lib/ui-language.ts`](../lib/ui-language.ts) が実行時の正本である。12評価項目は4軸×3、6 check/diagnostic項目は評価後に置く。すべて7件法、必須、初期選択なし。

`MC-ODOR` と `MC-VISUAL` は操作チェック、`MC-EVENT` は診断、`DQ-*` は診断である。操作チェック得点で参加者を除外しない。チェック回答を割付の代替にしない。`MC-EVENT` と `DQ-*` を結果変数に合算しない。`DQ-UNSAID` を除外・再生成・共変量調整へ使わない。主評価は収集前に固定する。

全セッションで、条件別のfallback数、validator rejection数、中立遷移数を操作チェックと併せて記述報告する。これらは条件の用量減弱を表す観測結果であり、除外基準や共変量ではない。合成ハーネスはprompt guidance、validator、候補戦略を変更するたびに実行するが、参加者収集の前置ゲートにはしない。

## 8. 保存・整合性・プライバシー

保存先はCSVまたはSupabaseの単一インターフェース背後に置く。旧schema v2の既存レコードは保持し、新規の二条件契約はschema v3として別CSV `results-v0.4.4-bilingual-two-condition-schema-v3.csv` に保存する。v3の主なレコードは `session_id`、`record_type`、`saved_at`、schema/protocol/prompt version、condition、language、initial fragment、6質問・6回答、question metadata/generation、final narrative、narrative annotations/generation、evaluation、checksである。

- 同意時の保存先とサーバ設定が異なる場合は拒否し、自動fallbackしない。
- session IDは安定させ、同一内容の再送は成功、同一IDで異なる内容は競合として拒否する。既存結果を更新しない。
- 全生成記録、attempts、rejections、diagnostics、model、request ID、prompt versionを保存する。diagnostics欠落を推定で埋めない。
- schema versionとprompt versionの不一致を保存時に拒否する。古い結果を新しい結果へ静かに混ぜない。
- ストレージエラーのURL、ヘッダ、秘密値、回答本文をクライアントへ返さず、詳細はサーバ側だけに記録する。
- 自由記述は100文字上限とPII警告を持つが、自動PII除去はしない。識別可能データとして扱う。
- 参加者認証、途中保存・再開、管理者の撤回・削除UI、公開運用は未実装であり、一般公開しない。
- 保持は最終公表から10年（未公表pilotは終了から10年）。匿名化前はsession ID単位で撤回を受け付け、primary store、export、backupを含めて破棄し、破棄後は削除記録だけ残す。匿名化後の個別削除不能は同意文に明示する。

リポジトリ上のSupabase migrationは、SQL、RLS、匿名ロール拒否、service roleのみの権限、`session_id`主キー、6件配列制約、`condition in ('visual','odor')`を定義する。ただし、既存DBへの適用状態と移行方法は未確認である。migrationの適用確認はこの文書作業の範囲外であり、既存DBを削除・再作成しない。

## 9. 実行資産と証跡の扱い

次はシステムが直接参照する唯一の正本である。別のディレクトリに複製を維持せず、変更履歴はgitで追跡する。

- 実行時プロンプト本文: `prompts/`
- 参加者画面の同意・想起トリガー: `app/experiment.tsx`、`lib/ui-language.ts`
- 18評価項目とアンカー: `lib/survey.ts`、`lib/ui-language.ts`
- fallback質問: `app/api/fallback-questions.ts`
- validator規則: `app/api/question-validation.ts`、`lib/content-validation.ts`、`app/api/narrative/route.ts`
- 10 personas: `core/05-verification/personas.mjs`

`artifacts/` と `core/05-verification/evidence/` の凍結レポート、生成記録、検証証跡は保持する。DEC番号が残る報告書は歴史的な参照であり、現在の要件の出典として新しいDEC記録を作らない。`core/05-verification/observed-behavior.md` も凍結された観察記録として保持する。`scripts/run-persona-batch.mjs` のpersona importを維持する。

## 10. 現行アプリとの観察済み差分

要求仕様と現行アプリの差分は次のとおりである。

- 条件の型・入力・validator・fallback・結果schema・persona batchは`visual` / `odor`の二条件である。Standardは現行runtimeでは受け入れない。
- 条件割付はクライアント側の `Math.random()` で、有効断片送信後のサーバ側ブロック割付・割付ログではない。
- `app/api/follow-up/route.ts` は設定境界から候補数・repair数・temperatureを読み、候補を並列生成し、候補本文と違反箇所をtemperature 0のrepairへ渡す。
- `turnFunction` は現行契約から削除され、質問metadataは要求仕様の二条件契約に合わせている。
- OpenAI呼出しにはbounded timeoutと `store:false` がある。質問の内容棄却だけがrepair/fallback対象で、auth/quota/provider unavailable/timeout/接続失敗は安全なエラーで中断する。provider request IDと具体的modelを含むdiagnostics欠落は成功扱いしない。
- narrative annotationは保存されるが、独立検証ではなくモデル自己申告である。
- `lib/result.ts`、`lib/result-validation.ts`、Supabase migration、persona batchは二条件値域に対応している。サーバ側割付と割付ログは未実装で、UIはクライアント側の`Math.random()`を使う。
- 保存先lock、CSV直列化、同一IDの競合拒否などは一部実装済みだが、要求される保持・撤回・削除の管理経路、認証・公開運用は未実装。リポジトリ上のSupabase migrationは二条件だが、既存DBへの適用状態と移行方法は未確認。
- オフラインfixtureとテストは存在し、二条件のUI/API保存フローを確認できるが、要求されるサーバ側割付やその他の未実装要件の証明にはならない。

### 現行互換性契約

現行実装を扱う際に、仕様移行や既存結果比較で失ってはならない互換性情報は次のとおりである。

- `record_type` は `participant` / `batch_synthetic`。participantは12評価項目と6 checksの完全ID集合および1〜7整数を必須とする。batch_syntheticはevaluationとchecksがともに空、またはともに完全集合の場合だけ許容し、片方だけの部分入力は拒否する。
- 質問prompt versionは `prompt-catalog-v0.4.4-mock-draft`、物語prompt versionは `prompt-catalog-v0.4.3-mock-draft`。既存結果の比較では質問generation record内のversionで区別する。
- `attempts` はその生成API呼出しで実行した全試行数で、並列候補とrepairを含む。`source=generated` は候補またはrepairの検証済み出力を採用したこと、`source=fallback` は候補とrepairをすべて棄却して固定質問へ置換したことを示す。fallbackは `model=fallback`、`requestId=null`、`fallbackReason` は `generation_rejected` / `non_recall` / `insufficient_evidence` のいずれかを必須とする。
- `diagnostics.rejections` は棄却候補または不採用候補ごとの `stage`、違反フラグ、候補本文・metadata（存在時）、providerのmodel/request ID（応答時）を保存する。画面再送前にAPI応答が返らなかった失敗は、その生成recordのattemptsには含めない。
- API `language` は `ja` / `en`、未指定は互換性上 `ja`、その他は拒否。言語変更後の現行UIは同意画面へ戻り初期断片を保持し、質問開始後は固定する。JSON key/id/enum値は言語間で不変、100文字上限は両言語同じ。
- 旧CSVはbilingual schema v2として保持し、新規CSVはbilingual two-condition schema v3で `language` 列を含む。旧CSVへの追記はせず、header/version mismatchへの追記は拒否する。

## 11. スコープ外・未解決事項

次は未解決または現行の適用スコープ外である。

- 実験条件、調査票の意味、生成規則、保存済みデータ、実験文言、runtime prompt本文。
- ブロックサイズ、割付比、seed、割付隠蔽、収集時に凍結するモデル・temperature・候補数の最終値、サンプルサイズ、分析モデル。
- 非方向主仮説と操作チェックのpredicted direction要求の整合。
- 題名の `Reconstruction` と参加者向けの「reconstructionを禁じる」説明の整合。
- 倫理審査の機関名・連絡先・提出日、参加者収集開始条件の具体的手続き。
- 認証、途中保存・再開、管理者画面、公開デプロイ、ガスセンサ、deep learning、TouchDesigner。

## 12. 適用順序と受け入れ条件

実装は別の恒久PLAN文書を作らず、次の順で進める。

1. **条件と入出力契約** — 二条件化、server割付、turn-1完全履歴、bounded timeout、strict schema、diagnostics、auth/quota/unavailableの中断を実装する。
2. **質問候補・validator・repair** — 並列候補、語境界、近似重複、repair、fallback理由、連続attemptsを実装する。
3. **保存整合性** — 二条件schema、同意lock、冪等性、競合、version mismatch拒否、保持・撤回・削除、Supabase/RLSを実装・検証する。
4. **UI/合成データ検証** — 条件秘匿、デブリーフ、保存先表示、fixture、二条件persona batchを検証する。

受け入れ条件は以下である。

- 必要な仕様・制約・未実装差分が `docs/SPEC.md` にあり、セットアップ・操作・オフライン検証・保存先検証・課金を伴う任意操作が `README.md` にある。
- READMEからSPECへ、AGENTSからREADME/SPECへ、残存する保存資産・証跡へそれぞれ正しく辿れる。
- Visual/Odor要求、Standardを受け付けない現行二条件runtime、client割付、未実装を明示し、実装済みと誤認させない。
- 指導教員approval gate不要、倫理審査・収集開始条件必要、研究上の未解決事項、非想起・DQ/MC-EVENT/fallbackの扱いを明示する。
- 実行資産は §9 の正本に一本化し、別ディレクトリに比較用コピーや履歴表を維持しない。
- 保存済みデータ、artifacts、凍結evidenceは保持する。
- 削除済みの説明文書・履歴表・作業用文書への生きた参照がない。
- 文書内リンク、対象ファイル参照、削除・整理対象への参照を検査する。
- コードまたは実行資産の変更では `npm test`、`npm run typecheck`、`npm run build` を順番に実行する。UI fixtureはwelcomeからdebrief、save、doneまでのオフライン影響フローを確認し、persona batchは10 personas × 2条件のdry-runを確認する。
