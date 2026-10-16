from ..learning.source import source_calls, gate_call, literal, diagnostics
from ..noise_lab.code_parser import SourceError, number, integer
from .models import Experiment, Noise
from ..timeline_lab.models import HardwareNoise


def parse(request):
    n,pi,calls=source_calls(request.code,'ProtectionCircuit')
    gates=[];noise=None;hardware=None
    node=None
    try:
        for node,name,args,keys in calls:
            if name=='protect_wire':
                if len(args)!=1 or keys:raise SourceError('Use qc.protect_wire(index).',node)
                noise=Noise(targetQubit=integer(args[0],pi))
            elif name=='hardware':
                if args or hardware is not None:raise SourceError('Use one hardware declaration with literal keyword arguments.',node)
                hardware=HardwareNoise(**{k:literal(v) for k,v in keys.items()})
            elif name=='noise':
                if noise is not None or len(args)!=1:raise SourceError('Declare exactly one noise region with one literal channel name.',node)
                kind=literal(args[0]);mapping={'enabled':'enabled','targets':'targetQubits','qubit':'targetQubit','boundary':'boundary','probability':'probability','strength':'strength','time_us':'timeUs','t1_us':'t1Us','t2_us':'t2Us'}
                if set(keys)-set(mapping):raise SourceError('Unknown noise parameter.',node)
                values={mapping[k]:(literal(v) if k in ('enabled','targets') else integer(v,pi) if k in ('qubit','boundary') else float(number(v,pi))) for k,v in keys.items()}
                noise=Noise(channel=kind,**values)
            else:gates.append(gate_call(node,name,args,keys,pi,len(gates),gates))
        if noise is None and hardware is None:raise SourceError('Add qc.hardware(...) or qc.noise(...).',node)
        return Experiment(qubits=n,operations=gates,noise=noise or Noise(enabled=False),hardware=hardware)
    except ValueError as exc:
        if isinstance(exc,SourceError):raise
        raise SourceError(exc.errors()[0]['msg'] if hasattr(exc,'errors') else str(exc),node) from exc


def compile_source(request):return diagnostics(parse,request,'experiment')
