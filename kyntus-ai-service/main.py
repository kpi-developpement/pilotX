from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers.voice_router import router as voice_router

app = FastAPI(title="KyntusOS AI Microservice", version="2.0")

# Setup CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Inclusion dyal l'Router
app.include_router(voice_router)

@app.get("/")
def read_root():
    return {"status": "KyntusOS AI Core is running on Port 8000"}