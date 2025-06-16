/* eslint-disable @typescript-eslint/no-unused-vars */
"use client"
import React, { useState } from 'react';
import { Eye, EyeOff, Building2, Mail, Users, FileText, Shield, CheckCircle } from 'lucide-react';
import AxiosInstances from '@/services/AxiosInstance';
import { damp } from 'three/src/math/MathUtils.js';
import toast, { Toaster } from 'react-hot-toast';
import { useRouter } from 'next/navigation';

interface FormData {
    name: string;
    description: string;
    no_of_employees: string;
    email: string;
    sector: string;
    company_type: string;
    password: string;
    confirmPassword: string;
}

interface FormErrors {
    name?: string;
    description?: string;
    no_of_employees?: string;
    email?: string;
    sector?: string;
    company_type?: string;
    password?: string;
    confirmPassword?: string;
}

const Register = () => {
    const [formData, setFormData] = useState<FormData>({
        name: '',
        description: '',
        no_of_employees: '',
        email: '',
        sector: '',
        company_type: '',
        password: '',
        confirmPassword: ''
    });
    const router = useRouter();

    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [errors, setErrors] = useState<FormErrors>({});
    const [isSubmitting, setIsSubmitting] = useState(false);

    const companySectors = [
        { value: 'technology', label: 'Technology' },
        { value: 'healthcare', label: 'Healthcare' },
        { value: 'finance', label: 'Finance' },
        { value: 'education', label: 'Education' },
        { value: 'manufacturing', label: 'Manufacturing' },
        { value: 'retail', label: 'Retail' },
        { value: 'consulting', label: 'Consulting' },
        { value: 'media', label: 'Media' },
        { value: 'real_estate', label: 'Real Estate' },
        { value: 'transportation', label: 'Transportation' },
        { value: 'energy', label: 'Energy' },
        { value: 'agriculture', label: 'Agriculture' },
        { value: 'hospitality', label: 'Hospitality' },
        { value: 'government', label: 'Government' },
        { value: 'non_profit', label: 'Non-Profit' },
        { value: 'other', label: 'Other' }
    ];

    const companyTypes = [
        { value: 'product', label: 'Product-based' },
        { value: 'service', label: 'Service-based' },
        { value: 'both', label: 'Both Product & Service' }
    ];

    const validateForm = () => {
        const newErrors: FormErrors = {};

        if (!formData.name.trim()) {
            newErrors.name = 'Company name is required';
        } else if (formData.name.length > 200) {
            newErrors.name = 'Company name must be less than 200 characters';
        }

        if (!formData.description.trim()) {
            newErrors.description = 'Company description is required';
        } else if (formData.description.length < 10) {
            newErrors.description = 'Description must be at least 10 characters';
        } else if (formData.description.length > 2000) {
            newErrors.description = 'Description must be less than 2000 characters';
        }

        const employeeCount = parseInt(formData.no_of_employees);
        if (!formData.no_of_employees) {
            newErrors.no_of_employees = 'Number of employees is required';
        } else if (isNaN(employeeCount) || employeeCount < 1) {
            newErrors.no_of_employees = 'Must be at least 1 employee';
        } else if (employeeCount > 1000000) {
            newErrors.no_of_employees = 'Must be less than 1,000,000 employees';
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!formData.email) {
            newErrors.email = 'Email is required';
        } else if (!emailRegex.test(formData.email)) {
            newErrors.email = 'Please enter a valid email address';
        }

        if (!formData.password) {
            newErrors.password = 'Password is required';
        } else if (formData.password.length < 8) {
            newErrors.password = 'Password must be at least 8 characters';
        }

        if (formData.password !== formData.confirmPassword) {
            newErrors.confirmPassword = 'Passwords do not match';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));

        // Clear error when user starts typing
        if (errors[name as keyof FormErrors]) {
            setErrors(prev => ({ ...prev, [name]: undefined }));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!validateForm()) {
            return;
        }

        setIsSubmitting(true);

        // Simulate API call
        try {
            const submitData = {
                name: formData.name.trim(),
                description: formData.description.trim(),
                no_of_employees: parseInt(formData.no_of_employees),
                email: formData.email.toLowerCase().trim(),
                sector: formData.sector || null,
                company_type: formData.company_type || null,
                password: formData.password
            };

            console.log('Submitting company registration:', submitData);

            //   Here you would make your actual API call
            const response = await AxiosInstances.post("/api/companies", submitData, {
                headers: {
                    'Content-Type': 'application/json',
                },
            });


            console.log('Registration successful:', response.data);

            toast('Company registered successfully!');
            router.push("/login")
            // Reset form on success
            setFormData({
                name: '',
                description: '',
                no_of_employees: '',
                email: '',
                sector: '',
                company_type: '',
                password: '',
                confirmPassword: ''
            });


        } catch (error) {
            console.error('Registration failed:', error);
            alert('Registration failed. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 py-6 sm:py-12 px-4 sm:px-6 lg:px-8">
            <Toaster
                position="top-right"
                reverseOrder={false}
            />
            <div className="max-w-3xl mx-auto">
                {/* Header */}
                <div className="text-center mb-6 sm:mb-8">
                    <div className="inline-flex items-center justify-center w-12 h-12 sm:w-16 sm:h-16 bg-blue-600 rounded-full mb-3 sm:mb-4">
                        <Building2 className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
                    </div>
                    <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Register Your Company</h2>
                    <p className="text-sm sm:text-base text-gray-600">Join our platform and Hire best candidates</p>
                </div>

                {/* Form */}
                <div className="bg-white rounded-2xl shadow-xl p-4 sm:p-6 lg:p-8">
                    <div className="space-y-4 sm:space-y-6">
                        {/* Company Name */}
                        <div>
                            <label htmlFor="name" className="block text-sm font-semibold text-gray-700 mb-2">
                                Company Name *
                            </label>
                            <div className="relative">
                                <Building2 className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
                                <input
                                    type="text"
                                    id="name"
                                    name="name"
                                    value={formData.name}
                                    onChange={handleInputChange}
                                    className={`w-full pl-10 sm:pl-11 pr-4 py-2.5 sm:py-3 text-sm sm:text-base border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${errors.name ? 'border-red-500' : 'border-gray-300'
                                        }`}
                                    placeholder="Enter your company name"
                                    maxLength={200}
                                />
                            </div>
                            {errors.name && <p className="mt-1 text-xs sm:text-sm text-red-600">{errors.name}</p>}
                        </div>

                        {/* Email */}
                        <div>
                            <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-2">
                                Company Email *
                            </label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
                                <input
                                    type="email"
                                    id="email"
                                    name="email"
                                    value={formData.email}
                                    onChange={handleInputChange}
                                    className={`w-full pl-10 sm:pl-11 pr-4 py-2.5 sm:py-3 text-sm sm:text-base border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${errors.email ? 'border-red-500' : 'border-gray-300'
                                        }`}
                                    placeholder="company@example.com"
                                />
                            </div>
                            {errors.email && <p className="mt-1 text-xs sm:text-sm text-red-600">{errors.email}</p>}
                        </div>

                        {/* Number of Employees */}
                        <div>
                            <label htmlFor="no_of_employees" className="block text-sm font-semibold text-gray-700 mb-2">
                                Number of Employees *
                            </label>
                            <div className="relative">
                                <Users className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
                                <input
                                    type="number"
                                    id="no_of_employees"
                                    name="no_of_employees"
                                    value={formData.no_of_employees}
                                    onChange={handleInputChange}
                                    className={`w-full pl-10 sm:pl-11 pr-4 py-2.5 sm:py-3 text-sm sm:text-base border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${errors.no_of_employees ? 'border-red-500' : 'border-gray-300'
                                        }`}
                                    placeholder="50"
                                    min="1"
                                    max="1000000"
                                />
                            </div>
                            {errors.no_of_employees && <p className="mt-1 text-xs sm:text-sm text-red-600">{errors.no_of_employees}</p>}
                        </div>

                        {/* Company Sector and Type Row */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                            {/* Company Sector */}
                            <div>
                                <label htmlFor="sector" className="block text-sm font-semibold text-gray-700 mb-2">
                                    Industry Sector
                                </label>
                                <select
                                    id="sector"
                                    name="sector"
                                    value={formData.sector}
                                    onChange={handleInputChange}
                                    className="w-full px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                                >
                                    <option value="">Select sector (optional)</option>
                                    {companySectors.map(sector => (
                                        <option key={sector.value} value={sector.value}>
                                            {sector.label}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Company Type */}
                            <div>
                                <label htmlFor="company_type" className="block text-sm font-semibold text-gray-700 mb-2">
                                    Company Type
                                </label>
                                <select
                                    id="company_type"
                                    name="company_type"
                                    value={formData.company_type}
                                    onChange={handleInputChange}
                                    className="w-full px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                                >
                                    <option value="">Select type (optional)</option>
                                    {companyTypes.map(type => (
                                        <option key={type.value} value={type.value}>
                                            {type.label}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* Company Description */}
                        <div>
                            <label htmlFor="description" className="block text-sm font-semibold text-gray-700 mb-2">
                                Company Description *
                            </label>
                            <div className="relative">
                                <FileText className="absolute left-3 top-3 w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
                                <textarea
                                    id="description"
                                    name="description"
                                    value={formData.description}
                                    onChange={handleInputChange}
                                    rows={4}
                                    className={`w-full pl-10 sm:pl-11 pr-4 py-2.5 sm:py-3 text-sm sm:text-base border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors resize-none ${errors.description ? 'border-red-500' : 'border-gray-300'
                                        }`}
                                    placeholder="Describe your company, its mission, and what makes it unique..."
                                    minLength={10}
                                    maxLength={2000}
                                />
                            </div>
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mt-1 gap-1 sm:gap-0">
                                {errors.description && <p className="text-xs sm:text-sm text-red-600">{errors.description}</p>}
                                <p className="text-xs sm:text-sm text-gray-500 sm:ml-auto">
                                    {formData.description.length}/2000 characters
                                </p>
                            </div>
                        </div>

                        {/* Password */}
                        <div>
                            <label htmlFor="password" className="block text-sm font-semibold text-gray-700 mb-2">
                                Password *
                            </label>
                            <div className="relative">
                                <Shield className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
                                <input
                                    type={showPassword ? "text" : "password"}
                                    id="password"
                                    name="password"
                                    value={formData.password}
                                    onChange={handleInputChange}
                                    className={`w-full pl-10 sm:pl-11 pr-10 sm:pr-12 py-2.5 sm:py-3 text-sm sm:text-base border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${errors.password ? 'border-red-500' : 'border-gray-300'
                                        }`}
                                    placeholder="Enter a secure password"
                                    minLength={8}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                >
                                    {showPassword ? <EyeOff className="w-4 h-4 sm:w-5 sm:h-5" /> : <Eye className="w-4 h-4 sm:w-5 sm:h-5" />}
                                </button>
                            </div>
                            {errors.password && <p className="mt-1 text-xs sm:text-sm text-red-600">{errors.password}</p>}
                        </div>

                        {/* Confirm Password */}
                        <div>
                            <label htmlFor="confirmPassword" className="block text-sm font-semibold text-gray-700 mb-2">
                                Confirm Password *
                            </label>
                            <div className="relative">
                                <Shield className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
                                <input
                                    type={showConfirmPassword ? "text" : "password"}
                                    id="confirmPassword"
                                    name="confirmPassword"
                                    value={formData.confirmPassword}
                                    onChange={handleInputChange}
                                    className={`w-full pl-10 sm:pl-11 pr-10 sm:pr-12 py-2.5 sm:py-3 text-sm sm:text-base border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${errors.confirmPassword ? 'border-red-500' : 'border-gray-300'
                                        }`}
                                    placeholder="Confirm your password"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                >
                                    {showConfirmPassword ? <EyeOff className="w-4 h-4 sm:w-5 sm:h-5" /> : <Eye className="w-4 h-4 sm:w-5 sm:h-5" />}
                                </button>
                            </div>
                            {errors.confirmPassword && <p className="mt-1 text-xs sm:text-sm text-red-600">{errors.confirmPassword}</p>}
                        </div>

                        {/* Submit Button */}
                        <button
                            type="button"
                            onClick={handleSubmit}
                            disabled={isSubmitting}
                            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 cursor-pointer text-white font-semibold py-3 sm:py-4 px-6 rounded-lg hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transform transition-all duration-200 hover:scale-[1.02] disabled:opacity-50 disabled:scale-100 disabled:cursor-not-allowed flex items-center justify-center text-sm sm:text-base"
                        >
                            {isSubmitting ? (
                                <>
                                    <div className="animate-spin rounded-full h-4 w-4 sm:h-5 sm:w-5 border-b-2 border-white mr-2"></div>
                                    Registering Company...
                                </>
                            ) : (
                                <>
                                    <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                                    Register Company
                                </>
                            )}
                        </button>
                    </div>

                    {/* Footer */}
                    <div className="mt-6 sm:mt-8 pt-4 sm:pt-6 border-t border-gray-200 text-center">
                        <p className="text-xs sm:text-sm text-gray-600">
                            Already have an account?{' '}
                            <a href="/login" className="text-blue-600 hover:text-blue-700 font-semibold">
                                Sign in here
                            </a>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Register;