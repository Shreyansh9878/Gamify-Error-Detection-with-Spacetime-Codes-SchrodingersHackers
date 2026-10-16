from ..learning.source import source_calls, gate_call, literal, diagnostics
from ..noise_lab.code_parser import SourceError, number, integer
from .models import Draft, Check, Tap, Fault


def parse(request):
    n,pi,calls=source_calls(request.code,'CheckCircuit');payload=[];prep=[];checks=[];faults=[];node=None
    try:
        for node,name,args,keys in calls:
            if name=='check':
                mapping={'id':'id','ancilla':'ancilla','start':'startBoundary','end':'endBoundary','opening':'openingTaps','closing':'closingTaps','closing_sign':'closingSign','opening_h':'openingHadamard','closing_h':'closingHadamard','measure':'measure'}
                if args or set(keys)-set(mapping):raise SourceError('A check accepts only the documented literal keyword fields.',node)
                values={mapping[k]:literal(v) for k,v in keys.items()}
                for field in ('openingTaps','closingTaps'):
                    if field in values:
                        pairs=values[field]
                        if not isinstance(pairs,list) or len(pairs)>3 or any(not isinstance(p,(tuple,list)) or len(p)!=2 for p in pairs):raise SourceError('Use at most three (wire, "X"|"Y"|"Z") pairs.',node)
                        values[field]=[Tap(qubit=q,pauli=p) for q,p in pairs]
                checks.append(Check(**values))
            elif name in ('bit_flip','pauli_y','phase_flip','decoherence'):
                mapping={'targets':'targets','boundary':'boundary','order':'order','time_us':'timeUs','t1_us':'t1Us','t2_us':'t2Us'}
                if len(args)!=1 or set(keys)-set(mapping):raise SourceError('Fault takes one wire plus boundary and optional waiting parameters.',node)
                target_node = keys.pop('targets', None)
                target_values = [{'kind':kind,'index':index} for kind,index in literal(target_node)] if target_node is not None else None
                values={mapping[k]:(integer(v,pi) if k in ('boundary','order') else float(number(v,pi))) for k,v in keys.items()}
                values.setdefault('order',len(faults))
                faults.append(Fault(id=f'fault-{len(faults)}',name=name,qubit=integer(args[0],pi),targets=target_values,**values))
            else:
                target=prep if name.startswith('prepare_') else payload
                gate_name=name.removeprefix('prepare_')
                target.append(gate_call(node,gate_name,args,keys,pi,len(prep)+len(payload),target))
        # Authored check IDs are stable; generated operation IDs must never
        # collide with them when visual drafts round-trip through source.
        used = {check.id for check in checks}
        for operation in prep + payload + faults:
            candidate = operation.id
            while candidate in used:
                candidate = '_' + candidate
            operation.id = candidate
            used.add(candidate)
        return Draft(mode=request.mode,dataQubits=n,preparation=prep,payload=payload,checks=checks,combineFaults=request.combineFaults,faults=faults)
    except (ValueError,TypeError) as exc:
        if isinstance(exc,SourceError):raise
        raise SourceError(exc.errors()[0]['msg'] if hasattr(exc,'errors') else str(exc),node) from exc


def compile_source(request):return diagnostics(parse,request,'draft')
