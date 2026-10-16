"""Notebook orchestration and figures, delegating all physics to project code.

The drawing adapters add labels/barriers for readability; they never score a
circuit. No channel evolution, check validation, optimizer or decoder is copied.
"""
from copy import deepcopy
import html
import io
import json
from pathlib import Path
import warnings

from IPython.display import HTML, Image, display
import matplotlib.pyplot as plt
import numpy as np
from qiskit import QuantumCircuit, QuantumRegister, ClassicalRegister
from qiskit.quantum_info import Pauli

from backend.learning.common import append_instruction
from backend.noise_lab.models import LabRunRequest
from backend.noise_lab.simulator import run_lab
from backend.protection_lab.models import ProtectionRequest
from backend.protection_lab.service import run as protection_run, generated, pieces
from backend.timeline_lab.models import Draft as TutorialDraft, fixed_payload
from backend.timeline_lab import service as timeline
from backend.timeline_lab.capstone_examples import example
from backend.missions.models import Draft as MissionDraft
from backend.missions.levels import get_level
from backend.missions import service as missions
from backend.quantum_core.pauli import opening_factor, propagate
from backend.quantum_core.paulice import optimize_clifford

ROOT = Path(__file__).resolve().parents[1]
TUTORIALS = json.loads((ROOT / 'backend/reference_solutions/tutorials.json').read_text(encoding='utf-8'))['flightSchools']
REFERENCES = json.loads((ROOT / 'backend/missions/references.json').read_text(encoding='utf-8'))
SEED = TUTORIALS[0]['request']['sampleSeed']
SHOTS = TUTORIALS[0]['request']['shots']
STRATEGIES = ('baseline', 'everywhere', 'reasonable', 'optimal', 'misplaced', 'tooSmall', 'overchecked')
STYLE = {'fontsize': 9, 'subfontsize': 7, 'backgroundcolor': '#ffffff'}


def table(rows):
    """Compact, escaped rich output; all table values are caller-computed."""
    if not rows:
        display(HTML('<p>No rows.</p>'))
        return
    def fmt(value):
        if value is None:
            return '—'
        if isinstance(value, float):
            return f'{value:.6g}'
        if isinstance(value, (dict, list, tuple)):
            return json.dumps(value, ensure_ascii=False)
        return str(value)
    headers = list(rows[0])
    head = ''.join(f'<th>{html.escape(str(k))}</th>' for k in headers)
    def render(key, value):
        if key == 'connector' and value in ('GREEN', 'RED'):
            color = '#18794e' if value == 'GREEN' else '#b42318'
            return f'<b style="color:{color}">{value}</b>'
        return html.escape(fmt(value))
    body = ''.join('<tr>' + ''.join(f'<td>{render(k, row.get(k))}</td>' for k in headers) + '</tr>' for row in rows)
    display(HTML('<div style="overflow-x:auto"><table><thead><tr>' + head +
                 '</tr></thead><tbody>' + body + '</tbody></table></div>'))


def figure(fig):
    """Embed compressed PNG bytes, without machine-specific image paths."""
    output = io.BytesIO()
    fig.savefig(output, format='png', dpi=85, bbox_inches='tight',
                pil_kwargs={'optimize': True, 'compress_level': 9})
    titles = ([fig._suptitle.get_text()] if fig._suptitle else []) + [ax.get_title() for ax in fig.axes if ax.get_title()]
    display(Image(data=output.getvalue(), metadata={'alt': '; '.join(titles) or 'Quantum Shield computed analysis figure'}))
    plt.close(fig)


def draw(qc, title):
    fig = qc.draw('mpl', style=STYLE, fold=28, idle_wires=True)
    fig.suptitle(title, fontsize=11, y=1.02)
    figure(fig)


def panels(circuits):
    fig, axes = plt.subplots(len(circuits), 1, figsize=(12, sum(max(2, c.num_qubits * .55) for _, c in circuits)))
    for ax, (title, circuit) in zip(np.atleast_1d(axes), circuits):
        circuit.draw('mpl', ax=ax, style=STYLE, fold=-1, idle_wires=True)
        ax.set_title(title, fontsize=10)
    fig.tight_layout()
    figure(fig)


def circuit_picture(items, data, ancillas=0, *, bands=None):
    """Render real operation records, with terminal readout and band labels.

    Hardware-noise channels are omitted only from circuit pictures; the real
    execution functions receive every channel. Explicit error blocks may still
    be drawn. Conditional recovery is taken from the service's own schedule.
    """
    q = QuantumRegister(data, 'q')
    registers = [q]
    if ancillas:
        registers += [QuantumRegister(ancillas, 'a')]
    registers += [ClassicalRegister(max(1, data + ancillas), 'm')]
    qc = QuantumCircuit(*registers)
    last_band = None
    for item in items:
        if item['name'] == 'noise':
            continue
        column = str(item.get('column', ''))
        if bands and column.startswith('b'):
            boundary = column[1:].split('s')[0]
            if boundary != last_band:
                qc.barrier(label=f'b{boundary}: {bands.get(boundary, 0)} slots')
                last_band = boundary
        if item['name'] in ('m', 'measure'):
            qc.measure(item['qubits'][0], item.get('bit', item['qubits'][0]))
        elif item['name'] == 'recovery':
            with qc.if_test((qc.cregs[0], item['condition'])):
                qc.x(item['qubits'][0])
        else:
            append_instruction(qc, item)
            if item.get('owner') == 'generated-method':
                last = qc.data[-1]
                labeled = last.operation.to_mutable()
                labeled.label = "auto P'"
                qc.data[-1] = last.replace(operation=labeled)
    return qc


def tutorial_picture(draft):
    # schedule(noise=False) still preserves authored test faults; it omits only
    # automatically applied hardware/check-overhead channels.
    return circuit_picture(timeline.schedule(draft, noise=False), draft.dataQubits, draft.ancillas)


def noise_school():
    reference = LabRunRequest.model_validate(TUTORIALS[0]['request'])
    result = run_lab(reference)
    # The drawing record is the service's actual error operator; no simulation
    # is performed in this drawing adapter.
    picture = [dict(name={'bit_flip': 'x', 'phase_flip': 'z'}.get(g.name, g.name), qubits=g.qubits)
               for g in reference.circuit.operations]
    draw(circuit_picture(picture, reference.circuit.qubits), 'FS1 stored reference: actual authored operations')
    rows = []
    scenarios = [('stored X error', reference)]
    for basis in ('Z', 'X'):
        raw = reference.model_dump()
        raw['basis'] = basis
        raw['circuit']['operations'] = [dict(id='prep', role='prepare', name='h', qubits=[0], column=0),
                                         dict(id='fault', role='error', name='phase_flip', qubits=[0], column=1)]
        scenarios.append((f'Z error on plus / {basis} readout', LabRunRequest.model_validate(raw)))
    decay = []
    for elapsed in (0., 20., 60., 120.):
        raw = reference.model_dump()
        raw['circuit']['operations'] = [dict(id='prep', role='prepare', name='h', qubits=[0], column=0),
            dict(id='wait', role='error', name='decoherence', qubits=[0], column=1,
                 timeUs=elapsed, t1Us=100., t2Us=80.)]
        request = LabRunRequest.model_validate(raw)
        output = run_lab(request)
        decay.append((elapsed, output['fidelity'], output['states'][1]['globalPurity']))
        scenarios.append((f'wait {elapsed:g} us (T1=100, T2=80)', request))
    for name, request in scenarios:
        out = run_lab(request)
        rows.append(dict(experiment=name, basis=out['basis'], fidelity=out['fidelity'],
                         idealProbabilities=out['states'][0]['probabilities'],
                         noisyProbabilities=out['states'][1]['probabilities'],
                         counts=out['states'][1]['counts']))
    table(rows)
    fig, ax = plt.subplots(figsize=(7, 2.5))
    for index, label in ((1, 'Fidelity to intended plus'), (2, 'Output purity')):
        ax.plot([x[0] for x in decay], [x[index] for x in decay], 'o-', label=label)
    ax.set(xlabel='Elapsed time (us)', ylabel='Exact state metric', ylim=(0, 1.05))
    ax.legend(); figure(fig)
    return unscored_row(1, reference.circuit.qubits, 0, result['fidelity'])


def protection_school():
    ref = TUTORIALS[1]
    rows = []
    pictures = []
    first_request = ProtectionRequest(experiment=ref['experiment'], technique=ref['methods'][0], sampleSeed=SEED, shotsPerVariant=SHOTS)
    base_a, base_b = pieces(first_request)
    base_picture = circuit_picture(base_a+base_b, first_request.experiment.qubits)
    for enabled in (False, True):
        for method in ref['methods']:
            experiment = deepcopy(ref['experiment'])
            experiment['hardware']['enabled'] = enabled
            request = ProtectionRequest(experiment=experiment, technique=method, sampleSeed=SEED, shotsPerVariant=SHOTS)
            result = protection_run(request)
            output = result['output']
            rows.append(dict(hardware=enabled, method=method, idealE=result['ideal']['expectation'],
                             noisyE=result['baseline']['expectation'],
                             finalE=result.get('exactFitEstimate') if output is None else output['expectation'],
                             sampledE=result.get('estimate') if output is None else output['sampledExpectation'],
                             stateFidelity=output['fidelity'] if output else None,
                             kept=result.get('retention'), physicalQubits=result['resources']['peakQubits'],
                             methodShots=result['resources']['methodShots']))
            if enabled and method in ('detection', 'correction'):
                variants, width, _, _ = generated(request)
                items = next(iter(variants.values()))
                pictures.append((method.title() + ' execution gates (hardware channels omitted from drawing)',
                                 circuit_picture(items, experiment['qubits'], width-experiment['qubits'])))
    table(rows)
    panels([('FS2 authored base (without method shell)', base_picture), pictures[0]])
    panels(pictures[1:])
    table([dict(hardware=ref['experiment']['hardware'], completion=ref['criteria'],
                interpretation='Mitigation estimates E, not a repaired quantum state; compare E, not fabricated mitigation state fidelity.')])
    return unscored_row(2, ref['qubits'], 'method-dependent', None)


def unscored_row(number, data, ancillas, demonstration):
    return dict(level=f'FS{number}', data=data, ancillas=ancillas, tCount=0,minimumKept=None,
                baseline=None, everywhere=None, reasonable=None, optimal=None,
                target=None, spread=None, completion=TUTORIALS[number-1]['criteria'],
                demonstratedFidelity=demonstration)


def trace_tutorial(draft, *, axis=None):
    """Call the shared core for each payload gate; no conjugation rules copied."""
    n = draft.dataQubits
    bounds = timeline.payload_bounds(draft, timeline.operations(draft))
    opening = [g for g in draft.operations if g.name in timeline.CP and g.column < bounds[0]]
    frame = Pauli('I' * n)
    if axis:
        frame = opening_factor(n, opening[0].qubits[1], axis)
    else:
        for gate in sorted(opening, key=lambda g: (g.column, g.id)):
            frame = frame.compose(opening_factor(n, gate.qubits[1], gate.name[1:]))
    rows = [dict(step='Opening', operator=frame.to_label(), status='Pauli')]
    for gate in fixed_payload(draft.lesson):
        try:
            frame = propagate(frame, gate.name, gate.qubits, n)
            rows.append(dict(step=f'{gate.name.upper()}{gate.qubits}', operator=frame.to_label(), status='Pauli'))
        except ValueError as exc:
            rows.append(dict(step=f'{gate.name.upper()}{gate.qubits}', operator=None, status=str(exc)))
            break
    return rows


def check_school(number):
    ref = TutorialDraft.model_validate(TUTORIALS[number-1]['draft'])
    validation = timeline.validation(ref)
    assert validation['valid']
    panels([('Locked data payload', timeline.circuit(fixed_payload(number), ref.dataQubits)),
            ('Stored reference shell; M is terminal readout', tutorial_picture(ref))])
    table(trace_tutorial(ref))
    clean = ref.model_copy(update={'operations': [g for g in ref.operations if g.name not in timeline.FAULTS]})
    trials = [('stored reference', ref), ('without explicit fault', clean)]
    bound = max(g.column for g in fixed_payload(number))
    if number == 4:
        closing = [g for g in ref.operations if g.name in timeline.CP and g.column > bound]
        bad = ref.model_copy(update={'operations': [g for g in ref.operations if g.id != closing[-1].id]})
        trials.append(('incomplete single-wire closing', bad))
    else:
        for name in (('cx', 'cy') if number == 5 else ('cx',)):
            changed = []
            for gate in clean.operations:
                change = gate.name in timeline.CP and (number == 5 or gate.column > bound)
                changed.append(gate.model_copy(update={'name': name}) if change else gate)
            trials.append((f'incorrect {name.upper()} check', clean.model_copy(update={'operations': changed})))
    rows = []
    for name, draft in trials:
        result = timeline.validation(draft)
        if name.startswith(('incorrect', 'incomplete')):
            assert not result['valid']
        measured = timeline.evaluate(draft, shots=SHOTS, seed=SEED, visuals=True) if result['valid'] else None
        rows.append(dict(case=name, valid=result['valid'], connector='GREEN' if result['valid'] else 'RED',
                         nonPauli=any(c['nonPauli'] for c in result['checks']),
                         syndromeCounts=measured['syndromeCounts'] if measured else None,
                         explanation='; '.join(c['message'] for c in result['checks'])))
    table(rows)
    color = '#18794e' if validation['valid'] else '#b42318'
    display(HTML(f'<p style="color:{color}"><b>GREEN — real validator: valid={validation["valid"]}</b></p>'))
    row = unscored_row(number, ref.dataQubits, ref.ancillas, None)
    row['tCount'] = sum(g.name in ('t', 'tdg') for g in fixed_payload(number))
    if number == 5:
        table(trace_tutorial(ref, axis='X') + trace_tutorial(ref, axis='Y'))
    return row


def capstone():
    draft = example('sensible')
    comparison = timeline.comparison(json.dumps(draft.hardware.model_dump(), sort_keys=True))
    drafts = {'baseline': example('unchecked'), 'everywhere': example('everywhere'),
              'reasonable': draft, 'optimal': TutorialDraft.model_validate(comparison['best']['draft'])}
    rows = []
    for name, sample in drafts.items():
        repeats = [timeline.evaluate(sample, visuals=False) for _ in range(3)]
        result = repeats[0]
        rows.append(dict(strategy=name, fidelity=result['fidelity'], kept=result['retention'],
                         score=result['score'], correct_shot_yield=result['correct_shot_yield'],minimumKept=result['minimumKept'],target=result['qualificationThreshold'],
                         spread=max(r['score'] for r in repeats)-min(r['score'] for r in repeats),
                         valid=timeline.validation(sample)['valid']))
    target = rows[2]['target']
    assert max(rows[0]['score'], rows[1]['score']) < target < rows[2]['score'] < rows[3]['score']
    panels([('FS6 locked payload', timeline.circuit(fixed_payload(6), draft.dataQubits)),
            ('Reasonable single-helper reference', tutorial_picture(draft))])
    table(rows)
    extra=json.loads((ROOT/'backend/reference_solutions/capstone.json').read_text())
    table([dict(strategy=k,**timeline.evaluate(TutorialDraft.model_validate(extra[k+'Draft']),visuals=False)) for k in ('misplaced','tooSmall','overchecked')])
    score_plot(rows, target, 'FS6: Trusted Fidelity and qualification target')
    with warnings.catch_warnings(record=True) as caught:
        native = timeline.paulice_search(json.dumps(draft.hardware.model_dump(), sort_keys=True))
    print('Game reference search:', comparison['scope'], 'Candidates:', comparison['candidates'])
    print('Separate native Paulice gamma:', native['nativeCost'], 'added helpers:', native['addedAncillas'])
    return dict(level='FS6', data=draft.dataQubits, ancillas=draft.ancillas, tCount=0,minimumKept=timeline.CAPSTONE_MINIMUM_KEPT,
                **{r['strategy']: r['score'] for r in rows}, target=target,
                spread=max(r['spread'] for r in rows), completion=TUTORIALS[5]['criteria'], demonstratedFidelity=None)


def score_plot(rows, target, title):
    fig, ax = plt.subplots(figsize=(7, 2.6))
    ax.bar([r['strategy'] for r in rows], [r['score'] for r in rows], color=['#94a3b8', '#d8a078', '#52a990', '#5b85ba'])
    ax.axhline(target, color='#b42318', ls='--', label=f'Target {target:.2f}')
    ax.set(title=title, ylabel='Trusted Fidelity', ylim=(0, 1))
    ax.legend(); figure(fig)


def main_level(number, cache):
    level = get_level(number)
    stored = REFERENCES['levels'][number-1]
    search = next(row for row in cache['results'] if row['level'] == number)
    assert search['result']['best']['draft'] == stored['optimalDraft']
    assert not search['result']['pauliceUsed']
    results = []
    for name in STRATEGIES:
        draft = MissionDraft.model_validate(stored[name+'Draft'])
        repeats = []
        for _ in range(3):
            missions._run.cache_clear()
            repeats.append(missions._run(draft.model_dump_json()))
        result = repeats[0]
        check = missions.validate(draft)
        spread = max(r['combinedScore'] for r in repeats)-min(r['combinedScore'] for r in repeats)
        assert abs(result['combinedScore']-stored[name]) <= stored['spread']+1e-9
        assert result['passed'] == (name!='baseline' and stored[name]>=stored['target'])
        results.append(dict(strategy=name, fidelity=result['fidelity'], kept=result['retention'],
                            score=result['combinedScore'], correct_shot_yield=result['correct_shot_yield'],minimumKept=result['minimumKept'],target=result['target'], spread=spread,
                            valid=check['valid'], passed=result['passed'], checkLoops=len(check['checks']),
                            controlledPaulis=sum(g['owner'] != 'fixed-fixture' and g['name'] in ('cx','cy','cz') for g in check['operations'])))
    reasonable = MissionDraft.model_validate(stored['reasonableDraft'])
    check = missions.validate(reasonable)
    draw(missions.qc_for(missions.payload(level), level['qubits']), f'Main {number}: {level["title"]} — locked payload')
    draw(circuit_picture(check['operations'], level['qubits'], level['ancillas'], bands=reasonable.bands),
         'Reasonable reference; barriers label inserted bands, auto P′ is locked (hardware channels omitted)')
    table(results)
    print('Data:',level['qubits'],'Fixed helpers:',level['ancillas'],
          'T/Tdg:',sum(g['name'] in ('t','tdg') for g in level['payload']),
          'Payload gates:',len(level['payload']),'Depth:',missions.qc_for(missions.payload(level),level['qubits']).depth())
    print('Noise:',json.dumps(level['noise'],sort_keys=True))
    print('Inserted editable bands:',json.dumps(reasonable.bands,sort_keys=True))
    print('Real dynamic endpoints:',json.dumps([{k:loop[k] for k in ('ancilla','opening','closing','valid')} for loop in check['checks']]))
    if level['assisted']:
        print('Locked auto P′:',json.dumps([dict(operator=g['name'], wires=g['qubits'], location=g['column'], locked=g['owner']=='generated-method')
               for g in check['generated']]))
    if number <= 7:
        qc = missions.qc_for(missions.payload(level), level['qubits'])
        qc.measure_all()
        with warnings.catch_warnings(record=True) as caught:
            native = optimize_clifford(qc, list(range(min(level['ancillas'], level['qubits']))), level['ancillas'])
        print('Separate native Paulice gamma:',float(native.cost),'added helpers:',native.circuit.num_qubits-level['qubits'])
    print('Search:',search['result']['kind'],'candidates:',search['result']['candidateCount'],
          'best opening:',search['result']['best']['label'],
          'interval:',(search['result']['best']['start'],search['result']['best']['end']),
          'cached search seconds:',round(search['seconds'],3))
    print('Scope:',search['result']['scope'])
    print('Scorer: Aer density_matrix;', 'statevector ideal; no Paulice' if number>=8 else 'stabilizer ideal')
    row = dict(level=f'Main{number}', data=level['qubits'], ancillas=level['ancillas'],minimumKept=level['minimumKept'],
               tCount=sum(g['name'] in ('t','tdg') for g in level['payload']),
               **{r['strategy']: r['score'] for r in results}, target=level['targetScore'],
               spread=max(r['spread'] for r in results), completion='Score target with a valid invariant', demonstratedFidelity=None)
    return row, results


def cross_level(summary, strategy_rows):
    table(summary)
    scored = [r for r in summary if r['target'] is not None]
    fig, axes = plt.subplots(1, 2, figsize=(12, 3))
    x = np.arange(len(scored))
    for key, label in [('baseline', 'No checks'), ('reasonable', 'Reasonable'), ('optimal', 'Best in family'), ('target', 'Target')]:
        axes[0].plot(x, [r[key] for r in scored], 'o-', label=label)
    axes[0].set_xticks(x, [r['level'] for r in scored], rotation=45)
    axes[0].set(ylabel='Trusted Fidelity', title='Exact validation scores'); axes[0].legend(fontsize=8)
    positions = [(r['target']-r['baseline'])/(r['optimal']-r['baseline']) for r in scored]
    axes[1].bar(x, positions)
    axes[1].set_xticks(x, [r['level'] for r in scored], rotation=45)
    axes[1].set(ylabel='(target − baseline)/(best − baseline)', ylim=(0,1), title='Target position (descriptive, not recalibration)')
    fig.tight_layout(); figure(fig)
    fig, axes = plt.subplots(1, 3, figsize=(13, 3))
    for ax, number in zip(axes, (3, 7, 10)):
        rows = strategy_rows[number]
        for key, marker, label in [('fidelity','o','Postselected fidelity'), ('kept','s','Kept fraction'), ('score','^','Trusted Fidelity')]:
            ax.scatter([r['checkLoops'] for r in rows], [r[key] for r in rows], marker=marker, label=label)
        for r in rows:
            ax.annotate(r['strategy'], (r['checkLoops'],r['score']), fontsize=7, xytext=(3,-10), textcoords='offset points')
        ax.set(title=f'Main {number}', xlabel='Measured helper check loops', ylim=(0,1.05))
    axes[0].legend(fontsize=7); fig.tight_layout(); figure(fig)
    difficulty = [dict(level='FS6', depth=timeline.circuit(fixed_payload(6),2).depth(), gates=len(fixed_payload(6)), data=2, tCount=0)]
    for number in range(1,11):
        level = get_level(number)
        difficulty.append(dict(level=f'Main{number}', depth=missions.qc_for(missions.payload(level),level['qubits']).depth(),
                               gates=len(level['payload']), data=level['qubits'], tCount=sum(g['name'] in ('t','tdg') for g in level['payload'])))
    fig, axes = plt.subplots(1,2,figsize=(12,3))
    for key in ('depth','gates'):
        axes[0].plot([r['level'] for r in difficulty],[r[key] for r in difficulty],'o-',label=key)
    for key in ('data','tCount'):
        axes[1].plot([r['level'] for r in difficulty],[r[key] for r in difficulty],'o-',label=key)
    for ax in axes:
        ax.tick_params(axis='x',rotation=45); ax.legend(); ax.set_title('Structural difficulty proxies, not a measured human difficulty scale')
    fig.tight_layout(); figure(fig)
    return difficulty
