# 暫定研究計画書レビュー

- 確認日: 2026-07-10
- 原本: `/Users/miramiki/Downloads/Form1_E_RPlan_1022170-2026-06-22.pdf`
- 文書種別: Research Supervision Plan / Research Plan（暫定版）
- ページ数: 4
- PDF更新日時: 2026-06-23 03:15:08 JST
- SHA-256: `ef4ffc1150aae249232940729fa9274859d2fa64508d7e1c8d447fbfd7209969`

## 計画書から確認できた内容

### 研究テーマと期間

- 英語テーマ: Effects of Odor-Related Memory Information on LLM-Generated Narratives
- 計画期間: 2026年4月から2027年3月
- 分野: Intelligent Information Science
- 卒業論文: 英語と日本語（日本語は参照版）
- 発表: 日本語、英語スライドは参照用
- 論文: 英語

original_text — “Effects of Odor-Related Memory Information on LLM-Generated Narratives”

source — `/Users/miramiki/Downloads/Form1_E_RPlan_1022170-2026-06-22.pdf`, p. 1, middle; p. 2, upper-middle.

note — 正式提出候補の題名として記録する。ただし、実際の独立変数は「記憶断片に匂い情報が含まれるか」ではなく「質問条件」であり、方法との不一致がある。

### 実験の基本構造

三条件の対話システム、参加者の短い自伝的記憶断片、条件別追質問、LLMによる文章生成、参加者評価という流れが明記されている。

original_text — “participants enter a short memory fragment, the LLM asks condition-specific follow-up questions, and a final narrative is generated.”

source — `/Users/miramiki/Downloads/Form1_E_RPlan_1022170-2026-06-22.pdf`, p. 2, middle.

note — 現行プロトタイプの基本フローと一致する。参加者評価とManipulation Checkは現行実装に不足している。

### 三条件の暫定定義

| 条件 | 計画書の焦点 | 確定状況 |
|---|---|---|
| Standard | events, people, places, sequence | 目的領域は暫定確認。質問全文は未決定 |
| Non-Odor | visual, auditory, tactile, bodily details | モダリティは暫定確認。対応質問は未決定 |
| Odor-Oriented | smell, air, atmosphere, odor-triggered associations | 対象領域は暫定確認。質問全文は未決定 |

original_text — “The standard condition should focus on events, people, places, and sequence.”

source — `/Users/miramiki/Downloads/Form1_E_RPlan_1022170-2026-06-22.pdf`, p. 3, middle.

note — Standard条件の空白は一部埋まったが、条件間の質問数、長さ、具体性、回答量を揃える仕様はまだない。

### 4評価項目と暫定項目文

| 評価項目 | 図中の質問文 | 日本語作業訳 |
|---|---|---|
| Scene Construction | How well could you mentally construct the scene? | その場面をどの程度具体的に心に描けましたか |
| Narrative Vividness | How vivid and detailed was the story? | その文章はどの程度鮮明で詳細でしたか |
| Affective Atmosphere | How strong was the emotional atmosphere? | 感情的な雰囲気をどの程度強く感じましたか |
| Memory-Likeness | How much did it feel like your own memory? | どの程度、自分自身の記憶のように感じましたか |

original_text — “Human Experience Analysis (Primary)”

source — `/Users/miramiki/Downloads/Form1_E_RPlan_1022170-2026-06-22.pdf`, p. 2, lower, research-flow figure.

note — 図では4項目全体がPrimaryと表示される。一方、本文の一文主張はAffective AtmosphereとMemory-Likenessだけを挙げており、統計上の主要評価項目は計画書内部でも一致していない。

### 参加者情報と使用言語

計画書は年齢、国籍、性別、文化的背景、言語を収集し、主分析ではなく文脈情報として扱うとしている。またResearch Questions欄ではEnglish memory fragmentsを対象としている。

original_text — “including age, nationality, gender, cultural background, and language.”

source — `/Users/miramiki/Downloads/Form1_E_RPlan_1022170-2026-06-22.pdf`, p. 3, middle.

note — 取得候補は具体化したが、対象者、募集方法、英語能力基準、除外基準、必要性のない属性を収集しない原則は未決定である。

### データと分析

計画書は、質問ログと生成文を保存するデータベース、参加者評価、生成文のテキスト分析を予定している。研究フロー図では人間評価をPrimary、テキスト分析をSecondaryとしている。

original_text — “a database for storing question logs and generated narratives”

source — `/Users/miramiki/Downloads/Form1_E_RPlan_1022170-2026-06-22.pdf`, p. 3, middle.

note — 現行プロトタイプはlocalStorageのみで、データベース、匿名化、保持期間、削除、アクセス制御が未実装である。

### 研究範囲と今後の拡張

実匂い提示や物理的嗅覚ディスプレイをB4研究へ含めず、将来拡張とする。JSETが発表先候補として記載される。

original_text — “This project is intentionally limited to an LLM-based elicitation system rather than a physical olfactory display.”

source — `/Users/miramiki/Downloads/Form1_E_RPlan_1022170-2026-06-22.pdf`, p. 4, upper.

note — 既存のスコープ決定と一致する。JSETはSuggested venueであり、採択・投稿決定ではない。

## 計画書内部の矛盾と弱点

### 1. 研究題名・一文主張と実験操作が一致しない

題名とPurposeは「匂い関連情報を含む記憶断片」の影響を述べるが、Methodsは参加者を三つの質問条件へ割り付ける。実験で操作するものは質問戦略であり、入力断片の匂い情報の有無ではない。現在のままでは独立変数の説明がずれている。

### 2. 主要評価項目が2項目と4項目で揺れている

PurposeはAffective AtmosphereとMemory-Likenessのみを挙げる。Methodsと図はScene Construction、Narrative Vividness、Affective Atmosphere、Memory-Likenessの4項目を挙げる。4項目をすべて統計上の主要評価項目とするか、一項目を主要・残りを副次とするかが未確定である。

### 3. Manipulation Checkが参加者の注意を直接測っていない

original_text — “check whether the condition manipulation worked by analyzing the question logs and generated narratives.”

source — `/Users/miramiki/Downloads/Form1_E_RPlan_1022170-2026-06-22.pdf`, p. 3, middle-lower.

note — ログと生成文は操作結果の行動・文章指標にはなるが、参加者が匂い・非匂い感覚・出来事情報のどれへ注意を向けたかを直接報告する尺度ではない。自己報告Manipulation Checkを別に追加する必要がある。

### 4. 既存尺度との対応が示されていない

参考文献にSAMとMemory Experiences Questionnaireがあるが、4評価項目のどれをどの既存尺度から採用・改変するかが書かれていない。独自単項目として使う場合も、妥当性と解釈の限界を明示する必要がある。

### 5. 参加者設計と統計設計がない

参加者数、募集対象、英語能力、除外基準、謝礼、効果量、検定法、多重比較、欠測処理が記載されていない。参加者属性の候補だけでは実験計画にならない。

### 6. 内部試験と条件確定の順序が逆転している

計画書はminimal prototypeを作り、internal trialを行い、その後にexperimental conditionsを修正すると書く。技術フローの検証なら妥当だが、実験条件を未確定のまま評価データを集めると、試験結果に合わせて条件を変更する危険がある。条件仕様を文書化した後に内部試験を行い、修正履歴を残す必要がある。

## 進捗判定の更新

- **確認済み**: B4では実匂いを使わない、三条件の基本領域、4評価項目、参加者属性候補、英語入力案、データベースを使う構想、人間評価を中心・テキスト分析を補助とする構想、JSET候補、2026年4月から2027年3月の計画期間。
- **部分的に解決**: Standard条件の焦点、Non-OdorとOdorのモダリティ、評価項目の作業質問文。
- **依然未決定**: 正式題名、独立変数の表現、4項目の統計的位置づけ、尺度出典、質問全文、Manipulation Check、対象者、人数、除外、分析法、倫理、データ管理、使用LLM、生成仕様。

