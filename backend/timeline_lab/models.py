from typing import Literal
from pydantic import Field, model_validator
from ..noise_lab.models import StrictModel


class HardwareNoise(StrictModel):
    enabled: bool = True
    bitFlip: float = Field(default=.025, ge=0, le=1)
    phaseFlip: float = Field(default=.01, ge=0, le=1)
    depolarizing: float = Field(default=0, ge=0, le=1)
    relaxationTimeUs: float = Field(default=0, ge=0, le=120)
    t1Us: float = Field(default=100, ge=20, le=200)
    t2Us: float = Field(default=80, gt=0, le=400)

    @model_validator(mode='after')
    def physical(self):
        if self.t2Us > 2*self.t1Us: raise ValueError('T2 must be at most 2T1.')
        return self


class Operation(StrictModel):
    id: str = Field(min_length=1, max_length=64)
    name: Literal['h','x','y','z','s','sdg','t','tdg','rx','ry','rz','cx','cy','cz','m','bit_flip','phase_flip','decoherence']
    qubits: list[int] = Field(min_length=1, max_length=7)
    column: int = Field(ge=0, le=23)
    angleRadians: float | None = Field(default=None,ge=-6.283185307179586,le=6.283185307179586)
    timeUs: float = Field(default=30, ge=0, le=200)
    t1Us: float = Field(default=100, ge=20, le=200)
    t2Us: float = Field(default=80, gt=0, le=400)

    @model_validator(mode='after')
    def arity(self):
        if len(set(self.qubits)) != len(self.qubits): raise ValueError('Gate endpoints must be distinct.')
        if self.name != 'decoherence' and len(self.qubits) != (2 if self.name in ('cx','cy','cz') else 1):
            raise ValueError('Controlled gates need control and target; ordinary gates need one wire.')
        if (self.name in ('rx','ry','rz')) != (self.angleRadians is not None):raise ValueError('Only RX/RY/RZ require an angle in radians.')
        if min(self.qubits)<0 or self.t2Us>2*self.t1Us: raise ValueError('Invalid wire or relaxation constants.')
        return self


def fixed_payload(lesson):
    rows = {3:[('s',[0],2)], 4:[('h',[0],3),('cx',[0,1],4)],
            5:[('t',[0],2)], 6:[('x',[0],4),('cx',[0,1],5),('h',[2],6),('s',[1],7)]}[lesson]
    return [Operation(id=f'locked-{i}',name=name,qubits=qs,column=c) for i,(name,qs,c) in enumerate(rows)]


class Draft(StrictModel):
    version: Literal[2] = 2
    lesson: Literal[3,4,5,6]
    mode: Literal['guided','sandbox'] = 'guided'
    dataQubits: int = Field(default=1, ge=1, le=5)
    ancillas: int = Field(default=1, ge=1, le=2)
    columns: int = Field(default=12, ge=7, le=24)
    operations: list[Operation] = Field(default_factory=list, max_length=96)
    hardware: HardwareNoise = Field(default_factory=lambda:HardwareNoise(enabled=False))

    @model_validator(mode='after')
    def bounded(self):
        if self.lesson==6 and (self.mode!='guided' or self.dataQubits!=3 or self.ancillas!=2):
            raise ValueError('The capstone has three locked data wires and two ancillas.')
        if self.mode=='guided' and self.dataQubits!={3:1,4:2,5:1,6:3}[self.lesson]:
            raise ValueError('Use the sandbox to change the guided data register.')
        if self.lesson!=6 and self.hardware.enabled: raise ValueError('Spatial faults belong to these lessons; hardware noise is enabled in FS6.')
        occupied=set();ids=set();measured={}
        ops=self.operations+(fixed_payload(self.lesson) if self.mode=='guided' else [])
        for g in sorted(ops,key=lambda g:(g.column,g.id)):
            if g.id in ids: raise ValueError('Operation IDs must be unique.')
            ids.add(g.id)
            if g.column>=self.columns: raise ValueError('An operation is outside the visible timeline.')
            if self.lesson!=5 and g.name in ('t','tdg'): raise ValueError('T gates belong to Flight School 5.')
            if self.lesson==6 and g.name in ('bit_flip','phase_flip','decoherence'):
                raise ValueError('Use the capstone hardware noise sliders, not spatial noise blocks.')
            for q in g.qubits:
                if q>=self.dataQubits+self.ancillas: raise ValueError('Operation targets a missing wire.')
                if (q,g.column) in occupied: raise ValueError('Two operations share a wire and column, or overwrite a locked gate.')
                if q in measured: raise ValueError('Measurement is terminal on its wire. Move M after its last interaction.')
                occupied.add((q,g.column))
                if g.name=='m': measured[q]=g.column
            if self.lesson==6 and g in self.operations:
                if not (len(g.qubits)==2 and g.name in ('cx','cy','cz') and g.qubits[0]>=3 and g.qubits[1]<3) and not (len(g.qubits)==1 and g.qubits[0]>=3 and g.name in ('h','x','y','z','s','sdg','rx','ry','rz','m')):
                    raise ValueError('The payload is locked. Add ancilla controls, readout, and ancilla-to-data CP gates around it.')
                if 4<=g.column<=8: raise ValueError('Keep capstone checks outside the locked workload.')
        if sum(g.name in ('t','tdg') for g in ops)>6: raise ValueError('Use at most six T gates in this bounded sandbox.')
        return self


class Request(StrictModel):
    draft: Draft
    shots: Literal[256,1024,4096] = 1024
    seed: int = Field(default=2026,ge=0,le=2147483647)


class CompileRequest(StrictModel):
    code: str = Field(max_length=14000)
