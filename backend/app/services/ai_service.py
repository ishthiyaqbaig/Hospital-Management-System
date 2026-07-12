import asyncio
import json
from datetime import datetime, timezone
from typing import Any
from urllib import error, parse, request

from app.services.database import get_database
from app.utils.config import get_settings

AI_REPORTS_COLLECTION = "ai_reports"
GEMINI_ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"
MAX_RETRIES = 3
REQUEST_TIMEOUT_SECONDS = 30


class AIServiceError(RuntimeError):
    pass


async def generate_json_response(
    prompt: str,
    response_schema: dict[str, Any],
) -> dict[str, Any]:
    raw_response = await _call_gemini(prompt, response_schema)
    return _parse_json_response(raw_response)


async def predict_queue_time(
    department: str,
    current_queue_len: int,
    avg_consult_time: int | float,
) -> dict[str, Any]:
    data = {
        "department": department,
        "current_queue_len": current_queue_len,
        "avg_consult_time_min": avg_consult_time,
    }
    return await _run_ai_task(
        task="predict_queue_time",
        prompt=_prompt(
            "Estimate queue wait.",
            data,
            ["estimated_wait_minutes", "confidence", "reasoning"],
        ),
        input_data=data,
        response_schema=_object_schema(
            {
                "estimated_wait_minutes": "number",
                "confidence": "number",
                "reasoning": "string",
            },
            ["estimated_wait_minutes", "confidence", "reasoning"],
        ),
    )


async def suggest_appointment_slot(
    doctor_schedule: list[dict[str, Any]] | dict[str, Any],
    patient_urgency: str | int | float,
) -> dict[str, Any]:
    data = {
        "doctor_schedule": doctor_schedule,
        "patient_urgency": patient_urgency,
    }
    return await _run_ai_task(
        task="suggest_appointment_slot",
        prompt=_prompt(
            "Choose best appointment slot.",
            data,
            ["recommended_slot", "doctor_id", "reasoning"],
        ),
        input_data=data,
        response_schema=_object_schema(
            {
                "recommended_slot": "string",
                "doctor_id": "string",
                "reasoning": "string",
            },
            ["recommended_slot", "reasoning"],
        ),
    )


async def summarize_patient_history(
    medical_records_list: list[dict[str, Any]],
) -> dict[str, Any]:
    data = {"medical_records": medical_records_list}
    return await _run_ai_task(
        task="summarize_patient_history",
        prompt=_prompt(
            "Summarize patient history.",
            data,
            ["summary", "key_conditions", "medications", "risks"],
        ),
        input_data=data,
        response_schema=_object_schema(
            {
                "summary": "string",
                "key_conditions": {"type": "array", "items": {"type": "string"}},
                "medications": {"type": "array", "items": {"type": "string"}},
                "risks": {"type": "array", "items": {"type": "string"}},
            },
            ["summary", "key_conditions", "medications", "risks"],
        ),
    )


async def prioritize_emergency(symptom_text: str) -> dict[str, Any]:
    data = {"symptom_text": symptom_text}
    return await _run_ai_task(
        task="prioritize_emergency",
        prompt=_prompt(
            "Triage symptoms.",
            data,
            ["urgency_score", "reasoning"],
        ),
        input_data=data,
        response_schema=_object_schema(
            {
                "urgency_score": "number",
                "reasoning": "string",
            },
            ["urgency_score", "reasoning"],
        ),
    )


async def generate_report(hospital_stats: dict[str, Any]) -> dict[str, Any]:
    data = {"hospital_stats": hospital_stats}
    return await _run_ai_task(
        task="generate_report",
        prompt=_prompt(
            "Generate operations report.",
            data,
            ["period", "summary", "highlights", "risks", "recommended_actions"],
        ),
        input_data=data,
        response_schema=_object_schema(
            {
                "period": "string",
                "summary": "string",
                "highlights": {"type": "array", "items": {"type": "string"}},
                "risks": {"type": "array", "items": {"type": "string"}},
                "recommended_actions": {"type": "array", "items": {"type": "string"}},
            },
            ["period", "summary", "highlights", "risks", "recommended_actions"],
        ),
    )


async def _run_ai_task(
    task: str,
    prompt: str,
    input_data: dict[str, Any],
    response_schema: dict[str, Any],
) -> dict[str, Any]:
    report = {
        "task": task,
        "input": input_data,
        "prompt": prompt,
        "model": get_settings().gemini_model,
        "status": "pending",
        "created_at": _now(),
        "updated_at": _now(),
    }
    report_id = await _insert_report(report)

    try:
        raw_response = await _call_gemini(prompt, response_schema)
        output = _parse_json_response(raw_response)
    except Exception as exc:
        await _update_report(report_id, {"status": "failed", "error": str(exc)})
        raise AIServiceError(f"{task} failed: {exc}") from exc

    await _update_report(
        report_id,
        {"status": "completed", "output": output, "raw_response": raw_response},
    )
    return {"report_id": report_id, "task": task, "output": output}


async def _call_gemini(prompt: str, response_schema: dict[str, Any]) -> dict[str, Any]:
    last_error: Exception | None = None
    for attempt in range(1, MAX_RETRIES + 1):
        try:
            return await asyncio.to_thread(_send_gemini_request, prompt, response_schema)
        except Exception as exc:
            last_error = exc
            if attempt < MAX_RETRIES:
                await asyncio.sleep(0.5 * attempt)
    raise AIServiceError(f"Gemini request failed after {MAX_RETRIES} attempts: {last_error}")


def _send_gemini_request(prompt: str, response_schema: dict[str, Any]) -> dict[str, Any]:
    settings = get_settings()
    model = parse.quote(_model_name(settings.gemini_model), safe="")
    url = f"{GEMINI_ENDPOINT.format(model=model)}?key={parse.quote(settings.gemini_api_key)}"
    payload = {
        "contents": [{"role": "user", "parts": [{"text": prompt}]}],
        "generationConfig": {
            "temperature": 0.2,
            "maxOutputTokens": 2048,
            "responseMimeType": "application/json",
            "responseSchema": response_schema,
        },
    }
    req = request.Request(
        url,
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        with request.urlopen(req, timeout=REQUEST_TIMEOUT_SECONDS) as response:
            return json.loads(response.read().decode("utf-8"))
    except error.HTTPError as exc:
        body = exc.read().decode("utf-8", errors="replace")
        raise AIServiceError(f"Gemini HTTP {exc.code}: {body}") from exc
    except error.URLError as exc:
        raise AIServiceError(f"Gemini network error: {exc.reason}") from exc


def _parse_json_response(raw_response: dict[str, Any]) -> dict[str, Any]:
    try:
        text = raw_response["candidates"][0]["content"]["parts"][0]["text"]
        parsed = json.loads(text)
    except (KeyError, IndexError, TypeError, json.JSONDecodeError) as exc:
        raise AIServiceError("Gemini returned invalid JSON content") from exc
    if not isinstance(parsed, dict):
        raise AIServiceError("Gemini JSON response must be an object")
    return parsed


def _prompt(task: str, data: dict[str, Any], keys: list[str]) -> str:
    compact_data = json.dumps(data, separators=(",", ":"), default=str)
    return "\n".join(
        [
            f"Task: {task}",
            "Return: JSON only",
            f"Keys: {','.join(keys)}",
            "Rules:",
            "- no markdown",
            "- no extra keys",
            "- concise reasoning",
            f"Data: {compact_data}",
        ]
    )


def _object_schema(properties: dict[str, Any], required: list[str]) -> dict[str, Any]:
    normalized = {
        key: value if isinstance(value, dict) else {"type": value}
        for key, value in properties.items()
    }
    return {
        "type": "object",
        "properties": normalized,
        "required": required,
    }


def _model_name(value: str) -> str:
    return value.removeprefix("models/")


async def _insert_report(report: dict[str, Any]) -> str:
    result = await get_database()[AI_REPORTS_COLLECTION].insert_one(report)
    return str(result.inserted_id)


async def _update_report(report_id: str, fields: dict[str, Any]) -> None:
    from bson import ObjectId

    fields["updated_at"] = _now()
    await get_database()[AI_REPORTS_COLLECTION].update_one(
        {"_id": ObjectId(report_id)},
        {"$set": fields},
    )


def _now() -> datetime:
    return datetime.now(timezone.utc)
