"""Execute this repository's trusted research notebook without a Jupyter server."""
import base64
from contextlib import redirect_stdout
import io
import json
from pathlib import Path
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt

ROOT=Path(__file__).resolve().parents[1]


def main():
    path=ROOT/'notebooks/track_experiments.ipynb';notebook=json.loads(path.read_text())
    scope={'__name__':'__notebook__'};counter=0
    for cell in notebook['cells']:
        if cell['cell_type']!='code':continue
        counter+=1;output=io.StringIO()
        with redirect_stdout(output):
            exec(compile(''.join(cell['source']),str(path),'exec'),scope)
        cell['execution_count']=counter;cell['outputs']=[]
        if output.getvalue():cell['outputs'].append(dict(output_type='stream',name='stdout',text=output.getvalue().splitlines(keepends=True)))
        for number in plt.get_fignums():
            image=io.BytesIO();plt.figure(number).savefig(image,format='png',dpi=100)
            cell['outputs'].append(dict(output_type='display_data',metadata={},data={'image/png':base64.b64encode(image.getvalue()).decode()}))
        plt.close('all')
    path.write_text(json.dumps(notebook,indent=2)+'\n',encoding='utf-8')
    print(f'Executed {counter} cells; all outputs are actual local Qiskit results.')


if __name__=='__main__':main()
