from app.utils.config import get_settings


def get_gemini_api_key() -> str:
    return get_settings().gemini_api_key
