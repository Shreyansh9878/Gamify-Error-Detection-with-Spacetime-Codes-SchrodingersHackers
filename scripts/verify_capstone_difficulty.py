"""Reproduce exact capstone scores; no sampling noise decides qualification."""
from pathlib import Path
import sys
import json
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT))

def main():
    from scripts.validate_capstone import calibrate, verify
    calibrate()
    result=verify()
    print(json.dumps({k:result[k] for k in ('baseline','everywhere','reasonable','optimal','minimumKept','target')}))

if __name__=='__main__':main()
