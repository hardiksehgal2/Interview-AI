from fastapi import APIRouter, Depends, HTTPException, Path, Query
from typing import List
from models.mongo import *
from beanie import PydanticObjectId
from datetime import datetime
from core.utility import *

router = APIRouter()


@router.post("/companies/", response_model=CompanyDoc)
async def create_company(company: CompanyCreate):
    """Register a new company"""
    # Check if email already exists
    existing_company = await CompanyDoc.find_one(CompanyDoc.email == company.email)
    if existing_company:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    hashed_password = hash_password(company.password)
    company_doc = CompanyDoc(
        **company.dict(exclude={"password"}),
        password_hash=hashed_password
    )
    await company_doc.insert()
    return company_doc


@router.get("/companies/{company_id}", response_model=CompanyDoc)
async def get_company(
    company_id: str = Path(..., description="Company ID"),
    current_user: dict = Depends(get_current_user)
):
    """Get company details"""
    try:
        company = await CompanyDoc.get(PydanticObjectId(company_id))
        if not company:
            raise HTTPException(status_code=404, detail="Company not found")
        return company
    except Exception:
        raise HTTPException(status_code=404, detail="Company not found")


@router.put("/companies/{company_id}", response_model=CompanyDoc)
async def update_company(
    company_id: str,
    company_update: CompanyUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Update company profile"""
    try:
        company = await CompanyDoc.get(PydanticObjectId(company_id))
        if not company:
            raise HTTPException(status_code=404, detail="Company not found")
        # Check authorization
        if current_user["user_type"] != "company" or current_user["user_id"] != company_id:
            raise HTTPException(status_code=403, detail="Not authorized")
        
        update_data = company_update.dict(exclude_unset=True)
        if update_data:
            update_data["updated_at"] = datetime.utcnow()
            await company.update({"$set": update_data})
        
        return await CompanyDoc.get(company.id)
    except Exception:
        raise HTTPException(status_code=403, detail="Company not found")


@router.get("/companies/", response_model=List[CompanyDoc])
async def list_companies(
    skip: int = Query(0, ge=0),
    limit: int = Query(10, ge=1, le=100)
):
    """List all companies"""
    companies = await CompanyDoc.find_all().skip(skip).limit(limit).to_list()
    return companies


@router.get("/companies/{company_id}/dashboard")
async def get_company_dashboard(
    company_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get comprehensive dashboard data for a company"""
    # Check authorization
    if not ((current_user["user_type"] == "company" and current_user["user_id"] == company_id) or
            (current_user["user_type"] == "company_user" and current_user.get("company_id") == company_id)):
        raise HTTPException(status_code=403, detail="Not authorized")
    
    company_oid = PydanticObjectId(company_id)
    
    # Recent applications (last 7 days)
    seven_days_ago = datetime.utcnow() - timedelta(days=7)
    recent_applications = await JobApplicationDoc.find(
        JobApplicationDoc.company_id == company_oid,
        JobApplicationDoc.applied_at >= seven_days_ago
    ).sort("-applied_at").limit(10).to_list()
    
    # Pending interviews
    pending_interviews = await InterviewDoc.find(
        InterviewDoc.company_id == company_oid,
        InterviewDoc.status == InterviewStatus.SCHEDULED
    ).sort("scheduled_at").limit(5).to_list()
    
    # Recent notifications
    recipient_type = "company" if current_user["user_type"] == "company" else "company_user"
    recent_notifications = await NotificationDoc.find(
        NotificationDoc.recipient_type == recipient_type,
        NotificationDoc.recipient_id == PydanticObjectId(current_user["user_id"]),
        NotificationDoc.is_read == False
    ).sort("-created_at").limit(5).to_list()
    
    # Top performing jobs
    top_jobs_pipeline = [
        {"$match": {"company_id": company_oid, "is_active": True}},
        {"$sort": {"applications_count": -1}},
        {"$limit": 5},
        {"$project": {"role_title": 1, "applications_count": 1, "created_at": 1}}
    ]
    top_jobs = await JobDescriptionDoc.aggregate(top_jobs_pipeline).to_list()
    
    return {
        "recent_applications": recent_applications,
        "pending_interviews": pending_interviews,
        "recent_notifications": recent_notifications,
        "top_performing_jobs": top_jobs,
        "generated_at": datetime.utcnow()
    }


@router.get("/companies/{company_id}/reports/hiring-funnel")
async def get_hiring_funnel_report(
    company_id: str,
    start_date: Optional[datetime] = Query(None),
    end_date: Optional[datetime] = Query(None),
    jd_id: Optional[str] = Query(None),
    current_user: dict = Depends(get_current_user)
):
    """Get hiring funnel report for a company"""
    # Check authorization
    if not ((current_user["user_type"] == "company" and current_user["user_id"] == company_id) or
            (current_user["user_type"] == "company_user" and current_user.get("company_id") == company_id)):
        raise HTTPException(status_code=403, detail="Not authorized")
    
    company_oid = PydanticObjectId(company_id)
    match_conditions = {"company_id": company_oid}
    
    if start_date:
        match_conditions["applied_at"] = {"$gte": start_date}
    if end_date:
        if "applied_at" in match_conditions:
            match_conditions["applied_at"]["$lte"] = end_date
        else:
            match_conditions["applied_at"] = {"$lte": end_date}
    if jd_id:
        match_conditions["jd_id"] = PydanticObjectId(jd_id)
    
    # Hiring funnel pipeline
    pipeline = [
        {"$match": match_conditions},
        {
            "$group": {
                "_id": "$application_status",
                "count": {"$sum": 1}
            }
        }
    ]
    
    funnel_data = await JobApplicationDoc.aggregate(pipeline).to_list()
    
    # Convert to structured funnel
    status_order = ["applied", "jd_screened", "interview_scheduled", "interviewed", "selected", "rejected"]
    funnel = {}
    
    for status in status_order:
        funnel[status] = 0
    
    for item in funnel_data:
        if item["_id"] in funnel:
            funnel[item["_id"]] = item["count"]
    
    return {
        "funnel": funnel,
        "total_applications": sum(funnel.values()),
        "conversion_rates": {
            "jd_screening": (funnel["jd_screened"] / funnel["applied"] * 100) if funnel["applied"] > 0 else 0,
            "interview": (funnel["interview_scheduled"] / funnel["jd_screened"] * 100) if funnel["jd_screened"] > 0 else 0,
            "selection": (funnel["selected"] / funnel["interviewed"] * 100) if funnel["interviewed"] > 0 else 0
        },
        "generated_at": datetime.utcnow()
    }

@router.get("/companies/{company_id}/reports/interview-analytics")
async def get_interview_analytics_report(
    company_id: str,
    start_date: Optional[datetime] = Query(None),
    end_date: Optional[datetime] = Query(None),
    current_user: dict = Depends(get_current_user)
):
    """Get interview analytics report"""
    # Check authorization
    if not ((current_user["user_type"] == "company" and current_user["user_id"] == company_id) or
            (current_user["user_type"] == "company_user" and current_user.get("company_id") == company_id)):
        raise HTTPException(status_code=403, detail="Not authorized")
    
    company_oid = PydanticObjectId(company_id)
    match_conditions = {"company_id": company_oid, "status": "completed"}
    
    if start_date:
        match_conditions["completed_at"] = {"$gte": start_date}
    if end_date:
        if "completed_at" in match_conditions:
            match_conditions["completed_at"]["$lte"] = end_date
        else:
            match_conditions["completed_at"] = {"$lte": end_date}
    
    # Interview analytics pipeline
    pipeline = [
        {"$match": match_conditions},
        {
            "$group": {
                "_id": None,
                "total_interviews": {"$sum": 1},
                "avg_overall_score": {"$avg": "$overall_score"},
                "avg_technical_score": {"$avg": "$technical_score"},
                "avg_communication_score": {"$avg": "$communication_score"},
                "avg_behavioral_score": {"$avg": "$behavioral_score"},
                "avg_duration": {"$avg": "$duration_minutes"},
                "hire_recommendations": {
                    "$sum": {"$cond": [{"$eq": ["$recommendation", "hire"]}, 1, 0]}
                },
                "reject_recommendations": {
                    "$sum": {"$cond": [{"$eq": ["$recommendation", "reject"]}, 1, 0]}
                }
            }
        }
    ]
    
    analytics = await InterviewDoc.aggregate(pipeline).to_list()
    
    if not analytics:
        return {
            "message": "No completed interviews found",
            "generated_at": datetime.utcnow()
        }
    
    data = analytics[0]
    
    return {
        "total_interviews": data["total_interviews"],
        "average_scores": {
            "overall": round(data["avg_overall_score"] or 0, 2),
            "technical": round(data["avg_technical_score"] or 0, 2),
            "communication": round(data["avg_communication_score"] or 0, 2),
            "behavioral": round(data["avg_behavioral_score"] or 0, 2)
        },
        "average_duration_minutes": round(data["avg_duration"] or 0, 2),
        "recommendations": {
            "hire": data["hire_recommendations"],
            "reject": data["reject_recommendations"],
            "hire_rate": round((data["hire_recommendations"] / data["total_interviews"]) * 100, 2) if data["total_interviews"] > 0 else 0
        },
        "generated_at": datetime.utcnow()
    }