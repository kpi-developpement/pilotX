from typing import List
from fastapi import APIRouter, UploadFile, File, Form
from services.ai_service import VoiceAIService

router = APIRouter(prefix="/api/v1/voice", tags=["Voice Biometrics"])

# ==========================================
# 1. ENREGISTREMENT (MULTI-SHOT 4 Audios)
# ==========================================
@router.post("/register")
async def register(
    audios: List[UploadFile] = File(...), 
    employeeId: str = Form(...)
):
    print("\n" + "="*50)
    print(f"🚀 [API] NOUVELLE REQUÊTE : ENREGISTREMENT MULTI-SHOT (STATELESS)")
    print("="*50)
    
    result = await VoiceAIService.register_voice_profile(audios, employeeId)
    return result


# ==========================================
# 2. IDENTIFICATION AUTOMATIQUE (1:N)
# ==========================================
@router.post("/identify")
async def identify(
    audio: UploadFile = File(...),
    challenge_code: str = Form(...),
    profiles_json: str = Form(...) # ⚠️ Jdid: Spring Boot ghadi ysift lina ga3 les profils hna
):
    print("\n" + "="*50)
    print("🚀 [API] NOUVELLE REQUÊTE : IDENTIFICATION AUTOMATIQUE 1:N (STATELESS)")
    print("="*50)
    
    result = await VoiceAIService.identify_voice(audio, challenge_code, profiles_json)
    return result