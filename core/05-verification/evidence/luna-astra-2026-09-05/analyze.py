"""Reproduce descriptive comparisons; no API calls, ratings, or population tests."""
import collections
import hashlib
import json
import re
import statistics
from pathlib import Path

ROOT = Path(__file__).resolve().parent
CONDS = ['standard', 'visual', 'odor']
ODOR = re.compile(r'匂い|におい|香り|香ば|臭')
NO_RECALL = re.compile(r'思い出せ(?:ません|ない|なかった)|覚えてい(?:ません|ない)|記憶(?:が|は)(?:ありません|ない)|分かりません|分からない|わかりません|わからない|覚えがありません')

def mean(xs):
    return statistics.mean(xs) if xs else None

def load_json(name):
    return json.loads((ROOT / name).read_text())

def metrics(s):
    ts = s['turns']
    questions = [t['question'] for t in ts]
    answers = [t['answer'] for t in ts]
    annotations = s.get('sentences', [])
    narrative = s['narrative']
    return dict(
        question_chars=mean([len(q) for q in questions]),
        answer_chars=sum(len(a) for a in answers),
        narrative_chars=len(narrative),
        question_odor_turns=sum(bool(ODOR.search(q)) for q in questions),
        answer_odor_turns=sum(bool(ODOR.search(a)) for a in answers),
        narrative_odor=int(bool(ODOR.search(narrative))),
        no_recall_turns=sum(bool(NO_RECALL.search(a)) for a in answers),
        fallback_turns=sum(t.get('source') == 'fallback' for t in ts),
        retried_turns=sum(t.get('attempts', 1) > 1 for t in ts),
        question_attempts=sum(t.get('attempts', 1) for t in ts),
        narrative_sentences=len(annotations) if annotations else len(re.findall(r'[。！？!?]', narrative)),
        creative_sentences=sum(a['containsCreativeAddition'] for a in annotations) if annotations else None,
        creative_fraction=mean([int(a['containsCreativeAddition']) for a in annotations]),
        neutral_turns=sum(t.get('metadata', {}).get('conditionFocus') == 'neutral' for t in ts),
    )

def summarize(sessions):
    out = {}
    for c in CONDS:
        ss = [s for s in sessions if s['condition'] == c]
        ms = [metrics(s) for s in ss]
        out[c] = dict(sessions=len(ss), means={k: mean([m[k] for m in ms if m[k] is not None]) for k in ms[0]})
        out[c]['totals'] = {k:(sum(m[k] for m in ms if m[k] is not None) if any(m[k] is not None for m in ms) else None) for k in ms[0] if k not in ['creative_fraction', 'question_chars']}
        out[c]['question_unique'] = len({t['question'] for s in ss for t in s['turns']})
    return out

def paired(left, right):
    a = {s['personaId']:s for s in left}
    b = {s['personaId']:s for s in right}
    keys = sorted(a.keys() & b.keys())
    out = {}
    for metric in ['narrative_chars', 'answer_chars', 'no_recall_turns', 'question_odor_turns', 'narrative_odor', 'creative_fraction']:
        vals = [(k, metrics(a[k])[metric], metrics(b[k])[metric]) for k in keys]
        vals = [(k, x-y) for k,x,y in vals if x is not None and y is not None]
        ds = [v for _,v in vals]
        out[metric] = dict(n=len(ds), mean_difference=mean(ds), median_difference=statistics.median(ds) if ds else None,
                           positive=sum(d>0 for d in ds), negative=sum(d<0 for d in ds), ties=sum(d==0 for d in ds),
                           differences=dict(vals))
    return out

def run():
    current = load_json('current-normalized.json')
    old_rows = load_json('baseline-20260725.json')
    old_logs = {s['sessionId']:s for s in load_json('baseline-log-20260725.json')}
    aliases = {'standard':'standard', 'non-odor':'visual', 'odor-based':'odor'}
    old = [dict(sessionId=r['session_id'], personaId=old_logs[r['session_id']]['personaId'],
                condition=aliases[r['condition']], fragment=r['initial_fragment'],
                turns=old_logs[r['session_id']]['turns'], narrative=r['final_result']) for r in old_rows]
    for label, ss in [('current',current),('old',old)]:
        assert len(ss) == 30, (label, len(ss))
        assert len({(s['personaId'],s['condition']) for s in ss}) == 30
        assert all(len(s['turns']) == 6 for s in ss)
        assert collections.Counter(s['condition'] for s in ss) == {c:10 for c in CONDS}
    report = dict(current=summarize(current), historical=summarize(old), condition_contrasts={}, historical_changes={})
    for a,b in [('odor','visual'),('odor','standard'),('visual','standard')]:
        report['condition_contrasts'][f'{a}_minus_{b}'] = paired([s for s in current if s['condition']==a], [s for s in current if s['condition']==b])
    for c in CONDS:
        cs, os = [s for s in current if s['condition']==c], [s for s in old if s['condition']==c]
        report['historical_changes'][c] = paired(cs, os)
        byid = {s['personaId']:s for s in os}
        report['historical_changes'][c]['changed_texts'] = dict(
            narratives=sum(s['narrative'] != byid[s['personaId']]['narrative'] for s in cs),
            questions=sum(t['question'] != u['question'] for s in cs for t,u in zip(s['turns'],byid[s['personaId']]['turns'])),
            answers=sum(t['answer'] != u['answer'] for s in cs for t,u in zip(s['turns'],byid[s['personaId']]['turns'])),
        )
    report['input_sha256'] = {n:hashlib.sha256((ROOT/n).read_bytes()).hexdigest() for n in ['current-normalized.json','baseline-20260725.json','baseline-log-20260725.json']}
    (ROOT/'metrics.json').write_text(json.dumps(report, ensure_ascii=False, indent=2)+'\n')
    lines = ['# 集計値（自動生成）', '', '平均文字数はUnicodeコードポイント数。非想起と匂い言及は正規表現による診断であり意味分類ではない。', '',
             '| 版・条件 | N | 質問平均字 | 回答合計平均字 | 文章平均字 | 非想起/60 | 匂い質問/60 | 匂い文章/10 | fallback/60 | 再試行/60 |',
             '|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|']
    for label in ['historical','current']:
        for c in CONDS:
            row=report[label][c]; m=row['means'];t=row['totals']
            lines.append(f"| {label} {c} | {row['sessions']} | {m['question_chars']:.1f} | {m['answer_chars']:.1f} | {m['narrative_chars']:.1f} | {t['no_recall_turns']} | {t['question_odor_turns']} | {t['narrative_odor']} | {t['fallback_turns']} | {t['retried_turns']} |")
    lines += ['', '| 現行対比（左−右） | 指標 | 平均対応差 | 正 / 負 / 同値 |', '|---|---|---:|---|']
    for contrast,ms in report['condition_contrasts'].items():
        for key,m in ms.items():
            lines.append(f"| {contrast} | {key} | {m['mean_difference']:.3f} | {m['positive']} / {m['negative']} / {m['ties']} |")
    (ROOT/'metrics.md').write_text('\n'.join(lines)+'\n')
    print(json.dumps({k:report[k] for k in ['current','historical']},ensure_ascii=False,indent=2))

if __name__ == '__main__':
    run()
