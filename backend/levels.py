"""Authoritative fixed workloads: players only design spacetime checks.

Rates are synthetic examples, not claimed Heron calibration. Slots use zero-based
columns and half-open check intervals [start, end).
"""
from copy import deepcopy


def gate(name, qubits, column):
    return dict(id=f'{name}-{column}-{qubits[0]}', name=name, qubits=qubits, column=column)


BELL = [gate('h', [0], 0), gate('cx', [0, 1], 1)]
GHZ = BELL + [gate('cx', [1, 2], 2)]
BACKBONE = [gate('h', [0], 0), gate('h', [1], 0), gate('cx', [0, 1], 1),
            gate('h', [2], 1), gate('cz', [1, 2], 2)]
DEEP = BACKBONE + [gate('s', [0], 3), gate('h', [1], 3),
                   gate('cx', [1, 2], 4), gate('h', [2], 5), gate('s', [1], 6)]


def doped(count):
    return deepcopy(BACKBONE) + [gate('t', [i % 3], 4 + i) for i in range(count)]


def level(i, title, subtitle, description, concept, hint, label, n, slots,
          budget, minimum, channel, noise, goal, target, default_start=0, **parameters):
    result = dict(id=i, title=title, subtitle=subtitle, description=description,
        concept=concept, hint=hint, targetLabel=label, qubits=n, slots=slots,
        gateBudget=len(target), checkBudget=budget, minChecks=minimum,
        allowed=sorted({g['name'] for g in target}), channel=channel, noise=noise,
        fidelityGoal=goal, retentionGoal=.40, target=deepcopy(target), starter=deepcopy(target),
        fixed=True, checkMode='manual' if i <= 5 else 'assisted', defaultStart=default_start,
        chapter='FOUNDATIONS' if i <= 5 else 'SPACETIME' if i <= 7 else 'BEYOND CLIFFORD',
        oneQubitNoise=.002, twoQubitNoise=.008, readoutNoise=.005,
        noiseLabel='Synthetic development model')
    result.update(parameters)
    return result


LEVELS = [
 level(1, 'The single-wire barrier', 'Close your first invariant',
       'A fixed X payload carries a fragile one. Choose the opening and closing taps that catch bit flips.',
       'Z and Y checks detect anticommuting X faults. A commuting X check misses them.',
       'Open Z on q0 at boundary 1 and close Z on q0 at boundary 4.',
       '|1>', 1, 4, 1, 1, 'bitflip', .08, .87, [gate('x', [0], 0)], 1),
 level(2, 'Phase interceptor', 'Protect an invisible phase',
       'H then S prepares a fixed phase-sensitive state. Design a check around its memory interval.',
       'Z-basis populations can stay unchanged while dephasing destroys coherence.',
       'Open X on q0 at boundary 2; close X on q0 at boundary 5. Try Y too.',
       '(|0> + i|1>)/sqrt(2)', 1, 5, 1, 1, 'dephasing', .10, .85,
       [gate('h', [0], 0), gate('s', [0], 1)], 2),
 level(3, 'Crossing the bridge', 'Follow a Pauli through CX',
       'A Bell payload is locked in place. Work out which closing taps complete your chosen interval.',
       'Across CX, X on its control spreads to both wires; Z on its control stays localized.',
       'Start after H: Z on q0 from boundary 1 to 4 closes as Z on q0. X needs X on both wires.',
       'Bell pair', 2, 4, 1, 1, 'depolarizing', .04, .76, BELL, 1),
 level(4, 'The closed loop puzzle', 'Match every closing component',
       'The Bell payload now includes S. Match the propagated Pauli product, not just its first wire.',
       'A valid loop satisfies P\u2032 U = U P as an operator identity; signs need a helper phase correction.',
       'A Z check on q0 from boundary 1 to 6 closes as Z on q0. Starting at 0 instead spreads Z into Y0 X1.',
       'S-rotated Bell pair', 2, 6, 1, 1, 'depolarizing', .025, .78,
       BELL + [gate('s', [0], 2)], 1, readoutNoise=.015),
 level(5, 'GHZ entangled fortress', 'Balance spread and overhead',
       'Protect a fixed three-qubit GHZ workload with at most two helpers. Compare localized intervals.',
       'A Z-type check flags X/Y faults, not commuting Z faults. Each extra check also adds noise.',
       'Try Z on q0 from boundary 1 to 6, closing Z on q0. Compare one helper with two staggered checks.',
       'GHZ state', 3, 6, 2, 1, 'depolarizing', .03, .67, GHZ, 1),
 level(6, 'Deep Clifford highway', 'Assisted closing unlocked',
       'Qiskit propagates the closing Pauli automatically. Search for low-weight paths through a deeper workload.',
       'Clifford tableaus map signed Paulis to signed Paulis efficiently; spread costs entangling gates.',
       'Start with Z on q0 over the whole circuit, then shorten the interval and compare overhead.',
       'Deep Clifford reference', 3, 8, 2, 1, 'depolarizing', .02, .62, DEEP),
 level(7, 'The Paulice automaton', 'Compare target order and resources',
       'Design checks around a fixed Clifford workload, then explore Paulice\u2019s automatic choices in Research Lab.',
       'Paulice uses a richer localized-check search. Its observable-specific benchmark has a separate metric.',
       'Try Z on q0 from 0 to 8. In Research Lab compare targets 0,1 with 1,0 at three repetitions.',
       'Clifford benchmark', 3, 8, 2, 1, 'depolarizing', .018, .63, BACKBONE,
       oneQubitNoise=.001, twoQubitNoise=.01, readoutNoise=.015,
       noiseLabel='Synthetic gate/readout example; not calibrated Heron data'),
 level(8, 'A little magic', 'One T gate: find a commuting path',
       'A fixed T on q0 at column 4 tests your propagated Pauli. Green paths commute; red paths need a non-Pauli closure.',
       'At the crossing itself, I/Z commute with T; X/Y become non-Pauli combinations.',
       'Open Z on q0 from boundary 4 to 8. Try X at the same location and inspect the T barrier.',
       'Clifford + 1 T', 3, 8, 2, 1, 'phase', .035, .60, doped(1), 4),
 level(9, 'Narrow passage', 'Two T gates: localize your check',
       'Find diagonal-tail checks or close before the T gates at columns 4 and 5.',
       'The Pauli at each crossing matters; an opening Z can rotate into X earlier in the payload.',
       'Try Z on q0 from 4 to 8, or a shorter interval ending at 4.',
       'Clifford + 2 T', 3, 8, 2, 1, 'depolarizing', .025, .61, doped(2), 4),
 level(10, 'The master spacetime architect', 'Four T gates: optimize throughput',
       'Protect the four-T workload under a declared thermal relaxation model. Compare fidelity, shots, and added cost.',
       'No valid Pauli detector catches every fault. A missed fault need not damage this particular input state.',
       'Try one Z helper on q0 from 4 to 9; compare with two valid helpers and inspect the retained fraction.',
       'Clifford + 4 T', 3, 9, 2, 1, 'thermal', .001, .85, doped(4), 4,
       t1=100000., t2=80000., singleGateNs=50., twoGateNs=300., idleNs=300.,
       noiseLabel='Synthetic thermal model: T1=100 us, T2=80 us')
]


def get_level(identifier):
    if not 1 <= identifier <= len(LEVELS):
        raise ValueError('Unknown mission.')
    return deepcopy(LEVELS[identifier-1])
