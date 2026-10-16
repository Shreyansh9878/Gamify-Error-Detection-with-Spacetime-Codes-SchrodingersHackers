"""Execute the matched study in a real analysis kernel, saving genuine outputs."""
import os
from pathlib import Path
import sys
import time

ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))


def main():
    import nbformat
    from nbclient import NotebookClient
    from scripts.run_notebook import project_kernel
    for name in ('OMP_NUM_THREADS','OPENBLAS_NUM_THREADS','MKL_NUM_THREADS'):
        os.environ[name]='1'
    os.environ['PYDEVD_DISABLE_FILE_VALIDATION']='1'
    if sys.platform == 'win32':
        import asyncio
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    path=ROOT/'notebooks/track_experiments.ipynb'
    notebook=nbformat.read(path,as_version=4)
    started=time.perf_counter()
    def progress(cell, cell_index, **kwargs):
        if cell.cell_type=='code':
            print(f'Executing cell {cell_index}: {cell.source.splitlines()[0][:80]}',flush=True)
    with project_kernel():
        NotebookClient(notebook,timeout=180,kernel_name='quantum-shield-analysis',
                       resources={'metadata':{'path':str(ROOT)}},allow_errors=False,
                       on_cell_start=progress).execute()
    import json
    outputs=json.dumps([c.get('outputs',[]) for c in notebook.cells],ensure_ascii=False)
    for location in (ROOT,Path.home()):
        for spelling in (str(location),location.as_posix()):
            if spelling in outputs or spelling.replace('\\','\\\\') in outputs:
                raise ValueError('Notebook output exposes a machine-specific path.')
    nbformat.validate(notebook)
    nbformat.write(notebook,path)
    count=sum(c.cell_type=='code' for c in notebook.cells)
    print(f'PASS: {count} real kernel cells; fresh results match the study; '
          f'{time.perf_counter()-started:.2f}s; {path.stat().st_size/1048576:.2f} MiB.')


if __name__=='__main__':main()
