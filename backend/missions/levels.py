"""Authoritative mission fixtures. Each instruction occupies one locked column."""
from copy import deepcopy

CLIFFORD = ['h', 's', 'sdg', 'x', 'y', 'z', 'cx', 'cy', 'cz']
TITLES = ['First contact', 'Crossed signals', 'Echo chamber', 'Interior access',
          'Branching paths', 'Hidden interference', 'Clifford labyrinth',
          'Golden crossing', 'Three phase barriers', 'The final invariant']


def build(number):
    n = 2 if number == 1 else 3 if number <= 7 else 4
    # The excited q1 crossing is a localized relaxation hotspot, as in FS6.
    # Subsequent non-cancelling Clifford instructions spread the check support.
    pairs = [('x', [0]), ('cx', [0, 1]), ('h', [2]), ('s', [1]),
             ('cx', [1, 2]), ('sdg', [0]), ('h', [1]), ('cz', [0, 2]),
             ('s', [2]), ('cy', [2, 0]), ('h', [0]), ('cx', [0, 1]),
             ('sdg', [2]), ('cz', [1, 2]), ('h', [2]), ('cy', [1, 0]),
             ('s', [0]), ('cx', [2, 1]), ('h', [1]), ('cz', [0, 1]),
             ('sdg', [1]), ('cx', [1, 2]), ('h', [0]), ('cy', [0, 2]),
             ('z', [2]), ('s', [1]), ('cx', [2, 0]), ('h', [2])]
    size = 6 + 2 * number
    pairs = pairs[:size]
    if number == 1:
        pairs = [('x',[0]),('cx',[0,1]),('s',[1]),('h',[0]),('cz',[0,1]),('h',[1])]
    if n == 4:
        pairs[3:3] = [('h', [3]), ('cx', [2, 3])]
    prefix = [('h' if j % 2 == 0 else 's', [n-1]) for j in range((number-1)//2)]
    pairs = prefix + pairs
    hotspot = len(prefix)+1
    t_count = {8: 1, 9: 3, 10: 5}.get(number, 0)
    # T gates act on actual involved wires. A localized check can end before
    # them; full-span admissible checks must have I/Z at every T boundary.
    if t_count:
        # X at the relaxation site becomes Z at the first T, then returns to
        # X. A winning reference crosses this barrier instead of avoiding it.
        pairs[hotspot+1:hotspot+1] = [('h',[1]),('t',[1]),('h',[1])]
    for j in range(1,t_count):
        pos = min(len(pairs), hotspot+5+j*4)
        pairs.insert(pos, ('t' if j % 2 == 0 else 'tdg', [j % n]))
    ancillas = 1 if number <= 2 else 2 if number <= 6 else 3
    target = .60  # Replaced by the checked-in calibration below.
    return dict(id=number, title=TITLES[number-1], qubits=n, ancillas=ancillas,
                checkBudget=ancillas, chapter='MANUAL' if number <= 3 else 'ASSISTED',
                subtitle='Close an invariant and protect the noisy crossing.',
                fixed=True, assisted=number >= 4, allowed=CLIFFORD + (['t', 'tdg'] if t_count else []),
                targetScore=target, payload=[dict(id=f'u{i}', name=g, qubits=q, column=i, fixed=True) for i, (g,q) in enumerate(pairs)],
                noise=dict(hotspotColumn=hotspot, qubit=1, timeUs=74.+number*2,
                           t1Us=100., t2Us=200., background=.0005, checkStrength=.025,
                           hardware=dict(enabled=True,bitFlip=.00015,phaseFlip=.00015,depolarizing=.0002,relaxationTimeUs=0.,t1Us=100.,t2Us=200.)),
                protocol='main-missions-v2-all-wire')


LEVELS = [build(i) for i in range(1, 11)]


def get_level(number):
    if not 1 <= number <= 10:
        raise ValueError('Unknown mission.')
    item = deepcopy(LEVELS[number-1])
    # Calibration is a versioned build artifact, never client-supplied.
    from pathlib import Path
    import json
    path = Path(__file__).with_name('references.json')
    if path.exists():
        item['targetScore'] = json.loads(path.read_text(encoding='utf-8'))['levels'][number-1]['target']
    item['overview'] = (f'Protect the noisy crossing while keeping useful shots. You have {item["ancillas"]} fixed ancilla'
                        f'{"s" if item["ancillas"] != 1 else ""}; reach a combined score of {item["targetScore"]:.2f}. '
                        + ('Place both opening and closing checks.' if number <= 3 else 'Place opening checks; closing operators are generated before your final H.'))
    return item
