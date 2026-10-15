"""Parse a tiny declared API. Submitted text is never compiled or executed."""
import ast
import math
from pydantic import ValidationError
from .models import Circuit, CompileRequest, Operation


class SourceError(ValueError):
    def __init__(self, message, node=None):
        super().__init__(message)
        self.line = getattr(node, 'lineno', 1)
        self.column = getattr(node, 'col_offset', 0) + 1


def number(node, pi_allowed):
    if isinstance(node, ast.Constant) and type(node.value) in (int, float):
        value = node.value
    elif isinstance(node, ast.Name) and node.id == 'pi' and pi_allowed:
        value = math.pi
    elif isinstance(node, ast.UnaryOp) and isinstance(node.op, (ast.UAdd, ast.USub)):
        value = number(node.operand, pi_allowed) * (-1 if isinstance(node.op, ast.USub) else 1)
    elif isinstance(node, ast.BinOp) and isinstance(node.op, (ast.Add, ast.Sub, ast.Mult, ast.Div)):
        a, b = number(node.left, pi_allowed), number(node.right, pi_allowed)
        if isinstance(node.op, ast.Add): value = a+b
        elif isinstance(node.op, ast.Sub): value = a-b
        elif isinstance(node.op, ast.Mult): value = a*b
        else:
            if b == 0: raise SourceError('Division by zero.', node)
            value = a/b
    else:
        raise SourceError('Use numeric literals and bounded +, −, *, / arithmetic (optionally pi).', node)
    if not math.isfinite(value) or abs(value) > 1_000_000:
        raise SourceError('Numeric expression is too large or not finite.', node)
    return value


def integer(node, pi_allowed):
    value = number(node, pi_allowed)
    if int(value) != value:
        raise SourceError('Wire indices, columns, and qubit count must be integers.', node)
    return int(value)


def parse(request: CompileRequest):
    source = request.code
    if len(source.encode('utf-8')) > 8192 or len(source.splitlines()) > 128:
        raise SourceError('Source is limited to 8 KiB and 128 lines.')
    try:
        tree = ast.parse(source)
    except (SyntaxError, RecursionError) as exc:
        err = SourceError(getattr(exc, 'msg', 'Source nesting is too deep.'))
        err.line, err.column = getattr(exc, 'lineno', 1) or 1, getattr(exc, 'offset', 1) or 1
        raise err from exc
    if sum(1 for _ in ast.walk(tree)) > 2048:
        raise SourceError('Source is too complex (maximum 2,048 syntax nodes).')
    declared = False
    pi_allowed = False
    circuit = None
    operations = []
    for node in tree.body:
        if isinstance(node, ast.ImportFrom):
            names = [(n.name, n.asname) for n in node.names]
            if node.level == 0 and node.module == 'quantum_shield' and names == [('TutorialCircuit', None)] and circuit is None:
                declared = True
                continue
            if node.level == 0 and node.module == 'math' and names == [('pi', None)] and circuit is None:
                pi_allowed = True
                continue
            raise SourceError('Only TutorialCircuit and optional math.pi declarations are supported.', node)
        if isinstance(node, ast.Assign) and circuit is None and declared:
            call = node.value
            if len(node.targets) != 1 or not isinstance(node.targets[0], ast.Name) or node.targets[0].id != 'qc' or not isinstance(call, ast.Call) or not isinstance(call.func, ast.Name) or call.func.id != 'TutorialCircuit' or len(call.args) != 1 or call.keywords:
                raise SourceError('Start with qc = TutorialCircuit(1), using 1–5 wires.', node)
            circuit = integer(call.args[0], pi_allowed)
            continue
        if not isinstance(node, ast.Expr) or not isinstance(node.value, ast.Call) or circuit is None:
            raise SourceError('Only qc gate/error calls are supported after the circuit declaration.', node)
        call = node.value
        if not isinstance(call.func, ast.Attribute) or not isinstance(call.func.value, ast.Name) or call.func.value.id != 'qc':
            raise SourceError('Use a supported qc method; dynamic calls and attribute chains are not allowed.', node)
        name = call.func.attr
        expected = 2 if name in ('cx', 'rx', 'ry', 'rz') else 1
        allowed = {'h','x','y','z','s','sdg','rx','ry','rz','cx','bit_flip','phase_flip','decoherence'}
        if name not in allowed or len(call.args) != expected:
            raise SourceError('Unknown method or wrong number of positional arguments.', node)
        keywords = {}
        for kw in call.keywords:
            if kw.arg is None or kw.arg in keywords or kw.arg not in ({'at','time_us','t1_us','t2_us'} if name == 'decoherence' else {'at'}):
                raise SourceError('Unsupported or repeated keyword argument.', node)
            keywords[kw.arg] = kw.value
        column = integer(keywords['at'], pi_allowed) if 'at' in keywords else max((op.column for op in operations), default=-1)+1
        rotation = name in ('rx','ry','rz')
        if name=='decoherence' and isinstance(call.args[0],(ast.List,ast.Tuple)):
            qubits=[integer(arg,pi_allowed) for arg in call.args[0].elts]
        else:
            qubits = [integer(arg, pi_allowed) for arg in (call.args[1:] if rotation else call.args)]
        values = dict(id=f'code-{len(operations)}', role='error' if name in ('bit_flip','phase_flip','decoherence') else 'prepare', name=name, qubits=qubits, column=column)
        if rotation: values['angleRadians'] = float(number(call.args[0], pi_allowed))
        if name == 'decoherence':
            for key, field, default in [('time_us','timeUs',50),('t1_us','t1Us',100),('t2_us','t2Us',80)]:
                values[field] = float(number(keywords[key], pi_allowed)) if key in keywords else float(default)
        try:
            operations.append(Operation(**values))
            Circuit(qubits=circuit, combineErrors=request.combineErrors, operations=operations)
        except ValidationError as exc:
            raise SourceError(exc.errors()[0]['msg'], node) from exc
    if circuit is None:
        raise SourceError('Declare from quantum_shield import TutorialCircuit, then qc = TutorialCircuit(n).')
    try:
        return Circuit(qubits=circuit, combineErrors=request.combineErrors, operations=operations)
    except ValidationError as exc:
        raise SourceError(exc.errors()[0]['msg']) from exc


def compile_source(request: CompileRequest):
    try:
        return {'circuit': parse(request).model_dump(exclude_none=True), 'diagnostics': []}
    except (SourceError, RecursionError) as exc:
        return {'circuit': None, 'diagnostics': [{'line': getattr(exc, 'line', 1), 'column': getattr(exc, 'column', 1), 'message': str(exc)}]}
