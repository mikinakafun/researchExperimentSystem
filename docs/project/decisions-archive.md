# decisions-archive.md は廃止しました（2026-09-08）

上書き・却下された決定の旧本文と引用原文（`provenance.md`）は削除しました。git が保持しています。

```bash
git show $(git log --diff-filter=D --format=%H -1 -- core/00-decisions/decisions-archive.md)^:core/00-decisions/decisions-archive.md
```

いま効いている境界は規則として仕様内にあります（[`core/01-research/research-context.md`](../../core/01-research/research-context.md)、[`core/03-measurement/measures.md`](../../core/03-measurement/measures.md)）。現在の仕様は[`core/DESIGN.md`](../../core/DESIGN.md)と`core/`の各モジュールが正本。

このファイルは既存リンクを切らないために残しています。追記しないでください。
