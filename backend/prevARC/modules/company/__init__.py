import os
from typing import List
from fastapi import APIRouter, Depends, HTTPException
# from db.models.company import CompanyCreate, CompanyLogin, CompanyResponse
import db.models.company as company_models
import db.mongo_db as mongo_db


router = APIRouter(prefix="/company", tags=["company"])

@router.post("/register", response_model=company_models.CompanyResponse)
async def register_company(company: company_models.CompanyCreate):
    """Register a new company"""
    try:
        result = await mongo_db.save_company(company)
        return result
    except HTTPException as e:
        raise e
    except Exception as e:
        print(f"Error registering company: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to register company")

@router.post("/login", response_model=company_models.CompanyResponse)  # Fixed: removed /companies
async def login_company(login_data: company_models.CompanyLogin):
    """Company login"""
    try:
        company = await mongo_db.authenticate_company(login_data.email, login_data.password)
        if company:
            return company
        else:
            raise HTTPException(status_code=401, detail="Invalid email or password")
    except HTTPException as e:
        raise e
    except Exception as e:
        print(f"Error during company login: {str(e)}")
        raise HTTPException(status_code=500, detail="Login failed")

@router.get("/{company_id}", response_model=company_models.CompanyResponse)  # Fixed: removed /companies
async def get_company(company_id: str):
    """Get company by ID"""
    try:
        company = await mongo_db.get_company_by_id(company_id)
        if company:
            return company
        else:
            raise HTTPException(status_code=404, detail="Company not found")
    except HTTPException as e:
        raise e
    except Exception as e:
        print(f"Error getting company: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to get company")