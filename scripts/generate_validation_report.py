"""Refresh paired physics/resource evidence without reverting the score schema."""
import json
from pathlib import Path
import sys
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT))
from backend.missions.levels import get_level
from backend.missions.models import Draft
from scripts.validate_main_levels import verify,resource_metrics,KINDS
from scripts.render_level_validation import main as render


def main():
    data=verify()
    for row in data['levels']:
        level=get_level(row['id'])
        for kind in KINDS:
            draft=Draft.model_validate(row[kind+'Draft'])
            row['metrics'][kind].update(resource_metrics(level,draft))
    (ROOT/'backend/missions/references.json').write_text(json.dumps(data,indent=2)+'\n',encoding='utf-8')
    render()


if __name__=='__main__':main()
