from typing import Literal
from pydantic import Field, model_validator
from ..noise_lab.models import StrictModel
from ..learning.common import Gate, Samples, validate_gates


class Noise(StrictModel):
    enabled: bool = True
    targetQubits: list[int] | None = Field(default=None,min_length=1,max_length=3)
    channel: Literal['bit_flip','phase_flip','depolarizing','decoherence']='bit_flip'
    targetQubit: int = Field(default=0,ge=0,le=2)
    boundary: int = Field(default=0,ge=0,le=16)
    probability: float | None = Field(default=None,ge=0,le=1)
    strength: float | None = Field(default=None,ge=0,le=1)
    timeUs: float | None = Field(default=None,ge=0,le=200)
    t1Us: float | None = Field(default=None,ge=20,le=200)
    t2Us: float | None = Field(default=None,gt=0,le=400)

    @model_validator(mode='after')
    def physical(self):
        if self.targetQubits is not None and len(set(self.targetQubits))!=len(self.targetQubits):raise ValueError('Noise targets must be distinct.')
        fields={'bit_flip':{'probability'},'phase_flip':{'probability'},'depolarizing':{'strength'},'decoherence':{'timeUs','t1Us','t2Us'}}[self.channel]
        for field in {'probability','strength','timeUs','t1Us','t2Us'}-fields:
            if getattr(self,field) is not None:raise ValueError('Noise fields must match the selected channel.')
        for field,default in {'probability':.15,'strength':.15,'timeUs':50.,'t1Us':100.,'t2Us':80.}.items():
            if field in fields and getattr(self,field) is None:setattr(self,field,default)
        if self.channel=='decoherence' and self.t2Us>2*self.t1Us:raise ValueError('T2 must be at most 2 × T1.')
        return self


class Experiment(StrictModel):
    schemaVersion: Literal[1]=1
    qubits: int = Field(ge=1,le=3)
    operations: list[Gate] = Field(default_factory=list,max_length=64)
    noise: Noise = Field(default_factory=Noise)

    @model_validator(mode='after')
    def bounded(self):
        validate_gates(self.operations,self.qubits)
        if any(g.name=='cz' for g in self.operations):raise ValueError('CZ is available in the check lab; use the protection lab preparation palette here.')
        if self.noise.targetQubit>=self.qubits:raise ValueError('Noise targets a missing data wire.')
        if any(q<0 or q>=self.qubits for q in self.noise.targetQubits or []):raise ValueError('Noise targets a missing data wire.')
        return self


class ProtectionRequest(Samples):
    experiment: Experiment
    technique: Literal['detection','mitigation','correction']='detection'
    detectionPauli: Literal['X','Y','Z']='Z'
    correctionFamily: Literal['bit_flip','phase_flip']='bit_flip'
    zneFit: Literal['linear','quadratic']='linear'

    @model_validator(mode='after')
    def valid_observable(self):
        if self.observable.qubit>=self.experiment.qubits:raise ValueError('Observable targets a missing data wire.')
        return self


class CompileRequest(StrictModel):
    code: str = Field(max_length=8192)
