# decisions.md の内容は分割・移動しました

| 探しているもの | 文書 |
| --- | --- |
| 実験システムの現在の仕様（**正本**） | [`core/DESIGN.md`](../../core/DESIGN.md)と`core/`の各モジュール |
| 制約として効いている境界（主張しないこと・変えない規則） | [`core/01-research/research-context.md`](../../core/01-research/research-context.md)、[`core/03-measurement/measures.md`](../../core/03-measurement/measures.md) |
| 研究プロジェクト運営の決定（日程、鍵の失効、倫理審査の方針） | [decisions-active.md](decisions-active.md) |
| これからやる作業 | [GitHub Projects](https://github.com/users/mikinakafun/projects/3) |
| 上書きされた旧本文・引用原文 | 削除済み。`git log -p --follow -- core/00-decisions/` |

- 2026-09-07（1回目）: 本書を3文書（decisions-active / decisions-archive / tasks）へ分割。
- 2026-09-07（2回目）: システムを規定する決定とタスクを`core/00-decisions/`へ移し、運営の決定だけを`docs/project/decisions-active.md`に残した。DEC番号は変えていない。
- 2026-09-08: 決定記録そのものを廃止し、`core/00-decisions/`を削除した。正本は仕様（`core/DESIGN.md`と各モジュール）。効いている境界は規則として仕様内にあり、DEC番号は凍結済みの報告書にのみ残る。

このファイルは、更新しない履歴文書（`docs/research/`、`docs/archive/`、`artifacts/`）からの既存リンクが切れないように残しています。追記しないでください。
