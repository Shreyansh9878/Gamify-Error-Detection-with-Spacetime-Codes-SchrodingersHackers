import logging
import os
import threading
from importlib.metadata import version
from uuid import uuid4
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from .levels import LEVELS
from .models import RunRequest, ResearchRequest, TutorialRequest, FaultRequest
from .engine import evaluate, validate_checks, trace_fault, VERSION
from .research import run_research
from .tutorial import lesson
from .noise_lab.models import CompileRequest, LabRunRequest
from .noise_lab.code_parser import compile_source
from .noise_lab.simulator import run_lab
from .protection_lab.models import ProtectionRequest, CompileRequest as ProtectionCompile
from .protection_lab.code_parser import compile_source as protection_compile_source
from .protection_lab.service import preview as protection_preview, run as protection_run
from .check_lab.models import CheckRequest, TraceRequest, CompileRequest as CheckCompile
from .check_lab.code_parser import compile_source as check_compile_source
from .check_lab.service import validate as check_validate, run as check_run, trace as check_trace, coverage as check_coverage
from .advanced_lab import models as advanced_models, service as advanced_service, code_parser as advanced_parser
from .graduation_lab import models as graduation_models, service as graduation_service, code_parser as graduation_parser
from .graduation_lab.fixture import manifest as graduation_fixture
from .learning.visualization import component_page, experiment_context
from .noise_lab.models import StrictModel
from pydantic import Field
from .timeline_lab import models as timeline_models, service as timeline_service
from .missions import models as mission_models, service as mission_service
from .missions.levels import get_level as get_mission

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
    if not any(request.url.path.startswith('/api/tutorial/'+lab+'/') for lab in ('noise-lab','protection-lab','check-lab','entangling-lab','non-clifford-lab','graduation-lab','timeline')):
        return JSONResponse({'error':{'code':'INVALID_REQUEST','message':'Invalid request. Check the circuit bounds, field types, and allowed settings.'}},status_code=422)
    details = [{'field': '.'.join(str(p) for p in e['loc']), 'message': e['msg']} for e in exc.errors()]
    return JSONResponse({'error':{'code':'INVALID_REQUEST','message':details[0]['message'] if details else 'Invalid request.', 'details':details}},status_code=422)

def compute(function,*args):
    if os.getenv('SIMULATION_ENABLED','true')!='true':
        return JSONResponse({'error':{'code':'DISABLED','message':'Simulation is temporarily paused.'}},status_code=503)
    if not lock.acquire(blocking=False):
        return JSONResponse({'error':{'code':'BUSY','message':'The quantum engine is busy. Try again shortly.'}},status_code=429,headers={'Retry-After':'2'})
    try:
        return experiment_context(function(*args))
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
    return [get_mission(i) for i in range(1,11)]

@app.post('/api/missions/validate')
def mission_validate(request:mission_models.Request):
    return compute(mission_service.validate,request.draft)

@app.post('/api/missions/run')
def mission_run(request:mission_models.Request):
    return compute(mission_service.run,request.draft)

@app.post('/api/missions/compile')
def mission_compile(request:mission_models.CompileRequest):
    return compute(mission_service.compile_source,request)

@app.post('/api/run-circuit')
def run(request:RunRequest):
    return compute(evaluate,request)

@app.post('/api/research')
def research(request:ResearchRequest):
    return compute(run_research,request)

@app.post('/api/validate-checks')
def check_preview(request:RunRequest):
    return compute(validate_checks,request)

@app.post('/api/trace-fault')
def fault_trace(request:FaultRequest):
    return compute(trace_fault,request)

@app.post('/api/tutorial/{step:int}')
def tutorial(step:int,request:TutorialRequest):
    return compute(lesson,step,request)

@app.post('/api/tutorial/noise-lab/compile')
def noise_compile(request:CompileRequest):
    return compute(compile_source, request)

@app.post('/api/tutorial/noise-lab/run')
def noise_run(request:LabRunRequest):
    return compute(run_lab, request)

@app.post('/api/tutorial/protection-lab/compile')
def protection_compile(request:ProtectionCompile):
    return compute(protection_compile_source, request)

@app.post('/api/tutorial/protection-lab/preview')
def protected_preview(request:ProtectionRequest):
    return compute(protection_preview, request)

@app.post('/api/tutorial/protection-lab/run')
def protected_run(request:ProtectionRequest):
    return compute(protection_run, request)

@app.post('/api/tutorial/check-lab/compile')
def compile_checks(request:CheckCompile):
    return compute(check_compile_source, request)

@app.post('/api/tutorial/check-lab/validate')
def validate_tutorial_checks(request:CheckRequest):
    return compute(check_validate, request)

@app.post('/api/tutorial/check-lab/run')
def run_tutorial_checks(request:CheckRequest):
    return compute(check_run, request)

@app.post('/api/tutorial/check-lab/trace-fault')
def trace_tutorial_fault(request:TraceRequest):
    return compute(check_trace, request)

@app.post('/api/tutorial/check-lab/coverage')
def tutorial_coverage(request:CheckRequest):
    return compute(check_coverage, request)


def register_advanced_lab(prefix, non_clifford):
    """Different request models enforce each lesson's capabilities independently."""
    run_model = advanced_models.NonCliffordRequest if non_clifford else advanced_models.RunRequest
    trace_model = advanced_models.NonCliffordTrace if non_clifford else advanced_models.TraceRequest
    coverage_model = advanced_models.CoverageRequest if non_clifford else run_model
    def compile_endpoint(request:advanced_models.CompileRequest):
        return compute(advanced_parser.compile_source,request,non_clifford)
    def validate_endpoint(request:run_model):
        return compute(advanced_service.validate,request)
    def run_endpoint(request:run_model):
        return compute(advanced_service.run,request)
    def trace_endpoint(request:trace_model):
        return compute(advanced_service.trace,request)
    def coverage_endpoint(request:coverage_model):
        return compute(advanced_service.coverage,request)
    for suffix, endpoint in [('compile',compile_endpoint),('validate',validate_endpoint),('run',run_endpoint),('trace-fault',trace_endpoint),('coverage',coverage_endpoint)]:
        app.add_api_route('/api/tutorial/'+prefix+'/'+suffix,endpoint,methods=['POST'],name=prefix+'-'+suffix)


register_advanced_lab('entangling-lab',False)
register_advanced_lab('non-clifford-lab',True)


@app.get('/api/tutorial/graduation-lab/fixture')
def capstone_fixture():
    return graduation_fixture()


@app.get('/api/tutorial/graduation-lab/benchmark')
def capstone_benchmark(fixtureVersion:str='graduation-fixture-v1'):
    return compute(graduation_service.benchmark,fixtureVersion)


@app.post('/api/tutorial/graduation-lab/compile')
def compile_strategy(request:graduation_models.CompileRequest):
    return compute(graduation_parser.compile_source,request)


@app.post('/api/tutorial/graduation-lab/validate')
def validate_strategy(request:graduation_models.RunRequest):
    return compute(graduation_service.validate,request)


@app.post('/api/tutorial/graduation-lab/run')
def run_strategy(request:graduation_models.RunRequest):
    return compute(graduation_service.run,request)


class VisualizationRequest(StrictModel):
    visualizationToken:str=Field(min_length=1,max_length=64)
    cursor:int=Field(default=0,ge=0,le=127)


@app.post('/api/tutorial/state-visualization')
def tutorial_state_components(request:VisualizationRequest):
    return compute(component_page,request.visualizationToken,request.cursor)


@app.post('/api/tutorial/graduation-lab/reveal')
def capstone_reveal(request:graduation_models.RunRequest):
    return compute(graduation_service.reveal,request)


@app.post('/api/tutorial/graduation-lab/diagnostic')
def capstone_diagnostic(request:graduation_models.DiagnosticRequest):
    return compute(graduation_service.diagnostic,request)


@app.post('/api/tutorial/timeline/compile')
def timeline_compile(request:timeline_models.CompileRequest):
    return compute(timeline_service.compile_source,request)


@app.post('/api/tutorial/timeline/validate')
def timeline_validate(request:timeline_models.Request):
    return compute(timeline_service.validation,request.draft)


@app.post('/api/tutorial/timeline/run')
def timeline_run(request:timeline_models.Request):
    return compute(timeline_service.run,request)


@app.post('/api/tutorial/timeline/reveal')
def timeline_reveal(request:timeline_models.Request):
    return compute(timeline_service.reveal,request)
