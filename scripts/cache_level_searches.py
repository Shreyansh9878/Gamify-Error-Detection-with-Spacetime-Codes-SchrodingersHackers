"""Regenerate the notebook's expensive finite-family searches using game code.

No levels, targets or game reference files are modified. Cache fingerprints
include source files and authoritative fixtures so stale results are rejected.
"""
import hashlib
from importlib.metadata import version
import json
from pathlib import Path
import sys
import time
from datetime import datetime, timezone

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
CACHE = ROOT / 'notebooks/data/level_search_results.json'


def source_signature():
    paths = sorted((ROOT / 'backend').rglob('*.py'))
    paths += [ROOT / 'backend/missions/references.json',
              ROOT / 'backend/reference_solutions/tutorials.json']
    # Canonical text makes the certificate portable across Git CRLF/LF clones.
    hashes = {p.relative_to(ROOT).as_posix(): hashlib.sha256(p.read_text(encoding='utf-8').encode('utf-8')).hexdigest()
              for p in paths}
    packages = {p: version(p) for p in ('qiskit', 'qiskit-aer', 'qiskit-paulice', 'numpy', 'scipy')}
    return {'files': hashes, 'packages': packages}


def load_searches():
    if not CACHE.exists():
        raise ValueError('Search cache missing. Run python scripts/cache_level_searches.py.')
    cache = json.loads(CACHE.read_text(encoding='utf-8'))
    if cache['signature'] != source_signature():
        raise ValueError('Search cache is stale. Run python scripts/cache_level_searches.py.')
    if {r['level'] for r in cache['results']} != set(range(1, 11)):
        raise ValueError('Search cache must contain all ten missions.')
    return cache


def main():
    from backend.missions.reference import optimize
    started = time.perf_counter()
    signature = source_signature()
    rows = []
    for number in range(1, 11):
        begin = time.perf_counter()
        result = optimize(number)
        rows.append({'level': number, 'seconds': time.perf_counter() - begin, 'result': result})
        print(f'Main {number}: {result["candidateCount"]} valid candidates, '
              f'best={result["best"]["score"]:.9f}, {rows[-1]["seconds"]:.2f}s', flush=True)
    if source_signature() != signature:
        raise RuntimeError('Physics files changed during the search; rerun instead of saving a mixed snapshot.')
    data = dict(schemaVersion=1, generator='python scripts/cache_level_searches.py',
                implementation='backend.missions.reference.optimize',
                generatedAtUtc=datetime.now(timezone.utc).isoformat(),
                seconds=time.perf_counter() - started, seed=2026,
                signature=signature, results=rows)
    CACHE.parent.mkdir(parents=True, exist_ok=True)
    CACHE.write_text(json.dumps(data, indent=2) + '\n', encoding='utf-8')
    print(f'Saved {CACHE.relative_to(ROOT)}; {data["seconds"]:.2f}s total.')


if __name__ == '__main__':
    main()
