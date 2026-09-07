# 決定の引用原文（凍結）

2026-09-07に`docs/project/decisions-active.md`から分離した、各決定の`original_text` / `source` / `note`と分割前の状態記述をそのまま保存したもの。**更新しない。** 有効な本文は[decisions.md](decisions.md)（システム関連）と[`../../docs/project/decisions-active.md`](../../docs/project/decisions-active.md)（プロジェクト運営）、旧本文は[decisions-archive.md](decisions-archive.md)。

## DEC-001 卒業研究では実匂い刺激を使用しない

- 状態（分割前の原文）: 決定済み

original_text — 「卒業研究では実際の匂い刺激ではなく、匂いに着目した質問を用いる。」

source — `/Users/miramiki/dev/labResearchProject/docs/research/research-context.md:685`

note — ガスセンサや実匂い提示は卒業研究の実装要件へ入れない。

## DEC-002 三条件の被験者間計画を採用する（DEC-041で二条件へ更新）

- 状態（分割前の原文）: 決定済み

original_text — 「一人の参加者は一条件だけを行う。」

source — `/Users/miramiki/dev/labResearchProject/docs/research/research-context.md:689`

note — 現行プロトタイプの条件選択UIは研究者用デモ機能であり、参加者用仕様ではない。

## DEC-003 参加者を条件へランダム割付する

- 状態（分割前の原文）: 決定済み

original_text — 「参加者を条件へランダムに割り当てる。」

source — `/Users/miramiki/dev/labResearchProject/docs/research/research-context.md:690`

note — 少人数の三群比較では単純無作為化だけでは群サイズが不均衡になりやすい。現行の`Math.random()`は正式採用しない。

original_text — 「単純無作為化ではなくブロック無作為化＋割付ログを仕様化する。」

source — `/Users/miramiki/.codex/attachments/7ae2c75e-2926-4f51-a939-af3502987d0a/pasted-text.txt`, §3

note — ブロックサイズ等の運用値は、目標サンプルサイズと募集方法の決定後に固定する。

## DEC-004 LLM生成文に対する本人の評価を主要な研究結果に含める

- 状態（分割前の原文）: 決定済み

original_text — 「人間評価を主要な研究結果に含める。」

source — `/Users/miramiki/dev/labResearchProject/docs/research/research-context.md:687`

note — 中心的な4評価軸を設定し、DEC-011によりPerceived Memory-Likeness（記憶様感）を主評価軸、残り3軸を副評価軸として扱う。

## DEC-005 LLMは参加者の断片情報から物語文章を生成する

- 状態（分割前の原文）: 決定済み

original_text — 「研究説明では『断片的な記憶情報をもとにした物語文章』を使う。」

source — `/Users/miramiki/dev/labResearchProject/docs/research/research-context.md:696`

note — LLMによる補完範囲と事実追加禁止規則は未決定である。

## DEC-006 Manipulation Checkを実施する

- 状態（分割前の原文）: 決定済み

original_text — 「Manipulation Checkを追加する。」

source — `/Users/miramiki/dev/labResearchProject/docs/research/research-context.md:692`

note — 実施の要否は決定済みで、測定仕様だけが未決定である。

## DEC-007 全条件共通の初期想起トリガーを設ける

- 状態（分割前の原文）: 決定済み

original_text — 「最初の想起トリガーを設計し、完全自由入力を減らす。」

source — `/Users/miramiki/dev/labResearchProject/docs/research/research-context.md:694`

note — 現行プロトタイプの自由記述欄は最終仕様ではない。

## DEC-008 卒業研究と大学院向け発展案を分離する

- 状態（分割前の原文）: 決定済み

original_text — 「両者は連続性を持つが、同一実験として混ぜない。」

source — `/Users/miramiki/dev/labResearchProject/docs/research/research-context.md:214`

note — 卒業研究の因果構造と実施可能性を守るためのスコープ境界である。

## DEC-009 現行expTest1は技術デモとして扱う

- 状態（分割前の原文）: 決定済み

original_text — 「技術デモとしては完成、パイロット実験としては未完成、本実験には使用不可」

source — `/Users/miramiki/dev/labResearchProject/docs/project/prototype-progress.md:6`

note — 「動作すること」と「妥当な実験であること」を分離する判断である。

## DEC-010 参加者が回答する中心的な評価セットは4つの評価軸とする

- 状態（分割前の原文）: 評価軸の構成を暫定採用。項目・尺度は小規模パイロット前のDRAFT。

original_text — 「Scene construction、Narrative vividness、Affective atmosphere、そして Memory-likeness です。」

source — ChatGPT LabResearchプロジェクト、2026-06-03「スライド用台本作成」、Slide 6 — Measurement、会話URL: <https://chatgpt.com/g/g-p-69d7167a69148191b61d4b0b9e7c2581-labresearch/c/6a1efaad-3854-83a3-8c21-5f7f63819718>

note — 旧4項目を、測定対象の重複を整理した4評価軸へ更新した。現行プロトタイプのEmotional ConnectionとSystem Preferenceは中心的評価セットから外す。

original_text — 「本研究では、再構成文が実体験の想起らしく感じられる程度を『記憶様感』として主評価軸に設定する。」

source — `/Users/miramiki/.codex/attachments/69f75345-147e-4c94-b7bf-8349c5ad403a/pasted-text.txt`, 「4軸の関係」最終記述

note — 添付提案を研究仕様へ反映した。先行研究の構成概念を直接尺度として流用せず、LLM再構成文への読後反応として操作化するため、項目妥当性の確認を残す。

## DEC-011 4評価軸の統計的位置づけと主仮説

original_text — 「研究上の想定は、情景構成、鮮明性、感情再体験が記憶様感を支えるという関係です。ただし、これは現時点では検証前の理論モデルです。」

source — `/Users/miramiki/.codex/attachments/69f75345-147e-4c94-b7bf-8349c5ad403a/pasted-text.txt`, 「4軸の関係」

note — 記憶様感を主評価軸にするが、副軸を合成して記憶様感を説明することは事前に仮定しない。まず各軸の条件差を独立に分析し、軸間関連は探索的に扱う。

original_text — 「とりあえずBにして結果を得てからAとしてもいいと考える。」

source — `docs/project/decisions.md`, DEC-011追記（2026-07-15確認）

note — 4軸を主評価として扱うなら、4仮説、多重比較、サンプルサイズ、成功判定を先に固定する必要がある。結果依存で主評価を切り替えると、分析の恣意性を避けられない。

original_text — 「主要評価項目を固定しないまま多数の尺度を測ると、分析の恣意性が高くなる。」

source — `/Users/miramiki/dev/labResearchProject/docs/research/research-context.md:673`

note — 4軸を評価画面から減らす必要はない。統計上の主従関係を事前に決める必要がある。

## DEC-014 Manipulation Checkの項目と判定

- 状態（分割前の原文）: v0.2.0-draftへ更新（指導教員レビュー・認知インタビュー・パイロット待ち）

original_text — “eliminating observations based on posttreatment criteria”

source — Montgomery, Nyhan, and Torres, “How Conditioning on Posttreatment Variables Can Ruin Your Experiment and What to Do about It,” *American Journal of Political Science*, 2018. <https://doi.org/10.1111/ajps.12357>

note — 条件提示後に測るManipulation Checkで参加者を除外すると、ランダム割付による比較を損なう可能性があるため、本研究では除外に使わない。

## DEC-015 初期想起トリガー

- 状態（分割前の原文）: v0.1.0初稿作成（指導教員レビュー・認知インタビュー・パイロット待ち）

original_text — 「あなた自身の過去の出来事を一つ思い出してください。何度も繰り返す習慣や長い期間ではなく、特定の一回の出来事を選んでください。」

source — [`../protocol/initial-recall-trigger.md`](../../docs/protocol/initial-recall-trigger.md)

note — 完全自由入力を残すが、出来事単位、回答量、安全性、感覚誘導の不在を共通化する初稿である。

## DEC-016 日本語を基本とし、英語対応版を併設する

- 状態（分割前の原文）: 決定済み

original_text — 「参加者は確実に多くなる日本語に決定。しかし英語の参加者にも参加できる様な設計にする。」

source — ユーザー指示、2026-07-15

note — 二言語を同じ分析に無条件で混ぜると、質問言語・回答言語の差が条件効果に混入する。英語対応は参加可能性の確保であり、直ちに言語横断比較を意味しない。

## DEC-019 同意・外部API送信・撤回説明

- 状態（分割前の原文）: 参加者向け草案を作成。指導教員・所属機関の確認と最終連絡先の記入が未了。

original_text — “Abuse monitoring logs may contain certain customer content, such as prompts and responses ... retained for up to 30 days”

source — [OpenAI API Data Controls](https://platform.openai.com/docs/models/default-usage-policies-by-endpoint)

note — 研究者側の保存期限を10年にしても、外部API側の保持を同じ期間に延長できるわけではない。外部事業者側の保持可能性を同意文に分けて記載する。

## DEC-020 研究データの保存・匿名化・保持・削除

- 状態（分割前の原文）: 保存期間・削除方法の決定案。指導教員・所属機関規程の確認待ち。

original_text — 「論文等の形で発表された研究成果のもととなった実験データ等の研究資料は、当該論文等の発表から10年間の保存を原則とする。」

source — [日本学術会議「科学研究における健全性の向上について」](https://www.scj.go.jp/ja/member/iinkai/kenzensei/pdf/kenzensei-kaito.pdf), §4

note — 日本の大学で広く採用される研究公正上の基準に合わせ、デジタル研究資料の保存を10年とする。医療・生命科学系指針が直接適用されるとは限らないが、同指針の「可能な限り長期間保管」「廃棄時に個人識別不能措置」という考え方も安全側の補助基準とする。

original_text — 「研究資料等の保存期間は10年間と定めています。」

source — [東北大学「研究データ等の保存及び管理に関する指針」案内](https://www.bureau.tohoku.ac.jp/kenkyo/fb/rules.html)

note — 大学の研究公正規程における実務上の標準と整合する。

original_text — 「保存項目・保持期間・削除方法は日本の学術論文において使われているものをそのまま行いたい。これをもってタスク終了 dec記入。」

source — ユーザー指示、2026-09-07。`tasks.md` TASK-013への追記。

note — 削除手順の具体的な記述と所属機関規程との突き合わせは残っている。DEC-042により倫理審査を行うことになったため、これらは審査の提出書類として作成する（TASK-024）。

## DEC-024 正式題名と独立変数の表現

- 状態（分割前の原文）: 正式題名と独立変数の表現を確定。指導教員への報告と確認は残る。

original_text — “This project will build an interactive autobiographical memory elicitation system using an LLM and examine how different questioning strategies influence reconstructed memory experiences.”

source — `/Users/miramiki/Downloads/Form1_E_RPlan_1022170-2026-06-22.pdf`, p. 3, upper-middle.

note — 正式題名は維持し、DEC-033により独立変数を質問焦点（出来事構造、視覚、匂い）の三水準として確定した。

## DEC-026 APIキー失効と配布用設定ファイルの無害化

- 状態（分割前の原文）: 決定済み（ユーザー確認済み）

original_text — 「キー失効は操作＆目で確認済み」

source — ユーザー指示、2026-07-16

note — CodexがOpenAI管理画面の操作を再検証したものではなく、ユーザーによる操作・画面確認を決定記録として採用した。

## DEC-028 大学院入試日程

- 状態（分割前の原文）: 決定済み（予定日）

original_text — 「入試日程は八月５と６」

source — ユーザー指示、2026-07-16

note — 試験日として記録した。試験区分や時刻は公式案内で別途確認する。

## DEC-029 本実験の追質問は条件制約付きのLLM生成質問を使用する

- 状態（分割前の原文）: 指導教員指示に基づく決定。プロンプト・停止条件・品質検査は未確定。

original_text — 「固定質問ではなく生成質問である方が良い」

source — ユーザー指示、2026-07-16（指導教員の指示の報告）

note — 生成を無制約に採用する決定ではなく、生成範囲と再現性管理を必須条件とする。

## DEC-030 追質問の再生成上限・フォールバック・生成ログ仕様

- 状態（分割前の原文）: 実装済み・パイロット検証合格（本番承認は未了）

original_text — `export const MAX_CONTENT_REGENERATIONS = 2;`

source — `/Users/miramiki/dev/labResearchProject/expTest1/lib/followup-generation.ts:18`

note — 無制限再生成ではなく合計3試行に固定。Claude検証で実ファイルと一致確認済み。

original_text — `No valid fallback question remained for ${input.condition} turn ${input.priorTurns.length + 1}.`

source — `/Users/miramiki/dev/labResearchProject/expTest1/lib/followup-generation.ts:225`

note — 質問バンクまで不合格なら違反質問を提示しない。Codex報告の223行は誤りで、実際は225行。

original_text — `Questions delivered: 54` / `Turns requiring retry: 7` / `Final validation flags: 0`

source — `/Users/miramiki/dev/labResearchProject/expTest1/artifacts/prompt-pilot/report.md:8`（8・10・13行）

note — 実API最終結果。ただしprompt/validatorはv0.2.1である点に注意。

original_text — `Fallback deliveries: 2` / `Final validation flags: 0`

source — `/Users/miramiki/dev/labResearchProject/expTest1/artifacts/prompt-pilot/dry-run-followup-pilot-v0.2.2__followup-validator-v0.2.2/report.md:13`

note — 再生成上限到達後のフォールバック経路を乾式で強制検証した結果。実APIではない。

original_text — `Independent-variable integrity gate: PASS`

source — `/Users/miramiki/dev/labResearchProject/expTest1/artifacts/prompt-pilot/live-run-followup-pilot-v0.2.8__followup-validator-v0.2.8/report.md:16`

note — Fable第2回レビュー後のv0.2.8実API検証。自動ゲート合格であり、Fable第3回・指導教員承認を代替しない。

## DEC-031 本実験システムは確定プロトコルを入力に最小構成で作り直す

- 状態（分割前の原文）: 作り直し方針を確定。実装着手条件としてPROTOCOL.mdの残項目を凍結する。

original_text — 「現行コードをさらに継ぎ足して完成させることは可能だが、その機会費用は高い。次に作る場合は、現行システムを縮小改修するのではなく、確定した研究プロトコルだけを入力として最小構成から作り直す方が合理的である。」

source — `docs/archive/memory-experiment-system-archive.md`, 「保全対象の結論」

note — 拡張継続の否定は能力不足ではなく機会費用の判断である。作り直しはDEC-009（expTest1は技術デモ）と同型の「動くこと」と「研究として妥当なこと」の分離を、production candidate自身へ適用した結果になる。

original_text — 「最大の誤りは、研究上の問いと運用形態が固まる前に「production candidate」を作ったことである。」

source — `docs/archive/memory-experiment-system-archive.md`, 「反省と作り直し方針」

note — この診断は、decisions.mdの未決定事項（DEC-011〜024）を先に確定させる既存の優先順位と整合する。作り直し自体より、プロトコル確定が律速である。

original_text — 「未決定事項を可視化した点は正しいが、26件のopen decisionを抱えた状態で本体実装を進めた順序が悪かった。」

source — `docs/archive/memory-experiment-system-archive.md`, 「反省と作り直し方針」

note — 同じ誤りを繰り返さないため、次期実装の着手条件を「PROTOCOL.mdの指導教員確認」とする。

## DEC-033 三条件をStandard・Visual・Odorとする（DEC-041で二条件へ更新）

- 状態（分割前の原文）: 決定済み（研究者判断。指導教員への報告と確認は残る）

original_text — 「Protocol0.4のstandard,visual,odorの三条件にするのを採用するのはどう？」／「これで一回更新して」

source — ユーザー指示、2026-08-16

note — 単一の感覚モダリティ同士を比較できる構成へ変更する。旧Non-Odor条件とその固定質問仕様は履歴として保持する。

## DEC-034 最終文章を参加者の証拠に限定する（最終文章の方針はDEC-036で更新）

- 状態（分割前の原文）: 決定済み（研究者判断。mock実装と限定的な実APIスモークは完了、30件再評価は未了）

original_text — 「これで一回更新して」

source — ユーザー指示、2026-08-16（Standard・Visual・Odor採用案と、それに伴うProtocol 0.4.1修正案への承認）

note — 2026-07-25の対照評価で、厳格な証拠制約が現行v0.3.0の主要欠陥を減らした結果を採用した。文章長の条件差は肉付けで埋めず、質問側の証拠量差として診断する。

## DEC-035 質問の必須検証を4種類に限定する

- 状態（分割前の原文）: 研究者方針として採用。mockへ反映。本実験の承認とは別に扱う。

original_text — 「条件ごとの制約と実験情報の開示、出力形式、重複以外は必須ではないと思う。また正規表現で言い回しを行わせるのも自由を損なわせるか良くないと思う」

source — 2026-09-02、このプロジェクトのユーザー指示。

note — 生成した質問が検証によって固定質問へ置換される問題を受け、条件の保護と文型の強制を分ける。新しい実験承認を得たという記録ではない。

## DEC-036 AIの創作を含む物語への読後反応を研究対象とする

- 状態（分割前の原文）: 研究者方針として採用。mockへ反映。研究実施の承認状態は変更しない。

original_text — 「主仮説が大事だと思うからAIによる創作でどう感じるかを見る方針にしよう。」

source — 2026-09-02、このプロジェクトのユーザー指示。

note — 主仮説を維持し、生成文章を忠実な編集に限定する方針を更新した。創作の程度や内容は出力評価の対象であり、新方針の妥当性が検証済みという記録ではない。

original_text — 「接続しただけの文章よりも読んだ感触は良くなった。方針を維持。タスクを終了」

source — ユーザー指示、2026-09-07。`tasks.md` TASK-014への追記。

note — 研究者による読後の印象であり、入力との矛盾量、条件別の追加内容、証拠量対文章量比を集計した結果ではない。条件別の傾向は本人評価のデータが集まってから確認する。

## DEC-037 ローカル検証の生成記録・保存境界を整備する

- 状態（分割前の原文）: ユーザー指示に基づき実装。オンライン公開・本番研究実施の承認ではない。

original_text — 「この変更を一旦行おう」

source — ユーザー指示、本タスク、2026-09-02

note — 提案した生成情報の保存、必須回答の検証、CSV保存処理の分離をローカル検証用に実施する。

## DEC-038 開発用Supabaseへの完了結果保存を追加する

- 状態（分割前の原文）: 接続コードとSQLを実装。2026-09-03にクラウドでの合成結果保存・再送時の重複防止・読み戻し・CSV出力を確認済み。

original_text — 「projectの名前は26labResearchとし.env.localに項目を追加しました」

source — ユーザー報告、本タスク、2026-09-03

note — オンライン移行に向けたローカル接続検証を進める。本番研究実施の承認とは区別する。

## DEC-039 回答状態を優先して次の質問を選ぶ

- 状態（分割前の原文）: ユーザー指示に基づくmock実装方針。実APIでの意味的な品質評価と研究実施の承認は未了。

original_text — 「これで一回コードを修正してみよう。指示をサブエージェントに出して行ってください」

source — ユーザー指示、本タスク、2026-09-06。直前に回答状態を優先する質問フローを提示。

note — mockでの試行実装。新方針の条件別質問機能、非想起の扱い、中立移行とフォールバックの頻度は今後の出力評価で確認する。

## DEC-040 指導教員確認を承認ゲートに置かない

original_text — 「教員確認は行わない。そういった確認は私が判断し明言したもののみ行う。これは行わない。タスクを終了」

source — ユーザー指示、2026-09-07。`tasks.md` TASK-006への追記。

original_text — 「教員確認しなきゃいけないと判断したタスクは私が適宜追加する。現在教員確認するとしているものは終了」

source — ユーザー指示、2026-09-07。本タスクでの確認回答。

original_text — 「完了するもしないも指導教官はシステムの内部よりもシステムの完成を求めているよってタスクを終了」

source — ユーザー指示、2026-09-07。`tasks.md` TASK-002への追記。

note — 指導教員の関心がシステムの完成にあるという観測が、内部仕様の一つ一つに承認を求めない判断の理由になっている。この観測自体は研究者による解釈であり、指導教員の明示的な意思表示として記録されたものではない。

note — 承認の所在を研究者へ一本化する運用上の決定であり、各決定の内容が研究として妥当であることを示すものではない。教員確認を外したことで`状態`が`暫定`から`確定`へ動くのは、文言や仕様がすでに固まっている場合に限る。DEC-010は文言が未確定のため`暫定`のまま残す。

## DEC-041 Standard条件を廃止しVisual・Odorの二条件とする

original_text — 「standard条件は削除方針に変更。タスク終了」

source — ユーザー指示、2026-09-07。`tasks.md` TASK-007への追記。

original_text — “It was the only condition defined purely by exclusion (no sensory, no emotion, no atmosphere). In a live run it produced every rejection observed (6 of 6) and fell back to a canned question on 2 of 6 turns, while `visual` and `odor` produced zero rejections across 18 turns.”

source — `core/DESIGN.md`, §2「Why `standard` was removed」。実測の根拠は`core/05-verification/observed-behavior.md`および`core/05-verification/evidence/live-run-2026-09-07.json`（2026-09-07、gpt-4o-mini-2024-07-18、質問24回・文章2回）。

note — 廃止の根拠は生成上の性質、すなわちその条件を安定して生成できるかどうかの観測である。Standardを含む三条件設計が研究上無効であったことを示すものではない。

original_text — “Dropping it buys ~1.5× the sample per remaining arm at fixed total N, and removes the only arm that could not be generated reliably.”

source — `core/DESIGN.md`, §2

note — 標本が1.5倍になるのは総Nを固定した場合の話である。目標Nそのものは三群比較ではなく二群比較として再計算する必要がある（TASK-016）。

## DEC-042 卒業研究で倫理審査を行う（DEC-027を上書き）

original_text — 「倫理審査は行う　Dec変更」

source — ユーザー指示、2026-09-07。`tasks.md` TASK-012への追記。

note — DEC-027は「所属機関の必須要件ではない」という判断で審査を行わないとしていた。本決定はその判断を覆すものであり、審査に要する期間が実験開始時期の制約になる。DEC-028の大学院入試日程との前後関係は未検討である。

## DEC-043 生成パラメータの正式値を事前に固定しない

original_text — 「正式値は決めない。出力の校正のたびに変更していく。最終値を論文に入れるだけなのでタスク終了。」

source — ユーザー指示、2026-09-07。`tasks.md` TASK-008への追記。

original_text — 「正式ターン数承認はしない。暫定のまま続行、正式採用タスクは意味がないのでタスクを終了。」

source — ユーザー指示、2026-09-07。`tasks.md` TASK-003への追記。

note — 校正段階では有効だが、参加者データの取得中にパラメータを変えると、条件差と生成設定の差を分離できなくなる。取得開始時点の値を凍結し、以後の変更を別のデータ収集として扱う必要がある。凍結の時期は本決定に含まれておらず未決定である（TASK-017と併せて判断する）。

## DEC-044 機械再評価と人間パイロットを並行運用とし承認ゲートにしない

original_text — 「再評価は質問選択などのプロンプト設計変更毎に行なっている。毎回そうやってタスクを増やすのは意味がないのでタスクを終了」

source — ユーザー指示、2026-09-07。`tasks.md` TASK-004への追記。

original_text — 「人間パイロットと並行しながら機械ゲートを行なっているためタスクの意味なし。タスクを終了」

source — ユーザー指示、2026-09-07。`tasks.md` TASK-005への追記。

original_text — “The synthetic harness must pass a pre-registered per-condition fallback threshold before any human participant.”

source — `core/manifest.json`, designDecisions `gate-before-humans`

note — `core/`の記述は本決定と矛盾する。2026-09-07のユーザー確認により本決定を優先し、`core/`側の記述を修正する（TASK-025）。事前登録した閾値による前置ゲートを外すため、条件別フォールバック率が高いまま人間データの取得が始まる可能性は残る。分析時にこの量を除外基準や共変量ではなく記述指標として報告する。

## DEC-045 質問候補を並列生成し検証器で選抜する

original_text — “Draw candidates in parallel and use the validator to select; add a repair pass before falling back.”

source — `core/manifest.json`, designDecisions `parallel-candidates`

note — 実装方針の決定であり、質問の意味的な品質を保証するものではない。並列生成はAPI呼び出し回数を増やすため、費用の見積へ影響する。

## DEC-046 turnFunctionフィールドを廃止する

original_text — “The six-value turnFunction field is removed.”

source — `core/manifest.json`, designDecisions `turnfunction-dropped`

## DEC-047 MC-EVENTを操作確認から希釈診断へ再分類する

original_text — “MC-EVENT is a dilution diagnostic, not a manipulation check.”

source — `core/manifest.json`, designDecisions `mc-event-reclassified`／`core/DESIGN.md`, §7

note — DEC-014の項目文そのものは有効だが、項目の役割分担と対比係数は本決定で置き換わる。`../protocol/manipulation-check.md`と`../../experiment/manipulation-check.yaml`の同期はTASK-023で行う。

## DEC-048 棄却候補とフォールバック理由を研究データとして分析へ持ち込む

original_text — “Rejected candidates and fallback reasons are persisted with the result and carried into analysis. Rejection rate per condition measures whether a condition can be sustained; the standard arm failed silently until generation records were examined.”

source — `core/manifest.json`, designDecisions `rejections-are-data`／`core/DESIGN.md`, §4

note — 保存項目そのものはDEC-037で実装済み。本決定が加えるのは、これを分析計画に含め条件別に報告するという位置づけである。報告先の分析計画はTASK-010で確定する。

## DEC-049 Odor条件で匂いの対象同定を許可する

original_text — 「いや発生源推測を制限するのはやっぱりおかしいわ。人はそもそも複数の分子を嗅覚で感じそれを何々の匂いと認識する匂いオブジェクトを行なっている。」

source — 研究者指示、2026-09-07。直前に`odor_source_inference`の発火実績（全artifacts中0件）と条件別棄却内訳を確認。

note — 嗅覚の対象知覚を根拠とする判断であり、言語依存を含む。抽象的な嗅覚語彙を持つ言語では前提が変わりうるが、パイロットは日本語のみである（DEC-016）。
