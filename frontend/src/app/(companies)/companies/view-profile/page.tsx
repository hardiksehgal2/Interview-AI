/* eslint-disable @typescript-eslint/no-unused-vars */
// frontend\src\app\(companies)\companies\view-profile\page.tsx
'use client'
import React, { useState, useEffect } from 'react'
import { useSearchParams } from "next/navigation";
import { useRouter } from "next/navigation";
import AxiosInstances from '@/services/AxiosInstance'
import { 
  MapPin, 
  Globe, 
  Phone, 
  Mail, 
  Users, 
  Building2, 
  Calendar,
  Briefcase
} from 'lucide-react'
import AllJobs from './components/AllJobs';

interface Company {
  _id: string;
  name: string;
  email: string;
  size: number;
  type: string;
  industry: string;
  location: string;
  website: string;
  phone: string;
  description: string;
  logo_url: string;
  subscription_plan: string;
  is_verified: boolean;
  created_at: string;
  updated_at: string;
}

const ViewProfile = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const companyId = searchParams.get('company_id');
  
  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'jobs'>('overview');

  useEffect(() => {
    const fetchCompanyProfile = async () => {
      if (!companyId) {
        setError('Company ID is missing');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const response = await AxiosInstances.get(`/companies/${companyId}`);
        
        if (response.data) {
          setCompany(response.data);
          console.log("Company data:", response.data);
        } else {
          setError('Company not found');
        }
      } catch (err) {
        console.error('Error fetching company profile:', err);
        setError('Failed to load company profile');
      } finally {
        setLoading(false);
      }
    };

    fetchCompanyProfile();
  }, [companyId]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getIndustryTags = (industry: string, type: string) => {
    const tags = [industry, type];
    // Add some common related tags based on industry
    if (industry?.toLowerCase().includes('tech')) {
      tags.push('Software', 'Innovation');
    }
    if (type?.toLowerCase().includes('product')) {
      tags.push('Product Development');
    }
    return tags.filter(Boolean);
  };

  const getSizeLabel = (size: number) => {
    if (size === 1) return 'Startup (1 employee)';
    if (size <= 10) return `Small (${size} employees)`;
    if (size <= 50) return `Medium (${size} employees)`;
    if (size <= 250) return `Large (${size} employees)`;
    return `${size}+ employees`;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="text-lg text-gray-600">Loading company profile...</p>
        </div>
      </div>
    );
  }

  if (error || !company) {
    return (
      <div className="flex flex-col justify-center items-center min-h-screen gap-4">
        <p className="text-lg text-red-600">{error || 'Company not found'}</p>
        <button
          onClick={() => router.push('/companies')}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          Back to Companies
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header Section */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
            {/* Company Info */}
            <div className="flex flex-col sm:flex-row items-start gap-6">
              {/* Logo */}
              <div className="flex-shrink-0">
                <div className="w-20 h-20 lg:w-24 lg:h-24 rounded-2xl overflow-hidden bg-gray-100 border border-gray-200 shadow-sm">
                  {company.logo_url ? (
                    <img 
                      src={company.logo_url} 
                      alt={`${company.name} logo`}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                      <span className="text-white text-2xl font-bold">
                        {company.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}
                </div>
              </div>
  
              {/* Company Details */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-3xl lg:text-4xl font-bold text-gray-900 truncate">
                    {company.name}
                  </h1>
                  {company.is_verified && (
                    <div className="flex-shrink-0 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                      <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                  )}
                </div>
                
                <p className="text-lg text-gray-600 mb-4 max-w-3xl">
                  {company.description}
                </p>
  
                {/* Tags */}
                <div className="flex flex-wrap gap-2 mb-4">
                  {getIndustryTags(company.industry, company.type).map((tag, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-700 border"
                    >
                      {tag.charAt(0).toUpperCase() + tag.slice(1)}
                    </span>
                  ))}
                </div>
  
                {/* Location */}
                <div className="flex items-center text-gray-600">
                  <MapPin className="w-5 h-5 mr-2" />
                  <span className="text-base">{company.location}</span>
                </div>
              </div>
            </div>
  
            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 lg:flex-col">
              <button
                onClick={() => setActiveTab('jobs')}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center justify-center gap-2"
              >
                <Briefcase className="w-5 h-5" />
                View Jobs
              </button>
              {company.website && (
                <a
                  href={company.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium flex items-center justify-center gap-2"
                >
                  <Globe className="w-5 h-5" />
                  Visit Website
                </a>
              )}
            </div>
          </div>
        </div>
      </div>
  
      {/* Tab Navigation */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8">
            <button
              onClick={() => setActiveTab('overview')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'overview'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab('jobs')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'jobs'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Jobs
            </button>
          </nav>
        </div>
      </div>
  
      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'overview' ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-8">
              {/* About Section */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">About {company.name}</h2>
                <div className="prose max-w-none">
                  <p className="text-gray-700 leading-relaxed text-base">
                    {company.description}
                  </p>
                </div>
              </div>
  
              {/* Company Stats */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Company Overview</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                      <Users className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">Company Size</p>
                      <p className="text-lg font-semibold text-gray-900">{getSizeLabel(company.size)}</p>
                    </div>
                  </div>
  
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                      <Building2 className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">Industry</p>
                      <p className="text-lg font-semibold text-gray-900 capitalize">{company.industry}</p>
                    </div>
                  </div>
  
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                      <Briefcase className="w-5 h-5 text-purple-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">Company Type</p>
                      <p className="text-lg font-semibold text-gray-900 capitalize">{company.type}</p>
                    </div>
                  </div>
  
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                      <Calendar className="w-5 h-5 text-orange-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">Founded</p>
                      <p className="text-lg font-semibold text-gray-900">{formatDate(company.created_at)}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
  
            {/* Sidebar */}
            <div className="space-y-6">
              {/* Contact Information */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-4">Contact Information</h3>
                <div className="space-y-4">
                  {company.website && (
                    <div className="flex items-center space-x-3">
                      <Globe className="w-5 h-5 text-gray-400" />
                      <a
                        href={company.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 truncate"
                      >
                        {company.website.replace(/^https?:\/\//, '')}
                      </a>
                    </div>
                  )}
                  
                  <div className="flex items-center space-x-3">
                    <Mail className="w-5 h-5 text-gray-400" />
                    <a
                      href={`mailto:${company.email}`}
                      className="text-blue-600 hover:text-blue-800 truncate"
                    >
                      {company.email}
                    </a>
                  </div>
  
                  {company.phone && (
                    <div className="flex items-center space-x-3">
                      <Phone className="w-5 h-5 text-gray-400" />
                      <a
                        href={`tel:${company.phone}`}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        {company.phone}
                      </a>
                    </div>
                  )}
  
                  <div className="flex items-center space-x-3">
                    <MapPin className="w-5 h-5 text-gray-400" />
                    <span className="text-gray-700">{company.location}</span>
                  </div>
                </div>
              </div>
  
              {/* Quick Actions */}
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-200 p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-4">Interested in joining?</h3>
                <p className="text-gray-600 text-sm mb-4">
                  Explore available opportunities and see if {company.name} is the right fit for your career.
                </p>
                <button
                  onClick={() => setActiveTab('jobs')}
                  className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center justify-center gap-2"
                >
                  <Briefcase className="w-5 h-5" />
                  View Open Positions
                </button>
              </div>
            </div>
          </div>
        ) : (
          <AllJobs companyId={company._id} companyName={company.name} />
        )}
      </div>
    </div>
  );
};

export default ViewProfile;