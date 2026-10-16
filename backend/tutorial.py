"""Six Qiskit-backed visual experiments around fixed payloads.

Illustrations of resource footprints are explicitly distinguished from simulated
state metrics. No historical code is claimed to have universally failed.
"""
import math
from qiskit import QuantumCircuit
from qiskit.quantum_info import Statevector, DensityMatrix, Pauli, Operator, SparsePauliOp, partial_trace, state_fidelity
from qiskit_aer.noise import pauli_error, depolarizing_error, amplitude_damping_error
from .engine import evaluate, check_paths, checked_circuit
from .levels import get_level, gate
from .models import RunRequest, Check, Gate, PauliTap


def response(title, message, ideal, noisy, **extra):
    rho = DensityMatrix(noisy)
    n = rho.num_qubits
    bloch = []
    for q in range(n):
        local = partial_trace(rho, [j for j in range(n) if j != q]) if n > 1 else rho
        bloch.append([float(local.expectation_value(Pauli(p)).real) for p in 'XYZ'])
    return dict(title=title, message=message, ideal=ideal.probabilities().tolist(),
        noisy=rho.probabilities().tolist(), fidelity=float(state_fidelity(ideal,rho)),
        coherence=float(2*abs(rho.data[0,1])) if n == 1 else 0., retention=1.,
        syndrome={}, bloch=bloch, **extra)


def from_run(title, message, result, shots=1024):
    return dict(title=title,message=message,ideal=result['ideal'],noisy=result['noisy'],
        fidelity=result['fidelity'],coherence=None,retention=result['retention'],
        syndrome=result['syndromes'],shots=result['shots'],keptShots=result['keptShots'],
        discardedShots=result['discardedShots'],samplingOverhead=result['samplingOverhead'],
        requiredShots=math.ceil(1000/result['retention']),
        addedTwoQubit=result['addedTwoQubit'],depth=result['depth'],checkDetails=result['checkDetails'])


def manual_check(level, qubit, pauli, start, end):
    """Only for authored tutorial/reference fixtures; players choose these manually."""
    c=Check(qubit=qubit,pauli=pauli,start=start,end=end)
    path=check_paths({**level,'checkMode':'assisted'},[Gate(**g) for g in level['target']],[c])[0]
    taps=[dict(qubit=q,pauli=p) for q,p in enumerate(reversed(path['closing'])) if p!='I']
    return c.model_copy(update={'closingOperators': [PauliTap(**t) for t in taps]})


def lesson(step, request):
    action=request.action
    if step == 1:
        if action not in ('x-noise','z-noise','depolarizing','relaxation'):
            raise ValueError('Choose a noise channel.')
        ideal=Statevector.from_label('1' if action=='relaxation' else '+')
        p=request.noise
        error={'x-noise':lambda:pauli_error([('X',p),('I',1-p)]),
               'z-noise':lambda:pauli_error([('Z',p),('I',1-p)]),
               'depolarizing':lambda:depolarizing_error(p,1),
               'relaxation':lambda:amplitude_damping_error(p)}[action]()
        noisy=DensityMatrix(ideal).evolve(error.to_quantumchannel())
        return response('Noise moves or shrinks the Bloch arrow',
            'The fixed input is |+> (|1> for relaxation). X noise leaves |+> unchanged because it is an X eigenstate. Z noise can reduce fidelity and X coherence while Z-basis probabilities stay 50/50. Relaxation moves |1> toward |0>.',ideal,noisy,
            channel=action,inputLabel='|1>' if action=='relaxation' else '|+>')
    if step == 2:
        if action not in ('detection','mitigation','correction'):
            raise ValueError('Choose detection, mitigation, or correction.')
        level=get_level(1)
        check=manual_check(level,0,'Z',1,4)
        result=evaluate(RunRequest(levelId=1,gates=level['target'],checks=[check]))
        p=.15
        ideal=Statevector.from_label('0')
        values=[]
        for rate in (p,2*p):
            dm=DensityMatrix(ideal).evolve(pauli_error([('X',rate),('I',1-rate)]).to_quantumchannel())
            values.append(float(dm.expectation_value(Pauli('Z')).real))
        recovered=0.
        for fault,weight in [(None,.7),(0,.1),(1,.1),(2,.1)]:
            qc=QuantumCircuit(3);qc.cx(0,1);qc.cx(0,2)
            if fault is not None:qc.x(fault)
            sv=Statevector.from_instruction(qc)
            recovered+=weight*sum(prob for i,prob in enumerate(sv.probabilities()) if i.bit_count()<2)
        messages={
          'detection':'A helper flags covered faults. Discarding a flagged run is post-selection: a detectable error is not repaired, and undetected errors can survive.',
          'mitigation':'Two known noise strengths give <Z> values whose linear extrapolation is 1. This bit-flip expectation is exactly linear; general zero-noise extrapolation can be biased and has extra sampling variance. It does not repair individual states.',
          'correction':'The simulated three-bit repetition decoder recovers the logical Z result under at most one X fault. Full quantum error correction also protects phase information, uses an encoding, repeated syndromes and a decoder. A nine-qubit footprint below is an illustrative Shor-code scale, not a simulation of a full fault-tolerant code.'}
        output=from_run('Three jobs, three kinds of overhead',messages[action],result)
        output.update(method=action,comparison=[
          dict(label='Detection: retained state fidelity',value=result['fidelity'],detail=f"{result['retention']:.3f} fraction retained; one helper"),
          dict(label='Mitigation: extrapolated <Z>',value=2*values[0]-values[1],detail='Two noise scales; observable estimate, not state fidelity'),
          dict(label='Correction: decoded logical Z success',value=recovered,detail='Restricted single-X repetition-code example')],
          extrapolation=[dict(scale=1,value=values[0]),dict(scale=2,value=values[1]),dict(scale=0,value=2*values[0]-values[1])],
          resources=dict(data=1 if action!='correction' else 9,helpers=1 if action=='detection' else 0,settings=2 if action=='mitigation' else 1,illustrative=action=='correction'))
        return output
    if step == 3:
        if action not in ('sandwich','localized'):raise ValueError('Choose a boundary or localized check.')
        level=get_level(5)
        c=manual_check(level,0,'X',1,6) if action=='sandwich' else manual_check(level,2,'Z',3,6)
        r=evaluate(RunRequest(levelId=5,gates=level['target'],checks=[c]))
        out=from_run('Spend protection where it helps',
          'Entangling gates spread Paulis: X0 becomes X0 X1 X2 through the CX cascade. A long sandwich can need more closing gates; a localized interval can cost less but cover fewer faults. Neither is guaranteed to win. This is a resource trade-off, not a claim that all older QED codes failed.',r)
        out.update(strategy=action,payload=level['target'],baseline=r['baseline'])
        return out
    if step == 4:
        if action not in ('match','inject'):raise ValueError('Choose a closing tap and test the loop.')
        qc=QuantumCircuit(1);qc.s(0)
        level=dict(qubits=1,slots=3,checkMode='assisted')
        gates=[Gate(**gate('s',[0],1))]
        c=Check(qubit=0,pauli=request.pauli,start=0,end=3)
        path=check_paths(level,gates,[c])[0]
        valid=request.closingPauli==path['closing']
        test_path={**path,'closing':request.closingPauli}
        # Intentionally permit a broken loop only in this unscored demonstration.
        class Fault: faultColumn=1;faultQubit=0;faultPauli='Z'
        state=Statevector.from_instruction(checked_circuit(level,gates,[test_path],Fault() if action=='inject' else None))
        dm=partial_trace(state,[1]);ideal=Statevector.from_instruction(qc)
        keep=float(state.probabilities(qargs=[1])[0])
        out=response('Close the spacetime invariant',
          'For S, X propagates to Y, Y to -X, and Z to Z. The helper sign correction is included. An open loop can flag even with no injected fault: that is a false alarm, not error detection.',ideal,dm,
          opening=request.pauli,expectedClosing=('-' if path['sign']<0 else '')+path['closing'],selectedClosing=request.closingPauli,loopValid=valid,
          injected=action=='inject')
        out.update(retention=keep,syndrome={'0':keep,'1':1-keep})
        return out
    if step == 5:
        if action not in ('bare','one','two'):raise ValueError('Choose zero, one, or two helpers.')
        level=get_level(5)
        checks=[] if action=='bare' else [manual_check(level,0,'Z',1,3)]
        if action=='two':checks.append(manual_check(level,2,'Z',3,6))
        r=evaluate(RunRequest(levelId=5,gates=level['target'],checks=checks,shots=request.shots))
        return from_run('Every discarded run costs another attempt',
          'All-zero syndrome runs are kept; any nonzero syndrome is discarded. Expected attempts per retained sample are 1/p(keep). For the same retained observable and variance, precision improves with retained sample count, not raw attempts. A detector can miss faults; syndrome 0 is not a guarantee of correctness.',r)
    if step == 6:
        if action not in ('clifford','t'):raise ValueError('Choose S or T to inspect.')
        qc=QuantumCircuit(1);getattr(qc,'s' if action=='clifford' else 't')(0)
        u=Operator(qc).data
        transformed=SparsePauliOp.from_operator(Operator(u@Pauli(request.pauli).to_matrix()@u.conj().T)).simplify(atol=1e-8)
        terms=[dict(pauli=p.to_label(),coefficient=float(c.real)) for p,c in zip(transformed.paulis,transformed.coeffs)]
        valid=len(terms)==1
        ideal=Statevector.from_instruction(qc)
        return response('The Pauli-only boundary',
          'S is Clifford and maps each Pauli to a signed Pauli. T maps X to (X+Y)/sqrt(2), Y to (Y-X)/sqrt(2), and Z to Z. A general controlled non-Pauli operator could close a wider class of checks, but costs non-Clifford resources; this game permits only Pauli taps. T equals RZ(pi/4) up to global phase.',ideal,DensityMatrix(ideal),
          opening=request.pauli,gate='S' if action=='clifford' else 'T',terms=terms,loopValid=valid)
    raise ValueError('Unknown tutorial module.')
