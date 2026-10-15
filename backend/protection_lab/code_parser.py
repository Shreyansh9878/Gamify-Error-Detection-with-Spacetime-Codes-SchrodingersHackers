from ..learning.source import source_calls, gate_call, literal, diagnostics
from ..noise_lab.code_parser import SourceError, number, integer
from .models import Experiment, Noise


def parse(request):
    n,pi,calls=source_calls(request.code,'ProtectionCircuit')
    gates=[];noise=None
    node=None
    try:
        for node,name,args,keys in calls:
            if name=='noise':
                if noise is not None or len(args)!=1:raise SourceError('Declare exactly one noise region with one literal channel name.',node)
                kind=literal(args[0]);mapping={'enabled':'enabled','targets':'targetQubits','qubit':'targetQubit','boundary':'boundary','probability':'probability','strength':'strength','time_us':'timeUs','t1_us':'t1Us','t2_us':'t2Us'}
                if set(keys)-set(mapping):raise SourceError('Unknown noise parameter.',node)
                values={mapping[k]:(literal(v) if k in ('enabled','targets') else integer(v,pi) if k in ('qubit','boundary') else float(number(v,pi))) for k,v in keys.items()}
                noise=Noise(channel=kind,**values)
            else:gates.append(gate_call(node,name,args,keys,pi,len(gates),gates))
        if noise is None:raise SourceError('Add qc.noise(channel, qubit=..., boundary=...).',node)
        return Experiment(qubits=n,operations=gates,noise=noise)
    except ValueError as exc:
        if isinstance(exc,SourceError):raise
        raise SourceError(exc.errors()[0]['msg'] if hasattr(exc,'errors') else str(exc),node) from exc


def compile_source(request):return diagnostics(parse,request,'experiment')
