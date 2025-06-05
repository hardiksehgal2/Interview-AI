# backend/auth/mongo_db/mongo_op.py
import datetime
from typing import List, Optional
import bcrypt
from bson import ObjectId
from fastapi import HTTPException
from pymongo.errors import DuplicateKeyError
from auth.mongo_db.mongo_schema import CompanyCreate, CompanyInDB, CompanyResponse
from dotenv import load_dotenv
import os

import services.mongo_op as mongo_service

load_dotenv()
COMPANY_COLLECTION = "companies"

async def debug_db_connection():
    """Debug function to check database status"""
    # print(f"DB object: {mongo_service.db}")
    # print(f"DB type: {type(mongo_service.db)}")
    if mongo_service.db is not None:
        try:
            collections = await mongo_service.db.list_collection_names()
            print(f"Available collections: {collections}")
        except Exception as e:
            print(f"Error listing collections: {e}")

async def create_company_index():
    """Create unique index on email field"""
    try:
        if mongo_service.db is None:
            print("Database connection not available for index creation")
            return
        await mongo_service.db[COMPANY_COLLECTION].create_index("email", unique=True)
        print("Company email index created successfully")
    except Exception as e:
        print(f"Error creating company index: {str(e)}")

async def hash_password(password: str) -> str:
    """Hash password using bcrypt"""
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password.encode('utf-8'), salt)
    return hashed.decode('utf-8')

async def verify_password(password: str, hashed_password: str) -> bool:
    """Verify password against hash"""
    return bcrypt.checkpw(password.encode('utf-8'), hashed_password.encode('utf-8'))

async def save_company(company_data: CompanyCreate) -> CompanyResponse:
    """Save a new company to the database"""
    try:
        await debug_db_connection()
        if mongo_service.db is None:
            raise HTTPException(status_code=500, detail="Database connection not available")
        
        # Hash the password
        hashed_password = await hash_password(company_data.password)
        
        # Create company document
        company_dict = company_data.dict(exclude={"password"})
        company_dict["password_hash"] = hashed_password
        company_dict["created_at"] = datetime.datetime.utcnow()
        company_dict["updated_at"] = datetime.datetime.utcnow()
        company_dict["is_active"] = True
        
        # Insert into database
        result = await mongo_service.db[COMPANY_COLLECTION].insert_one(company_dict)
        
        # Retrieve the created company
        created_company = await mongo_service.db[COMPANY_COLLECTION].find_one({"_id": result.inserted_id})
        
        if created_company:
            created_company["_id"] = str(created_company["_id"])
            return CompanyResponse(**created_company)
        else:
            raise HTTPException(status_code=500, detail="Failed to retrieve created company")
            
    except DuplicateKeyError:
        raise HTTPException(status_code=400, detail="Company with this email already exists")
    except Exception as e:
        print(f"Error saving company: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to save company")

async def get_company_by_id(company_id: str) -> Optional[CompanyResponse]:
    """Get company by ID"""
    try:
        if mongo_service.db is None:
            return None
            
        if not ObjectId.is_valid(company_id):
            return None
            
        company = await mongo_service.db[COMPANY_COLLECTION].find_one({"_id": ObjectId(company_id)})
        
        if company:
            company["_id"] = str(company["_id"])
            return CompanyResponse(**company)
        return None
        
    except Exception as e:
        print(f"Error getting company by ID: {str(e)}")
        return None

async def get_companies_by_sector(sector: str, limit: int = 10, skip: int = 0) -> List[CompanyResponse]:
    """Get companies by sector"""
    try:
        if mongo_service.db is None:
            return []
            
        cursor = mongo_service.db[COMPANY_COLLECTION].find(
            {"sector": sector, "is_active": True}
        ).skip(skip).limit(limit)
        
        companies = []
        async for company in cursor:
            company["_id"] = str(company["_id"])
            companies.append(CompanyResponse(**company))
        
        return companies
        
    except Exception as e:
        print(f"Error getting companies by sector: {str(e)}")
        return []

async def get_company_by_email(email: str) -> Optional[CompanyInDB]:
    """Get company by email (for authentication)"""
    try:
        if mongo_service.db is None:
            return None
            
        company = await mongo_service.db[COMPANY_COLLECTION].find_one({"email": email})
        
        if company:
            company["_id"] = str(company["_id"])
            return CompanyInDB(**company)
        return None
        
    except Exception as e:
        print(f"Error getting company by email: {str(e)}")
        return None

async def authenticate_company(email: str, password: str) -> Optional[CompanyResponse]:
    """Authenticate company login"""
    try:
        company = await get_company_by_email(email)
        
        if company and company.is_active:
            if await verify_password(password, company.password_hash):
                # Return company response without password hash
                company_dict = company.dict(exclude={"password_hash"},by_alias=True)
                return CompanyResponse(**company_dict)
        
        return None
        
    except Exception as e:
        print(f"Error authenticating company: {str(e)}")
        return None