from typing import Literal
from pydantic import BaseModel, ConfigDict, Field, model_validator

GateName = Literal['h', 'x', 'z', 's', 'sdg', 'sx', 'sxdg', 'cx', 'cz', 'rz', 't']

class Gate(BaseModel):
    model_config = ConfigDict(extra='forbid', strict=True)
    id: str = Field(min_length=1, max_length=64)
    name: GateName
    qubits: list[int] = Field(min_length=1, max_length=2)
    column: int = Field(ge=0, le=15)
    quarterTurns: int = Field(default=1, ge=-4, le=4)

class PauliTap(BaseModel):
    model_config = ConfigDict(extra='forbid', strict=True)
    qubit: int = Field(ge=0, le=3)
    pauli: Literal['X', 'Y', 'Z']

class Check(BaseModel):
    model_config = ConfigDict(extra='forbid', strict=True)
    qubit: int = Field(ge=0, le=3)
    pauli: Literal['X', 'Y', 'Z'] = 'Z'
    start: int = Field(ge=0, le=15)
    end: int = Field(ge=1, le=16)
    closingQubit: int | None = Field(default=None, ge=0, le=3)
    closingPauli: Literal['X', 'Y', 'Z'] | None = None
    closingOperators: list[PauliTap] | None = Field(default=None, min_length=1, max_length=3)

    @model_validator(mode='after')
    def ordered(self):
        if self.end <= self.start:
            raise ValueError('The closing boundary must follow the opening boundary.')
        if (self.closingQubit is None) != (self.closingPauli is None):
            raise ValueError('Select both a closing qubit and a closing Pauli.')
        if self.closingOperators is not None and self.closingQubit is not None:
            raise ValueError('Choose a single closing tap or a product, not both.')
        return self

class RunRequest(BaseModel):
    model_config = ConfigDict(extra='forbid', strict=True)
    levelId: int = Field(ge=1, le=10)
    gates: list[Gate] = Field(max_length=32)
    checks: list[Check] = Field(default_factory=list, max_length=2)
    noiseScale: float = Field(default=1.0, ge=0, le=1.5)
    shots: Literal[256, 1024, 4096] = 1024

class ResearchRequest(BaseModel):
    model_config = ConfigDict(extra='forbid', strict=True)
    levelId: int = Field(ge=1, le=10)
    targets: list[int] = Field(default_factory=list, max_length=2)
    repetitions: int = Field(default=1, ge=1, le=3)
    tCount: Literal[0, 1, 2, 4] = 0

class FaultRequest(RunRequest):
    faultQubit: int = Field(ge=0, le=3)
    faultColumn: int = Field(ge=0, le=15)
    faultPauli: Literal['X', 'Y', 'Z']

class TutorialRequest(BaseModel):
    model_config = ConfigDict(extra='forbid', strict=True)
    action: str = Field(default='observe', max_length=32)
    noise: float = Field(default=0.3, ge=0, le=0.8)
    pauli: Literal['X', 'Y', 'Z'] = 'X'
    closingPauli: Literal['X', 'Y', 'Z'] = 'Y'
    injectFault: bool = False
    shots: Literal[256, 1024, 4096] = 1024
