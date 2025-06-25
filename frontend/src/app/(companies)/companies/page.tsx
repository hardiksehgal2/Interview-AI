/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";
import React, { useState, useEffect } from "react";
import {
  MapPin,
  Globe,
  Users,
  Building2,
  Star,
  Calendar,
  ArrowRight,
  Search,
  Filter,
  ChevronDown,
} from "lucide-react";
import { NavbarDemo } from "@/components/NavbarMain";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import AxiosInstances from "@/services/AxiosInstance";
import { ShimmerGrid } from "@/components/shimmer/CompaniesSkeleton";
import Image from "next/image";
import { useRouter } from 'next/navigation';
import Link from "next/link";
interface CompanyData {
  name: string;
  email: string;
  size: string;
  type: string;
  industry: string;
  location: string;
  website: string;
  phone: string;
  description: string;
  logo_url: string;
  subscription_plan: string;
  _id: string;
  is_verified: boolean;
  created_at: string;
  updated_at: string | null;
}

const Companies = () => {
  const [companies, setCompanies] = useState<CompanyData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedIndustry, setSelectedIndustry] = useState("all");
  const [isLoaded, setIsLoaded] = useState(false);
  const router = useRouter();

  // Fetch companies data
  useEffect(() => {
    const fetchCompanies = async () => {
      try {
        const { data } = await AxiosInstances.get<CompanyData[]>("/companies");
        setCompanies(data);
        setTimeout(() => setIsLoaded(true), 100);
      } catch (error) {
        console.error("Failed to fetch companies:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchCompanies();
  }, []);

  // Filter companies based on search and industry
  const filteredCompanies = companies.filter((company) => {
    const matchesSearch =
      company.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      company.industry?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      company.location?.toLowerCase().includes(searchTerm.toLowerCase());

    const industry = company.industry ?? "";
    const matchesIndustry =
      selectedIndustry === "all" ||
      industry.toLowerCase() === selectedIndustry.toLowerCase();

    return matchesSearch && matchesIndustry;
  });

  // Get unique industries for filter
  const industries = [
    "all",
    ...Array.from(new Set(companies.map((company) => company.industry))),
  ];

  // Get company logo or first letter
  const getCompanyLogo = (company: CompanyData) => {
    if (
      company.logo_url &&
      company.logo_url !== "string" &&
      company.logo_url.startsWith("data:image")
    ) {
      return (
        <Image
          src={company.logo_url}
          alt={company.name}
          width={48}
          height={48}
          className="object-contain"
        />
      );
    }

    return (
      <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
        <span className="text-white font-bold text-lg">
          {company.name.charAt(0).toUpperCase()}
        </span>
      </div>
    );
  };

  // Get subscription plan styling
  const getSubscriptionStyling = (plan: string) => {
    const styles = {
      free: "bg-gray-100 text-gray-800 border-gray-200",
      pro: "bg-blue-100 text-blue-800 border-blue-200",
      enterprise: "bg-purple-100 text-purple-800 border-purple-200",
    };
    return styles[plan as keyof typeof styles] || styles.free;
  };

  // Get industry color
  const getIndustryColor = (industry: string) => {
    const colors = {
      technology: "bg-blue-100 text-blue-800",
      IT: "bg-green-100 text-green-800",
      finance: "bg-yellow-100 text-yellow-800",
      healthcare: "bg-red-100 text-red-800",
      education: "bg-purple-100 text-purple-800",
      retail: "bg-pink-100 text-pink-800",
    };
    return (
      colors[industry as keyof typeof colors] || "bg-gray-100 text-gray-800"
    );
  };

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
    });
  };

  // Get company size label
  const getCompanySizeLabel = (size: number) => {
    if (size <= 10) return "Startup";
    if (size <= 50) return "Small";
    if (size <= 200) return "Medium";
    return "Large";
  };

  const handleApply = (id: string) => {
    window.open(`/companies/view-profile?company_id=${id}`, '_blank');
  };
  
  return (
    <>
      <NavbarDemo />
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
        {/* Hero Section */}
        <div className="relative overflow-hidden bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-800">
          <div className="absolute inset-0 bg-black opacity-20"></div>
          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
            <h1 className="text-5xl md:text-6xl font-bold text-center text-white mb-6">
              Discover Amazing
              <span className="block bg-gradient-to-r from-yellow-400 to-orange-400 bg-clip-text text-transparent">
                Companies
              </span>
            </h1>
            <p className="text-xl text-indigo-100 max-w-3xl text-center mx-auto ">
              Explore innovative companies across various industries. Find your
              next career opportunity or business partner.
            </p>
            {/* <div className="flex items-center justify-center space-x-4 text-indigo-200">
                <div className="flex items-center">
                  <Building2 className="w-5 h-5 mr-2" />
                  <span>{companies.length} Companies</span>
                </div>
                <div className="w-1 h-1 bg-indigo-300 rounded-full"></div>
                <div className="flex items-center">
                  <Users className="w-5 h-5 mr-2" />
                  <span>{industries.length - 1} Industries</span>
                </div>
              </div> */}
          </div>
        </div>

        {/* Search and Filter Section */}
        {!isLoaded ? (
          <ShimmerGrid /> // 👈 Show shimmer when not loaded
        ) : (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div
              className={`transform transition-all duration-700 ease-out ${
                isLoaded
                  ? "translate-y-0 opacity-100"
                  : "translate-y-4 opacity-0"
              }`}
              style={{ transitionDelay: "200ms" }}
            >
              <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 mb-8">
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <Input
                      placeholder="Search companies, industries, locations..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 h-12 border-gray-200 focus:border-indigo-500 focus:ring-indigo-500"
                    />
                  </div>
                  <div className="relative">
                    <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <select
                      value={selectedIndustry}
                      onChange={(e) => setSelectedIndustry(e.target.value)}
                      className="pl-10 pr-8 h-12 border border-gray-200 rounded-lg focus:border-indigo-500 focus:ring-indigo-500 bg-white min-w-[200px] appearance-none"
                    >
                      {industries.map((industry) => (
                        <option key={industry} value={industry}>
                          {industry === "all" ? "All Industries" : industry}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none" />
                  </div>
                </div>
              </div>
            </div>

            {/* Results Counter */}
            <div
              className={`transform transition-all duration-700 ease-out mb-6 ${
                isLoaded
                  ? "translate-y-0 opacity-100"
                  : "translate-y-4 opacity-0"
              }`}
              style={{ transitionDelay: "300ms" }}
            >
              <p className="text-gray-600 text-lg">
                Showing{" "}
                <span className="font-semibold text-indigo-600">
                  {filteredCompanies.length}
                </span>{" "}
                companies
              </p>
            </div>

            {/* Companies Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredCompanies.map((company, index) => (
                <div
                  key={company._id}
                  className={`transform transition-all duration-700 ease-out ${
                    isLoaded
                      ? "translate-y-0 opacity-100"
                      : "translate-y-8 opacity-0"
                  }`}
                  style={{ transitionDelay: `${400 + index * 100}ms` }}
                >
                  <Card className="group hover:shadow-xl  hover:-translate-y-2 transition-all duration-300 border-0 shadow-lg overflow-hidden h-72 bg-white">
                    <CardContent className="p-6">
                      {/* Header */}
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center space-x-3">
                          {getCompanyLogo(company)}
                          <div className="flex-1">
                            <h3 className="font-bold text-lg text-gray-900 group-hover:text-indigo-600 transition-colors">
                              {company.name}
                            </h3>
                            <Badge
                              className={`${getIndustryColor(
                                company.industry
                              )} border-0 text-xs`}
                            >
                              {company.industry}
                            </Badge>
                          </div>
                        </div>
                        {/* <Badge
                          className={`${getSubscriptionStyling(
                            company.subscription_plan
                          )} border text-xs font-medium`}
                        >
                          {company.subscription_plan.charAt(0).toUpperCase() +
                            company.subscription_plan.slice(1)}
                        </Badge> */}
                      </div>

                      {/* Description */}
                      <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                        {company.description}
                      </p>

                      {/* Company Details */}
                      <div className="space-y-2 mb-4">
                        <div className="flex items-center text-sm text-gray-500">
                          <MapPin className="w-4 h-4 mr-2" />
                          <span>{company.location}</span>
                        </div>
                        <div className="flex items-center text-sm text-gray-500">
                          <Users className="w-4 h-4 mr-2" />
                          <span>
                            {company.size} employees 
                            {/* {getCompanySizeLabel(company)} */}
                          </span>
                        </div>
                        {company.website && (
                          <div className="flex items-center text-sm text-gray-500">
                            <Globe className="w-4 h-4 mr-2" />
                            <span className="truncate">{company.website}</span>
                          </div>
                        )}
                      </div>

                      {/* Footer */}
                      <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                        <div className="flex items-center text-xs text-gray-400">
                          <Calendar className="w-3 h-3 mr-1" />
                          <span>Since {formatDate(company.created_at)}</span>
                        </div>
                        <Button
                          size="sm"
                          onClick={()=>handleApply(company._id)}
                          className="bg-indigo-600 hover:bg-indigo-700 cursor-pointer text-white group-hover:shadow-md transition-all"
                        >
                          View Details
                          <ArrowRight className="w-3 h-3 ml-1 group-hover:translate-x-1 transition-transform" />
                        </Button>
                      </div>

                      {/* Verification Badge */}
                      {company.is_verified && (
                        <div className="absolute top-4 right-4">
                          <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                            <Star className="w-3 h-3 text-white fill-current" />
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              ))}
            </div>

            {/* Empty State */}
            {filteredCompanies.length === 0 && (
              <div className="text-center py-16">
                <Building2 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  No companies found
                </h3>
                <p className="text-gray-600 mb-4">
                  Try adjusting your search terms or filter criteria
                </p>
                <Button
                  onClick={() => {
                    setSearchTerm("");
                    setSelectedIndustry("all");
                  }}
                  variant="outline"
                >
                  Clear Filters
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
};

export default Companies;
