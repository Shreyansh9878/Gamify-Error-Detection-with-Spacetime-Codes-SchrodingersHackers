from typing import Literal
from pydantic import Field, model_validator
from ..noise_lab.models import StrictModel
from .levels import get_level


class Gate(StrictModel):
    id: str = Field(min_length=1, max_length=64, pattern=r'^[a-zA-Z0-9_-]+$')
    name: Literal['h', 'x', 'y', 'z', 's', 'sdg', 'cx', 'cy', 'cz', 'm']
    qubits: list[int] = Field(min_length=1, max_length=2)
    boundary: int = Field(ge=0, le=40)
    slot: int = Field(ge=0, le=7)


class Draft(StrictModel):
    version: Literal[1] = 1
    levelId: int = Field(ge=1, le=10)
    # Slots before payload instruction b; the final boundary follows all U.
    bands: dict[str, int] = Field(default_factory=dict, max_length=42)
    operations: list[Gate] = Field(default_factory=list, max_length=100)

    @model_validator(mode='after')
    def valid(self):
        level = get_level(self.levelId); length = len(level['payload'])
        for key, count in self.bands.items():
            if not key.isdigit() or str(int(key)) != key or not 0 <= int(key) <= length or count not in (0, 4, 8):
                raise ValueError('Editable bands must be canonical payload boundaries with 0, 4 or 8 slots.')
        occupied=set(); ids=set(); measured={}
        for gate in sorted(self.operations, key=lambda g: (g.boundary, g.slot)):
            if gate.id in ids or gate.id.startswith(('u', 'auto-')):
                raise ValueError('Gate identifiers must be unique and cannot use payload or auto prefixes.')
            ids.add(gate.id)
            if gate.boundary > length or gate.slot >= self.bands.get(str(gate.boundary), 0):
                raise ValueError('Insert editable columns at this boundary before placing a gate.')
            if len(gate.qubits) != (2 if gate.name in ('cx','cy','cz') else 1) or len(set(gate.qubits)) != len(gate.qubits):
                raise ValueError('Controlled gates need two distinct wires; other gates need one.')
            if any(q < 0 or q >= level['qubits']+level['ancillas'] for q in gate.qubits):
                raise ValueError('The ancilla register is fixed by the mission.')
            if gate.name in ('cx','cy','cz'):
                if gate.qubits[0] < level['qubits'] or gate.qubits[1] >= level['qubits']:
                    raise ValueError('Checks must be controlled by an ancilla and target a data wire.')
            elif gate.qubits[0] < level['qubits']:
                raise ValueError('Payload data gates are locked; single-wire controls belong on ancillas.')
            for q in gate.qubits:
                cell=(q,gate.boundary,gate.slot)
                if cell in occupied: raise ValueError('Two gates cannot share a wire in the same slot.')
                if q in measured: raise ValueError('Ancilla measurement must be terminal.')
                occupied.add(cell)
            if gate.name=='m': measured[gate.qubits[0]]=True
        return self


class Request(StrictModel):
    draft: Draft


class CompileRequest(StrictModel):
    levelId: int = Field(ge=1, le=10)
    code: str = Field(max_length=8192)
