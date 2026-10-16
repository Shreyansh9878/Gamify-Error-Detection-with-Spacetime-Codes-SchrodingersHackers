"""Re-run real Clifford-only Paulice suggestions under fixed helper budgets."""
import json
import sys
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT))
from backend.missions.levels import get_level
from backend.missions.service import qc_for,payload
from backend.timeline_lab.service import paulice_search
from backend.timeline_lab.capstone_examples import example
from backend.quantum_core.paulice import optimize_clifford


def verify():
    rows=[]
    for number in range(1,8):
        level=get_level(number);qc=qc_for(payload(level),level['qubits']);qc.measure_all()
        targets=list(range(min(level['ancillas'],level['qubits'])))
        candidate=optimize_clifford(qc,targets,level['ancillas'])
        added=candidate.circuit.num_qubits-level['qubits']
        assert added<=level['ancillas']
        rows.append(dict(level=number,ancillaLimit=level['ancillas'],addedAncillas=added,targets=targets,nativeGamma=float(candidate.cost)))
    fs6=paulice_search(json.dumps(example().hardware.model_dump(),sort_keys=True))
    assert fs6['available'] and fs6['addedAncillas']<=1
    return dict(noise='Synthetic Paulice NoiseModel(gate_noise=0.01, readout_noise=0).',
                distinction='Native gamma/windowed suggestions, not game-score optima. Reachable game references are separately enumerated and Aer-rescored. No T circuit is passed to Paulice.',flightSchool6=fs6,missions=rows)


if __name__=='__main__':
    output=verify();(ROOT/'docs/PAULICE_VERIFICATION.json').write_text(json.dumps(output,indent=2)+'\n')
    print('Real Paulice suggestions verified for FS6 and Clifford missions; all helper limits respected.')
