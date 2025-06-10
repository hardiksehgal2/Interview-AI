/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"
import React, { useState, useEffect } from 'react';
import {
    Building2,
    Mail,
    Phone,
    Globe,
    MapPin,
    Users,
    Briefcase,
    Shield,
    ShieldCheck,
    Edit,
    Camera,
    Crown,
    Building,
} from 'lucide-react';
import { useRouter } from "next/navigation";

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TokenManager } from '@/utils/tokenManager';
import { toast } from 'react-hot-toast';
import AxiosInstances from '@/services/AxiosInstance';
import { withAuth } from '@/wrapper/authWrapper';

interface CompanyData {
    name: string;
    email: string;
    size: string | null;
    type: string | null;
    industry: string | null;
    location: string | null;
    website: string | null;
    phone: string | null;
    description: string;
    logo_url: string | null;
    subscription_plan: string;
    _id: string;
    is_verified: boolean;
    created_at: string;
    updated_at: string;
}
interface City {
    id: string;
    name: string;
    state: string;
}
const CompanyProfile: React.FC = () => {
    const [company, setCompany] = useState<CompanyData | null>(null);
    const [isLoaded, setIsLoaded] = useState(false);
    const [selectedCity, setSelectedCity] = useState<City | null>(null);
    const [isCityOpen, setIsCityOpen] = useState(false);
    const router = useRouter();
    const handleCitySelect = (city: City) => {
        setSelectedCity(city);
        setIsCityOpen(false);
    };
    // Fetch company from API on mount
    useEffect(() => {
        const fetchCompany = async () => {
            const userData = TokenManager.getUserData();
            if (!userData || !userData.id) {
                toast.error('Unable to get company information. Please log in again.');
                return;
            }

            try {
                const { data } = await AxiosInstances.get<CompanyData>(`/companies/${userData.id}`);
                setCompany(data);
            } catch (error) {
                console.error(error);
                toast.error('Failed to load company information.');
            } finally {
                // small delay for entry animation
                setTimeout(() => setIsLoaded(true), 300);
            }
        };

        fetchCompany();
    }, []);

    // Helper to format ISO date strings
    const formatDate = (dateString: string) =>
        new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        });

    const getSubscriptionBadge = (plan: string) => {
        const variants = {
            free: { color: 'bg-gray-100 text-gray-800', icon: Shield },
            pro: { color: 'bg-indigo-100 text-indigo-800', icon: ShieldCheck },
            enterprise: { color: 'bg-purple-100 text-purple-800', icon: Crown },
        } as const;

        const variant = variants[plan as keyof typeof variants] || variants.free;
        const Icon = variant.icon;

        return (
            <Badge className={`${variant.color} border-0 font-medium`}>
                <Icon className="w-3 h-3 mr-1" />
                {plan.charAt(0).toUpperCase() + plan.slice(1)}
            </Badge>
        );
    };

    const EmptyState = ({ label }: { label: string }) => (
        <div className="flex items-center justify-center h-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200 transition-colors hover:bg-gray-100">
            <span className="text-gray-500 text-sm">No {label.toLowerCase()} provided</span>
        </div>
    );
    const handleApply = () => {
        router.push("/company-profile/edit")
    }
    const InfoCard = ({
        icon: Icon,
        label,
        value,
        delay = 0,
    }: {
        icon: any;
        label: string;
        value: string | null;
        delay?: number;
    }) => (
        <div
            className={`transform transition-all duration-500 ease-out ${isLoaded ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
                }`}
            style={{ transitionDelay: `${delay}ms` }}
        >
            <div className="flex items-start min-h-20 h-full space-x-3 p-4 bg-white rounded-lg border border-gray-200 hover:border-gray-300 hover:shadow-sm transition-all duration-200">
                <div className="flex-shrink-0">
                    <div className="w-10 h-10 bg-indigo-50 rounded-lg flex items-center justify-center">
                        <Icon className="w-5 h-5 text-indigo-600" />
                    </div>
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 mb-1">{label}</p>
                    {value ? <p className="text-gray-700">{value}</p> : <EmptyState label={label} />}
                </div>
            </div>
        </div>
    );

    // Render loading state until company is fetched
    if (!company) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <p className="text-gray-500">Loading company information…</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen   bg-white p-6">
            <div className="w-full mx-auto">
                {/* Header */}
                <div
                    className={`transform transition-all duration-700 ease-out ${isLoaded ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
                        }`}
                >
                    <Card className="mb-8 overflow-hidden border-0 shadow-lg bg-gradient-to-r from-indigo-600 to-indigo-700">
                        <CardContent className="p-8">
                            <div className="flex flex-col md:flex-row items-start md:items-center justify-between">
                                <div className="flex items-center space-x-6 mb-6 md:mb-0">
                                    <div className="relative group">
                                        <div className="w-24 h-24 bg-white rounded-2xl flex items-center justify-center shadow-lg">
                                            {company.logo_url ? (
                                                <img
                                                    src={company.logo_url}
                                                    alt={company.name}
                                                    className="w-16 h-16 object-contain"
                                                />
                                            ) : (
                                                <Building2 className="w-12 h-12 text-indigo-600" />
                                            )}
                                        </div>
                                        <button className="absolute -bottom-2 -right-2 w-8 h-8 bg-indigo-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:bg-indigo-400">
                                            <Camera className="w-4 h-4 text-white" />
                                        </button>
                                    </div>

                                    <div>
                                        <div className="flex items-center space-x-3 mb-2">
                                            <h1 className="text-3xl font-bold text-white">{company.name}</h1>
                                            {company.is_verified ? (
                                                <ShieldCheck className="w-6 h-6 text-green-400" />
                                            ) : (
                                                <Shield className="w-6 h-6 text-gray-300" />
                                            )}
                                        </div>
                                        <div className="flex items-center space-x-4">
                                            {getSubscriptionBadge(company.subscription_plan)}
                                            <span className="text-indigo-100 text-sm">
                                                Member since {formatDate(company.created_at)}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <Button variant="secondary" onClick={handleApply} className="bg-white cursor-pointer text-indigo-600 hover:bg-gray-50 shadow-md">
                                    <Edit className="w-4 h-4 mr-2" />
                                    Edit Profile
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Main Content Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Company Description */}
                    <div
                        className={`lg:col-span-2 transform transition-all duration-700 ease-out ${isLoaded ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
                            }`}
                        style={{ transitionDelay: '100ms' }}
                    >
                        <Card className="border-0 shadow-md">
                            <CardHeader>
                                <CardTitle className="flex items-center">
                                    <Building className="w-5 h-5 mr-2 text-indigo-600" />
                                    About Company
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-gray-700 leading-relaxed text-lg">{company.description}</p>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Quick Stats */}
                    <div
                        className={`transform transition-all duration-700 ease-out ${isLoaded ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
                            }`}
                        style={{ transitionDelay: '200ms' }}
                    >
                        <Card className="border-0 shadow-md">
                            <CardHeader>
                                <CardTitle className="text-lg">Quick Stats</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="flex justify-between items-center">
                                    <span className="text-gray-600">Verification Status</span>
                                    <Badge variant={company.is_verified ? 'default' : 'secondary'}>
                                        {company.is_verified ? 'Verified' : 'Unverified'}
                                    </Badge>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-gray-600">Last Updated</span>
                                    <span className="text-sm text-gray-700">{formatDate(company.updated_at)}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-gray-600">Company ID</span>
                                    <span className="text-xs text-gray-500 font-mono bg-gray-100 px-2 py-1 rounded">
                                        {company._id.slice(-8)}
                                    </span>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>

                {/* Contact Information Grid */}
                <div
                    className={`mt-8 transform transition-all duration-700 ease-out ${isLoaded ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
                        }`}
                    style={{ transitionDelay: '300ms' }}
                >
                    <h2 className="text-2xl font-bold text-gray-900 mb-6">Company Information</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        <InfoCard icon={Mail} label="Email" value={company.email} delay={400} />
                        <InfoCard icon={Phone} label="Phone" value={company.phone} delay={450} />
                        <InfoCard icon={Globe} label="Website" value={company.website} delay={500} />
                        <InfoCard icon={MapPin} label="Location" value={company.location} delay={550} />
                        <InfoCard icon={Users} label="Company Size" value={company.size} delay={600} />
                        <InfoCard icon={Briefcase} label="Industry" value={company.industry} delay={650} />
                    </div>
                </div>

                {/* Company Type */}
                {company.type && (
                    <div
                        className={`mt-6 transform transition-all duration-700 ease-out ${isLoaded ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
                            }`}
                        style={{ transitionDelay: '700ms' }}
                    >
                        <InfoCard icon={Building2} label="Company Type" value={company.type} />
                    </div>
                )}
            </div>
        </div>
    );
};

export default withAuth(CompanyProfile);
