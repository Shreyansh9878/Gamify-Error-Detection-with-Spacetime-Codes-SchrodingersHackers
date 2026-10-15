import ast
from ..learning.source import literal, diagnostics
from ..noise_lab.code_parser import SourceError
from .models import Strategy, ActiveRail


def parse(request):
    code = request.code
    if len(code.encode())>8192 or len(code.splitlines())>128:
        raise SourceError('Source is limited to 8 KiB and 128 lines.')
    try: tree = ast.parse(code)
    except (SyntaxError,RecursionError) as e:
        raise SourceError('Invalid strategy syntax.') from e
    if sum(1 for _ in ast.walk(tree))>2048: raise SourceError('Source is too complex.')
    declared = False; ready = False; rails = {}; node = None
    for node in tree.body:
        if isinstance(node,ast.ImportFrom) and not declared and not node.level and node.module=='quantum_shield' and [(v.name,v.asname) for v in node.names]==[('GraduationStrategy',None)]:
            declared=True; continue
        if isinstance(node,ast.Assign) and declared and not ready:
            call = node.value
            if len(node.targets)!=1 or not isinstance(node.targets[0],ast.Name) or node.targets[0].id!='strategy' or not isinstance(call,ast.Call) or not isinstance(call.func,ast.Name) or call.func.id!='GraduationStrategy' or len(call.args)!=1 or call.keywords or literal(call.args[0])!='graduation-fixture-v1':
                raise SourceError('Declare strategy = GraduationStrategy("graduation-fixture-v1").',node)
            ready=True; continue
        if not ready or not isinstance(node,ast.Expr) or not isinstance(node.value,ast.Call): raise SourceError('Only literal strategy.check calls are supported.',node)
        call = node.value
        if not isinstance(call.func,ast.Attribute) or not isinstance(call.func.value,ast.Name) or call.func.value.id!='strategy' or call.func.attr!='check' or call.args:
            raise SourceError('Only literal strategy.check calls are supported.',node)
        mapping = {'ancilla':'ancilla','start':'startBoundary','end':'endBoundary','opening':'openingTaps','closing':'closingTaps','closing_sign':'closingSign'}
        if any(k.arg not in mapping for k in call.keywords) or len({k.arg for k in call.keywords})!=len(call.keywords): raise SourceError('Unsupported/repeated strategy fields.',node)
        values = {mapping[k.arg]:literal(k.value) for k in call.keywords}
        try:
            for field in ('openingTaps','closingTaps'):
                values[field] = [{'qubit':q,'pauli':p} for q,p in values.get(field,[])]
            rail = ActiveRail(active=True,**values)
            if rail.ancilla in rails: raise ValueError('Each rail can be declared only once.')
            rails[rail.ancilla]=rail.model_dump()
        except (ValueError,TypeError) as e: raise SourceError(str(e),node) from e
    if not ready: raise SourceError('Import and declare GraduationStrategy first.')
    return Strategy(rails=[rails.get(a,{'ancilla':a,'active':False}) for a in range(2)])


def compile_source(request): return diagnostics(parse,request,'draft')
