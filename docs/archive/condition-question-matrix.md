# 三条件固定質問文・対応表（旧仕様）

- 作成日: 2026-07-15
- 版: 0.1.0-draft
- 状態: DEC-029により上書き。履歴参照用であり、現行実装仕様ではない。
- 実装用仕様: [`../../experiment/conditions.yaml`](../../experiment/conditions.yaml)
- 適用範囲: 共通の初期想起トリガーで一つの具体的な出来事を選んだ後に提示する追質問

## 旧仕様（現行では不採用）

| 項目 | 仕様 |
|---|---|
| 条件 | Standard / Non-Odor / Odor-Oriented |
| 質問数 | 各条件5問 |
| 順序 | 固定。1から5の順に提示 |
| 分岐 | なし。LLMによる追加質問・言い換えを禁止 |
| 表示 | 1画面1問。条件名は参加者へ表示しない |
| 回答形式 | 必須の自由記述、推奨1〜3文 |
| 日本語上限 | 300文字 |
| 英語上限 | 600 characters |
| 想起できない場合 | 「思い出せない」/ “I don't remember.” を有効回答として許可 |
| 言語 | 日本語を原版、英語を意味対応版とする。同一セッション内では混在させない |
| 自発的な条件外情報 | 削除・禁止しない。ただし追加質問で掘り下げない |

文字数上限を日本語と英語で同じにしていないのは、英語の方が同程度の意味内容に多くの文字を必要とするためである。これは言語間の完全な等価性を保証しない。英語回答を日本語回答と同じ確認的分析に統合するには、別途、翻訳同等性と分析計画を固定する。

## 質問対応表

### 1. 文脈への導入

| 条件 | 日本語原版 | English version |
|---|---|---|
| Standard | その出来事は、いつごろ、どこで、どのような状況で起きましたか。 | When and where did the event take place, and what was the situation? |
| Non-Odor | その場の見た目について、明るさ、色、物の配置、人の様子など、思い出せることを説明してください。 | Describe what you remember about how the setting looked, such as the light, colors, arrangement of objects, or appearance of people. |
| Odor-Oriented | その出来事の場で、匂いや空気のにおいについて何か思い出せますか。思い出せる場合、最初に浮かぶものを説明してください。 | Can you remember anything about a smell or the scent of the air during the event? If so, describe the first detail that comes to mind. |

### 2. 内容の特徴

| 条件 | 日本語原版 | English version |
|---|---|---|
| Standard | その場には誰がいて、あなたと周囲の人は何をしていましたか。 | Who was there, and what were you and the people around you doing? |
| Non-Odor | その場で聞こえた音や声について、種類、大きさ、聞こえた方向など、思い出せることを説明してください。 | Describe what you remember about sounds or voices, such as their type, volume, or direction. |
| Odor-Oriented | その匂いについて、種類、強さ、快さまたは不快さなど、思い出せる特徴を説明してください。 | Describe any qualities of the smell that you remember, such as its type, intensity, or pleasantness or unpleasantness. |

### 3. 発生と変化

| 条件 | 日本語原版 | English version |
|---|---|---|
| Standard | その出来事はどのように始まり、その直後に何が起きましたか。 | How did the event begin, and what happened immediately afterward? |
| Non-Odor | 出来事の最中、肌に触れたもの、温度、湿度などはどのように感じられ、変化しましたか。 | During the event, how did things touching your skin, the temperature, or the humidity feel and change? |
| Odor-Oriented | その匂いはどこから来て、出来事の間に強さや種類がどのように変化しましたか。 | Where did the smell come from, and how did its intensity or type change during the event? |

### 4. 出来事中の反応

| 条件 | 日本語原版 | English version |
|---|---|---|
| Standard | 出来事が進む間、あなたは何をし、どのように感じましたか。 | As the event unfolded, what did you do, and how did you feel? |
| Non-Odor | それらの見た目、音、触感がある中で、身体や気分にどのような反応がありましたか。 | Among those sights, sounds, and tactile sensations, how did your body or mood respond? |
| Odor-Oriented | その匂いに気づいたとき、身体や気分にどのような反応がありましたか。 | When you noticed the smell, how did your body or mood respond? |

### 5. 最も明瞭な詳細と連想

| 条件 | 日本語原版 | English version |
|---|---|---|
| Standard | その出来事で最もはっきり覚えている詳細は何ですか。それはあなたに何を思い起こさせますか。 | What detail of the event do you remember most clearly, and what does it bring to mind? |
| Non-Odor | 視覚、音、触感、身体感覚のうち、最もはっきり覚えている詳細は何ですか。それはあなたに何を思い起こさせますか。 | Which visual, auditory, tactile, or bodily detail do you remember most clearly, and what does it bring to mind? |
| Odor-Oriented | 匂いや空気のにおいについて、最もはっきり覚えている詳細は何ですか。それはあなたに何を思い起こさせますか。 | What detail about the smell or scent of the air do you remember most clearly, and what does it bring to mind? |

## 条件ごとの操作対象

- Standard: 出来事、人物、場所、順序へ注意を向ける。感覚情報を禁止しないが、質問側から特定の感覚を指定しない。
- Non-Odor: 視覚、聴覚、触覚、温度・湿度、身体感覚へ注意を向ける。参加者が自発的に匂いへ言及しても削除しないが、匂いを追質問しない。
- Odor-Oriented: 匂い、空気のにおい、発生源、強さ・快不快・時間変化、身体・気分の反応、匂いによる連想へ注意を向ける。

original_text — “The standard condition should focus on events, people, places, and sequence.”

source — `/Users/miramiki/Downloads/Form1_E_RPlan_1022170-2026-06-22.pdf`, p. 3, middle.

note — Standard条件は感覚情報を排除する条件ではなく、質問側から特定感覚へ誘導しない基準条件として設計した。

original_text — “The non-odor condition should focus on visual, auditory, tactile, and bodily details.”

source — `/Users/miramiki/Downloads/Form1_E_RPlan_1022170-2026-06-22.pdf`, p. 3, middle.

note — Non-Odor条件は視覚・聴覚・触覚・身体感覚を5問へ配分し、Odor-Oriented条件と同じ質問数・回答形式にした。

original_text — `| Odor-Oriented | smell, air, atmosphere, odor-triggered associations | 対象領域は暫定確認。質問全文は未決定 |`

source — [`../research/research-plan-review.md`](../research/research-plan-review.md), 「三条件の暫定定義」

note — Odor-Oriented条件は匂いが存在したと断定しない。想起できない回答を認め、匂いの創作を強制しない。

## 採用前に必ず確認する点

1. 指導教員が、各条件5問と固定順序を承認すること。
2. 日本語母語話者3〜5名程度の認知インタビューで、質問の理解、重複、圧力、回答時間を確認すること。
3. Odor-Oriented条件で匂いを思い出せない参加者が、回答を作るよう圧力を感じないか確認すること。
4. 三条件で回答時間・文字数・欠測率が極端に異ならないか、小規模パイロットで確認すること。
5. 日本語版を修正した場合、英語版も同じ版番号で再確認すること。

この版は実装可能な初稿だが、本実験でそのまま使用できる確定刺激ではない。指導教員レビューとパイロット後に版を凍結する。
