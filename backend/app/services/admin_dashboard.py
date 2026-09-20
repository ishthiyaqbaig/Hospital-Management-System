from datetime import datetime, timedelta
from typing import Any

from app.services.ai_service import AIServiceError, generate_report
from app.services.database import get_database


async def analytics() -> dict[str, Any]:
    db = get_database()
    since_30 = datetime.now() - timedelta(days=30)
    since_14 = datetime.now() - timedelta(days=14)
    since_7 = datetime.now() - timedelta(days=7)

    patient_volume = await _aggregate(
        "patients",
        [
            {"$match": {"created_at": {"$gte": since_30}}},
            *_daily_count_pipeline("created_at", "patients"),
        ],
    )
    doctor_utilization = await _aggregate("appointments", _doctor_utilization_pipeline(since_7))
    department_load = await _aggregate("appointments", _department_load_pipeline(since_7))
    average_wait_time = await _aggregate("appointments", _average_wait_pipeline(since_14))
    revenue = await _aggregate("billing", _revenue_pipeline(since_30))

    totals = {
        "patients": await db["patients"].count_documents({}),
        "appointments_today": await _appointments_today_count(),
        "paid_revenue": sum(item["amount"] for item in revenue),
        "average_wait_minutes": _mean(
            [item["avg_wait_minutes"] for item in average_wait_time if item.get("avg_wait_minutes") is not None]
        ),
    }
    return {
        "patient_volume": patient_volume,
        "doctor_utilization": doctor_utilization,
        "department_load": department_load,
        "average_wait_time": average_wait_time,
        "revenue": revenue,
        "totals": totals,
    }


async def generate_admin_report() -> dict[str, Any]:
    stats = await analytics()
    try:
        result = await generate_report(stats)
    except AIServiceError as exc:
        fallback = _fallback_report(stats, str(exc))
        return {"report_id": fallback["report_id"], "report": fallback["report"], "stats": stats}
    return {"report_id": result["report_id"], "report": result["output"], "stats": stats}


def _fallback_report(stats: dict[str, Any], error: str) -> dict[str, Any]:
    totals = stats.get("totals", {})
    busy_departments = stats.get("department_load", [])[:3]
    slow_departments = stats.get("average_wait_time", [])[:3]
    highlights = [
        f"{int(totals.get('patients', 0))} total patients are registered.",
        f"{int(totals.get('appointments_today', 0))} appointments are scheduled today.",
        f"Paid revenue for the current 30-day window is {float(totals.get('paid_revenue', 0)):.2f}.",
    ]
    if busy_departments:
        highlights.append(
            "Highest department load: "
            + ", ".join(f"{item.get('label', 'Department')} ({item.get('appointments', 0)})" for item in busy_departments)
        )

    risks = []
    average_wait = float(totals.get("average_wait_minutes", 0) or 0)
    if average_wait >= 30:
        risks.append(f"Average wait time is elevated at {average_wait} minutes.")
    if slow_departments:
        risks.append(
            "Departments needing wait-time review: "
            + ", ".join(
                f"{item.get('label', 'Department')} ({item.get('avg_wait_minutes', 0)} min)"
                for item in slow_departments
            )
        )
    if not risks:
        risks.append("No major operational risk is visible in the current analytics snapshot.")

    return {
        "report_id": f"local-{datetime.now().strftime('%Y%m%d%H%M%S')}",
        "report": {
            "period": "Current analytics snapshot",
            "summary": "Generated from live hospital analytics because the Gemini report service was unavailable.",
            "highlights": highlights,
            "risks": risks,
            "recommended_actions": [
                "Review departments with the highest load before peak hours.",
                "Follow up on appointments with long queue positions.",
                "Retry the AI report after confirming the Gemini API key and network access.",
            ],
            "source": "local_fallback",
            "ai_error": error,
        },
    }


async def _aggregate(collection: str, pipeline: list[dict[str, Any]]) -> list[dict[str, Any]]:
    return await get_database()[collection].aggregate(pipeline).to_list(length=100)


def _daily_count_pipeline(date_field: str, count_name: str) -> list[dict[str, Any]]:
    return [
        {
            "$group": {
                "_id": {"$dateToString": {"format": "%Y-%m-%d", "date": f"${date_field}"}},
                count_name: {"$sum": 1},
            }
        },
        {"$sort": {"_id": 1}},
        {"$project": {"_id": 0, "label": "$_id", count_name: 1}},
    ]


def _doctor_utilization_pipeline(since: datetime) -> list[dict[str, Any]]:
    return [
        {"$match": {"scheduled_at": {"$gte": since}, "status": {"$ne": "cancelled"}}},
        {"$group": {"_id": "$doctor_id", "appointments": {"$sum": 1}}},
        {"$addFields": {"doctor_object_id": {"$convert": {"input": "$_id", "to": "objectId", "onError": None}}}},
        {"$lookup": {"from": "doctors", "localField": "doctor_object_id", "foreignField": "_id", "as": "doctor"}},
        {"$unwind": {"path": "$doctor", "preserveNullAndEmptyArrays": True}},
        {
            "$project": {
                "_id": 0,
                "label": {"$ifNull": ["$doctor.name", "$_id"]},
                "appointments": 1,
                "utilization": {"$min": [{"$multiply": [{"$divide": ["$appointments", 40]}, 100]}, 100]},
            }
        },
        {"$sort": {"appointments": -1}},
        {"$limit": 10},
    ]


def _department_load_pipeline(since: datetime) -> list[dict[str, Any]]:
    return [
        {"$match": {"scheduled_at": {"$gte": since}, "status": {"$ne": "cancelled"}}},
        {"$group": {"_id": "$department_id", "appointments": {"$sum": 1}}},
        {"$addFields": {"department_object_id": {"$convert": {"input": "$_id", "to": "objectId", "onError": None}}}},
        {"$lookup": {"from": "departments", "localField": "department_object_id", "foreignField": "_id", "as": "department"}},
        {"$unwind": {"path": "$department", "preserveNullAndEmptyArrays": True}},
        {"$project": {"_id": 0, "label": {"$ifNull": ["$department.name", "$_id"]}, "appointments": 1}},
        {"$sort": {"appointments": -1}},
        {"$limit": 10},
    ]


def _average_wait_pipeline(since: datetime) -> list[dict[str, Any]]:
    return [
        {"$match": {"scheduled_at": {"$gte": since}, "status": {"$ne": "cancelled"}}},
        {
            "$project": {
                "department_id": 1,
                "estimated_wait": {
                    "$multiply": [
                        {"$max": [{"$subtract": [{"$ifNull": ["$queue_position", 1]}, 1]}, 0]},
                        15,
                    ]
                },
            }
        },
        {"$group": {"_id": "$department_id", "avg_wait_minutes": {"$avg": "$estimated_wait"}}},
        {"$addFields": {"department_object_id": {"$convert": {"input": "$_id", "to": "objectId", "onError": None}}}},
        {"$lookup": {"from": "departments", "localField": "department_object_id", "foreignField": "_id", "as": "department"}},
        {"$unwind": {"path": "$department", "preserveNullAndEmptyArrays": True}},
        {"$project": {"_id": 0, "label": {"$ifNull": ["$department.name", "$_id"]}, "avg_wait_minutes": {"$round": ["$avg_wait_minutes", 1]}}},
        {"$sort": {"avg_wait_minutes": -1}},
    ]


def _revenue_pipeline(since: datetime) -> list[dict[str, Any]]:
    return [
        {"$match": {"status": "paid", "created_at": {"$gte": since}}},
        {"$group": {"_id": {"$dateToString": {"format": "%Y-%m-%d", "date": "$created_at"}}, "amount": {"$sum": "$amount"}}},
        {"$sort": {"_id": 1}},
        {"$project": {"_id": 0, "label": "$_id", "amount": 1}},
    ]


async def _appointments_today_count() -> int:
    start = datetime.combine(datetime.now().date(), datetime.min.time())
    end = datetime.combine(datetime.now().date(), datetime.max.time())
    return await get_database()["appointments"].count_documents({"scheduled_at": {"$gte": start, "$lte": end}})


def _mean(values: list[float]) -> float:
    if not values:
        return 0
    return round(sum(values) / len(values), 1)
