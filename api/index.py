import sys
import os
from fastapi import FastAPI

sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'backend'))

from app.main import app as backend_app

app = FastAPI()
app.mount("/api", backend_app)
