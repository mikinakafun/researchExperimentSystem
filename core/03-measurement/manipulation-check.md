# Manipulation Check v0.3.0-draft

- 更新日: 2026-09-07（Standard条件の廃止に伴い、操作確認2項目・診断4項目・対比係数`[-1, +1]`へ再構成）
- 状態: 初稿改訂。認知インタビュー・パイロット前
- 実装用仕様: [`manipulation-check.yaml`](manipulation-check.yaml)
- 提示位置: Memory-Likenessを含む主要・副次評価の回答後、デブリーフィング前

## 目的

二条件（Visual / Odor）の生成質問が、意図した注意対象へ参加者の注意を向けたかを確認する。操作確認は、Odor条件がVisual条件よりも匂いへの注意を高めたか（MC-ODOR）と、Visual条件がOdor条件よりも視覚への注意を高めたか（MC-VISUAL）の二方向で見る。Manipulation Checkは主要評価項目ではなく、操作の解釈可能性を確認する補助測定である。

MC-EVENTは操作確認から外し、**希釈診断**として扱う。Standard条件を廃止した二条件設計では、出来事構造への注意は中立的な出来事質問を通じてしか入らない。MC-EVENTはその混入量の指標であり、条件操作の成立を確認する項目ではない。

## 回答方式

- 7件法のラジオボタン
- 初期選択なし、全項目必須
- 1 = 全く向けなかった／全く感じなかった
- 4 = 中程度
- 7 = 非常に強く向けた／非常に強く感じた
- DQ-MEMORYBASISのみ、1 = 全く基づいていなかった、7 = 完全に基づいていた
- DQ-UNSAIDのみ、1 = 全く含まれていなかった、7 = 非常に多く含まれていた
- 日本語原版と英語対応版を使用

## 操作確認2項目

項目文は変更していない。

| ID | 日本語原版 | English version | 期待される傾向 |
|---|---|---|---|
| MC-VISUAL | 提示された質問は、物や人の見た目、色、明るさ、配置などの視覚的な詳細に、どの程度あなたの注意を向けましたか。 | To what extent did the questions direct your attention to visual details, such as the appearance, colors, lighting, or arrangement of objects and people? | VisualがOdorより高い |
| MC-ODOR | 提示された質問は、匂いや空気のにおいに、どの程度あなたの注意を向けましたか。 | To what extent did the questions direct your attention to smells or the scent of the air? | OdorがVisualより高い |

## 診断4項目

以下は操作確認ではなく、結果変数でもない。Manipulation Checkの合計得点へ含めない。

| ID | 日本語原版 | English version | 解釈 |
|---|---|---|---|
| MC-EVENT | 提示された質問は、出来事の中での行動、人物、やり取り、起きた順序に、どの程度あなたの注意を向けましたか。 | To what extent did the questions direct your attention to actions, people, interactions, and the sequence of the event? | 希釈診断。中立質問を通じて混入した出来事構造への注意量。条件差ではなく、セッションあたりの中立移行回数と併せて読む |
| DQ-PRESSURE | 実際には思い出せない詳細まで答えるよう求められていると、どの程度感じましたか。 | To what extent did you feel that you were being asked to provide details you could not actually remember? | 高いほど創作圧力が強い可能性 |
| DQ-MEMORYBASIS | あなたの回答は、推測ではなく、実際に思い出せた内容にどの程度基づいていましたか。 | To what extent were your answers based on details you actually remembered rather than guesses? | 高いほど記憶に基づく自己報告 |
| DQ-UNSAID | 作成された文章には、あなたが答えていない内容が、どの程度含まれていたと感じましたか。 | To what extent did you feel that the generated story contained content you had not provided in your answers? | 高いほど参加者が入力にない内容を知覚。で創作を許可したため、高得点を品質不合格としない。除外、再生成、主分析の共変量に使わず条件別集計の診断のみ |

## 分析と成立判定

二群であるため対比係数は条件順Visual / Odorに対して`[-1, +1]`、すなわち単純な群間比較になる。MC-ODORはこの対比が正、MC-VISUALは負であることを期待する。

| 判定 | 事前規則 |
|---|---|
| 強い成立証拠 | 推定差が期待した向きで、両側95%信頼区間が0を含まない |
| 不確実 | 推定差は期待した向きだが、両側95%信頼区間が0を含む |
| 不成立または逆転 | 推定差が0、または期待と逆向き |

この三分類は結果の解釈用であり、参加者を個別に除外する規則ではない。操作確認が不成立でも主要評価の結果は報告するが、「匂い質問に効果がなかった」と断定せず、「匂いへの注意操作が十分に成立しなかった可能性」を区別して論じる。

**併記の義務**: すべてのManipulation Checkの報告に、セッションあたりの固定フォールバック回数と中立質問への移行回数を条件別に併記する。どちらも操作量の低下であり、操作確認の得点はその量と切り離して読めない。ただし除外基準にも共変量にも使わない。

## 除外・モデル投入の方針

- Manipulation Checkの低得点を理由に参加者を除外しない。
- 操作確認2項目を合算した「操作確認得点」を作らない。MC-VISUALとMC-ODORは別々に読む。
- Manipulation Check得点で標本を分割しない。
- 主要評価モデルの共変量として投入しない。
- ランダム割付条件の代わりにManipulation Check得点を独立変数として使わない。
- 注意不足や不正回答を除外する必要がある場合は、操作確認とは別の事前規定した基準を使用する。

original_text — “eliminating observations based on posttreatment criteria”

source — Montgomery, Nyhan, and Torres, “How Conditioning on Posttreatment Variables Can Ruin Your Experiment and What to Do about It,” *American Journal of Political Science*, 2018. <https://doi.org/10.1111/ajps.12357>

note — Manipulation Checkは条件提示後の変数である。低得点者を除外すると、ランダム割付による比較を損なう可能性があるため、本研究では除外に使わない。

## 採用前の確認事項

1. 6項目が参加者に条件名を推測させても、主要・副次評価後の提示で結果を汚染しないかを確認する。
2. 日本語・英語で「注意を向けた」の強度が対応しているかを確認する。
3. 7件法のアンカーが各項目で自然に理解できるかを認知インタビューで確認する。
4. MC-VISUALとMC-ODORが二条件の質問焦点を十分に区別できるかをパイロットで確認する。二条件では、MC-EVENTが両条件で同程度に高い場合、それは操作の失敗ではなく中立質問の多さを示している可能性がある。
5. 操作確認の分析を分析計画と事前登録へ転記する（TASK-010、TASK-017）。
