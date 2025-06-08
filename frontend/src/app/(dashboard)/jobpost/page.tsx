/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectTrigger, SelectContent, SelectItem } from "@/components/ui/select";
import { withAuth } from "@/wrapper/authWrapper";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { motion, AnimatePresence } from "motion/react";
import {
  IconBriefcase,
  IconMapPin,
  IconCurrency,
  IconUsers,
  IconRobot,
  IconPlus,
  IconX,
  IconCheck,
  IconChevronRight,
  IconChevronLeft,
  IconSettings
} from "@tabler/icons-react";
import { useRouter } from "next/navigation";
import toast, { Toaster } from "react-hot-toast";
import { TokenManager } from "@/utils/tokenManager"; // Import TokenManager
import AxiosInstances from "@/services/AxiosInstance";

type EmploymentType = "full_time" | "part_time" | "contract" | "internship";
type ExperienceLevel = "entry" | "mid" | "senior" | "lead" | "executive";
type DifficultyLevel = "easy" | "medium" | "hard";

// Updated interface - removed company_id and created_by since backend handles these
interface JobPostingFormData {
  role_title: string;
  description: string;
  skills: Record<string, string>;
  requirements: { description: string };
  salary_min: number;
  salary_max: number;
  location: string;
  employment_type: EmploymentType;
  experience_level: ExperienceLevel;
  accuracy_threshold: number;
  difficulty: DifficultyLevel;
  openings: number;
  duration: string;
  perks: string;
  responsibilities: string;
  is_active: boolean;
}

interface ValidationErrors {
  [key: string]: string;
}

const steps = [
  {
    id: 1,
    title: "Job Details",
    description: "Basic information and requirements",
    icon: IconBriefcase
  },
  {
    id: 2,
    title: "AI Settings",
    description: "Configure AI matching parameters",
    icon: IconRobot
  },
  {
    id: 3,
    title: "Review & Publish",
    description: "Final review and publication",
    icon: IconCheck
  }
];

function JobPostingForm() {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<JobPostingFormData>({
    role_title: "",
    description: "",
    skills: {},
    requirements: { description: "" },
    salary_min: 0,
    salary_max: 0,
    location: "",
    employment_type: "full_time",
    experience_level: "entry",
    accuracy_threshold: 70,
    difficulty: "medium",
    openings: 1,
    duration: "",
    perks: "",
    responsibilities: "",
    is_active: true,
  });
  const router = useRouter();
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentSkill, setCurrentSkill] = useState("");

  const containerVariants = {
    hidden: { opacity: 0, x: 300 },
    visible: {
      opacity: 1,
      x: 0,
      transition: {
        duration: 0.5,
        ease: "easeInOut"
      }
    },
    exit: {
      opacity: 0,
      x: -300,
      transition: {
        duration: 0.3,
        ease: "easeInOut"
      }
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target;
    const newValue = type === "number" ? (value ? Number(value) : 0) : value;

    // Special handling for requirements field
    if (name === "requirements") {
      setFormData(prev => ({
        ...prev,
        requirements: { description: value }
      }));
    } else {
      setFormData(prev => ({ ...prev, [name]: newValue }));
    }
  };

  const handleSelectChange = (name: keyof JobPostingFormData, value: string | number) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const addSkill = () => {
    if (currentSkill.trim()) {
      const skillKey = `skill_${Object.keys(formData.skills).length + 1}`;
      if (!Object.values(formData.skills).includes(currentSkill.trim())) {
        setFormData(prev => ({
          ...prev,
          skills: { ...prev.skills, [skillKey]: currentSkill.trim() }
        }));
        setCurrentSkill("");
      }
    }
  };

  const removeSkill = (skillToRemove: string) => {
    setFormData(prev => {
      const newSkills = { ...prev.skills };
      // Find and remove the skill
      const keyToRemove = Object.keys(newSkills).find(key => newSkills[key] === skillToRemove);
      if (keyToRemove) {
        delete newSkills[keyToRemove];
      }
      // Reindex the remaining skills
      const reindexedSkills: Record<string, string> = {};
      Object.values(newSkills).forEach((skill, index) => {
        reindexedSkills[`skill_${index + 1}`] = skill;
      });
      return { ...prev, skills: reindexedSkills };
    });
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addSkill();
    }
  };

  const nextStep = () => {
    if (currentStep < steps.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };


  // Validation function for step progression
  const validateCurrentStep = (): boolean => {
    const newErrors: ValidationErrors = {};

    if (currentStep === 1) {
      if (!formData.role_title.trim()) newErrors.role_title = "Job title is required";
      if (!formData.description.trim()) newErrors.description = "Job description is required";
      if (!formData.location.trim()) newErrors.location = "Location is required";
      if (formData.employment_type !== "full_time" && !formData.duration.trim()) {
        newErrors.duration = "Duration is required for non-full-time positions";
      }
      if (formData.salary_min > 0 && formData.salary_max > 0 && formData.salary_min >= formData.salary_max) {
        newErrors.salary_max = "Maximum salary must be greater than minimum salary";
      }
      if (Object.keys(formData.skills).length === 0) {
        newErrors.skills = "At least one skill is required";
      }
      if (!formData.requirements.description.trim()) {
        newErrors.requirements = "Job requirements are required";
      }
      if (!formData.responsibilities.trim()) {
        newErrors.responsibilities = "Job responsibilities are required";
      }
    }
    if (currentStep === 2) {
      if (formData.accuracy_threshold < 50 || formData.accuracy_threshold > 100) {
        newErrors.accuracy_threshold = "Accuracy threshold must be between 50-100%";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    setIsSubmitting(true);

    try {
      // Get company ID from user data
      const userData = TokenManager.getUserData();
      if (!userData || !userData.id) {
        toast.error("Unable to get company information. Please log in again.");
        setIsSubmitting(false);
        return;
      }

      const companyId = userData.id;
      console.log("Company ID ", companyId);

      // Prepare the job data
      const jobData = {
        role_title: formData.role_title,
        description: formData.description,
        skills: formData.skills,
        requirements: formData.requirements,
        accuracy_threshold: formData.accuracy_threshold,
        salary_min: formData.salary_min || undefined,
        salary_max: formData.salary_max || undefined,
        location: formData.location,
        employment_type: formData.employment_type,
        experience_level: formData.experience_level,
        is_active: formData.is_active,
        difficulty: formData.difficulty,
        openings: formData.openings,
        duration: formData.duration || undefined,
        perks: formData.perks || undefined,
        responsibilities: formData.responsibilities || undefined,
      };

      console.log("🚀 Submitting Job Data:", jobData);

      // Make API call using AxiosInstances
      const response = await AxiosInstances.post(
        `/api/companies/${companyId}/jobs/`,
        jobData
      );

      console.log("✅ Job created successfully:", response.data);
      toast.success("Job posted successfully! 🎉");

      // Navigate to dashboard after successful submission
      setTimeout(() => {
        router.push("/dashboard");
      }, 500);

    } catch (error: any) {
      console.error("❌ Error creating job:", error);

      // Handle different types of errors
      if (error.response?.data?.detail) {
        if (Array.isArray(error.response.data.detail)) {
          const errorMessages = error.response.data.detail.map((err: any) => err.msg).join(", ");
          toast.error(`Validation Error: ${errorMessages}`);
        } else {
          toast.error(`Error: ${error.response.data.detail}`);
        }
      } else if (error.response?.status === 401) {
        toast.error("Authentication failed. Please log in again.");
      } else if (error.response?.status === 403) {
        toast.error("You don't have permission to create jobs for this company.");
      } else if (error.response?.status >= 500) {
        toast.error("Server error. Please try again later.");
      } else {
        toast.error("Failed to create job. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };
  const handleNextStep = () => {
    if (validateCurrentStep()) {
      nextStep();
    } else {
      toast.error("Please fill in all required fields correctly");
    }
  };

  const renderStep1 = () => (
    <motion.div
      key="step1"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      className="space-y-6"
    >
      {/* Basic Information */}
      <Card className="shadow-lg border-0">
        <CardHeader className="bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-t-lg">
          <CardTitle className="flex items-center gap-2">
            <IconBriefcase className="h-5 w-5" />
            Basic Information
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Job Title *</label>
              <Input
                name="role_title"
                value={formData.role_title}
                onChange={handleChange}
                placeholder="e.g. Senior Frontend Developer"
                className={`w-full ${errors.role_title ? 'border-red-500 focus:border-red-500' : ''}`}
                required
              />
              {errors.role_title && <p className="text-red-500 text-xs">{errors.role_title}</p>}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Number of Openings</label>
              <Input
                name="openings"
                type="number"
                min="1"
                value={formData.openings}
                onChange={handleChange}
                className="w-full"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700">Job Description *</label>
            <Textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Provide a comprehensive description of the role, company culture, and what makes this opportunity exciting..."
              className={`w-full h-32 resize-none ${errors.description ? 'border-red-500 focus:border-red-500' : ''}`}
              required
            />
            {errors.description && <p className="text-red-500 text-xs">{errors.description}</p>}
          </div>

          {/* Rest of the fields with similar error handling... */}
        </CardContent>
      </Card>

      {/* Location & Compensation with validation */}
      <Card className="shadow-lg border-0">
        <CardHeader className="bg-gradient-to-r from-green-500 to-green-600 text-white">
          <CardTitle className="flex items-center gap-2">
            <IconMapPin className="h-5 w-5" />
            Location & Compensation
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Location *</label>
              <Input
                name="location"
                value={formData.location}
                onChange={handleChange}
                placeholder="e.g. San Francisco, CA or Remote"
                className={`w-full ${errors.location ? 'border-red-500 focus:border-red-500' : ''}`}
                required
              />
              {errors.location && <p className="text-red-500 text-xs">{errors.location}</p>}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Minimum Salary</label>
              <div className="relative">
                <IconCurrency className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <Input
                  name="salary_min"
                  type="number"
                  min="0"
                  value={formData.salary_min}
                  onChange={handleChange}
                  placeholder="50000"
                  className="w-full pl-10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Maximum Salary</label>
              <div className="relative">
                <IconCurrency className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <Input
                  name="salary_max"
                  type="number"
                  min="0"
                  value={formData.salary_max}
                  onChange={handleChange}
                  placeholder="100000"
                  className={`w-full pl-10 ${errors.salary_max ? 'border-red-500 focus:border-red-500' : ''}`}
                />
              </div>
              {errors.salary_max && <p className="text-red-500 text-xs">{errors.salary_max}</p>}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Skills & Requirements with validation */}
      <Card className="shadow-lg border-0">
        <CardHeader className="bg-gradient-to-r from-purple-500 to-purple-600 text-white">
          <CardTitle className="flex items-center gap-2">
            <IconUsers className="h-5 w-5" />
            Skills & Requirements
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700">Required Skills *</label>
            <div className="flex gap-2">
              <Input
                value={currentSkill}
                onChange={(e) => setCurrentSkill(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Add a skill and press Enter"
                className="flex-1"
              />
              <Button
                type="button"
                onClick={addSkill}
                variant="outline"
                size="icon"
              >
                <IconPlus className="h-4 w-4" />
              </Button>
            </div>
            {errors.skills && <p className="text-red-500 text-xs">{errors.skills}</p>}
            <div className="flex flex-wrap gap-2 mt-3">
              {Object.values(formData.skills).map((skill, index) => (
                <Badge
                  key={index}
                  variant="secondary"
                  className="bg-purple-100 text-purple-800 hover:bg-purple-200"
                >
                  {skill}
                  <button
                    type="button"
                    onClick={() => removeSkill(skill)}
                    className="ml-2 hover:text-red-600"
                  >
                    <IconX className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Requirements *</label>
              <Textarea
                name="requirements"
                value={formData.requirements.description}
                onChange={handleChange}
                placeholder="• Bachelor's degree in Computer Science&#10;• 3+ years of experience&#10;• Strong problem-solving skills"
                className={`w-full h-32 resize-none ${errors.requirements ? 'border-red-500 focus:border-red-500' : ''}`}
              />
              {errors.requirements && <p className="text-red-500 text-xs">{errors.requirements}</p>}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Key Responsibilities *</label>
              <Textarea
                name="responsibilities"
                value={formData.responsibilities}
                onChange={handleChange}
                placeholder="• Develop and maintain web applications&#10;• Collaborate with cross-functional teams&#10;• Write clean, maintainable code"
                className={`w-full h-32 resize-none ${errors.responsibilities ? 'border-red-500 focus:border-red-500' : ''}`}
              />
              {errors.responsibilities && <p className="text-red-500 text-xs">{errors.responsibilities}</p>}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700">Perks & Benefits</label>
            <Textarea
              name="perks"
              value={formData.perks}
              onChange={handleChange}
              placeholder="• Health insurance&#10;• Flexible working hours&#10;• Professional development budget"
              className="w-full h-24 resize-none"
            />
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );

  const renderStep2 = () => (
    <motion.div
      key="step2"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      className="space-y-6"
    >
      <Card className="shadow-lg border-0">
        <CardHeader className="bg-gradient-to-r from-orange-500 to-orange-600 text-white">
          <CardTitle className="flex items-center gap-2">
            <IconRobot className="h-5 w-5" />
            AI Configuration
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="space-y-6">
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
              <p className="text-sm text-orange-800">
                <strong>Note:</strong> These settings are only visible to employers and help our AI system provide more accurate candidate matching and screening results.
              </p>
            </div>

            <div className="space-y-4">
              <label className="text-sm font-semibold text-slate-700">
                Accuracy Threshold ({formData.accuracy_threshold}%)
              </label>
              <input
                type="range"
                min="50"
                max="100"
                value={formData.accuracy_threshold}
                onChange={(e) => handleSelectChange("accuracy_threshold", Number(e.target.value))}
                className="w-full h-2 bg-orange-200 rounded-lg appearance-none cursor-pointer slider"
              />
              <div className="flex justify-between text-xs text-slate-500">
                <span>Less Strict (50%)</span>
                <span>More Strict (100%)</span>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Difficulty Level</label>
              <Select
                value={formData.difficulty}
                onValueChange={(value) => handleSelectChange("difficulty", value as DifficultyLevel)}
              >
                <SelectTrigger className="w-full">
                  {formData.difficulty.charAt(0).toUpperCase() + formData.difficulty.slice(1)}
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="easy">Easy</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="hard">Hard</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-slate-500">
                This affects the complexity of AI-generated interview questions and assessment criteria.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );

  const renderStep3 = () => (
    <motion.div
      key="step3"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      className="space-y-6"
    >
      <Card className="shadow-lg border-0">
        <CardHeader className="bg-gradient-to-r from-green-500 to-green-600 text-white">
          <CardTitle className="flex items-center gap-2">
            <IconCheck className="h-5 w-5" />
            Review & Publish
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="space-y-6">
            <div className="bg-green-50 border border-green-200 rounded-lg p-6">
              <div className="text-center mb-6">
                <IconCheck className="h-16 w-16 text-green-500 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-green-800 mb-2">Ready to Publish!</h3>
                <p className="text-green-700">
                  Review your job posting details below and click publish when ready.
                </p>
              </div>

              {/* Detailed Job Preview */}
              <div className="bg-white rounded-lg p-6 space-y-6">
                <div className="border-b pb-4">
                  <h2 className="text-2xl font-bold text-slate-800">{formData.role_title}</h2>
                  <div className="flex flex-wrap gap-2 mt-2">
                    <Badge variant="outline">{formData.employment_type.replace('_', ' ')}</Badge>
                    <Badge variant="outline">{formData.experience_level}</Badge>
                    <Badge variant="outline">{formData.location}</Badge>
                    {formData.duration && <Badge variant="outline">{formData.duration}</Badge>}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-semibold text-slate-800 mb-2">Job Description</h4>
                    <p className="text-sm text-slate-600 bg-slate-50 p-3 rounded">
                      {formData.description || "No description provided"}
                    </p>
                  </div>

                  <div>
                    <h4 className="font-semibold text-slate-800 mb-2">Compensation</h4>
                    <p className="text-sm text-slate-600">
                      {formData.salary_min > 0 || formData.salary_max > 0
                        ? `$${formData.salary_min?.toLocaleString() || '0'} - $${formData.salary_max?.toLocaleString() || '0'}`
                        : "Salary not specified"}
                    </p>
                  </div>

                  <div>
                    <h4 className="font-semibold text-slate-800 mb-2">Required Skills</h4>
                    <div className="flex flex-wrap gap-1">
                      {Object.values(formData.skills).map((skill, index) => (
                        <Badge key={index} variant="secondary" className="text-xs">
                          {skill}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h4 className="font-semibold text-slate-800 mb-2">Openings</h4>
                    <p className="text-sm text-slate-600">{formData.openings} position(s)</p>
                  </div>

                  <div>
                    <h4 className="font-semibold text-slate-800 mb-2">Requirements</h4>
                    <p className="text-sm text-slate-600 bg-slate-50 p-3 rounded whitespace-pre-line">
                      {formData.requirements.description || "No requirements specified"}
                    </p>
                  </div>

                  <div>
                    <h4 className="font-semibold text-slate-800 mb-2">Responsibilities</h4>
                    <p className="text-sm text-slate-600 bg-slate-50 p-3 rounded whitespace-pre-line">
                      {formData.responsibilities || "No responsibilities specified"}
                    </p>
                  </div>

                  {formData.perks && (
                    <div className="md:col-span-2">
                      <h4 className="font-semibold text-slate-800 mb-2">Perks & Benefits</h4>
                      <p className="text-sm text-slate-600 bg-slate-50 p-3 rounded whitespace-pre-line">
                        {formData.perks}
                      </p>
                    </div>
                  )}

                  <div className="md:col-span-2 border-t pt-4">
                    <h4 className="font-semibold text-slate-800 mb-2">AI Settings</h4>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="font-medium">Accuracy Threshold:</span> {formData.accuracy_threshold}%
                      </div>
                      <div>
                        <span className="font-medium">Difficulty Level:</span> {formData.difficulty}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Navigation and Publish Buttons */}
            <div className="flex w-full justify-between items-center gap-4">
              <Button
                onClick={prevStep}
                variant="outline"
                className="flex w-1/2 items-center gap-2 px-6 py-3"
              >
                <IconChevronLeft className="h-4 w-4" />
                Previous
              </Button>

              <Button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="flex-1 w-1/2 py-4 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-semibold rounded-lg shadow-lg hover:shadow-xl transition-all duration-300"
              >
                {isSubmitting ? (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    className="w-5 h-5 border-2 border-white border-t-transparent rounded-full mr-2"
                  />
                ) : null}
                {isSubmitting ? "Publishing Job..." : "🚀 Publish Job"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );


  return (
    <div className="h-full  bg-white w-full">
      <Toaster position="top-right" />

      <div className="w-full mx-auto p-6">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-slate-800 mb-2">Post a New Job</h1>
          <p className="text-slate-600">Create an engaging job posting to attract top talent</p>
        </div>

        {/* Stepper */}
        <div className="flex items-center justify-center mb-8">
          <div className="flex items-center space-x-8">
            {steps.map((step, index) => {
              const isActive = currentStep === step.id;
              const isCompleted = currentStep > step.id;
              const IconComponent = step.icon;

              return (
                <div key={step.id} className="flex items-center">
                  <div className="flex flex-col items-center">
                    <div
                      className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 ${isCompleted
                        ? "bg-green-500 text-white"
                        : isActive
                          ? "bg-blue-500 text-white"
                          : "bg-gray-200 text-gray-500"
                        }`}
                    >
                      {isCompleted ? (
                        <IconCheck className="h-6 w-6" />
                      ) : (
                        <IconComponent className="h-6 w-6" />
                      )}
                    </div>
                    <div className="mt-2 text-center">
                      <div className={`text-sm font-semibold ${isActive ? "text-blue-600" : "text-gray-600"}`}>
                        {step.title}
                      </div>
                      <div className="text-xs text-gray-500">{step.description}</div>
                    </div>
                  </div>

                  {index < steps.length - 1 && (
                    <div className={`w-16 h-1 mx-4 ${isCompleted ? "bg-green-500" : "bg-gray-200"}`} />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Form Content */}
        <div className="min-h-[500px] ">
          <AnimatePresence mode="wait">
            {currentStep === 1 && renderStep1()}
            {currentStep === 2 && renderStep2()}
            {currentStep === 3 && renderStep3()}
          </AnimatePresence>
        </div>

        {/* Navigation Buttons */}
        {currentStep !== 3 && (
          <div className="flex justify-between mt-8">
            <Button
              onClick={prevStep}
              disabled={currentStep === 1}
              variant="outline"
              className="flex items-center gap-2"
            >
              <IconChevronLeft className="h-4 w-4" />
              Previous
            </Button>

            {currentStep < 3 ? (
              <Button
                onClick={handleNextStep} // Changed from nextStep to handleNextStep
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700"
              >
                Next
                <IconChevronRight className="h-4 w-4" />
              </Button>
            ) : (
              <div className="text-sm text-slate-500">
                Review your information and publish when ready
              </div>
            )}
          </div>
        )}
      </div>

      <style jsx>{`
        .slider::-webkit-slider-thumb {
          appearance: none;
          height: 20px;
          width: 20px;
          border-radius: 50%;
          background: #fb923c;
          cursor: pointer;
          box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        }
        
        .slider::-moz-range-thumb {
          height: 20px;
          width: 20px;
          border-radius: 50%;
          background: #fb923c;
          cursor: pointer;
          border: none;
          box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        }
      `}</style>
    </div>
  );
}

export default withAuth(JobPostingForm);