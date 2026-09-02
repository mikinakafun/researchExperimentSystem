# 初期想起トリガー v0.1.2

- 作成日: 2026-07-15
- 更新日: 2026-07-17（一文の技術的上限を100文字に設定・暫定値）
- 状態: 初稿改訂。指導教員レビュー・認知インタビュー・パイロット前
- 対応する決定: DEC-015、DEC-016
- 適用位置: 同意・属性取得後、三条件への割付前

## 参加者向け原文

### 日本語原版

あなた自身の過去の出来事を一つ思い出してください。何度も繰り返す習慣や長い期間ではなく、特定の一回の出来事を選んでください。少なくとも1週間前に起きた出来事で、あなたが説明しても安全だと感じるものにしてください。楽しかった、普通だった、つらかったなど、感情の種類は問いません。匂いや特定の感覚に意識を向ける必要はありません。

まず、その出来事を一文で書いてください。人の名前、住所、電話番号など、あなたや他者を特定できる情報は書かないでください。思い出せない、または答えたくない場合は、「思い出せない」を選択できます。

### English version（本実験用。パイロット版では使用しない — DEC-016追記）

Please recall one event from your own past. Choose one specific occasion rather than a repeated routine or a long period of time. Choose an event that happened at least one week ago and that you feel safe describing. The event may have been pleasant, neutral, or unpleasant. You do not need to focus on smell or any particular sensory detail.

First, describe the event in one sentence. Do not include names, addresses, telephone numbers, or other information that could identify you or another person. If you cannot remember an event or do not wish to answer, select “I don't remember.”

## 入力仕様

| 項目 | 仕様 |
|---|---|
| 回答形式 | 必須の自由記述、一文（DEC-015追記、2026-07-16） |
| 文字数上限 | 日本語100文字（暫定値、PROTOCOL §3。承認待ち）。旧値500文字は失効 |
| 想起不能 | 「思い出せない」/ “I don't remember.” を有効な中断状態として扱う |
| 代替想起 | 想起不能または回答拒否の場合、別の出来事を1回だけ選び直せる |
| 2回目も不可の場合 | LLM送信・条件割付を行わず、初期断片なしとして終了記録する |
| セーフティ | いつでも中止・撤回できるボタンを表示する |
| 条件割付 | 有効な初期断片が得られた後に実施する |
| 言語 | パイロット版は日本語のみ（DEC-016追記）。本実験では開始時に日本語または英語を選択し、セッション中は混在させない |

## 設計上の意図

- 一つの具体的な出来事に限定し、習慣や人生全体の記述を避ける。
- 参加者の感情価を指定しない。快・中立・不快のいずれも受け入れる。
- 初期段階で匂いを指定せず、三条件の操作が初期入力に混入することを避ける。
- 匂いを思い出すことを要求しない。匂いのない出来事や匂いを想起できない出来事も回答可能にする。
- センシティブな記憶の詳細を要求しない。参加者が安全でないと感じた場合は回答せず終了できる。

## 記録する状態

`language`、`initial_recall_status`（`usable` / `no_recall` / `declined` / `withdrawn`）、回答本文、文字数、再試行回数、開始・送信・中止時刻を記録する。`no_recall`、`declined`、`withdrawn`では、条件割付とLLM API送信を行わない。

## 採用前の確認事項

1. 「少なくとも1週間前」という期間制限が妥当かを指導教員と確認する。
2. 一文・100文字の初期断片で、6ターンの生成質問（DEC-029）の入力として十分な情報が得られるかをパイロットで確認し、上限値を正式確定する。
3. センシティブ記憶への注意文と中止導線を倫理・同意文と整合させる。
4. 日本語・英語で意味と安全上の注意が対応しているかを確認する。
5. 認知インタビューで「特定の一回の出来事」「安全に説明できる出来事」の理解を確認する。

original_text — 「最初の想起トリガーを設計し、完全自由入力を減らす。」

source — [`docs/research/research-context.md`](../research/research-context.md):694

note — 本初稿は自由入力を完全には排除せず、出来事単位、回答量、安全性、感覚誘導の不在を共通化する設計である。

## 変更履歴

| 日付 | 版 | 変更 |
|---|---|---|
| 2026-07-15 | 0.1.0 | 初稿。2〜4文、日本語500文字・英語1000 characters上限。 |
| 2026-07-16 | 0.1.1 | DEC-015追記により回答を一文へ変更、旧文字数上限を失効。DEC-016追記によりパイロット版を日本語のみへ変更。 |
| 2026-07-17 | 0.1.2 | 一文の技術的上限を日本語100文字に設定（暫定値・承認待ち、PROTOCOL §3）。 |
