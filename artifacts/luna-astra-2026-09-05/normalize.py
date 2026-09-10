"""Normalize completed Luna sessions and create a verbatim review transcript."""
import json
from pathlib import Path

root = Path(__file__).resolve().parent
personas = {p['id']:p for p in json.loads((root/'personas.json').read_text())}
raw = [json.loads(line) for line in (root/'api-responses.jsonl').read_text().splitlines() if line.strip()]
records = []
seen = set()
for event in raw:
    if event.get('pathname') != '/api/save-result' or not event.get('response', {}).get('saved') or event['response'].get('duplicate'):
        continue
    r = event['request']
    assert r['sessionId'] not in seen, 'More than one successful first save for the same session'
    seen.add(r['sessionId'])
    p = next(p for p in personas.values() if p['fragment'] == r['fragment'])
    turns = [dict(turn=i+1, question=q, answer=r['answers'][i], metadata=r['questionMetadata'][i],
                  generation=r['questionGeneration'][i], source=r['questionGeneration'][i]['source'],
                  attempts=r['questionGeneration'][i]['attempts']) for i,q in enumerate(r['questions'])]
    assert ''.join(s['text'] for s in r['narrativeSentences']) == r['finalResult']
    records.append(dict(sessionId=r['sessionId'], personaId=p['id'], condition=r['condition'], odorMemory=p['odorMemory'],
                        turns=turns, narrativeSentences=r['narrativeSentences'], narrativeGeneration=r['narrativeGeneration'], savedAt=event['at']))
normalized = []
lines = ['# API出力の原文確認用記録', '', '合成ペルソナのみ。Astraの評価は別ファイルに記録。', '']
for s in records:
    p = personas[s['personaId']]
    narrative = ''.join(x['text'] for x in s['narrativeSentences'])
    normalized.append({**s, 'fragment':p['fragment'], 'narrative':narrative, 'sentences':s['narrativeSentences']})
    lines += [f"## {s['condition']} / {s['personaId']}", '', f"sessionId: `{s['sessionId']}`", '', f"初期断片: {p['fragment']}", '']
    for t in s['turns']:
        lines += [f"Q{t['turn']}: {t['question']}", f"A{t['turn']}: {t['answer']}", '']
    for i,n in enumerate(s['narrativeSentences'],1):
        lines += [f"文{i} [創作申告={n['containsCreativeAddition']}, 参照={','.join(n['sourceIds'])}]: {n['text']}", '']
(root/'current-normalized.json').write_text(json.dumps(normalized,ensure_ascii=False,indent=2)+'\n')
(root/'transcripts.md').write_text('\n'.join(lines)+'\n')
print(f'{len(normalized)} completed sessions normalized')
