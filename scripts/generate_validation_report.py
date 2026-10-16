"""Refresh report tables and per-strategy resource/fidelity evidence."""
import json
import sys
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT))
from backend.missions.models import Draft
from backend.missions.levels import get_level
from backend.missions.service import _run,validate,qc_for,payload


def main():
    path=ROOT/'backend/missions/references.json';data=json.loads(path.read_text())
    lines=['# Level validation','',
        'All scores use the same authoritative engine as the player. Exact channel evolution has no shot variance. “Optimal” means best in the declared finite search family, not a proof over arbitrary circuits. See SCIENTIFIC_REPORT.md for the search boundary and separate Paulice results.','',
        '| Level | Data | Ancillas | T/Tdg | Baseline | Blanket | Reasonable | Best found | Target | Spread |',
        '|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|']
    fs=json.loads((ROOT/'docs/CAPSTONE_DIFFICULTY_VERIFICATION.json').read_text())
    r=fs['results'];lines.append(f'| FS6 | 2 | 1 | 0 | {r["unchecked"]["score"]:.6f} | {r["everywhere"]["score"]:.6f} | {r["sensible"]["score"]:.6f} | {fs["exactReferenceMaximum"]:.6f} | {fs["threshold"]:.2f} | 0 |')
    for row in data['levels']:
        l=get_level(row['id']);u=qc_for(payload(l),l['qubits']);metrics={}
        for kind in ('baseline','everywhere','reasonable','optimal'):
            d=Draft.model_validate(row[kind+'Draft']);ops=validate(d)['operations'];out=_run(d.model_dump_json())
            qc=qc_for(ops,l['qubits']+l['ancillas']);two=lambda q:sum(len(g.qubits)==2 for g in q.data)
            active={q for g in d.operations for q in g.qubits if q>=l['qubits']}
            metrics[kind]=dict(fidelity=out['fidelity'],keptFraction=out['retention'],combinedScore=out['combinedScore'],
                addedAncillas=len(active),addedTwoQubit=two(qc)-two(u),addedDepth=qc.depth()-u.depth())
        row['metrics']=metrics
        lines.append('| '+ ' | '.join([str(row['id']),str(row['qubits']),str(row['ancillas']),str(row['tCount'])]+[f'{row[k]:.6f}' for k in ('baseline','everywhere','reasonable','optimal')]+[f'{row["target"]:.2f}','0'])+' |')
    lines+=['','FS1–5 do not define fidelity-score thresholds. Their completion contracts are experiments plus MCQs/method coverage; a numeric zero-check or blanket-check “fail” would be misleading. Stored experiments are in backend/reference_solutions/tutorials.json; e2e/full-progression.spec.ts exercises completion, drag/drop and sequential unlocking for all sixteen screens on desktop and mobile.','',
        'Main references include actual editable bands and gate operations. Main1–3 manually close checks; Main4–10 use the same generated closures as the UI. T-level candidates are rejected whenever the transported Pauli has X/Y at a T/Tdg crossing. Blanket means all data wires/all allowed helpers for Clifford; for T levels it is the broadest valid full-span product, since invalid X/T circuits cannot be assigned a score.','']
    path.write_text(json.dumps(data,indent=2)+'\n')
    (ROOT/'docs/LEVEL_VALIDATION.md').write_text('\n'.join(lines),encoding='utf-8')


if __name__=='__main__':main()
