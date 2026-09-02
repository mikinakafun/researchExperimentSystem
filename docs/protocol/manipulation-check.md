# Manipulation Check v0.2.0-draft

- 作成日: 2026-07-15
- 更新日: 2026-08-16（Standard / Visual / OdorとOdor対Visualの主対比へ更新）
- 状態: 初稿改訂。指導教員レビュー・認知インタビュー・パイロット前
- 対応する決定: DEC-014、DEC-033、DEC-034
- 実装用仕様: [`../../experiment/manipulation-check.yaml`](../../experiment/manipulation-check.yaml)
- 提示位置: Memory-Likenessを含む主要・副次評価の回答後、デブリーフィング前

## 目的

三条件の生成質問が、意図した注意対象へ参加者の注意を向けたかを確認する。主要な操作確認は、Odor条件がVisual条件よりも匂いへの注意を高めたかである。Manipulation Checkは主要評価項目ではなく、操作の解釈可能性を確認する補助測定である。

## 回答方式

- 7件法のラジオボタン
- 初期選択なし、全項目必須
- 1 = 全く向けなかった／全く感じなかった
- 4 = 中程度
- 7 = 非常に強く向けた／非常に強く感じた
- DQ-MEMORYBASISのみ、1 = 全く基づいていなかった、7 = 完全に基づいていた
- DQ-UNSAIDのみ、1 = 全く含まれていなかった、7 = 非常に多く含まれていた
- 日本語原版と英語対応版を使用

## 操作確認3項目

| ID | 日本語原版 | English version | 期待される傾向 |
|---|---|---|---|
| MC-EVENT | 提示された質問は、出来事の中での行動、人物、やり取り、起きた順序に、どの程度あなたの注意を向けましたか。 | To what extent did the questions direct your attention to actions, people, interactions, and the sequence of the event? | Standardが最も高い |
| MC-VISUAL | 提示された質問は、物や人の見た目、色、明るさ、配置などの視覚的な詳細に、どの程度あなたの注意を向けましたか。 | To what extent did the questions direct your attention to visual details, such as the appearance, colors, lighting, or arrangement of objects and people? | Visualが最も高い |
| MC-ODOR | 提示された質問は、匂いや空気のにおいに、どの程度あなたの注意を向けましたか。 | To what extent did the questions direct your attention to smells or the scent of the air? | Odorが最も高い |

## データ品質診断3項目

以下はManipulation Checkの合計得点へ含めない。

| ID | 日本語原版 | English version | 解釈 |
|---|---|---|---|
| DQ-PRESSURE | 実際には思い出せない詳細まで答えるよう求められていると、どの程度感じましたか。 | To what extent did you feel that you were being asked to provide details you could not actually remember? | 高いほど創作圧力が強い可能性 |
| DQ-MEMORYBASIS | あなたの回答は、推測ではなく、実際に思い出せた内容にどの程度基づいていましたか。 | To what extent were your answers based on details you actually remembered rather than guesses? | 高いほど記憶に基づく自己報告 |
| DQ-UNSAID | 作成された文章には、あなたが答えていない内容が、どの程度含まれていたと感じましたか。 | To what extent did you feel that the generated story contained content you had not provided in your answers? | 高いほど参加者が入力にない内容を知覚（DEC-032追記を維持。DEC-034実装後も、除外・再生成・共変量に使わず条件別集計の診断のみ） |

## 分析と成立判定

主要操作確認はMC-ODORのOdor対Visualとする。条件順をStandard / Visual / Odorとした対比係数は`[0, -1, +1]`である。

| 判定 | 事前規則 |
|---|---|
| 強い成立証拠 | 推定差が正で、両側95%信頼区間が0を含まない |
| 不確実 | 推定差は正だが、両側95%信頼区間が0を含む |
| 不成立または逆転 | 推定差が0以下 |

この三分類は結果の解釈用であり、参加者を個別に除外する規則ではない。操作確認が不成立でも主要評価の結果は報告するが、「匂い質問に効果がなかった」と断定せず、「匂いへの注意操作が十分に成立しなかった可能性」を区別して論じる。

## 除外・モデル投入の方針

- Manipulation Checkの低得点を理由に参加者を除外しない。
- Manipulation Check得点で標本を分割しない。
- 主要評価モデルの共変量として投入しない。
- ランダム割付条件の代わりにManipulation Check得点を独立変数として使わない。
- 注意不足や不正回答を除外する必要がある場合は、操作確認とは別の事前規定した基準を使用する。

original_text — “eliminating observations based on posttreatment criteria”

source — Montgomery, Nyhan, and Torres, “How Conditioning on Posttreatment Variables Can Ruin Your Experiment and What to Do about It,” *American Journal of Political Science*, 2018. <https://doi.org/10.1111/ajps.12357>

note — Manipulation Checkは条件提示後の変数である。低得点者を除外すると、ランダム割付による比較を損なう可能性があるため、本研究では除外に使わない。

## 採用前の確認事項

1. 3項目が参加者に条件名を推測させても、主要・副次評価後の提示で結果を汚染しないかを確認する。
2. 日本語・英語で「注意を向けた」の強度が対応しているかを確認する。
3. 7件法のアンカーが各項目で自然に理解できるかを認知インタビューで確認する。
4. MC-EVENT、MC-VISUAL、MC-ODORが生成質問の焦点を十分に区別できるかをパイロットで確認する。
5. 操作確認の分析をDEC-021の分析計画と事前登録へ転記する。
