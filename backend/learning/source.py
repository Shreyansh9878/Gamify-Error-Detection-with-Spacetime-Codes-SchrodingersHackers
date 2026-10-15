"""Shared syntactic allowlist. Nothing submitted by a learner is executed."""
import ast
from ..noise_lab.code_parser import SourceError, number, integer
from .common import Gate


def source_calls(code,wrapper):
    if len(code.encode())>8192 or len(code.splitlines())>128: raise SourceError('Source is limited to 8 KiB and 128 lines.')
    try:tree=ast.parse(code)
    except (SyntaxError,RecursionError) as exc:
        err=SourceError(getattr(exc,'msg','Source nesting is too deep.'));err.line=getattr(exc,'lineno',1) or 1;err.column=getattr(exc,'offset',1) or 1;raise err from exc
    if sum(1 for _ in ast.walk(tree))>2048:raise SourceError('Maximum 2048 syntax nodes.')
    declared=False;pi=False;n=None;calls=[]
    for node in tree.body:
        if isinstance(node,ast.ImportFrom) and n is None and not node.level:
            names=[(v.name,v.asname) for v in node.names]
            if node.module=='quantum_shield' and names==[(wrapper,None)]:declared=True;continue
            if node.module=='math' and names==[('pi',None)]:pi=True;continue
        if isinstance(node,ast.Assign) and n is None and declared:
            v=node.value
            if len(node.targets)!=1 or not isinstance(node.targets[0],ast.Name) or node.targets[0].id!='qc' or not isinstance(v,ast.Call) or not isinstance(v.func,ast.Name) or v.func.id!=wrapper or len(v.args)!=1 or v.keywords:raise SourceError(f'Use qc = {wrapper}(n).',node)
            n=integer(v.args[0],pi);continue
        if not isinstance(node,ast.Expr) or not isinstance(node.value,ast.Call) or n is None:raise SourceError('Only the wrapper declaration and supported qc calls are allowed.',node)
        call=node.value
        if not isinstance(call.func,ast.Attribute) or not isinstance(call.func.value,ast.Name) or call.func.value.id!='qc':raise SourceError('Dynamic calls and attribute chains are not allowed.',node)
        keys={}
        for kw in call.keywords:
            if kw.arg is None or kw.arg in keys:raise SourceError('Repeated/dynamic keyword arguments are not allowed.',node)
            keys[kw.arg]=kw.value
        calls.append((node,call.func.attr,call.args,keys))
    if n is None:raise SourceError(f'Import {wrapper}, then declare qc = {wrapper}(n).')
    return n,pi,calls


def gate_call(node,name,args,keys,pi,index,existing):
    if name not in ('h','x','y','z','s','sdg','rx','ry','rz','cx','cz'):raise SourceError('Unknown or unsupported gate.',node)
    if set(keys)-{'at'}:raise SourceError('Only at=column is accepted for a gate.',node)
    rotation=name in ('rx','ry','rz')
    if len(args)!=(2 if rotation or name in ('cx','cz') else 1):raise SourceError('Wrong gate argument count.',node)
    values={'id':f'code-{index}','name':name,'qubits':[integer(a,pi) for a in (args[1:] if rotation else args)],'column':integer(keys['at'],pi) if 'at' in keys else max((g.column for g in existing),default=-1)+1}
    if rotation:values['angleRadians']=float(number(args[0],pi))
    return Gate(**values)


def literal(node):
    try:return ast.literal_eval(node)
    except (ValueError,TypeError,RecursionError):raise SourceError('Use bounded literal strings, booleans and lists of wire/Pauli pairs.',node)


def numeric_keys(keys,pi):
    return {key:number(value,pi) for key,value in keys.items()}


def diagnostics(function,request,key):
    try:return {key:function(request).model_dump(exclude_none=True),'diagnostics':[]}
    except (ValueError,RecursionError) as exc:
        message=exc.errors()[0]['msg'] if hasattr(exc,'errors') else str(exc)
        return {key:None,'diagnostics':[{'line':getattr(exc,'line',1),'column':getattr(exc,'column',1),'message':message}]}
