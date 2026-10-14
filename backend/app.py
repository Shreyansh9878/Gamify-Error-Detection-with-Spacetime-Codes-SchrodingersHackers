import logging
import os
import threading
from importlib.metadata import version
from uuid import uuid4
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from .levels import LEVELS
from .models import RunRequest, ResearchRequest, TutorialRequest
from .engine import evaluate, VERSION
from .research import run_research
from .tutorial import lesson

app=FastAPI(title='Quantum Shield Stage 1',version=VERSION)
lock=threading.BoundedSemaphore(1)
logger=logging.getLogger('quantum-shield')

@app.middleware('http')
async def bounded_body(request:Request,call_next):
    if request.method=='POST':
        body=bytearray()
        async for chunk in request.stream():
            body.extend(chunk)
            if len(body)>16384:
                return JSONResponse({'error':{'code':'PAYLOAD_TOO_LARGE','message':'Circuit requests must be smaller than 16 KiB.'}},status_code=413)
        request._body=bytes(body)
    response=await call_next(request)
    response.headers['Cache-Control']='no-store'
    response.headers['X-Content-Type-Options']='nosniff'
    return response

@app.exception_handler(RequestValidationError)
async def invalid_request(request,exc):
    return JSONResponse({'error':{'code':'INVALID_REQUEST','message':'Invalid request. Check the circuit bounds, field types, and allowed settings.'}},status_code=422)

def compute(function,*args):
    if os.getenv('SIMULATION_ENABLED','true')!='true':
        return JSONResponse({'error':{'code':'DISABLED','message':'Simulation is temporarily paused.'}},status_code=503)
    if not lock.acquire(blocking=False):
        return JSONResponse({'error':{'code':'BUSY','message':'The quantum engine is busy. Try again shortly.'}},status_code=429,headers={'Retry-After':'2'})
    try:
        return function(*args)
    except ValueError as error:
        return JSONResponse({'error':{'code':'INVALID_CIRCUIT','message':str(error)}},status_code=422)
    except Exception:
        request_id=str(uuid4())
        logger.exception('Simulation failed: %s',request_id)
        return JSONResponse({'error':{'code':'SIMULATION_FAILED','message':'Simulation failed. Retry or simplify the circuit.','requestId':request_id}},status_code=500)
    finally:
        lock.release()

@app.get('/api/health')
def health():
    return {'status':'ready','engineVersion':VERSION,'packages':{p:version(p) for p in ['qiskit','qiskit-aer','qiskit-paulice']}}

@app.get('/api/levels')
def levels():
    return LEVELS

@app.post('/api/run-circuit')
def run(request:RunRequest):
    return compute(evaluate,request)

@app.post('/api/research')
def research(request:ResearchRequest):
    return compute(run_research,request)

@app.post('/api/tutorial/{step}')
def tutorial(step:int,request:TutorialRequest):
    return compute(lesson,step,request)
