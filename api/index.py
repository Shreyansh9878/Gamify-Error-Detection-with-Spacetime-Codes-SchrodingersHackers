"""One Vercel ASGI function. Numeric limits/physics stay in existing models."""
import os

# Set thread bounds before importing NumPy/Aer. Hobby provides one CPU.
for name in ('OMP_NUM_THREADS','OPENBLAS_NUM_THREADS','MKL_NUM_THREADS'):
    os.environ[name]='1'
os.environ['PORTABLE_STATE_FRAMES']='true'

from backend.app import app
from backend.deployment_security import RequestBudget
from fastapi import Request
from fastapi.responses import JSONResponse

budget=RequestBudget()


@app.middleware('http')
async def admission(request:Request,call_next):
    if request.method=='POST':
        # On Vercel this header is set by its trusted proxy. Local equivalent
        # runs do not trust caller-supplied forwarding headers.
        forwarded=request.headers.get('x-forwarded-for','') if os.getenv('VERCEL')=='1' else ''
        address=forwarded.split(',')[0].strip() or (request.client.host if request.client else 'unknown')
        if not budget.allow(address):
            return JSONResponse({'error':{'code':'RATE_LIMITED','message':'Too many simulations. Wait a minute and retry.'}},
                                status_code=429,headers={'Retry-After':'60','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'})
    return await call_next(request)
