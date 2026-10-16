def resolved_targets(fault, data_wires, ancillas=None):
    if fault.targets is None:return [fault.qubit]
    mapping=ancillas if ancillas is not None else {a:data_wires+a for a in range(2)}
    return [t.index if t.kind=='data' else mapping[t.index] for t in fault.targets]
