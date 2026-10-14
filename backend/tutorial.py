"""Six real Qiskit micro-experiments, with explicit scope for analogies."""
import numpy as np
from qiskit import QuantumCircuit
from qiskit.quantum_info import Statevector, DensityMatrix, state_fidelity, Pauli
from qiskit_aer.noise import phase_damping_error, pauli_error
from .engine import evaluate, condition
from .levels import get_level
from .models import RunRequest

def lesson(step, request):
    action=request.action
    p=request.noise
    if step==1:
        if action not in ('observe','x','h'): raise ValueError('Unknown experiment action.')
        qc=QuantumCircuit(1)
        if action!='observe': getattr(qc,action)(0)
        ideal=Statevector.from_instruction(qc)
        noisy=DensityMatrix(ideal).evolve(phase_damping_error(p).to_quantumchannel())
        noisy=noisy.evolve(pauli_error([('X',p/3),('I',1-p/3)]).to_quantumchannel())
        return dict(title='A tiny signal, a noisy world',message='X swaps zero and one. H makes a superposition. Dephasing reduces the off-diagonal coherence; equal probability bars do not imply an undamaged state.',ideal=ideal.probabilities().tolist(),noisy=noisy.probabilities().tolist(),coherence=float(2*abs(noisy.data[0,1])),fidelity=float(state_fidelity(ideal,noisy)),retention=1,syndrome={})
    if step==2:
        if action not in ('clean','bit','phase'): raise ValueError('Unknown experiment action.')
        qc=QuantumCircuit(2)
        qc.h(1); qc.cz(1,0)
        if action=='bit': qc.x(0)
        if action=='phase': qc.z(0)
        qc.cz(1,0); qc.h(1)
        state=Statevector.from_instruction(qc)
        probs=state.probabilities()
        alarm=float(sum(probs[2:]))
        return dict(title='Read the helper, not the secret',message='The Z check flags an X bit flip through phase kickback. It does not flag a commuting Z error. On |0>, that Z also leaves the state unchanged; on a superposition it can matter.',ideal=[1.,0.],noisy=[float(probs[0]+probs[2]),float(probs[1]+probs[3])],coherence=0,fidelity=float(probs[0]+probs[2]),retention=1-alarm,syndrome={'0':1-alarm,'1':alarm})
    if step==3:
        if action not in ('detection','mitigation','correction'): raise ValueError('Unknown experiment action.')
        # Qiskit channel produces a bit-flip ensemble on |0>.
        dm=DensityMatrix.from_label('0').evolve(pauli_error([('X',.2),('I',.8)]).to_quantumchannel())
        observed=float(dm.expectation_value(Pauli('Z')).real)
        corrected=observed/(1-2*.2)
        # Restricted repetition code: at most one X fault, known classical codeword.
        # Compute all four fault branches with Qiskit and decode measured majority.
        recovered=0.
        for fault,weight in [(None,.8),(0,.2/3),(1,.2/3),(2,.2/3)]:
            qc=QuantumCircuit(3)
            qc.cx(0,1); qc.cx(0,2)
            if fault is not None: qc.x(fault)
            sv=Statevector.from_instruction(qc)
            recovered += weight*sum(prob for i,prob in enumerate(sv.probabilities()) if i.bit_count()<2)
        details={'detection':'Detection discards flagged runs: 80% survive in this idealized detector example. It does not repair a qubit.',
                 'mitigation':'Known readout calibration corrects the expectation estimate from 0.6 to 1.0. No individual state is repaired. Finite-shot estimates have uncertainty.',
                 'correction':'A three-bit repetition-code decoder recovers the logical Z result after at most one X fault. This illustration does not correct arbitrary phase errors.'}
        return dict(title='Three different jobs',message=details[action],ideal=[1.,0.],noisy=dm.probabilities().tolist(),coherence=0,fidelity=.8,retention=.8 if action=='detection' else 1,
            syndrome={'flagged':.2,'not flagged':.8},comparison=[dict(label='Detection: kept fraction',value=.8,detail='Ideal detector; discard flagged shots'),dict(label='Mitigation: corrected <Z>',value=corrected,detail='Known symmetric readout calibration'),dict(label='Correction: recovered Z',value=recovered,detail='Single-X repetition-code model')])
    if step in (4,5,6):
        level=get_level(3 if step in (4,6) else 4)
        if step==4 and action not in ('bare','protect'): raise ValueError('Unknown experiment action.')
        if step==5 and action not in ('empty','h','bell'): raise ValueError('Unknown experiment action.')
        if step==6 and action not in ('prepare','protect'): raise ValueError('Unknown experiment action.')
        gates=level['target'] if step!=5 or action=='bell' else level['target'][:1] if action=='h' else []
        checks=[dict(qubit=0,pauli='Z',start=0,end=level['slots'])] if action=='protect' else []
        result=evaluate(RunRequest(levelId=level['id'],gates=gates,checks=checks))
        messages={4:'A single helper checks an interval in time. Higher retained fidelity comes with discarded shots and extra noisy gates.',5:'Match the full state, not just a bar chart. H on q0 followed by CX(q0,q1) prepares the Bell target.',6:'You prepared the target and tested a coherent check. In missions, choose gates, inspect the radar, run, and compare fidelity with shots kept.'}
        return dict(title={4:'One helper, useful protection',5:'Build the Bell signal',6:'Ready for the real mission'}[step],message=messages[step],ideal=result['ideal'],noisy=result['noisy'],coherence=0,fidelity=result['fidelity'],retention=result['retention'],syndrome=result['syndromes'])
    raise ValueError('Unknown tutorial step.')
