from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.requests import Request

from app.database import init_db
from app.routers import covered_calls, health


app = FastAPI(title="OptionX API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3001",
    ],
    allow_methods=["GET", "POST", "DELETE"],
    allow_headers=["*"],
)
app.include_router(health.router)
app.include_router(covered_calls.router)


@app.on_event("startup")
def startup() -> None:
    init_db()


@app.middleware("http")
async def log_requests(request: Request, call_next):
    print(f"OptionX API request: {request.method} {request.url.path}", flush=True)
    return await call_next(request)


def main() -> None:
    print("Run the API with: uv run uvicorn main:app --reload")


if __name__ == "__main__":
    main()
