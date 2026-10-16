"""Signed operator transport: Q = U P U†, never an unsigned label guess."""
from functools import lru_cache
from qiskit import QuantumCircuit
from qiskit.quantum_info import Clifford, Operator, SparsePauliOp, Pauli


def single_term(matrix):
    terms=SparsePauliOp.from_operator(Operator(matrix),atol=1e-8).to_list()
    return terms[0] if len(terms)==1 else None


@lru_cache(maxsize=128)
def gate_operator(name,qubits,width):
    qc=QuantumCircuit(width)
    getattr(qc,name)(*qubits)
    return Operator(qc).data,Clifford(qc) if name not in ('t','tdg') else None


def opening_factor(width,qubit,axis):
    letters=['I']*width
    letters[width-1-qubit]=axis.upper()
    return Pauli(''.join(letters))


def propagate(frame,name,qubits,width):
    if name in ('t','tdg'):
        # T rotates X/Y into coherent sums; I/Z commute exactly.
        if frame.x[qubits[0]]:
            raise ValueError('Non-Pauli transport: use only Z/I at a T or Tdg crossing.')
        return frame
    _,tableau=gate_operator(name,tuple(qubits),width)
    return frame.evolve(tableau,frame='s')
