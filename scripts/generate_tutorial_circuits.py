"""Generate static tutorial circuit assets using Qiskit's matplotlib drawer.

Run from the repository: .venv/Scripts/python.exe scripts/generate_tutorial_circuits.py
Install requirements.txt and requirements-draw.txt first. No drawing runs in the app.
"""
from pathlib import Path
import sys
import json
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from qiskit import QuantumCircuit, QuantumRegister, ClassicalRegister
from qiskit.circuit.library import ZGate
from qiskit_aer.noise import thermal_relaxation_error

ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT))
from backend.timeline_lab.models import fixed_payload
from backend.timeline_lab.service import HOTSPOT

OUT=ROOT/'public'/'tutorial-circuits'
STYLE={'backgroundcolor':'#111923','textcolor':'#dcebf0','gatetextcolor':'#10212a',
       'linecolor':'#9cb5c6','creglinecolor':'#9cb5c6','subtextcolor':'#dcebf0',
       'gatefacecolor':'#94ddc4','barrierfacecolor':'#36515c','fontsize':12,
       'displaycolor':{'cx':('#efbd75','#10212a'),'t':('#efbd75','#10212a'),'tdg':('#efbd75','#10212a')}}

def shell(data=1):
    q=QuantumRegister(data,'q');a=QuantumRegister(1,'a');c=ClassicalRegister(1,'syndrome')
    return QuantumCircuit(q,a,c),a[0],c[0]

def main():
    circuits={}
    for kind in ('bit-flip','phase-flip','decoherence'):
        qc=QuantumCircuit(1,1)
        if kind=='bit-flip':qc.x(0,label='X error')
        elif kind=='phase-flip':qc.h(0);qc.append(ZGate(label='Z error'),[0])
        else:
            qc.x(0);gate=thermal_relaxation_error(100,80,50).to_instruction();gate.label='T1/T2: 50 us';qc.append(gate,[0])
        qc.measure(0,0);circuits['noise-'+kind]=qc
    qc,a,c=shell();qc.h(a);qc.cz(a,0);qc.x(0,label='test fault');qc.cz(a,0);qc.h(a);qc.measure(a,c);circuits['school-2']=qc
    for fault in (False,True):
        qc,a,c=shell();qc.h(a);qc.cx(a,0);qc.s(0)
        if fault:qc.x(0,label='X error')
        qc.cy(a,0);qc.h(a);qc.measure(a,c);circuits['school-3-fault' if fault else 'school-3']=qc
    qc,a,c=shell(2);qc.h(a);qc.cz(a,0);qc.h(0);qc.cx(0,1);qc.cx(a,0);qc.cx(a,1);qc.h(a);qc.measure(a,c);circuits['school-4']=qc
    qc,a,c=shell();qc.h(a);qc.cz(a,0);qc.t(0);qc.cz(a,0);qc.h(a);qc.measure(a,c);circuits['school-5']=qc
    qc=QuantumCircuit(3)
    for g in fixed_payload(6):
        getattr(qc,g.name)(*g.qubits)
        if g.name=='cx':
            gate=thermal_relaxation_error(HOTSPOT['t1Us'],HOTSPOT['t2Us'],HOTSPOT['timeUs']).to_instruction();gate.label='q1 hotspot: 70 us';qc.append(gate,[1])
    circuits['school-6']=qc
    qc=QuantumCircuit(2);qc.h(0);qc.x(0);qc.h(0);qc.sdg(1);qc.x(1);qc.s(1);circuits['clifford']=qc
    OUT.mkdir(parents=True,exist_ok=True)
    manifest={}
    for name,qc in circuits.items():
        figure=qc.draw('mpl',style=STYLE,fold=-1,idle_wires=True)
        figure.savefig(OUT/(name+'.png'),dpi=170,bbox_inches='tight',facecolor='#111923')
        plt.close(figure)
        manifest[name]={'generator':'QuantumCircuit.draw("mpl")','operations':dict(qc.count_ops()),'qubits':qc.num_qubits}
    (OUT/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n',encoding='utf-8')
    print(f'Generated {len(circuits)} Qiskit circuit images in {OUT}')

if __name__=='__main__':main()
