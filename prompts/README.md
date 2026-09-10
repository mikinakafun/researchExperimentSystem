# Prompt files

実行時に使うプロンプト本文は、コードに埋め込まずこのディレクトリから読み込みます。質問本文は `v0.4.4-mock-draft/`、文章本文は `v0.4.3-mock-draft/narrative.{ja,en}.txt` が唯一の正本です。質問は対象ごとの回答状態を優先して選び、文章は入力を素材とする創作を許します。

各ファイルは UTF-8 のプレーンテキストです。`{{UPPER_SNAKE_CASE}}` はコードが実行時に置換する変数です。プロンプトを編集したら、サーバーを再起動して反映してください。

`lib/prompt-files.ts` はリポジトリ直下の `prompts/` のみを参照します。親ディレクトリへのフォールバックや `PROMPT_DIR` による外部参照はありません。プロンプトを変更する場合は、ここにあるファイルを編集してください。
旧版本文と変更理由はgit履歴から追跡します。別のディレクトリに比較用コピーや版別catalogを維持しません。

## Runtime language selection

- Follow-up instructions and guidance: `v0.4.4-mock-draft/follow-up.{ja,en}.txt` and `follow-up-guidance.{ja,en}.txt`.
- Narrative instructions: `v0.4.3-mock-draft/narrative.{ja,en}.txt`.
- The API request's `language` selects the files and retry-message language. Missing language defaults to `ja`; unsupported values are rejected.
- The two translations retain the same conditions, answer-state guidance, creative-narrative policy, and JSON contract. Participant input remains unmodified; only instructions and generated output use the selected language.
- English wording is a draft translation and has not been validated for cross-language experimental equivalence.
