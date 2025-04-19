from fastapi import FastAPI
from lovable_ui.api_bridge.prompt_router import router as prompt_router

app = FastAPI()
@app.get("/healthz")
def health_check():
    return {"status": "ok"}

app.include_router(prompt_router)