# backend/auth/routes/auth_routes.py
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from auth.mongo_db.mongo_schema import CompanyCreate, CompanyLogin, CompanyResponse
from auth.mongo_db.mongo_op import (
    save_company, get_company_by_id,
    get_companies_by_sector, authenticate_company
)

router = APIRouter()

@router.post("/register", response_model=CompanyResponse)
async def register_company(company: CompanyCreate):
    """Register a new company"""
    try:
        result = await save_company(company)
        return result
    except HTTPException as e:
        raise e
    except Exception as e:
        print(f"Error registering company: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to register company")

@router.post("/login", response_model=CompanyResponse)  # Fixed: removed /companies
async def login_company(login_data: CompanyLogin):
    """Company login"""
    try:
        company = await authenticate_company(login_data.email, login_data.password)
        if company:
            return company
        else:
            raise HTTPException(status_code=401, detail="Invalid email or password")
    except HTTPException as e:
        raise e
    except Exception as e:
        print(f"Error during company login: {str(e)}")
        raise HTTPException(status_code=500, detail="Login failed")

@router.get("/{company_id}", response_model=CompanyResponse)  # Fixed: removed /companies
async def get_company(company_id: str):
    """Get company by ID"""
    try:
        company = await get_company_by_id(company_id)
        if company:
            return company
        else:
            raise HTTPException(status_code=404, detail="Company not found")
    except HTTPException as e:
        raise e
    except Exception as e:
        print(f"Error getting company: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to get company")

@router.get("/sector/{sector}", response_model=List[CompanyResponse])  # Fixed: removed /companies
async def get_companies_by_sector_endpoint(
    sector: str, 
    limit: int = 10, 
    skip: int = 0
):
    """Get companies by sector"""
    try:
        companies = await get_companies_by_sector(sector, limit, skip)
        return companies
    except Exception as e:
        print(f"Error getting companies by sector: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to get companies")