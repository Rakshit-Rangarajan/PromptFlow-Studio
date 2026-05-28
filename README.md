# PromptFlow Studio

A single-page visual IDE for prompt pipelines with a React canvas frontend, FastAPI backend, and MongoDB graph/vector-search persistence.

## Frontend

```powershell
cd frontend
npm.cmd install
npm.cmd run dev
```

## Backend

```powershell
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

PromptFlow Studio uses a BYO runtime model. Users paste provider keys and vector database connection strings in the hosted Settings screen; graph saves do not include secrets. The backend still supports an optional `MONGODB_URI` for shared graph persistence, otherwise graph saves use an in-memory fallback.
