"""The submission study must stay matched and physically closed."""
import json
from pathlib import Path
from scripts.run_track_experiments import workload,z_shell,score


def test_matched_family_keeps_width_and_doping_slots():
    circuits=[workload(1,t) for t in (0,1,2,4)]
    assert {c.num_qubits for c in circuits}=={3}
    assert len({len(c.data) for c in circuits})==1
    assert [c.count_ops().get('t',0) for c in circuits]==[0,1,2,4]


def test_research_shell_has_no_false_syndrome_without_noise():
    base=workload(1,2);checked=z_shell(base,'ZII')
    assert checked is not None
    result=score(checked,base,noisy=False)
    assert abs(result['fidelity']-1)<1e-10
    assert abs(result['retention']-1)<1e-10
    # Two T rotations may return a sum to a Pauli, but the intermediate
    # non-Pauli crossing is outside the game's admissible check family.
    assert z_shell(workload(1,4),'IZZ') is None


def test_recorded_study_has_actual_paulice_and_paired_metrics():
    data=json.loads((Path(__file__).resolve().parents[1]/'docs/TRACK_EXPERIMENTS.json').read_text())
    assert any(row['checks']>0 for row in data['pauliceObservableBenchmarks'])
    for row in data['rows']:
        assert abs(row['score']-row['fidelity']*row['retention'])<1e-10
        assert row['score']==row['correct_shot_yield']
        assert row['minimumKept'] is None and row['trusted_fidelity'] is None
        assert all(key in row for key in ('uncheckedFidelity','addedAncillas','addedTwoQubit','addedDepth'))
