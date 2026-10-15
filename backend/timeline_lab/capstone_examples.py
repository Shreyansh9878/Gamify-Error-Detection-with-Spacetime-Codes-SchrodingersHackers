"""Reproducible calibrated examples, not automatically inserted into player drafts."""
from qiskit.quantum_info import Pauli, Clifford
from .models import Draft, Operation, HardwareNoise, fixed_payload

def example(kind='sensible'):
    from .service import circuit
    labels=[] if kind=='unchecked' else ['IXI'] if kind=='sensible' else ['XYX','XYX']
    ops=[];unitary=Clifford(circuit(fixed_payload(6),3))
    for a,label in enumerate(labels):
        wire=3+a
        ops.append(Operation(id=f'h{a}',name='h',qubits=[wire],column=0))
        order=[(j+a)%3 for j in range(3)]
        for j,q in enumerate(order):
            axis=label[-1-q]
            if axis!='I':ops.append(Operation(id=f'o{a}{q}',name='c'+axis.lower(),qubits=[wire,q],column=1+j))
        closing=Pauli(label).evolve(unitary,frame='s')
        letters=closing.to_label().lstrip('-+')
        for j,q in enumerate(order):
            axis=letters[-1-q]
            if axis!='I':ops.append(Operation(id=f'c{a}{q}',name='c'+axis.lower(),qubits=[wire,q],column=9+j))
        if closing.phase==2:ops.append(Operation(id=f'z{a}',name='z',qubits=[wire],column=12))
        ops.extend([Operation(id=f'f{a}',name='h',qubits=[wire],column=13),Operation(id=f'm{a}',name='m',qubits=[wire],column=14)])
    return Draft(lesson=6,dataQubits=3,ancillas=2,columns=15,operations=ops,hardware=HardwareNoise(bitFlip=.001,phaseFlip=.001))
