# PROTOCOL.md は退役しました（2026-09-07）

パイロット実験の仕様は [`core/DESIGN.ja.md`](../../core/DESIGN.ja.md)（英語版 [`core/DESIGN.md`](../../core/DESIGN.md)）に一本化しました。各要件の根拠は [`core/00-decisions/decisions.md`](../../core/00-decisions/decisions.md) のDEC番号で示します。

本書v0.4.0-draftが集約していた内容の行き先:

| 旧PROTOCOL.mdの内容 | 現在の場所 |
| --- | --- |
| 研究概要・条件・独立変数 | `core/DESIGN.md` §1・§2、`core/01-research/research-context.md` |
| 参加者フロー・初期想起・追質問・最終文章 | `core/DESIGN.md` §3・§5・§6 |
| 評価軸・Manipulation Check・分析 | `core/DESIGN.md` §7、`core/03-measurement/measures.md` |
| 保存・同意・削除 | `core/DESIGN.md` §8、`core/04-storage/recording-and-storage.md` |
| 承認ゲート G1〜G5 | 廃止。G1はDEC-031で完了、G2はDEC-041で二条件へ、G3はDEC-043で正式承認を取らない方針へ、G4・G5はDEC-044で機械ゲートを前置しない方針へ |
| 「FROZENまで本番コードへ移植しない」規則 | 廃止（DEC-040で指導教員承認をゲートに置かない） |

この`docs/protocol/`に残る個別仕様は引き続き有効です: [consent-form-ja.md](consent-form-ja.md)（DEC-019）、[initial-recall-trigger.md](initial-recall-trigger.md)（DEC-015）、[manipulation-check.md](manipulation-check.md)（DEC-014・047。二条件化の同期はTASK-023）。

旧本文はgit履歴（この変更以前のコミット）で参照できます。
