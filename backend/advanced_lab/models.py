from typing import ClassVar, Literal
from pydantic import Field, model_validator
from ..noise_lab.models import StrictModel
from ..check_lab.models import Fault as OldFault
from ..learning.common import validate_gates


class Gate(StrictModel):
    id: str = Field(min_length=1, max_length=64)
    role: Literal['prepare'] = 'prepare'
    name: Literal['h', 'x', 'y', 'z', 's', 'sdg', 'cx', 'cz', 'swap', 't', 'tdg']
    qubits: list[int] = Field(min_length=1, max_length=2)
    column: int = Field(ge=0, le=15)

    @property
    def angleRadians(self):
        return None

    @model_validator(mode='after')
    def arity(self):
        if len(self.qubits) != (2 if self.name in ('cx', 'cz', 'swap') else 1) or len(set(self.qubits)) != len(self.qubits):
            raise ValueError('Choose distinct endpoints for a two-wire gate; other gates need one wire.')
        return self


class Tap(StrictModel):
    qubit: int = Field(ge=0, le=4)
    pauli: Literal['X', 'Y', 'Z']


class Check(StrictModel):
    id: str = Field(min_length=1, max_length=64)
    ancilla: int = Field(ge=0, le=1)
    startBoundary: int = Field(ge=0, le=15)
    endBoundary: int = Field(ge=1, le=16)
    openingHadamard: bool = False
    openingTaps: list[Tap] = Field(default_factory=list, max_length=5)
    closingTaps: list[Tap] = Field(default_factory=list, max_length=5)
    closingSign: Literal[1, -1] = 1
    closingHadamard: bool = False
    measure: bool = False

    @model_validator(mode='after')
    def interval(self):
        if self.startBoundary >= self.endBoundary:
            raise ValueError('Opening boundary must precede closing boundary.')
        for taps in (self.openingTaps, self.closingTaps):
            if len({t.qubit for t in taps}) != len(taps):
                raise ValueError('One Pauli factor per wire.')
        return self


class Fault(OldFault):
    name: Literal['bit_flip', 'pauli_y', 'phase_flip', 'decoherence']
    qubit: int = Field(ge=0, le=4)


class Draft(StrictModel):
    MAX_QUBITS: ClassVar[int] = 4
    NON_CLIFFORD: ClassVar[bool] = False
    schemaVersion: Literal[1] = 1
    mode: Literal['guided', 'sandbox'] = 'sandbox'
    dataQubits: int = Field(ge=1, le=5)
    preparation: list[Gate] = Field(default_factory=list, max_length=16)
    payload: list[Gate] = Field(default_factory=list, max_length=64)
    checks: list[Check] = Field(default_factory=list, max_length=2)
    combineFaults: bool = False
    faults: list[Fault] = Field(default_factory=list, max_length=4)

    @model_validator(mode='after')
    def bounds(self):
        if self.dataQubits > self.MAX_QUBITS:
            raise ValueError(f'This lesson allows at most {self.MAX_QUBITS} data wires.')
        all_gates = self.preparation + self.payload
        if len(all_gates) > 64:
            raise ValueError('Maximum 64 preparation/payload gates.')
        t_count = sum(g.name in ('t', 'tdg') for g in all_gates)
        if t_count > (4 if self.NON_CLIFFORD else 0):
            raise ValueError('T/T† are limited to four in Flight School 5 and unavailable in Flight School 4.')
        validate_gates(self.preparation, self.dataQubits)
        validate_gates(self.payload, self.dataQubits)
        ids = [v.id for v in all_gates + self.checks + self.faults]
        if len(set(ids)) != len(ids):
            raise ValueError('All operation/check IDs must be unique.')
        if len({c.ancilla for c in self.checks}) != len(self.checks):
            raise ValueError('Each check owns a distinct ancilla.')
        for c in self.checks:
            if any(t.qubit >= self.dataQubits for t in c.openingTaps + c.closingTaps):
                raise ValueError('Check targets a missing data wire.')
        if len(self.faults) > (4 if self.combineFaults else 1):
            raise ValueError('Enable Combine Faults before adding more than one event.')
        if len({(f.boundary, f.order) for f in self.faults}) != len(self.faults):
            raise ValueError('Fault order at each boundary must be unique.')
        if any(f.qubit >= self.dataQubits for f in self.faults):
            raise ValueError('Fault targets a missing data wire.')
        for f in self.faults:
            for target in f.targets or []:
                if target.kind=='ancilla' and any(c.ancilla==target.index and f.boundary>c.endBoundary for c in self.checks):raise ValueError('This helper has already been measured. Place diagnostic helper noise at or before its readout boundary.')
                if target.kind=='data' and target.index>=self.dataQubits or target.kind=='ancilla' and target.index not in {c.ancilla for c in self.checks}:
                    raise ValueError('Noise targets a missing or inactive wire.')
        if self.mode == 'guided' and not self.NON_CLIFFORD:
            n, name, wires = (1, 't', [0]) if self.NON_CLIFFORD else (2, 'cx', [0, 1])
            if self.dataQubits != n or self.preparation or len(self.payload) != 1 or self.payload[0].name != name or self.payload[0].qubits != wires or self.payload[0].column != 2:
                raise ValueError('The guided payload and zero input are locked.')
            if len(self.checks) != 1 or any(c.ancilla != 0 or c.startBoundary != 1 or c.endBoundary != 3 for c in self.checks):
                raise ValueError('Guided mode owns a0 between boundaries 1 and 3.')
            if self.NON_CLIFFORD and not all((self.checks[0].openingHadamard, self.checks[0].closingHadamard, self.checks[0].measure)):
                raise ValueError('The guided T comparison has a fixed complete H/H/M shell.')
        return self


class NonCliffordDraft(Draft):
    MAX_QUBITS: ClassVar[int] = 5
    NON_CLIFFORD: ClassVar[bool] = True


class Observable(StrictModel):
    qubit: int = Field(default=0, ge=0, le=4)
    basis: Literal['X', 'Z'] = 'Z'


class RunRequest(StrictModel):
    draft: Draft
    faultsEnabled: bool = True
    observable: Observable = Field(default_factory=Observable)
    shotsPerVariant: Literal[256, 1024, 4096] = 1024
    sampleSeed: int = Field(default=2026, ge=0, le=2147483647)

    @model_validator(mode='after')
    def observed(self):
        if self.observable.qubit >= self.draft.dataQubits:
            raise ValueError('Observable targets a missing data wire.')
        return self


class NonCliffordRequest(RunRequest):
    draft: NonCliffordDraft


class TraceRequest(RunRequest):
    fault: Fault


class NonCliffordTrace(NonCliffordRequest):
    fault: Fault


class CoverageRequest(NonCliffordRequest):
    cursor: int = Field(default=0, ge=0, le=254)


class CompileRequest(StrictModel):
    code: str = Field(max_length=8192)
    mode: Literal['guided', 'sandbox'] = 'sandbox'
    combineFaults: bool = False
