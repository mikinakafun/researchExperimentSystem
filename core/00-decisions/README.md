# 決定とタスク（core/00-decisions）

この実験システムを規定する**決定**と、それに紐づく**未了作業**を置く。`core/`はこのディレクトリを含めて自己完結し、切り出して別プロジェクトの土台にできる。

| ファイル | 置くもの | 更新 |
| --- | --- | --- |
| [decisions.md](decisions.md) | システムを規定する有効な決定（研究設計・プロトコル・実装・データ保存） | 新しい決定を追記する |
| [tasks.md](tasks.md) | 未了作業。運営系・システム系を分けない一つの一覧 | 完了したら末尾へ移す |
| [decisions-archive.md](decisions-archive.md) | 上書き・却下された決定と、書き換え前の旧本文 | 上書きが起きたとき |
| [provenance.md](provenance.md) | 各決定の引用原文（`original_text` / `source` / `note`）。2026-09-07時点で凍結 | 更新しない |
| [`../../docs/project/decisions-active.md`](../../docs/project/decisions-active.md) | 研究プロジェクト運営の決定（`core/`の外。日程、承認の所在、鍵の失効、倫理審査の方針） | 運営上の決定を追記する |

## 運用規則

1. **1つの決定は1か所にだけ置く。** システムを規定するなら本ディレクトリ、プロジェクト運営なら`docs/project/`。両方に書かない。
2. **DEC番号は変えない。** 上書きは新しい番号で追記し、旧項目には「更新」行と旧本文の移動先（`decisions-archive.md`）を残す。
3. **各決定は「反映先」を持つ。** 反映先はその決定を実装している`core/`内のモジュール。反映先と決定が食い違ったら決定が正で、仕様側を直す。決定を変えるときは反映先を全部直す。
4. **仕様書の中で新しい判断をしない。** `DESIGN.md`や各モジュールに書きたくなった判断は、先に`decisions.md`へDECとして起こし、仕様書からはDEC番号で参照する。
5. **タスクは決定の中に書かない。** 決定の`残作業`フィールドはTASK番号への参照だけ。
6. 承認フィールドは`不要` / `機関確認待ち`の2値。指導教員確認を承認ゲートに置かない（DEC-040）。研究者が必要と明言したものだけ、その都度タスクとして追加する。

## フィールド

| フィールド | 値 | 意味 |
| --- | --- | --- |
| 状態 | `確定` / `暫定` | `確定`=研究仕様として採用済み。`暫定`=現行実装または作業仮説として存在するが、文言や値が固まっていない |
| 領域 | `研究設計` / `プロトコル` / `実装` / `運用・倫理` | どの文書群を触る判断か |
| 承認 | `不要` / `機関確認待ち` | 研究者の判断が済んでいても外部の承認が残ることがある。状態と承認は独立 |
| 残作業 | `なし` / TASK-xxx | 紐づく未了作業。実体は`tasks.md` |
| 反映先 | `core/`内のパスと節 | その決定を実装している場所 |

## 索引（全決定）

| ID | 表題 | 状態 | 領域 | 所在 | リンク |
| --- | --- | --- | --- | --- | --- |
| DEC-001 | 卒業研究では実匂い刺激を使用しない | 確定 | 研究設計 | core | [decisions.md](decisions.md#dec-001-卒業研究では実匂い刺激を使用しない) |
| DEC-002 | 被験者間計画を採用する（一人一条件） | 確定 | 研究設計 | core | [decisions.md](decisions.md#dec-002-被験者間計画を採用する一人一条件) |
| DEC-003 | 参加者を条件へランダム割付する | 確定 | 研究設計 | core | [decisions.md](decisions.md#dec-003-参加者を条件へランダム割付する) |
| DEC-004 | LLM生成文に対する本人の評価を主要な研究結果に含める | 確定 | 研究設計 | core | [decisions.md](decisions.md#dec-004-llm生成文に対する本人の評価を主要な研究結果に含める) |
| DEC-005 | LLMは参加者の断片情報から物語文章を生成する | 確定 | プロトコル | core | [decisions.md](decisions.md#dec-005-llmは参加者の断片情報から物語文章を生成する) |
| DEC-006 | Manipulation Checkを実施する | 確定 | プロトコル | core | [decisions.md](decisions.md#dec-006-manipulation-checkを実施する) |
| DEC-007 | 全条件共通の初期想起トリガーを設ける | 確定 | プロトコル | core | [decisions.md](decisions.md#dec-007-全条件共通の初期想起トリガーを設ける) |
| DEC-008 | 卒業研究と大学院向け発展案を分離する | 確定 | 運用・倫理 | docs | [docs/project/decisions-active.md](../../docs/project/decisions-active.md) |
| DEC-009 | 現行expTest1は技術デモとして扱う | 確定 | 実装 | docs | [docs/project/decisions-active.md](../../docs/project/decisions-active.md) |
| DEC-010 | 参加者が回答する中心的な評価セットは4つの評価軸とする | 暫定 | 研究設計 | core | [decisions.md](decisions.md#dec-010-参加者が回答する中心的な評価セットは4つの評価軸とする) |
| DEC-011 | 4評価軸の統計的位置づけと主仮説 | 確定 | 研究設計 | core | [decisions.md](decisions.md#dec-011-4評価軸の統計的位置づけと主仮説) |
| DEC-014 | Manipulation Checkの項目と判定 | 暫定 | プロトコル | core | [decisions.md](decisions.md#dec-014-manipulation-checkの項目と判定) |
| DEC-015 | 初期想起トリガー | 確定 | プロトコル | core | [decisions.md](decisions.md#dec-015-初期想起トリガー) |
| DEC-016 | 日本語を基本とし、英語対応版を併設する | 確定 | 研究設計 | core | [decisions.md](decisions.md#dec-016-日本語を基本とし英語対応版を併設する) |
| DEC-019 | 同意・外部API送信・撤回説明 | 暫定 | 運用・倫理 | core | [decisions.md](decisions.md#dec-019-同意外部api送信撤回説明) |
| DEC-020 | 研究データの保存・匿名化・保持・削除 | 確定 | 運用・倫理 | core | [decisions.md](decisions.md#dec-020-研究データの保存匿名化保持削除) |
| DEC-024 | 正式題名と独立変数の表現 | 確定 | 研究設計 | core | [decisions.md](decisions.md#dec-024-正式題名と独立変数の表現) |
| DEC-026 | APIキー失効と配布用設定ファイルの無害化 | 確定 | 運用・倫理 | docs | [docs/project/decisions-active.md](../../docs/project/decisions-active.md) |
| DEC-028 | 大学院入試日程 | 確定 | 運用・倫理 | docs | [docs/project/decisions-active.md](../../docs/project/decisions-active.md) |
| DEC-029 | 本実験の追質問は条件制約付きのLLM生成質問を使用する | 確定 | プロトコル | core | [decisions.md](decisions.md#dec-029-本実験の追質問は条件制約付きのllm生成質問を使用する) |
| DEC-030 | 追質問の再生成上限・フォールバック・生成ログ仕様 | 確定 | 実装 | core | [decisions.md](decisions.md#dec-030-追質問の再生成上限フォールバック生成ログ仕様) |
| DEC-031 | 本実験システムは確定プロトコルを入力に最小構成で作り直す | 確定 | 実装 | docs | [docs/project/decisions-active.md](../../docs/project/decisions-active.md) |
| DEC-033 | Visual・Odor条件の焦点定義と解釈上の制約 | 確定 | 研究設計 | core | [decisions.md](decisions.md#dec-033-visualodor条件の焦点定義と解釈上の制約) |
| DEC-034 | 最終文章の素材と条件盲検の生成処理（創作の方針はDEC-036） | 確定 | プロトコル | core | [decisions.md](decisions.md#dec-034-最終文章の素材と条件盲検の生成処理創作の方針はdec-036) |
| DEC-035 | 質問の必須検証を4種類に限定する | 確定 | 実装 | core | [decisions.md](decisions.md#dec-035-質問の必須検証を4種類に限定する) |
| DEC-036 | AIの創作を含む物語への読後反応を研究対象とする | 確定 | プロトコル | core | [decisions.md](decisions.md#dec-036-aiの創作を含む物語への読後反応を研究対象とする) |
| DEC-037 | ローカル検証の生成記録・保存境界を整備する | 確定 | 実装 | core | [decisions.md](decisions.md#dec-037-ローカル検証の生成記録保存境界を整備する) |
| DEC-038 | 開発用Supabaseへの完了結果保存を追加する | 確定 | 実装 | core | [decisions.md](decisions.md#dec-038-開発用supabaseへの完了結果保存を追加する) |
| DEC-039 | 回答状態を優先して次の質問を選ぶ | 確定 | 実装 | core | [decisions.md](decisions.md#dec-039-回答状態を優先して次の質問を選ぶ) |
| DEC-040 | 指導教員確認を承認ゲートに置かない | 確定 | 運用・倫理 | docs | [docs/project/decisions-active.md](../../docs/project/decisions-active.md) |
| DEC-041 | Standard条件を廃止しVisual・Odorの二条件とする | 確定 | 研究設計 | core | [decisions.md](decisions.md#dec-041-standard条件を廃止しvisualodorの二条件とする) |
| DEC-042 | 卒業研究で倫理審査を行う（DEC-027を上書き） | 確定 | 運用・倫理 | docs | [docs/project/decisions-active.md](../../docs/project/decisions-active.md) |
| DEC-043 | 生成パラメータの正式値を事前に固定しない | 確定 | 実装 | core | [decisions.md](decisions.md#dec-043-生成パラメータの正式値を事前に固定しない) |
| DEC-044 | 機械再評価と人間パイロットを並行運用とし承認ゲートにしない | 確定 | 実装 | core | [decisions.md](decisions.md#dec-044-機械再評価と人間パイロットを並行運用とし承認ゲートにしない) |
| DEC-045 | 質問候補を並列生成し検証器で選抜する | 確定 | 実装 | core | [decisions.md](decisions.md#dec-045-質問候補を並列生成し検証器で選抜する) |
| DEC-046 | turnFunctionフィールドを廃止する | 確定 | 実装 | core | [decisions.md](decisions.md#dec-046-turnfunctionフィールドを廃止する) |
| DEC-047 | MC-EVENTを操作確認から希釈診断へ再分類する | 確定 | 研究設計 | core | [decisions.md](decisions.md#dec-047-mc-eventを操作確認から希釈診断へ再分類する) |
| DEC-048 | 棄却候補とフォールバック理由を研究データとして分析へ持ち込む | 確定 | 実装 | core | [decisions.md](decisions.md#dec-048-棄却候補とフォールバック理由を研究データとして分析へ持ち込む) |
| DEC-049 | Odor条件で匂いの対象同定を許可する | 確定 | 研究設計 | core | [decisions.md](decisions.md#dec-049-odor条件で匂いの対象同定を許可する) |

上書き・却下された決定（[decisions-archive.md](decisions-archive.md)）:

| ID | 表題 | 上書きした決定 |
| --- | --- | --- |
| DEC-012 | Standard条件は出来事・人物・場所・順序に焦点を置く | DEC-041 |
| DEC-013 | Non-OdorとOdor-Orientedの焦点領域 | DEC-033 |
| DEC-025 | 本実験の追質問は条件別の固定質問文を使用する | DEC-029 |
| DEC-027 | 卒業研究の倫理審査を行わない | DEC-042 |
| DEC-032 | 最終文章の証拠・事実追加・レビュー規則 | DEC-034（一部） |
| IMP-001〜010 | expTest1の暫定実装値 | DEC-009 |

DEC-017・018・021・022・023は決定記録を持たず、対応する作業が`tasks.md`にある（TASK-015、010、016、017）。決めた時点で新しい番号で記録を起こす。
