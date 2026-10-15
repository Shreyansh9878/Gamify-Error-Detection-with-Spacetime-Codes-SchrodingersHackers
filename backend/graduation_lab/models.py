from typing import Literal, Annotated
from pydantic import Field, model_validator
from ..noise_lab.models import StrictModel
from ..advanced_lab.models import Tap, Fault
from ..learning.common import Samples
from .fixture import WINDOWS


class InactiveRail(StrictModel):
    ancilla: Literal[0,1]
    active: Literal[False]


class ActiveRail(StrictModel):
    ancilla: Literal[0,1]
    active: Literal[True]
    startBoundary: int
    endBoundary: int
    openingTaps: list[Tap] = Field(max_length=1)
    closingTaps: list[Tap] = Field(default_factory=list,max_length=3)
    closingSign: Literal[1,-1] = 1

    @model_validator(mode='after')
    def allowed(self):
        if (self.startBoundary,self.endBoundary) not in WINDOWS:
            raise ValueError('Choose one of the four fixed capstone windows.')
        if any(t.qubit>2 for t in self.openingTaps+self.closingTaps):
            raise ValueError('The locked workload has only q0, q1 and q2.')
        if len({t.qubit for t in self.closingTaps}) != len(self.closingTaps):
            raise ValueError('One closing factor per data wire.')
        return self


class Strategy(StrictModel):
    schemaVersion: Literal[1] = 1
    rails: list[Annotated[ActiveRail|InactiveRail,Field(discriminator='active')]] = Field(min_length=2,max_length=2)

    @model_validator(mode='after')
    def unique(self):
        if {r.ancilla for r in self.rails} != {0,1}:
            raise ValueError('Keep exactly one descriptor for each rail a0 and a1.')
        keys = [(r.startBoundary,r.endBoundary,r.openingTaps[0].qubit,r.openingTaps[0].pauli) for r in self.rails if r.active and r.openingTaps]
        if len(set(keys)) != len(keys):
            raise ValueError('Duplicate candidate checks are not allowed.')
        return self


class RunRequest(Samples):
    fixtureVersion: Literal['graduation-fixture-v1'] = 'graduation-fixture-v1'
    strategy: Strategy


class CompileRequest(StrictModel):
    code: str = Field(max_length=8192)


class DiagnosticRequest(RunRequest):
    overlay: list[Fault] = Field(min_length=1,max_length=4)

    @model_validator(mode='after')
    def diagnostic_targets(self):
        active={r.ancilla for r in self.strategy.rails if r.active}
        for f in self.overlay:
            if f.boundary>8 or f.qubit>2:raise ValueError('Diagnostic overlay must stay within the locked three-wire timeline.')
            for t in f.targets or []:
                if t.kind=='data' and t.index>2 or t.kind=='ancilla' and t.index not in active:
                    raise ValueError('Diagnostic noise targets a missing or bypassed wire.')
        if len({f.id for f in self.overlay})!=len(self.overlay):raise ValueError('Diagnostic fault IDs must be unique.')
        return self
