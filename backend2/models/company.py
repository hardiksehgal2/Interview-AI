from pydantic import BaseModel, Field, EmailStr, validator
from typing import Optional, List
from enum import Enum
import datetime
from bson import ObjectId

class CompanyType(str, Enum):
    PRODUCT = "product"
    SERVICE = "service"
    BOTH = "both"

class CompanySector(str, Enum):
    TECHNOLOGY = "technology"
    HEALTHCARE = "healthcare"
    FINANCE = "finance"
    EDUCATION = "education"
    MANUFACTURING = "manufacturing"
    RETAIL = "retail"
    CONSULTING = "consulting"
    MEDIA = "media"
    REAL_ESTATE = "real_estate"
    TRANSPORTATION = "transportation"
    ENERGY = "energy"
    AGRICULTURE = "agriculture"
    HOSPITALITY = "hospitality"
    GOVERNMENT = "government"
    NON_PROFIT = "non_profit"
    OTHER = "other"

class CompanyCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=200, description="Company name")
    description: str = Field(..., min_length=10, max_length=2000, description="Company description")
    no_of_employees: int = Field(..., ge=1, le=1000000, description="Number of employees")
    email: EmailStr = Field(..., description="Company contact email")
    sector: Optional[CompanySector] = Field(None, description="Company sector/industry")
    company_type: Optional[CompanyType] = Field(None, description="Product or service based company")
    password: str = Field(..., min_length=8, description="Company password")
    
    # When you use Enums (CompanyType, CompanySector), by default, Pydantic would return the full Enum object in your response, like:
    # "company_type": "CompanyType.PRODUCT"
    #But when you set: use_enum_values = True
    #It only returns the value, not the full object: "company_type": "product"
    class Config:
        use_enum_values = True
        # Every datetime object will be converted like this:
        # datetime.datetime(2025, 6, 5, 15, 0).isoformat()
        # → "2025-06-05T15:00:00"

        json_encoders = {
            datetime.datetime: lambda v: v.isoformat()
        }

class CompanyInDB(BaseModel):
    id: Optional[str] = Field(None, alias="_id")
    name: str
    description: str
    no_of_employees: int
    email: EmailStr
    sector: Optional[CompanySector] = None
    company_type: Optional[CompanyType] = None
    password_hash: str  # Store hashed password, not plain text
    created_at: datetime.datetime = Field(default_factory=datetime.datetime.utcnow)
    updated_at: datetime.datetime = Field(default_factory=datetime.datetime.utcnow)
    is_active: bool = Field(default=True)
    
    class Config:
        use_enum_values = True
        allow_population_by_field_name = True
        json_encoders = {
            ObjectId: str,
            datetime.datetime: lambda v: v.isoformat()
        }

class CompanyResponse(BaseModel):
    id: str = Field(..., alias="_id")
    name: str
    description: str
    no_of_employees: int
    email: EmailStr
    sector: Optional[CompanySector] = None
    company_type: Optional[CompanyType] = None
    created_at: datetime.datetime
    updated_at: datetime.datetime
    is_active: bool
    
    class Config:
        use_enum_values = True
        allow_population_by_field_name = True
        json_encoders = {
            datetime.datetime: lambda v: v.isoformat()
        }

class CompanyLogin(BaseModel):
    email: EmailStr
    password: str