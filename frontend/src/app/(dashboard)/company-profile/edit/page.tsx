/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { withAuth } from "@/wrapper/authWrapper";
import { TokenManager } from "@/utils/tokenManager";
import { toast } from "react-hot-toast";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import {
  Loader2,
  Building2,
  Mail,
  Phone,
  Globe,
  MapPin,
  Users,
  Briefcase,
  FileText,
  ArrowLeft,
  Save,
  ChevronDown,
  Camera,
  Gift,
  X,
  Check,
  Tag,
  //   Share2,
} from "lucide-react";
import AxiosInstances from "@/services/AxiosInstance";
import citiesData from "@/data/cities.json";
import PhotoUpload from "./PhotoUpload";
import benefitsData from "@/data/benifits.json";
import Image from "next/image";
import companyTagsData from "@/data/company-tags.json";

// Types
interface City {
  id: string;
  name: string;
  state: string;
}

// Constants for dropdowns
const companySectors = [
  { value: "technology", label: "Technology" },
  { value: "healthcare", label: "Healthcare" },
  { value: "finance", label: "Finance" },
  { value: "education", label: "Education" },
  { value: "manufacturing", label: "Manufacturing" },
  { value: "retail", label: "Retail" },
  { value: "consulting", label: "Consulting" },
  { value: "media", label: "Media" },
  { value: "real_estate", label: "Real Estate" },
  { value: "transportation", label: "Transportation" },
  { value: "energy", label: "Energy" },
  { value: "agriculture", label: "Agriculture" },
  { value: "hospitality", label: "Hospitality" },
  { value: "government", label: "Government" },
  { value: "non_profit", label: "Non-Profit" },
  { value: "other", label: "Other" },
];

const companyTypes = [
  { value: "product", label: "Product-based" },
  { value: "service", label: "Service-based" },
  { value: "both", label: "Both Product & Service" },
];

const socialMediaPlatforms = [
  {
    value: "twitter" as const,
    label: "Twitter",
    iconUrl: "/icons/twitter.svg",
    placeholder: "https://x.com/yourcompany",
  },
  {
    value: "facebook" as const,
    label: "Facebook",
    iconUrl: "/icons/facebook.svg",
    placeholder: "https://facebook.com/yourcompany",
  },
  {
    value: "linkedin" as const,
    label: "LinkedIn",
    iconUrl: "/icons/linkedin.svg",
    placeholder: "https://linkedin.com/company/yourcompany",
  },
  {
    value: "instagram" as const,
    label: "Instagram",
    iconUrl: "/icons/instagram.svg",
    placeholder: "https://instagram.com/yourcompany",
  },
  {
    value: "youtube" as const,
    label: "YouTube",
    iconUrl: "/icons/youtube.svg",
    placeholder: "https://youtube.com/@yourcompany",
  },
  {
    value: "github" as const,
    label: "GitHub",
    iconUrl: "/icons/github.svg",
    placeholder: "https://github.com/yourcompany",
  },
];
// Updated Schema with better error messages
const companySchema = z.object({
  name: z.string().min(1, "Company name cannot be empty"),
  email: z.string().email("Please enter a valid email address"),
  size: z.coerce.number().min(1, "Company size must be at least 1"),
  type: z.string().min(1, "Company type cannot be empty"),
  industry: z.string().min(1, "Industry sector cannot be empty"),
  location: z.string().min(1, "Location cannot be empty"),
  website: z
    .string()
    .url("Please enter a valid URL")
    .optional()
    .or(z.literal("")),
  phone: z.string().min(1, "Phone number cannot be empty"),
  description: z.string().min(1, "Company description cannot be empty"),
  logo_url: z.string().optional(),
  benefits: z.array(z.string()).optional(),
  tags: z.array(z.string()).max(5, "You can select maximum 5 tags").optional(), // Add tags field with max 5 validation
  social: z
    .object({
      twitter: z
        .string()
        .url("Please enter a valid Twitter URL")
        .optional()
        .or(z.literal("")),
      facebook: z
        .string()
        .url("Please enter a valid Facebook URL")
        .optional()
        .or(z.literal("")),
      linkedin: z
        .string()
        .url("Please enter a valid LinkedIn URL")
        .optional()
        .or(z.literal("")),
      instagram: z
        .string()
        .url("Please enter a valid Instagram URL")
        .optional()
        .or(z.literal("")),
      youtube: z
        .string()
        .url("Please enter a valid YouTube URL")
        .optional()
        .or(z.literal("")),
      github: z
        .string()
        .url("Please enter a valid GitHub URL")
        .optional()
        .or(z.literal("")),
    })
    .optional(), // Add social field
});

export type CompanyFormData = z.infer<typeof companySchema>;

// Form Field Component
const FormField = ({
  label,
  error,
  children,
  icon: Icon,
  delay = 0,
  isLoaded = true,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
  icon?: any;
  delay?: number;
  isLoaded?: boolean;
}) => (
  <div
    className={`space-y-2 transform transition-all duration-500 ease-out ${
      isLoaded ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
    }`}
    style={{ transitionDelay: `${delay}ms` }}
  >
    <label className="flex items-center text-sm font-semibold text-gray-700 mb-2">
      {Icon && <Icon className="w-4 h-4 mr-2 text-indigo-600" />}
      {label}
    </label>
    <div className="relative">{children}</div>
    {error && (
      <p className="text-xs text-red-600 mt-1 animate-fadeIn">{error}</p>
    )}
  </div>
);

const EditCompany: React.FC = () => {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isCityOpen, setIsCityOpen] = useState(false);
  const [selectedCity, setSelectedCity] = useState<City | null>(null);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [isPhotoModalOpen, setIsPhotoModalOpen] = useState(false);
  const [isBenefitsOpen, setIsBenefitsOpen] = useState(false);
  const [selectedBenefits, setSelectedBenefits] = useState<string[]>([]);
  const [isTagsOpen, setIsTagsOpen] = useState(false);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<CompanyFormData>({
    resolver: zodResolver(companySchema),
    defaultValues: {
      name: "",
      email: "",
      size: 1,
      type: "",
      industry: "",
      location: "",
      website: "",
      phone: "",
      description: "",
      logo_url: "",
      benefits: [],
      tags: [],
      social: {
        twitter: "",
        facebook: "",
        linkedin: "",
        instagram: "",
        youtube: "",
        github: "",
      },
    },
  });

  const companyName = watch("name");

  const handleCitySelect = (city: City) => {
    setSelectedCity(city);
    setIsCityOpen(false);
    setValue("location", `${city.name}, ${city.state}`, {
      shouldValidate: true,
    });
  };

  // Fetch current company data
  useEffect(() => {
    const fetchCompany = async () => {
      const userData = TokenManager.getUserData();
      if (!userData || !userData.id) {
        toast.error("Unable to get company information. Please log in again.");
        router.push("/login");
        return;
      }

      try {
        const { data } = await AxiosInstances.get<CompanyFormData>(
          `/companies/${userData.id}`
        );
        if (data.benefits && Array.isArray(data.benefits)) {
          setSelectedBenefits(data.benefits);
        }
        // Find the selected city from the current location
        if (data.location) {
          const foundCity = citiesData.find(
            (city) =>
              data.location.includes(city.name) &&
              data.location.includes(city.state)
          );
          if (foundCity) {
            setSelectedCity(foundCity);
          }
        }
        if (data.tags && Array.isArray(data.tags)) {
          setSelectedTags(data.tags);
        }

        reset({
          ...data,
          size: Number(data.size) || 1,
          website: data.website || "",
          logo_url: data.logo_url || "",
          benefits: data.benefits || [],
          tags: data.tags || [], // Add tags to reset
          social: {
            twitter: data.social?.twitter || "",
            facebook: data.social?.facebook || "",
            linkedin: data.social?.linkedin || "",
            instagram: data.social?.instagram || "",
            youtube: data.social?.youtube || "",
            github: data.social?.github || "",
          },
        });
        // Trigger animations after data loads
        setTimeout(() => setIsLoaded(true), 100);
      } catch (error) {
        console.error(error);
        toast.error("Failed to load company information.");
      } finally {
        setLoading(false);
      }
    };

    fetchCompany();
  }, [reset, router]);
  const handlePhotoChange = (base64: string | null) => {
    setLogoUrl(base64);
    setValue("logo_url", base64 || "", { shouldValidate: true });
  };
  // Submit handler
  const onSubmit = async (formData: CompanyFormData) => {
    const userData = TokenManager.getUserData();
    if (!userData?.id) {
      toast.error("Session expired. Please log in again.");
      router.push("/login");
      return;
    }

    try {
      // Clean up optional fields
      const cleanedData = {
        ...formData,
        website: formData.website || undefined,
        logo_url: logoUrl || undefined,
      };

      await AxiosInstances.put(`/companies/${userData.id}`, cleanedData);
      toast.success("Company profile updated successfully!");
      router.push("/company-profile");
    } catch (error: any) {
      console.error(error);
      toast.error(error?.response?.data?.detail || "Update failed");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="animate-spin w-8 h-8 text-indigo-600" />
          <p className="text-gray-600">Loading company information...</p>
        </div>
      </div>
    );
  }

  const handleBenefitSelect = (benefit: string) => {
    const newBenefits = selectedBenefits.includes(benefit)
      ? selectedBenefits.filter((b) => b !== benefit)
      : [...selectedBenefits, benefit];
    setSelectedBenefits(newBenefits);
    setValue("benefits", newBenefits, { shouldValidate: true });
  };

  const removeBenefit = (benefitToRemove: string) => {
    const newBenefits = selectedBenefits.filter((b) => b !== benefitToRemove);
    setSelectedBenefits(newBenefits);
    setValue("benefits", newBenefits, { shouldValidate: true });
  };
  const handleTagSelect = (tag: string) => {
    if (selectedTags.includes(tag)) {
      // Remove tag
      const newTags = selectedTags.filter((t) => t !== tag);
      setSelectedTags(newTags);
      setValue("tags", newTags, { shouldValidate: true });
    } else if (selectedTags.length < 5) {
      // Add tag only if less than 5 are selected
      const newTags = [...selectedTags, tag];
      setSelectedTags(newTags);
      setValue("tags", newTags, { shouldValidate: true });
    }
  };
  const removeTag = (tagToRemove: string) => {
    const newTags = selectedTags.filter((t) => t !== tagToRemove);
    setSelectedTags(newTags);
    setValue("tags", newTags, { shouldValidate: true });
  };
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 sm:p-6">
      <div className="w-full mx-auto">
        {/* Header */}
        <div
          className={`transform transition-all duration-700 ease-out mb-8 ${
            isLoaded ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"
          }`}
        >
          <div className="flex items-center justify-between mb-6">
            <Button
              variant="ghost"
              onClick={() => router.push("/company-profile")}
              className="flex items-center text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Profile
            </Button>
          </div>

          <Card className="border-0 shadow-lg bg-gradient-to-r from-indigo-600 to-indigo-700 text-white overflow-hidden">
            <CardContent className="p-6 sm:p-8">
              <div className="flex items-center space-x-4 sm:space-x-6">
                <div className="relative group">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 bg-white rounded-2xl flex items-center justify-center shadow-lg overflow-hidden">
                    {logoUrl ? (
                      <img
                        src={logoUrl}
                        alt="Company Logo"
                        className="w-full h-full object-cover rounded-2xl"
                      />
                    ) : (
                      <Building2 className="w-8 h-8 sm:w-10 sm:h-10 text-indigo-600" />
                    )}
                  </div>

                  <Dialog
                    open={isPhotoModalOpen}
                    onOpenChange={setIsPhotoModalOpen}
                  >
                    <DialogTrigger asChild>
                      <button
                        type="button"
                        className="absolute -bottom-2 -right-2 w-8 h-8 bg-indigo-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:bg-indigo-400"
                      >
                        <Camera className="w-4 h-4 text-white" />
                      </button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-md">
                      <DialogHeader>
                        <DialogTitle>Upload Company Logo</DialogTitle>
                      </DialogHeader>
                      <div className="mt-4">
                        <PhotoUpload
                          currentPhoto={logoUrl || ""}
                          onPhotoChange={(base64) => {
                            handlePhotoChange(base64);
                            if (base64) {
                              setIsPhotoModalOpen(false); // Close modal after successful upload
                            }
                          }}
                          maxSizeInMB={5}
                          allowedTypes={[
                            "image/jpeg",
                            "image/jpg",
                            "image/png",
                            "image/webp",
                          ]}
                        />
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>

                <div>
                  <h1 className="text-2xl sm:text-3xl font-bold">
                    {companyName || "Edit Company Profile"}
                  </h1>
                  <p className="text-indigo-100 mt-1">
                    Update your company information
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Form Card */}
        <Card
          className={`border-0 shadow-xl transform transition-all duration-700 ease-out ${
            isLoaded ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"
          }`}
          style={{ transitionDelay: "200ms" }}
        >
          <CardHeader className="border-b border-gray-100">
            <CardTitle className="text-xl text-gray-900">
              Company Information
            </CardTitle>
            <p className="text-gray-600 text-sm">
              Keep your company profile up to date with accurate information
            </p>
          </CardHeader>
          <CardContent className="p-6 sm:p-8">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
              {/* Basic Information */}
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-gray-900 border-b border-gray-100 pb-2">
                  Basic Information
                </h3>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <FormField
                    label="Company Name"
                    error={errors.name?.message}
                    icon={Building2}
                    delay={300}
                    isLoaded={isLoaded}
                  >
                    <Input
                      {...register("name")}
                      className="h-11"
                      placeholder="Enter company name"
                    />
                  </FormField>
                  <FormField
                    label="Email Address"
                    error={errors.email?.message}
                    icon={Mail}
                    delay={350}
                    isLoaded={isLoaded}
                  >
                    <Input
                      type="email"
                      {...register("email")}
                      className="h-11"
                      placeholder="company@example.com"
                    />
                  </FormField>
                  <FormField
                    label="Phone Number"
                    error={errors.phone?.message}
                    icon={Phone}
                    delay={400}
                    isLoaded={isLoaded}
                  >
                    <Input
                      {...register("phone")}
                      className="h-11"
                      placeholder="+1 (555) 123-4567"
                    />
                  </FormField>
                  <FormField
                    label="Company Size"
                    error={errors.size?.message}
                    icon={Users}
                    delay={450}
                    isLoaded={isLoaded}
                  >
                    <Input
                      type="number"
                      {...register("size", { valueAsNumber: true })}
                      className="h-11"
                      placeholder="e.g., 50"
                    />
                  </FormField>
                </div>
              </div>

              {/* Company Details */}
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-gray-900 border-b border-gray-100 pb-2">
                  Company Details
                </h3>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <FormField
                    label="Industry Sector"
                    error={errors.industry?.message}
                    icon={Briefcase}
                    delay={500}
                    isLoaded={isLoaded}
                  >
                    <select
                      {...register("industry")}
                      className="w-full h-11 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 bg-white"
                    >
                      <option value="">Select industry sector</option>
                      {companySectors.map((sector) => (
                        <option key={sector.value} value={sector.value}>
                          {sector.label}
                        </option>
                      ))}
                    </select>
                  </FormField>
                  <FormField
                    label="Company Type"
                    error={errors.type?.message}
                    icon={Building2}
                    delay={550}
                    isLoaded={isLoaded}
                  >
                    <select
                      {...register("type")}
                      className="w-full h-11 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 bg-white"
                    >
                      <option value="">Select company type</option>
                      {companyTypes.map((type) => (
                        <option key={type.value} value={type.value}>
                          {type.label}
                        </option>
                      ))}
                    </select>
                  </FormField>

                  {/* Location Dropdown */}
                  <FormField
                    label="Location"
                    error={errors.location?.message}
                    icon={MapPin}
                    delay={600}
                    isLoaded={isLoaded}
                  >
                    <Popover open={isCityOpen} onOpenChange={setIsCityOpen}>
                      <PopoverTrigger asChild>
                        <button
                          type="button"
                          className={`w-full h-11 flex items-center justify-between px-3 py-2 text-left border rounded-lg bg-white hover:bg-gray-50 transition-all duration-200 ${
                            errors.location
                              ? "border-red-500"
                              : "border-gray-300"
                          }`}
                        >
                          <span
                            className={
                              selectedCity ? "text-gray-900" : "text-gray-500"
                            }
                          >
                            {selectedCity
                              ? `${selectedCity.name}, ${selectedCity.state}`
                              : "Select a city..."}
                          </span>
                          <ChevronDown className="h-4 w-4 text-gray-400" />
                        </button>
                      </PopoverTrigger>
                      <PopoverContent className="w-full p-0" align="start">
                        <Command>
                          <div className="flex items-center border-b px-3">
                            {/* <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" /> */}
                            <CommandInput
                              placeholder="Search cities..."
                              className="flex h-10 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
                            />
                          </div>
                          <CommandEmpty>No city found.</CommandEmpty>
                          <CommandGroup className="max-h-64 overflow-auto">
                            {citiesData.map((city: City) => (
                              <CommandItem
                                key={city.id}
                                value={city.name}
                                onSelect={() => handleCitySelect(city)}
                                className="cursor-pointer"
                              >
                                <div className="flex flex-col">
                                  <span className="font-medium">
                                    {city.name}
                                  </span>
                                  <span className="text-sm text-gray-500">
                                    {city.state}
                                  </span>
                                </div>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </Command>
                      </PopoverContent>
                    </Popover>
                    {/* Hidden input for form registration */}
                    <input type="hidden" {...register("location")} />
                  </FormField>

                  <FormField
                    label="Website (Optional)"
                    error={errors.website?.message}
                    icon={Globe}
                    delay={650}
                    isLoaded={isLoaded}
                  >
                    <Input
                      {...register("website")}
                      className="h-11"
                      placeholder="https://www.company.com"
                    />
                  </FormField>
                </div>
              </div>

              {/* Additional Information */}
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-gray-900 border-b border-gray-100 pb-2">
                  Additional Information
                </h3>
                <FormField
                  label="Company Description"
                  error={errors.description?.message}
                  icon={FileText}
                  delay={700}
                  isLoaded={isLoaded}
                >
                  <Textarea
                    rows={4}
                    {...register("description")}
                    className="resize-none"
                    placeholder="Describe your company, its mission, and what you do..."
                  />
                </FormField>
                <FormField
                  label="Benefits (Optional)"
                  icon={Gift}
                  delay={675}
                  isLoaded={isLoaded}
                >
                  <div className="space-y-2">
                    <Popover
                      open={isBenefitsOpen}
                      onOpenChange={setIsBenefitsOpen}
                    >
                      <PopoverTrigger asChild>
                        <button
                          type="button"
                          className="w-full min-h-[44px] flex items-center justify-between px-3 py-2 text-left border rounded-lg bg-white hover:bg-gray-50 transition-all duration-200 border-gray-300"
                        >
                          <span className="text-gray-500">
                            {selectedBenefits.length > 0
                              ? `${selectedBenefits.length} benefit${
                                  selectedBenefits.length > 1 ? "s" : ""
                                } selected`
                              : "Select benefits..."}
                          </span>
                          <ChevronDown className="h-4 w-4 text-gray-400" />
                        </button>
                      </PopoverTrigger>
                      <PopoverContent className="w-full p-0" align="start">
                        <Command>
                          <div className="flex items-center border-b px-3">
                            <CommandInput
                              placeholder="Search benefits..."
                              className="flex h-10 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
                            />
                          </div>
                          <CommandEmpty>No benefits found.</CommandEmpty>
                          <CommandGroup className="max-h-64 overflow-auto">
                            {benefitsData.map((benefit: string) => (
                              <CommandItem
                                key={benefit}
                                value={benefit}
                                onSelect={() => handleBenefitSelect(benefit)}
                                className="cursor-pointer flex items-center space-x-2"
                              >
                                <div
                                  className={`w-4 h-4 border-2 rounded flex items-center justify-center ${
                                    selectedBenefits.includes(benefit)
                                      ? "bg-indigo-600 border-indigo-600"
                                      : "border-gray-300"
                                  }`}
                                >
                                  {selectedBenefits.includes(benefit) && (
                                    <Check className="w-3 h-3 text-white" />
                                  )}
                                </div>
                                <span className="flex-1">{benefit}</span>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </Command>
                      </PopoverContent>
                    </Popover>

                    {/* Selected benefits display */}
                    {selectedBenefits.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {selectedBenefits.map((benefit) => (
                          <span
                            key={benefit}
                            className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-indigo-100 text-indigo-800 border border-indigo-200"
                          >
                            {benefit}
                            <button
                              type="button"
                              onClick={() => removeBenefit(benefit)}
                              className="ml-2 text-indigo-600 hover:text-indigo-800 focus:outline-none"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Hidden input for form registration */}
                    <input type="hidden" {...register("benefits")} />
                  </div>
                </FormField>
                <FormField
                  label="Company Tags (Optional)"
                  error={errors.tags?.message}
                  icon={Tag}
                  delay={700}
                  isLoaded={isLoaded}
                >
                  <div className="space-y-2">
                    <Popover open={isTagsOpen} onOpenChange={setIsTagsOpen}>
                      <PopoverTrigger asChild>
                        <button
                          type="button"
                          className="w-full min-h-[44px] flex items-center justify-between px-3 py-2 text-left border rounded-lg bg-white hover:bg-gray-50 transition-all duration-200 border-gray-300"
                        >
                          <span className="text-gray-500">
                            {selectedTags.length > 0
                              ? `${selectedTags.length}/5 tag${
                                  selectedTags.length > 1 ? "s" : ""
                                } selected`
                              : "Select up to 5 tags..."}
                          </span>
                          <ChevronDown className="h-4 w-4 text-gray-400" />
                        </button>
                      </PopoverTrigger>
                      <PopoverContent className="w-full p-0" align="start">
                        <Command>
                          <div className="flex items-center border-b px-3">
                            <CommandInput
                              placeholder="Search tags..."
                              className="flex h-10 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
                            />
                          </div>
                          <CommandEmpty>No tags found.</CommandEmpty>
                          <CommandGroup className="max-h-64 overflow-auto">
                            {companyTagsData.map((tag: string) => {
                              const isSelected = selectedTags.includes(tag);
                              const isDisabled =
                                !isSelected && selectedTags.length >= 5;

                              return (
                                <CommandItem
                                  key={tag}
                                  value={tag}
                                  onSelect={() =>
                                    !isDisabled && handleTagSelect(tag)
                                  }
                                  className={`cursor-pointer flex items-center space-x-2 ${
                                    isDisabled
                                      ? "opacity-50 cursor-not-allowed"
                                      : ""
                                  }`}
                                  disabled={isDisabled}
                                >
                                  <div
                                    className={`w-4 h-4 border-2 rounded flex items-center justify-center ${
                                      isSelected
                                        ? "bg-blue-600 border-blue-600"
                                        : "border-gray-300"
                                    }`}
                                  >
                                    {isSelected && (
                                      <Check className="w-3 h-3 text-white" />
                                    )}
                                  </div>
                                  <span className="flex-1">{tag}</span>
                                  {isDisabled && !isSelected && (
                                    <span className="text-xs text-gray-400">
                                      Max 5
                                    </span>
                                  )}
                                </CommandItem>
                              );
                            })}
                          </CommandGroup>
                        </Command>
                      </PopoverContent>
                    </Popover>

                    {/* Selected tags display */}
                    {selectedTags.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {selectedTags.map((tag) => (
                          <span
                            key={tag}
                            className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-green-100 text-green-800 border border-green-200"
                          >
                            {tag}
                            <button
                              type="button"
                              onClick={() => removeTag(tag)}
                              className="ml-2 text-green-600 hover:text-green-800 focus:outline-none"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Helper text */}
                    <p className="text-xs text-gray-500">
                      Select up to 5 tags that best describe your company (
                      {selectedTags.length}/5 selected)
                    </p>

                    {/* Hidden input for form registration */}
                    <input type="hidden" {...register("tags")} />
                  </div>
                </FormField>
              </div>
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-gray-900 border-b border-gray-100 pb-2">
                  Social Media Links (Optional)
                </h3>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {socialMediaPlatforms.map((platform, index) => {
                    const fieldName = `social.${platform.value}` as const;
                    const fieldError = errors.social?.[platform.value];
                    const errorMessage =
                      fieldError &&
                      typeof fieldError === "object" &&
                      "message" in fieldError
                        ? fieldError.message
                        : undefined;

                    return (
                      <FormField
                        key={platform.value}
                        label={platform.label}
                        error={errorMessage}
                        // icon={Share2}
                        delay={750 + index * 50}
                        isLoaded={isLoaded}
                      >
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Image
                              src={platform.iconUrl}
                              alt={`${platform.label} icon`}
                              height={5}
                              width={5}
                              className="w-5 h-5 object-contain"
                              onError={(e) => {
                                // Fallback to a generic link icon if image fails to load
                                e.currentTarget.style.display = "none";
                              }}
                            />
                          </div>
                          <Input
                            {...register(fieldName)}
                            className="h-11 pl-12"
                            placeholder={platform.placeholder}
                            type="url"
                          />
                        </div>
                      </FormField>
                    );
                  })}
                </div>
              </div>
              {/* Submit Button */}
              <div
                className={`flex justify-end pt-6 border-t border-gray-100 transform transition-all duration-500 ease-out ${
                  isLoaded
                    ? "translate-y-0 opacity-100"
                    : "translate-y-4 opacity-0"
                }`}
                style={{ transitionDelay: "800ms" }}
              >
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3 h-auto font-medium transition-all duration-200 transform hover:scale-105"
                >
                  {isSubmitting ? (
                    <>
                      {" "}
                      <Loader2 className="animate-spin w-4 h-4 mr-2" /> Saving
                      Changes...{" "}
                    </>
                  ) : (
                    <>
                      {" "}
                      <Save className="w-4 h-4 mr-2" /> Save Changes{" "}
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default withAuth(EditCompany);
