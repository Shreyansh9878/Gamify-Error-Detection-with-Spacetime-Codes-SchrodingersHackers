"""Lossless visualization transport; no shared serverless instance required."""
import base64
import struct


def pack_components(components,qubits):
    values=[]
    for component in components:
        values.append(component['weight'])
        for real,imaginary in component['amplitudes']:
            values.extend((real,imaginary))
    data=struct.pack(f'<{len(values)}d',*values)
    return dict(format='f64le-base64-v1',qubits=qubits,count=len(components),data=base64.b64encode(data).decode('ascii'))
