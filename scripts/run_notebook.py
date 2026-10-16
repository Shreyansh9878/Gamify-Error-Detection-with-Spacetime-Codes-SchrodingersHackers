"""Execute the trusted level-analysis notebook in a real Jupyter kernel.

Install notebooks/requirements.txt in an isolated environment first. A temporary
kernel spec points at this interpreter, without installing a global kernel.
Outputs are saved only after every cell and score comparison passes.
"""
import argparse
import hashlib
from contextlib import contextmanager
import json
import math
import os
from pathlib import Path
import sys
import tempfile
import time

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
NOTEBOOK = ROOT / 'notebooks/level_design_and_validation.ipynb'


def analysis_inputs():
    notebook = json.loads(NOTEBOOK.read_text(encoding='utf-8'))
    sources = [''.join(c['source']) for c in notebook['cells']]
    result = {'notebookSources': hashlib.sha256(json.dumps(sources).encode()).hexdigest()}
    for name in ('scripts/level_design_analysis.py', 'scripts/cache_level_searches.py', 'scripts/run_notebook.py',
                 'notebooks/requirements.txt', 'notebooks/data/level_search_results.json'):
        result[name] = hashlib.sha256((ROOT / name).read_text(encoding='utf-8').encode('utf-8')).hexdigest()
    return result


def expected_scores():
    refs = json.loads((ROOT / 'backend/missions/references.json').read_text(encoding='utf-8'))
    capstone = json.loads((ROOT / 'docs/CAPSTONE_DIFFICULTY_VERIFICATION.json').read_text(encoding='utf-8'))
    fs6 = capstone['results']
    tutorial = json.loads((ROOT / 'backend/reference_solutions/tutorials.json').read_text(encoding='utf-8'))['flightSchools'][-1]
    result = {'FS6': dict(baseline=fs6['unchecked']['score'], everywhere=fs6['everywhere']['score'],
                          reasonable=fs6['sensible']['score'], optimal=capstone['exactReferenceMaximum'],
                          target=capstone['threshold'], spread=0., qubits=tutorial['qubits'],
                          ancillas=tutorial['ancillas'], tCount=tutorial['tCount'],minimumKept=capstone['minimumKept'])}
    result.update({f'Main{row["id"]}': row for row in refs['levels']})
    return result


def validate_manifest(manifest):
    rows = manifest['summary']
    wanted = [f'FS{i}' for i in range(1, 7)] + [f'Main{i}' for i in range(1, 11)]
    if [row['level'] for row in rows] != wanted:
        raise ValueError('The notebook must summarize FS1–6 and Main1–10 exactly once, in order.')
    expected = expected_scores()
    for row in rows:
        name = row['level']
        for key in ('minimumKept','baseline', 'everywhere', 'reasonable', 'optimal', 'target', 'spread'):
            value = row[key]
            if name not in expected:
                if value is not None:
                    raise ValueError(f'{name}: invented numeric completion score ({key}).')
                continue
            reference = expected[name]
            # Float epsilon is separate from run spread; exact scores have no
            # sampling variance. Match the existing live validation tolerance.
            tolerance = reference['spread'] + 1e-9
            if not isinstance(value, (int, float)) or not math.isfinite(value):
                raise ValueError(f'{name}: non-finite {key}.')
            if abs(value - reference[key]) > tolerance:
                raise ValueError(f'{name}: {key} differs from validation ({value} vs {reference[key]}).')
        if name in expected:
            for key in ('data', 'ancillas', 'tCount'):
                source_key = 'qubits' if key == 'data' else key
                if row[key] != expected[name][source_key]:
                    raise ValueError(f'{name}: {key} differs from the authoritative reference.')
    if manifest['seed'] != 2026 or manifest['shots'] != 1024:
        raise ValueError('Use the same seed and shot settings as stored validation experiments.')
    if not manifest['tValidationPassed']:
        raise ValueError('T-capable scorer validation did not pass.')
    # The human-readable certificate rounds its scores; check that it also
    # agrees, while full precision above uses the existing 1e-9 tolerance.
    for line in (ROOT / 'docs/LEVEL_VALIDATION.md').read_text(encoding='utf-8').splitlines():
        cells = [part.strip() for part in line.split('|')[1:-1]]
        if len(cells)!=11 or not (cells[0] == 'FS6' or cells[0].isdigit()):
            continue
        name = cells[0] if cells[0] == 'FS6' else 'Main' + cells[0]
        row = next(r for r in rows if r['level'] == name)
        for key, rounded in zip(('minimumKept','baseline','everywhere','reasonable','optimal','target','spread'), cells[4:]):
            decimals = len(rounded.split('.')[1]) if '.' in rounded else 0
            if abs(row[key] - float(rounded)) > .5 * 10**(-decimals) + 1e-9:
                raise ValueError(f'{name}: summary disagrees with the rounded LEVEL_VALIDATION.md table.')
    return len(rows)


def extract_manifest(notebook):
    found = []
    execution_counts = []
    for cell in notebook['cells']:
        if cell['cell_type'] != 'code':
            continue
        execution_counts.append(cell.get('execution_count'))
        for output in cell.get('outputs', []):
            if output['output_type'] == 'error':
                raise ValueError('Notebook contains an error output.')
            if 'validation-manifest' in cell.get('metadata', {}).get('tags', []):
                data = output.get('data', {}).get('application/json')
                if data is not None:
                    found.append(data)
    if execution_counts != list(range(1, len(execution_counts) + 1)):
        raise ValueError('Every code cell must have a real sequential execution count.')
    if len(found) != 1:
        raise ValueError('Expected exactly one computed JSON validation manifest.')
    validate_manifest(found[0])
    from scripts.cache_level_searches import load_searches
    load_searches()
    if found[0].get('inputs') != analysis_inputs():
        raise ValueError('Notebook sources, helpers, pins or cache changed after execution; rerun the notebook.')
    return found[0], len(execution_counts)


@contextmanager
def project_kernel():
    with tempfile.TemporaryDirectory(prefix='quantum-shield-kernel-') as directory:
        spec = Path(directory) / 'kernels/quantum-shield-analysis'
        spec.mkdir(parents=True)
        (spec / 'kernel.json').write_text(json.dumps(dict(
            argv=[sys.executable, '-m', 'ipykernel_launcher', '-f', '{connection_file}'],
            display_name='Quantum Shield analysis (current interpreter)', language='python')), encoding='utf-8')
        previous = os.environ.get('JUPYTER_PATH')
        os.environ['JUPYTER_PATH'] = directory + (os.pathsep + previous if previous else '')
        try:
            yield
        finally:
            if previous is None:
                os.environ.pop('JUPYTER_PATH', None)
            else:
                os.environ['JUPYTER_PATH'] = previous


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--check-saved', action='store_true', help='Validate saved outputs without re-execution.')
    args = parser.parse_args()
    import nbformat
    nb = nbformat.read(NOTEBOOK, as_version=4)
    if args.check_saved:
        _, cells = extract_manifest(nb)
        print(f'PASS: saved outputs, {cells} executed cells, all 16 summary rows match validation.')
        return
    for name in ('OMP_NUM_THREADS', 'OPENBLAS_NUM_THREADS', 'MKL_NUM_THREADS'):
        os.environ[name] = '1'
    os.environ['PYDEVD_DISABLE_FILE_VALIDATION'] = '1'
    if sys.platform == 'win32':
        import asyncio
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    from nbclient import NotebookClient
    started = time.perf_counter()
    with project_kernel():
        client = NotebookClient(nb, timeout=180, kernel_name='quantum-shield-analysis',
                                resources={'metadata': {'path': str(ROOT)}},
                                allow_errors=False, record_timing=True)
        client.execute()
    manifest, cells = extract_manifest(nb)
    # Reject accidental path disclosure instead of silently relabeling output.
    outputs = json.dumps([c.get('outputs', []) for c in nb.cells], ensure_ascii=False)
    for path in (str(ROOT), ROOT.as_posix(), str(Path.home()), Path.home().as_posix()):
        if path in outputs or path.replace('\\', '\\\\') in outputs:
            raise ValueError('A notebook output contains a machine-specific absolute path; fix its display.')
    nbformat.validate(nb)
    nbformat.write(nb, NOTEBOOK)
    elapsed = time.perf_counter() - started
    print(f'PASS: {cells} real executed cells; all 16 summary rows match validation; '
          f'0 numeric disagreements; {elapsed:.2f}s execution; {NOTEBOOK.stat().st_size / 1048576:.2f} MiB saved.')
    print(f'Notebook-measured analysis time: {manifest["runtimeSeconds"]:.2f}s (kernel startup excluded).')


if __name__ == '__main__':
    main()
