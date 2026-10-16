"""Reachable bounded-family optimizer, using the FS6 exact enumeration method.

This is not a certificate of a global optimum over arbitrary gate sequences.
The family includes every nonidentity Pauli product on one helper in each of
five meaningful windows, plus the full-register comparison strategy. Every
candidate is an actual player draft, processed by the ordinary auto-closer.
"""
import itertools
import numpy as np
from .levels import get_level
from .models import Draft, Gate
from .service import _run, validate, single_term, qc_for, payload


def empty(number):
    l=get_level(number)
    return Draft(levelId=number,bands={'0':4,str(len(l['payload'])):8})


def shell(number, label, start=0, end=None, helpers=1):
    l=get_level(number); n=l['qubits']; end=len(l['payload']) if end is None else end
    bands={'0':4,str(len(l['payload'])):8,str(start):8,str(end):8}
    gs=[]
    def add(name, qs, boundary, slot):
        gs.append(Gate(id=f'g{len(gs)}',name=name,qubits=qs,boundary=boundary,slot=slot))
    # Reversing closing order permits multi-helper products without data-slot
    # collisions. Nontrivial helper overlaps are still certified by validation.
    for a in range(helpers):
        wire=n+a;add('h',[wire],start,0)
        for j,q in enumerate(range(n)):
            p=label[-1-q]
            if p!='I': add('c'+p.lower(),[wire,q],start,1+(q+a)%n)
        if not l['assisted']:
            from qiskit.quantum_info import Pauli,Operator
            u=Operator(qc_for(payload(l)[start:end],n)).data
            term=single_term((u@Pauli(label).to_matrix()@u.conj().T).conj().T)
            if term is None: raise ValueError('Non-Pauli closing product.')
            closing,coef=term
            for q,p in enumerate(reversed(closing)):
                if p!='I':add('c'+p.lower(),[wire,q],end,(q+helpers-1-a)%n)
            phase=min([(1,None),(-1,'z'),(1j,'s'),(-1j,'sdg')],key=lambda x:abs(x[0]-coef))[1]
            if phase:add(phase,[wire],end,5)
        add('h',[wire],end,6);add('m',[wire],end,7)
    return Draft(levelId=number,bands=bands,operations=gs)


def windows(level):
    length=len(level['payload'])
    h=level['noise']['hotspotColumn']
    return sorted(set([(0,length),(h,h+1),(max(0,h-1),h+1),(h,length),(h,min(h+4,length))]))


def candidates(number):
    l=get_level(number)
    for start,end in windows(l):
        for letters in itertools.product('IXYZ',repeat=l['qubits']):
            label=''.join(letters)
            if set(label)=={'I'}:continue
            try:d=shell(number,label,start,end)
            except ValueError:continue
            if validate(d)['valid']:
                yield label,start,end,d


def scored_candidates(number):
    """Evaluate reachable drafts once; retain both physical metrics for budgets."""
    for label,start,end,draft in candidates(number):
        result=_run(draft.model_dump_json())
        yield dict(label=label,start=start,end=end,score=result['combinedScore'],
                   fidelity=result['fidelity'],retention=result['retention'],
                   correct_shot_yield=result['correct_shot_yield'],draft=draft.model_dump())


def optimize(number):
    best=None; broadest=None;count=0
    for candidate in scored_candidates(number):
        count+=1;label=candidate['label'];start=candidate['start'];end=candidate['end']
        draft=Draft.model_validate(candidate['draft'])
        if best is None or candidate['score']>best['score']:best=candidate
        if start==0 and end==len(get_level(number)['payload']):
            cost=sum(g['name'] in ('cx','cy','cz') for g in validate(draft)['operations'])
            if broadest is None or cost>broadest['cost']:
                broadest=dict(label=label,cost=cost)
    return dict(kind='custom-t-pauli-search' if number>=8 else 'clifford-pauli-reference-search',pauliceUsed=False,
                best=best,broadest=broadest,candidateCount=count,scope='Exact maximum over all nonidentity single-helper Pauli products in the five declared windows. Not a global optimum over arbitrary multi-helper circuits.')


def overcheck(number):
    """Blanket every data wire with each available helper, when T rules allow.

    For T-doped circuits use the broadest legal full-span product, rather than
    fabricating a numeric score for an invalid X/T circuit (scoring is blocked).
    """
    l=get_level(number)
    if number<8:return shell(number,'X'*l['qubits'],helpers=l['ancillas'])
    choices=[]
    for letters in itertools.product('IXYZ',repeat=l['qubits']):
        label=''.join(letters)
        if set(label)=={'I'}:continue
        d=shell(number,label)
        if validate(d)['valid']:
            choices.append((sum(p!='I' for p in label),-_run(d.model_dump_json())['combinedScore'],label))
    if not choices:raise ValueError('No legal full-span over-checking strategy; adjust T positions.')
    label=max(choices)[2]
    return shell(number,label,helpers=l['ancillas'])
