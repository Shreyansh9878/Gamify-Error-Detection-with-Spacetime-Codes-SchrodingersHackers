"""Build submission figures and numeric tables from stored simulation evidence."""
import json
from pathlib import Path
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'submission'


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    figures = OUT / 'figures'
    figures.mkdir(exist_ok=True)
    missions = json.loads((ROOT / 'backend/missions/references.json').read_text(encoding='utf-8'))['levels']
    capstone = json.loads((ROOT / 'backend/reference_solutions/capstone.json').read_text(encoding='utf-8'))
    tutorial = json.loads((ROOT / 'backend/reference_solutions/tutorials.json').read_text(encoding='utf-8'))['flightSchools'][-1]
    capstone.update(id='FS6', **{k: tutorial[k] for k in ('qubits', 'ancillas', 'tCount')})
    levels = [capstone] + missions
    study = json.loads((ROOT / 'docs/TRACK_EXPERIMENTS.json').read_text(encoding='utf-8'))
    matched = []
    for repetitions in (1, 3):
        for count in (0, 1, 2, 4):
            rows = [r for r in study['rows'] if r['repetitions'] == repetitions and r['tCount'] == count]
            baseline = next(r for r in rows if r['method'] == 'unchecked')
            checks = [r for r in rows if r['method'] != 'unchecked']
            best = max(checks, key=lambda r: r['correct_shot_yield']) if checks else None
            matched.append(dict(repetitions=repetitions, tCount=count, validChecks=len(checks),
                                baseline=baseline, bestChecked=best))
    labels = ['FS6'] + [f'M{i}' for i in range(1, 11)]
    fig, ax = plt.subplots(figsize=(9, 3.6), constrained_layout=True)
    colors = ['#94a3b8', '#e69f00', '#0072b2', '#009e73']
    for offset, (key, label), color in zip((-.27, -.09, .09, .27),
        [('baseline', 'No checks'), ('everywhere', 'Blanket'), ('reasonable', 'Reasonable'), ('optimal', 'Best found')], colors):
        ax.bar([i + offset for i in range(len(levels))], [r[key] for r in levels], .18, label=label, color=color)
    ax.plot(range(len(levels)), [r['target'] for r in levels], 'ko--', markersize=3, label='Target')
    ax.set(xticks=range(len(levels)), xticklabels=labels, ylabel='Trusted Fidelity', ylim=(0, 1))
    ax.grid(axis='y', alpha=.2)
    ax.legend(ncol=5, fontsize=8, loc='upper center', frameon=False)
    fig.savefig(figures / 'level_scores.png', dpi=170)
    plt.close(fig)
    fig, axes = plt.subplots(1, 2, figsize=(9, 3.5), constrained_layout=True, sharey=True)
    for ax, repetitions in zip(axes, (1, 3)):
        rows = [r for r in matched if r['repetitions'] == repetitions]
        xs = [r['tCount'] for r in rows]
        for key, label, color in [('fidelity', 'Kept-shot fidelity', '#0072b2'),
                                  ('retention', 'Kept fraction', '#009e73'),
                                  ('correct_shot_yield', 'Correct-shot yield', '#d55e00')]:
            ys = [r['bestChecked'][key] if r['bestChecked'] else float('nan') for r in rows]
            ax.plot(xs, ys, 'o-', label=label, color=color)
        ax.plot(xs, [r['baseline']['fidelity'] for r in rows], 'k--', label='Unchecked fidelity')
        ax.set(title=f'{repetitions} backbone repetition(s)', xlabel='T gates', xticks=(0, 1, 2, 4), ylim=(0, 1))
        ax.grid(alpha=.2)
        if repetitions == 1:
            ax.annotate('No valid checked candidate', xy=(4, .42), xytext=(.8, .34), fontsize=8,
                        arrowprops=dict(arrowstyle='->', color='#666666'))
    axes[0].set_ylabel('Exact state metric')
    axes[1].legend(fontsize=7, loc='lower left', frameon=False)
    fig.savefig(figures / 'matched_study.png', dpi=170)
    plt.close(fig)
    fields = ('id', 'qubits', 'ancillas', 'tCount', 'minimumKept', 'baseline', 'everywhere', 'reasonable', 'optimal', 'target', 'spread', 'metrics')
    fig, ax = plt.subplots(figsize=(6.5, 2.15), constrained_layout=True)
    ax.set(xlim=(0, 6.5), ylim=(0, 2.2))
    ax.axis('off')
    nodes = ['Player edit\nvisual or safe code', 'Typed circuit draft\nReact and TypeScript',
             'Same-origin JSON\nFastAPI validation', 'Invariant check\nsigned auto closing',
             'Qiskit reference\nAer noisy evolution', 'All-zero syndrome\nF_ps and S_keep',
             'Trusted Fidelity\nshot budget and target', 'Outcome and progress\nbrowser localStorage']
    positions = [(x, 1.65) for x in (.8, 2.4, 4., 5.6)] + [(x, .5) for x in (5.6, 4., 2.4, .8)]
    for text, (x, y) in zip(nodes, positions):
        ax.text(x, y, text, ha='center', va='center', fontsize=7.5,
                bbox=dict(boxstyle='square,pad=.5', facecolor='#f1f5f9', edgecolor='#64748b'))
    for (x, y), (nx, ny) in zip(positions, positions[1:]):
        ax.annotate('', xy=(nx - .75 * (nx > x) + .75 * (nx < x), ny + .32 * (ny < y)),
                    xytext=(x + .75 * (nx > x) - .75 * (nx < x), y - .32 * (ny < y)),
                    arrowprops=dict(arrowstyle='->', color='#334155'))
    fig.savefig(figures / 'architecture.png', dpi=200)
    plt.close(fig)
    result = dict(levels=[{k: r[k] for k in fields} for r in levels], matched=matched, studyRows=len(study['rows']),
                  sources=['backend/missions/references.json', 'backend/reference_solutions/capstone.json',
                           'docs/TRACK_EXPERIMENTS.json'],
                  selection='Best valid checked candidate by correct_shot_yield, excluding unchecked; no game budget in matched study.')
    (OUT / 'results.json').write_text(json.dumps(result, indent=2) + '\n', encoding='utf-8')
    print(f'Created figures and tables from {len(levels)} scored levels and {len(matched)} matched settings.')


if __name__ == '__main__':
    main()
