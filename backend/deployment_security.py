"""Best-effort warm-instance admission; never advertised as a global quota."""
from collections import OrderedDict
from threading import Lock
import time


class RequestBudget:
    def __init__(self,limit=300,period=60,capacity=1024):
        self.limit=limit
        self.period=period
        self.capacity=capacity
        self.entries=OrderedDict()
        self.lock=Lock()

    def allow(self,key,now=None):
        now=time.monotonic() if now is None else now
        with self.lock:
            start,count=self.entries.pop(key,(now,0))
            if now-start>=self.period:start,count=now,0
            self.entries[key]=(start,count+1)
            while len(self.entries)>self.capacity:self.entries.popitem(last=False)
            return count<self.limit
