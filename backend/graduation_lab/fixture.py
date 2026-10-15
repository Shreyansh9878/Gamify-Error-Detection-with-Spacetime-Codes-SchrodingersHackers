from ..advanced_lab.models import Gate

FIXTURE = 'graduation-fixture-v1'
NOISE = 'graduation-noise-v1'
SCHEDULER = 'graduation-schedule-v1'
CATALOGUE = 'graduation-catalogue-v1'
METRIC = 'fidelity-yield-v2'
WINDOWS = [(2,4),(1,7),(4,7),(2,6)]
PAYLOAD = [Gate(id=f'payload-{i}',name=name,qubits=qs,column=column) for i,(column,name,qs) in enumerate([(1,'h',[0]),(1,'h',[2]),(2,'cx',[0,1]),(3,'s',[1]),(3,'s',[2]),(5,'cx',[0,1]),(6,'cx',[0,1])])]
DATA_NOISE = [{'boundary':3,'qubit':0,'channel':'bit_flip','probability':.20},{'boundary':3,'qubit':1,'channel':'phase_flip','probability':.01},{'boundary':5,'qubit':2,'channel':'phase_flip','probability':.005}]
TAP_NOISE = {'channel':'depolarizing','strength':.005,'numQubits':2}


def manifest():
    return {'fixtureVersion':FIXTURE,'noiseVersion':NOISE,'schedulerVersion':SCHEDULER,'catalogueVersion':CATALOGUE,'metricVersion':METRIC,'dataQubits':3,'payload':[g.model_dump() for g in PAYLOAD],'dataNoise':DATA_NOISE,'tapNoise':TAP_NOISE,'windows':WINDOWS,'optionalQualityTarget':.90,'scoreGoal':.65,'fixed':True,'shell':{'openingH':0,'finalHAndMeasurement':8},'limitations':'Ideal H/sign/readout; no idle, routing or crosstalk noise. Controlled taps each have one local two-qubit depolarizing channel.'}
