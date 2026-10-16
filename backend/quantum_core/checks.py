"""Translate a transported Pauli product into its controlled inverse closure."""
from .pauli import single_term


def closing_factors(matrix,ancilla):
    term=single_term(matrix.conj().T)
    if term is None:
        raise ValueError('A coherent Pauli sum needs a non-Pauli check.')
    label,coefficient=term
    factors=[('c'+p.lower(),[ancilla,q]) for q,p in enumerate(reversed(label)) if p!='I']
    # A sign/global phase on the data branch is a relative phase on the helper.
    phase=min([(1,None),(-1,'z'),(1j,'s'),(-1j,'sdg')],key=lambda pair:abs(pair[0]-coefficient))[1]
    if phase:
        factors.append((phase,[ancilla]))
    return factors
