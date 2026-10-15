from math import pi
from typing import Literal
from pydantic import BaseModel, ConfigDict, Field, model_validator


class StrictModel(BaseModel):
    model_config = ConfigDict(extra='forbid', strict=True, allow_inf_nan=False)


class Operation(StrictModel):
    id: str = Field(min_length=1, max_length=64)
    role: Literal['prepare', 'error']
    name: Literal['h', 'x', 'y', 'z', 's', 'sdg', 'rx', 'ry', 'rz', 'cx', 'cy', 'cz', 'm',
                  'bit_flip', 'phase_flip', 'decoherence']
    qubits: list[int] = Field(min_length=1, max_length=5)
    column: int = Field(ge=0, le=15)
    angleRadians: float | None = Field(default=None, ge=-2*pi, le=2*pi)
    timeUs: float | None = Field(default=None, ge=0, le=200)
    t1Us: float | None = Field(default=None, ge=20, le=200)
    t2Us: float | None = Field(default=None, gt=0, le=400)

    @model_validator(mode='after')
    def valid_operation(self):
        error = self.name in ('bit_flip', 'phase_flip', 'decoherence')
        if error != (self.role == 'error'):
            raise ValueError('Operation name does not match its preparation/error role.')
        if (self.name != 'decoherence' and len(self.qubits) != (2 if self.name in ('cx','cy','cz') else 1)) or len(set(self.qubits)) != len(self.qubits):
            raise ValueError('CX needs distinct control and target; other blocks need one qubit.')
        if self.name in ('rx', 'ry', 'rz'):
            if self.angleRadians is None:
                raise ValueError('Rotation requires angleRadians.')
        elif self.angleRadians is not None:
            raise ValueError('Only rotations accept an angle.')
        if self.name == 'decoherence':
            if any(v is None for v in (self.timeUs, self.t1Us, self.t2Us)):
                raise ValueError('Waiting requires elapsed time, T1, and T2 in microseconds.')
            if self.t2Us > 2*self.t1Us:
                raise ValueError('T2 must be at most 2 × T1.')
        elif any(v is not None for v in (self.timeUs, self.t1Us, self.t2Us)):
            raise ValueError('Only decoherence blocks accept waiting parameters.')
        return self


class Circuit(StrictModel):
    schemaVersion: Literal[1] = 1
    qubits: int = Field(ge=1, le=5)
    combineErrors: bool = False
    operations: list[Operation] = Field(max_length=64)

    @model_validator(mode='after')
    def valid_circuit(self):
        ids, occupied = set(), set()
        errors = sum(op.role == 'error' for op in self.operations)
        if errors > (8 if self.combineErrors else 1):
            raise ValueError('Enable Combine Errors for multiple blocks; maximum eight errors.')
        measured=set()
        for op in sorted(self.operations,key=lambda g:g.column):
            if any(q in measured for q in op.qubits):raise ValueError('Measurement is terminal on its wire. Move M after its final gate or noise.')
            if op.name=='m':measured.update(op.qubits)
            if op.id in ids:
                raise ValueError('Block IDs must be unique.')
            ids.add(op.id)
            for q in op.qubits:
                if not 0 <= q < self.qubits:
                    raise ValueError('Block targets a wire outside this circuit.')
                if (q, op.column) in occupied:
                    raise ValueError('Blocks sharing a wire cannot share a column.')
                occupied.add((q, op.column))
        return self


class CompileRequest(StrictModel):
    code: str = Field(max_length=8192)
    combineErrors: bool = False


class LabRunRequest(StrictModel):
    circuit: Circuit
    comparisonMode: Literal['selected_error', 'final'] = 'final'
    selectedErrorId: str | None = Field(default=None, max_length=64)
    basis: Literal['Z', 'X'] = 'Z'
    shots: Literal[256, 1024, 4096] = 1024
    sampleSeed: int = Field(default=2026, ge=0, le=2147483647)

    @model_validator(mode='after')
    def valid_selection(self):
        if self.comparisonMode == 'selected_error' and not any(
            op.id == self.selectedErrorId and op.role == 'error' for op in self.circuit.operations
        ):
            raise ValueError('Select an existing error block for before/after comparison.')
        return self


def ordered(circuit: Circuit):
    return sorted(circuit.operations, key=lambda op: (op.column, op.role == 'error', op.qubits, op.id))
