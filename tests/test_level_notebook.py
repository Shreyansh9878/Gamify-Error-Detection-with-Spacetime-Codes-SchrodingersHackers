"""Check notebook evidence and failure behavior without adding Jupyter to runtime."""
from copy import deepcopy
import json
from pathlib import Path
import re

import pytest
from scripts.run_notebook import extract_manifest, validate_manifest
from scripts.cache_level_searches import load_searches

ROOT = Path(__file__).resolve().parents[1]


def saved():
    notebook = json.loads((ROOT / 'notebooks/level_design_and_validation.ipynb').read_text(encoding='utf-8'))
    return notebook, extract_manifest(notebook)[0]


def test_executed_notebook_matches_all_reference_scores():
    notebook, manifest = saved()
    assert validate_manifest(manifest) == 16
    assert len([c for c in notebook['cells'] if c['cell_type'] == 'code']) > 16
    assert any('image/png' in o.get('data', {}) for c in notebook['cells'] for o in c.get('outputs', []))


def test_notebook_check_rejects_a_wrong_score_or_invented_tutorial_threshold():
    _, manifest = saved()
    changed = deepcopy(manifest)
    changed['summary'][-1]['reasonable'] += .001
    with pytest.raises(ValueError, match='differs from validation'):
        validate_manifest(changed)
    changed = deepcopy(manifest)
    changed['summary'][0]['target'] = .5
    with pytest.raises(ValueError, match='invented numeric'):
        validate_manifest(changed)


def test_notebook_check_rejects_missing_execution_or_error_output():
    notebook, _ = saved()
    changed = deepcopy(notebook)
    cell = next(c for c in changed['cells'] if c['cell_type'] == 'code')
    cell['execution_count'] = None
    with pytest.raises(ValueError, match='execution count'):
        extract_manifest(changed)
    cell['outputs'].append({'output_type': 'error', 'ename': 'Example', 'evalue': 'failure', 'traceback': []})
    with pytest.raises(ValueError, match='error output'):
        extract_manifest(changed)


def test_analysis_cache_covers_all_missions_and_notebook_pins_are_outside_deployment():
    cache = load_searches()
    assert len(cache['results']) == 10
    assert all(not row['result']['pauliceUsed'] for row in cache['results'])
    pins = [x for x in (ROOT / 'notebooks/requirements.txt').read_text().splitlines() if x and not x.startswith('#')]
    assert all(re.fullmatch(r'[A-Za-z0-9_.-]+==[A-Za-z0-9_.+-]+', x) for x in pins)
    runtime = (ROOT / 'requirements.txt').read_text()
    assert all(name not in runtime for name in ('matplotlib', 'pylatexenc', 'nbclient', 'nbformat', 'ipykernel', 'jupyter'))
    assert 'notebooks' in (ROOT / '.vercelignore').read_text().splitlines()


def test_analysis_cache_rejects_changed_physics_or_simulator_versions(monkeypatch):
    from scripts import cache_level_searches
    monkeypatch.setattr(cache_level_searches, 'source_signature', lambda: {'files': {}, 'packages': {}})
    with pytest.raises(ValueError, match='cache is stale'):
        cache_level_searches.load_searches()
