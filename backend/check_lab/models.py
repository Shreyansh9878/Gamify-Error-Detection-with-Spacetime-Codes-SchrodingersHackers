from typing import Literal
from pydantic import Field, model_validator
from ..noise_lab.models import StrictModel
from ..learning.common import Gate, Samples, validate_gates


class Tap(StrictModel):
    qubit: int = Field(ge=0,le=2)
    pauli: Literal['X','Y','Z']


class Check(StrictModel):
    id: str = Field(min_length=1,max_length=64)
    ancilla: int = Field(ge=0,le=1)
    startBoundary: int = Field(ge=0,le=15)
    endBoundary: int = Field(ge=1,le=16)
    openingHadamard: bool = False
    openingTaps: list[Tap] = Field(default_factory=list,max_length=3)
    closingTaps: list[Tap] = Field(default_factory=list,max_length=3)
    closingSign: Literal[1,-1] = 1
    closingHadamard: bool = False
    measure: bool = False

    @model_validator(mode='after')
    def interval(self):
        if self.startBoundary>=self.endBoundary:raise ValueError('Opening boundary must precede closing boundary.')
        for taps in (self.openingTaps,self.closingTaps):
            if len({t.qubit for t in taps})!=len(taps):raise ValueError('A Pauli product has at most one factor per wire.')
        return self


class WireTarget(StrictModel):
    kind: Literal['data','ancilla']
    index: int = Field(ge=0,le=4)


class Fault(StrictModel):
    id: str = Field(min_length=1,max_length=64)
    name: Literal['bit_flip','pauli_y','phase_flip','decoherence']
    qubit: int = Field(ge=0,le=2)
    boundary: int = Field(ge=0,le=16)
    order: int = Field(default=0,ge=0,le=3)
    targets: list[WireTarget] | None = Field(default=None,min_length=1,max_length=7)
    timeUs: float | None = Field(default=None,ge=0,le=200)
    t1Us: float | None = Field(default=None,ge=20,le=200)
    t2Us: float | None = Field(default=None,gt=0,le=400)

    @model_validator(mode='after')
    def physical(self):
        if self.targets is not None and len({(t.kind,t.index) for t in self.targets})!=len(self.targets):raise ValueError('Noise targets must be unique.')
        if self.name=='decoherence':
            if self.timeUs is None:self.timeUs=50.
            if self.t1Us is None:self.t1Us=100.
            if self.t2Us is None:self.t2Us=80.
            if self.t2Us>2*self.t1Us:raise ValueError('T2 must not exceed 2 × T1.')
        elif any(v is not None for v in (self.timeUs,self.t1Us,self.t2Us)):raise ValueError('Only waiting accepts time parameters.')
        return self


class Draft(StrictModel):
    schemaVersion: Literal[1] = 1
    mode: Literal['guided','sandbox']='guided'
    dataQubits: int = Field(ge=1,le=3)
    preparation: list[Gate] = Field(default_factory=list,max_length=16)
    payload: list[Gate] = Field(default_factory=list,max_length=64)
    checks: list[Check] = Field(default_factory=list,max_length=2)
    combineFaults: bool = False
    faults: list[Fault] = Field(default_factory=list,max_length=4)

    @model_validator(mode='after')
    def bounded(self):
        n=self.dataQubits
        validate_gates(self.preparation,n,True);validate_gates(self.payload,n,True)
        if len(self.preparation)+len(self.payload)>64:raise ValueError('Maximum 64 preparation/payload gates.')
        ids=[g.id for g in self.preparation+self.payload]+[c.id for c in self.checks]+[f.id for f in self.faults]
        if len(set(ids))!=len(ids):raise ValueError('All gate, check, and fault IDs must be unique.')
        if len({c.ancilla for c in self.checks})!=len(self.checks):raise ValueError('Each check owns a distinct ancilla; helpers cannot be reused.')
        if len(self.faults)>(4 if self.combineFaults else 1):raise ValueError('Enable Combine Faults before adding multiple fault blocks.')
        if len({(f.boundary,f.order) for f in self.faults})!=len(self.faults):raise ValueError('Fault ordering at a boundary must be unique.')
        if any(t.qubit>=n for c in self.checks for t in c.openingTaps+c.closingTaps) or any(f.qubit>=n for f in self.faults):raise ValueError('Check/fault targets a missing data wire.')
        for f in self.faults:
            for target in f.targets or []:
                if target.kind=='ancilla' and any(c.ancilla==target.index and f.boundary>c.endBoundary for c in self.checks):raise ValueError('This helper has already been measured. Place diagnostic helper noise at or before its readout boundary.')
                if target.kind=='data' and target.index>=n or target.kind=='ancilla' and target.index not in {c.ancilla for c in self.checks}:raise ValueError('Noise targets a missing/inactive wire.')
        if self.mode=='guided':
            if n!=1 or self.preparation or len(self.payload)!=1 or self.payload[0].name!='s' or self.payload[0].qubits!=[0] or self.payload[0].column!=2:raise ValueError('Guided mode locks one data wire, zero preparation, and S at column 2.')
            if len(self.checks)>1 or any(c.ancilla!=0 or c.startBoundary!=1 or c.endBoundary!=3 for c in self.checks):raise ValueError('Guided check uses a0 with fixed opening 1 and closing 3.')
        return self


class CheckRequest(Samples):
    draft: Draft
    faultsEnabled: bool = True

    @model_validator(mode='after')
    def observed(self):
        if self.observable.qubit>=self.draft.dataQubits:raise ValueError('Observable targets a missing data wire.')
        return self


class TraceRequest(CheckRequest):
    fault: Fault

    @model_validator(mode='after')
    def traceable(self):
        if self.fault.name=='decoherence':raise ValueError('Use Run for channel experiments; Trace Fault accepts one X/Z event.')
        return self


class CompileRequest(StrictModel):
    code: str = Field(max_length=8192)
    mode: Literal['guided','sandbox']='sandbox'
    combineFaults: bool = False
