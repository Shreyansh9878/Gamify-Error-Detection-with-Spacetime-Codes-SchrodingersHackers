"""Ten authored missions. QFF specifies experiments, not numbered levels."""
from copy import deepcopy

def gate(name, qubits, column):
    return {'id': f'{name}-{column}-{qubits[0]}', 'name': name, 'qubits': qubits, 'column': column}

def level(i, title, subtitle, description, concept, hint, label, n, slots, budget,
          check_budget, minimum, allowed, channel, noise, goal, target, fixed=False):
    return dict(id=i, title=title, subtitle=subtitle, description=description,
                concept=concept, hint=hint, targetLabel=label, qubits=n, slots=slots,
                gateBudget=budget, checkBudget=check_budget, minChecks=minimum,
                allowed=allowed, channel=channel, noise=noise, fidelityGoal=goal,
                retentionGoal=0.40, target=target, starter=deepcopy(target) if fixed else [],
                fixed=fixed, chapter='FOUNDATIONS' if i <= 3 else 'SPACETIME' if i <= 7 else 'BEYOND CLIFFORD')

BELL = [gate('h',[0],0), gate('cx',[0,1],1)]
GHZ = BELL + [gate('cx',[1,2],2)]
BACKBONE = [gate('h',[0],0),gate('h',[1],0),gate('cx',[0,1],1),gate('h',[2],1),gate('cz',[1,2],2)]

def doped(count):
    output = deepcopy(BACKBONE)
    for i in range(count):
        output.append(gate('t', [i % 3], 3 + i))
    return output

LEVELS = [
 level(1,'First light','Prepare a single qubit',
       'Turn a quiet zero into a one. The noise radar shows how the environment disturbs your result.',
       'A gate changes the state. Noise is an unwanted change.',
       'Choose X, then click any cell on q0. Run the circuit to compare with |1>.',
       '|1>',1,4,2,0,0,['x','h','z'],'bitflip',0.035,0.84,[gate('x',[0],0)]),
 level(2,'Phase whisper','Find the invisible error',
       'Prepare a plus state. Phase noise can damage it even when zero and one still look equally likely.',
       'Probabilities alone do not reveal every quantum error.',
       'Place H on q0. Compare phase coherence as well as the probability bars.',
       '|+>',1,4,2,1,0,['h','x','z'],'phase',0.045,0.82,[gate('h',[0],0)]),
 level(3,'Catch the glitch','Your first coherent check',
       'Prepare |1> and use one helper qubit to flag bit flips during the computation.',
       'A Z check notices X errors; no alarm does not guarantee a clean shot.',
       'Place X, add a Z check on q0 from boundary 0 to 4, then run.',
       '|1>',1,4,2,1,1,['x','h','z'],'bitflip',0.06,0.87,[gate('x',[0],0)]),
 level(4,'Entangled allies','Protect a Bell pair',
       'Build a Bell pair and protect its shared information with a spacetime check.',
       'A check can spread across qubits as it passes an entangling gate.',
       'H on q0, then CX from q0 to q1. A Z check starting on q0 is propagated for you.',
       '(|00> + |11>)/sqrt(2)',2,5,4,1,1,['h','x','z','cx','cz'],'depolarizing',0.025,0.79,BELL),
 level(5,'Memory leak','Meet decoherence',
       'Keep a plus state coherent while the environment gradually learns about it.',
       'Dephasing suppresses off-diagonal coherence without necessarily changing populations.',
       'Place H. Use an X check beginning after H: boundary 1 to 5.',
       '|+>',1,5,3,1,1,['h','x','z','s'],'dephasing',0.09,0.86,[gate('h',[0],0)]),
 level(6,'Three-body signal','Build a GHZ state',
       'Entangle three qubits. Spend no more than two ancillas protecting the signal.',
       'More checks cost more gates and can introduce errors of their own.',
       'H(q0), CX(q0,q1), CX(q1,q2). Start with a Z check on q0 across the whole circuit.',
       '(|000> + |111>)/sqrt(2)',3,6,5,2,1,['h','x','z','s','cx','cz'],'depolarizing',0.018,0.70,GHZ),
 level(7,'Clifford cartographer','Explore the automatic-check lab',
       'Protect a fixed Clifford payload. Open Research Lab to compare Paulice target order and depth.',
       'Paulice searches for low-overhead checks; its measurement protocol is reported separately.',
       'The payload is fixed. Try a Z check on q0, then compare q1. Research Lab is available below.',
       'Fixed Clifford reference',3,7,5,2,1,['h','x','z','s','sdg','sx','sxdg','cx','cz','rz'],'depolarizing',0.018,0.66,BACKBONE,True),
 level(8,'A little magic','One T gate',
       'The same Clifford backbone now contains one T gate. Find a valid Pauli path through it.',
       'At a T crossing, a propagated Pauli must act as I or Z on that qubit.',
       'Try a Z check on q0 from boundary 3 through 7, across the diagonal tail. Invalid X crossings are rejected.',
       'Clifford + 1 T reference',3,7,6,2,1,['h','cx','cz','t'],'phase',0.025,0.68,doped(1),True),
 level(9,'Narrow passage','Two T gates',
       'Two non-Clifford gates constrain your check paths. Compare fidelity and shots kept.',
       'The valid check space shrinks; T gates do not automatically imply lower fidelity in every model.',
       'A Z check from boundary 3 to 7 can cross the diagonal tail. Try different opening qubits.',
       'Clifford + 2 T reference',3,7,7,2,1,['h','cx','cz','t'],'depolarizing',0.016,0.65,doped(2),True),
 level(10,'The spacetime architect','Four T gates · final challenge',
       'Use everything you learned. Protect a T-doped payload and explain the best fidelity/retention trade-off.',
       'Low-overhead detection is about useful protection per resource, not the largest number of checks.',
       'Try Z on q0 from boundary 3 to 8. In Research Lab compare T counts 0, 1, 2, and 4.',
       'Clifford + 4 T reference',3,8,9,2,1,['h','cx','cz','t'],'relaxation',0.025,0.64,doped(4),True),
]

def get_level(identifier):
    if not 1 <= identifier <= len(LEVELS):
        raise ValueError('Unknown mission.')
    return deepcopy(LEVELS[identifier-1])
