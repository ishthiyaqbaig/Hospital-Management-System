from fastapi import APIRouter, Depends

from app.models.admin_dashboard import AdminAnalyticsResponse, AdminReportResponse
from app.services.admin_dashboard import analytics, generate_admin_report
from app.utils.dependencies import require_roles

router = APIRouter(prefix="/admin-dashboard", tags=["Admin Dashboard"])


@router.get("/analytics", response_model=AdminAnalyticsResponse)
async def get_analytics(_: object = Depends(require_roles("admin"))):
    return await analytics()


@router.post("/report", response_model=AdminReportResponse)
async def create_report(_: object = Depends(require_roles("admin"))):
    return await generate_admin_report()
