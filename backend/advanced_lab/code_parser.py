from ..learning.source import source_calls, literal, diagnostics
from ..noise_lab.code_parser import SourceError, integer, number
from .models import Gate, Check, Tap, Fault, Draft, NonCliffordDraft


def parse(request, non_clifford=False):
    wrapper = 'NonCliffordCircuit' if non_clifford else 'EntanglingCircuit'
    n, pi, calls = source_calls(request.code, wrapper)
    prep, payload, checks, faults = [], [], [], []
    node = None
    try:
        for node, name, args, keys in calls:
            if name == 'check':
                mapping = {'id':'id', 'ancilla':'ancilla', 'start':'startBoundary', 'end':'endBoundary', 'opening':'openingTaps', 'closing':'closingTaps', 'closing_sign':'closingSign', 'opening_h':'openingHadamard', 'closing_h':'closingHadamard', 'measure':'measure'}
                if args or set(keys) - set(mapping):
                    raise SourceError('Use documented literal check keywords.', node)
                values = {mapping[k]: literal(v) for k, v in keys.items()}
                for field in ('openingTaps', 'closingTaps'):
                    if field in values:
                        pairs = values[field]
                        if not isinstance(pairs, list) or len(pairs) > n or any(not isinstance(p, (tuple, list)) or len(p) != 2 for p in pairs):
                            raise SourceError('Use a bounded list of (wire, Pauli) pairs.', node)
                        values[field] = [Tap(qubit=q, pauli=p) for q, p in pairs]
                checks.append(Check(**values))
            elif name in ('bit_flip', 'pauli_y', 'phase_flip', 'decoherence'):
                mapping = {'targets':'targets', 'boundary':'boundary', 'order':'order', 'time_us':'timeUs', 't1_us':'t1Us', 't2_us':'t2Us'}
                if len(args) != 1 or set(keys) - set(mapping):
                    raise SourceError('Fault takes one wire and bounded timing keywords.', node)
                target_node = keys.pop('targets', None)
                target_values = [{'kind':kind,'index':index} for kind,index in literal(target_node)] if target_node is not None else None
                values = {mapping[k]: integer(v, pi) if k in ('boundary', 'order') else float(number(v, pi)) for k,v in keys.items()}
                faults.append(Fault(id=f'fault-{len(faults)}', name=name, qubit=integer(args[0], pi), targets=target_values, **values))
            else:
                target = prep if name.startswith('prepare_') else payload
                gate_name = name.removeprefix('prepare_')
                if set(keys) - {'at'} or len(args) != (2 if gate_name in ('cx', 'cz', 'swap') else 1):
                    raise SourceError('Wrong gate arguments; use wire indices and at=column.', node)
                target.append(Gate(id=f'code-{len(prep)+len(payload)}', name=gate_name, qubits=[integer(a, pi) for a in args], column=integer(keys['at'], pi) if 'at' in keys else max((g.column for g in target), default=-1)+1))
        used = {c.id for c in checks}
        for operation in prep + payload + faults:
            while operation.id in used:
                operation.id = '_' + operation.id
            used.add(operation.id)
        model = NonCliffordDraft if non_clifford else Draft
        return model(mode=request.mode, dataQubits=n, preparation=prep, payload=payload, checks=checks, faults=faults, combineFaults=request.combineFaults)
    except (ValueError,TypeError) as error:
        if isinstance(error, SourceError):
            raise
        raise SourceError(error.errors()[0]['msg'] if hasattr(error, 'errors') else str(error), node) from error


def compile_source(request, non_clifford=False):
    return diagnostics(lambda r: parse(r, non_clifford), request, 'draft')
