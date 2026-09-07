# Prompt files

実行時に使うプロンプト本文は、コードに埋め込まずこのディレクトリから読み込みます。質問本文は`v0.4.4-mock-draft/`、文章本文は`v0.4.3-mock-draft/narrative.{ja,en}.txt`を読み込み、それぞれの版を生成記録へ返します。質問は対象ごとの回答状態を優先して選び、ターン別の推奨順序は与えません（DEC-039）。文章は入力を素材とする創作を許し、文ごとに素材参照と追加の自己申告を付けます。旧版は比較用に残しています。

各ファイルは UTF-8 のプレーンテキストです。`{{UPPER_SNAKE_CASE}}` はコードが実行時に置換する変数です。プロンプトを編集したら、サーバーを再起動して反映してください。

`lib/prompt-files.ts` はリポジトリ直下の `prompts/` のみを参照します。親ディレクトリへのフォールバックや `PROMPT_DIR` による外部参照はありません。プロンプトを変更する場合は、ここにあるファイルを編集してください。

## Runtime language selection

- Follow-up instructions and guidance: `v0.4.4-mock-draft/follow-up.{ja,en}.txt` and `follow-up-guidance.{ja,en}.txt`.
- Narrative instructions: `v0.4.3-mock-draft/narrative.{ja,en}.txt`.
- The API request's `language` selects the files and retry-message language. Missing language defaults to `ja`; unsupported values are rejected.
- The two translations retain the same conditions, answer-state guidance, creative-narrative policy, and JSON contract. Participant input remains unmodified; only instructions and generated output use the selected language.
- English wording is a draft translation and has not been validated for cross-language experimental equivalence.
