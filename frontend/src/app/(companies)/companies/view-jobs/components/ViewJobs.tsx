/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react/no-unescaped-entities */
// frontend\src\app\(companies)\companies\view-jobs\page.tsx
"use client";
import { useRouter } from "next/navigation";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import AxiosInstances from "@/services/AxiosInstance";

import toast, { Toaster } from "react-hot-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Target } from "lucide-react";
import ShimmerJobCard from "@/components/shimmer/ShimmerJobCard";

// Define job interface
interface Job {
  _id: string;
  role_title: string;
  description: string;
  skills: {
    skill_1?: string;
    skill_2?: string;
    skill_3?: string;
    skill_4?: string;
    skill_5?: string;
    skill_6?: string;
    skill_7?: string;
  };
  requirements: {
    description: string;
  };
  responsibilities: string;
  accuracy_threshold: number;
  salary_min: number;
  salary_max: number;
  location: string;
  employment_type: string;
  experience_level: string;
  difficulty: string;
  openings: number;
  duration: string | null;
  perks: string | null;
  company_id: string;
  created_by: string;
  applications_count: number;
  is_active: boolean;
  created_at: string;
  updated_at: string | null;
}

export function ViewJobs() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Get company_id and job_id from query parameters
  const companyId = searchParams.get("company_id");
  const jobId = searchParams.get("job_id");

  const [interviewId, setInterviewId] = useState<string | null>(null);
  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState<boolean>(false);
  const [submitSuccess, setSubmitSuccess] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [showInterviewDialog, setShowInterviewDialog] =
    useState<boolean>(false);
  const [formData, setFormData] = useState<{
    name: string;
    email: string;
    resume: File | null;
    jobId: string | null;
  }>({
    name: "",
    email: "",
    resume: null,
    jobId: jobId || null,
  });

  useEffect(() => {
    const fetchJobDetails = async () => {
      if (!jobId) {
        setError("Job ID is missing");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        // Fetch job by job_id
        const response = await AxiosInstances.get(`/jobs/${jobId}`);

        if (response.data) {
          // Response.data is now a single object
          setJob(response.data);
          console.log("job data", response.data);
        } else {
          setError("Job not found");
        }
      } catch (err) {
        console.error("Error fetching job details:", err);
        setError("Failed to load job details");
      } finally {
        setLoading(false);
      }
    };

    fetchJobDetails();
  }, [jobId]);

  const handleApplyInterview = () => {
    router.push(`/careers/jobDetail/interview?id=${interviewId}`);
  };

  // Format domain name for display (e.g., "gen-ai" becomes "Gen Ai")
  const formatEmploymentType = (type: string | null): string => {
    if (!type) return "";

    return type
      .split("_")
      .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  // Handle apply button click
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFormData((prev) => ({
        ...prev,
        resume: e.target.files![0],
      }));
    }
  };

  const handleSubmit = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitSuccess(false);

    // Create form data with the keys expected by the backend
    const formDataToSend = new FormData();
    formDataToSend.append("candidate_name", formData.name);
    formDataToSend.append("candidate_email", formData.email);
    if (formData.resume) {
      formDataToSend.append("resume_file", formData.resume);
    }
    if (formData.jobId) {
      formDataToSend.append("jd_id", formData.jobId);
    }

    try {
      // Show toast message that questions are being generated
      toast.success(
        "Questions are being generated, this may take few seconds..."
      );

      // Send the application data to the API
      const response = await AxiosInstances.post(
        "/resumes/apply/",
        formDataToSend,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );

      // Handle successful response
      if (response.data && response.data.interview_id) {
        // Store the interview ID
        setInterviewId(response.data.interview_id);

        // Show success toast
        toast.success("Application submitted successfully!", {
          id: "application-submission",
        });

        setSubmitSuccess(true);
        setFormData({
          name: "",
          email: "",
          resume: null,
          jobId: jobId || null,
        });

        // Show interview guidelines dialog after 0 seconds
        setTimeout(() => {
          setIsDialogOpen(false);
          setShowInterviewDialog(true);
        }, 0);
      } else {
        // Unexpected response format
        toast.error("Unexpected response from server", {
          id: "application-submission",
        });
      }
    } catch (error: any) {
      console.error("Error submitting application:", error);

      // Show error toast with message from API if available
      toast.error(
        error.response?.data?.message ||
          "Failed to submit application. Please try again.",
        { id: "application-submission" }
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleApply = () => {
    setIsDialogOpen(true);
  };

  // Custom components for rendering markdown
  const components = {
    // Customize table rendering
    table: ({ node, ...props }: any) => (
      <div className="overflow-x-auto my-6">
        <table
          className="min-w-full divide-y divide-gray-300 border rounded-lg"
          {...props}
        />
      </div>
    ),
    thead: ({ node, ...props }: any) => (
      <thead className="bg-gray-50" {...props} />
    ),
    tbody: ({ node, ...props }: any) => (
      <tbody className="divide-y divide-gray-200 bg-white" {...props} />
    ),
    tr: ({ node, ...props }: any) => (
      <tr className="hover:bg-gray-50" {...props} />
    ),
    th: ({ node, ...props }: any) => (
      <th
        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
        {...props}
      />
    ),
    td: ({ node, ...props }: any) => (
      <td
        className="px-6 py-4 whitespace-normal text-sm text-gray-500"
        {...props}
      />
    ),
    // Customize headings
    h2: ({ node, ...props }: any) => (
      <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4" {...props} />
    ),
    h3: ({ node, ...props }: any) => (
      <h3
        className="text-xl font-semibold text-gray-800 mt-6 mb-3"
        {...props}
      />
    ),
    // Customize lists
    ul: ({ node, ...props }: any) => (
      <ul className="list-disc pl-5 my-4 space-y-2 text-gray-700" {...props} />
    ),
    ol: ({ node, ...props }: any) => (
      <ol
        className="list-decimal pl-5 my-4 space-y-2 text-gray-700"
        {...props}
      />
    ),
    // Customize emphasis and strong
    em: ({ node, ...props }: any) => (
      <em className="italic text-gray-700" {...props} />
    ),
    strong: ({ node, ...props }: any) => (
      <strong className="font-bold text-gray-900" {...props} />
    ),
    // Regular paragraphs
    p: ({ node, ...props }: any) => (
      <p className="my-4 text-gray-700 leading-relaxed" {...props} />
    ),
    // Handle horizontal rules
    hr: ({ node, ...props }: any) => (
      <hr className="my-6 border-t border-gray-300" {...props} />
    ),
  };

  if (loading) {
    return <ShimmerJobCard />;
  }

  if (error || !job) {
    return (
      <div className="flex flex-col justify-center items-center min-h-screen gap-4">
        <p className="text-lg text-red-600">{error || "Job not found"}</p>
        <button
          onClick={() =>
            router.push(`/companies/view-profile?company_id=${companyId}`)
          }
          className="px-4 py-2 bg-gray-900 text-white rounded-md hover:bg-gray-800 transition-colors"
        >
          Back to Company Profile
        </button>
      </div>
    );
  }
  const formatSalary = (
    min: number | null | undefined,
    max: number | null | undefined
  ): string => {
    const formatNumber = (num: number): string => {
      if (num >= 100000) {
        return `${(num / 100000).toFixed(1)}L`;
      }
      if (num >= 1000) {
        return `${(num / 1000).toFixed(0)}K`;
      }
      return num.toString();
    };

    if (min == null || max == null) {
      return "Not Disclosed";
    }

    return `${formatNumber(min)} - ${formatNumber(max)}`;
  };
  return (
    <div className="w-full mx-auto px-8 lg:px-16 py-8">
      <Toaster position="top-right" reverseOrder={false} />
      {/* Back button */}
      <button
        onClick={() =>
          router.push(`/companies/view-profile?company_id=${companyId}`)
        }
        className="mb-6 flex items-center cursor-pointer text-indigo-600 hover:text-indigo-800 transition-colors"
      >
        <svg
          className="w-4 h-4 mr-1"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M19 12H5M5 12L12 19M5 12L12 5"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        Back to Company Profile
      </button>

      {/* Job title */}
      <h1 className="text-3xl font-bold text-gray-900 mb-4">
        {job.role_title}
      </h1>

      {/* Job metadata */}
      <div className="mb-6">
        <div className="flex flex-wrap gap-2 mb-4">
          <div className="inline-flex items-center px-3 py-1 rounded-full border border-gray-300 text-sm">
            <svg
              className="w-4 h-4 mr-1"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M12 2L2 7V17C2 17.55 2.45 18 3 18H9V12H15V18H21C21.55 18 22 17.55 22 17V7L12 2Z"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            {job.location}
          </div>
          <div className="inline-flex items-center px-3 py-1 rounded-full border border-gray-300 text-sm">
            <svg
              className="w-4 h-4 mr-1"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <circle
                cx="12"
                cy="12"
                r="9"
                stroke="currentColor"
                strokeWidth="2"
              />
              <path
                d="M12 7V12L15 15"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            {formatEmploymentType(job.employment_type)}
          </div>
          <div className="inline-flex items-center px-3 py-1 rounded-full border border-gray-300 text-sm">
            <svg
              className="w-4 h-4 mr-1"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M16 21V19C16 17.9 15.1 17 14 17H6C4.9 17 4 17.9 4 19V21M20 8V6C20 4.9 19.1 4 18 4H6C4.9 4 4 4.9 4 6V8M12 13C10.9 13 10 12.1 10 11C10 9.9 10.9 9 12 9C13.1 9 14 9.9 14 11C14 12.1 13.1 13 12 13Z"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            {job.experience_level.charAt(0).toUpperCase() +
              job.experience_level.slice(1)}{" "}
            Level
          </div>
          <div className="inline-flex items-center px-3 py-1 rounded-full border border-green-300 text-sm text-green-600 bg-green-50">
            <svg
              className="w-4 h-4 mr-1"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M12 2C13.1 2 14 2.9 14 4C14 5.1 13.1 6 12 6C10.9 6 10 5.1 10 4C10 2.9 10.9 2 12 2ZM21 9V7L15 1H9V3H15V9H21ZM7 14C7.6 14 8 14.4 8 15S7.6 16 7 16 6 15.6 6 15 6.4 14 7 14ZM3 9V11H5V9H3ZM9 9V11H11V9H9ZM15 15C15.6 15 16 15.4 16 16S15.6 17 16 17 17 16.6 17 16 16.6 15 16 15Z"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            {formatSalary(job.salary_min, job.salary_max)}
          </div>
        </div>
      </div>

      {/* Job description and details */}
      <div className="space-y-8 mb-10">
        {/* Job Description */}
        <div className="bg-white p-6 rounded-lg border border-gray-100">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Job Description
          </h2>
          <p className="text-gray-700 leading-relaxed">{job.description}</p>
        </div>

        {/* Required Skills */}
        <div className="bg-white p-6 rounded-lg border border-gray-100">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Required Skills
          </h2>
          <div className="flex flex-wrap gap-2">
            {Object.values(job.skills)
              .filter((skill) => skill)
              .map((skill, index) => (
                <span
                  key={index}
                  className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-indigo-50 text-indigo-700 border border-indigo-200"
                >
                  {skill}
                </span>
              ))}
          </div>
        </div>

        {/* Requirements */}
        <div className="bg-white p-6 rounded-lg border border-gray-100">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Requirements
          </h2>
          <div className="text-gray-700 leading-relaxed">
            {job.requirements.description.split("\n").map((line, index) => (
              <p key={index} className="mb-2">
                {line}
              </p>
            ))}
          </div>
        </div>

        {/* Responsibilities */}
        <div className="bg-white p-6 rounded-lg border border-gray-100">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Responsibilities
          </h2>
          <div className="text-gray-700 leading-relaxed">
            {job.responsibilities.split("\n").map((line, index) => (
              <p key={index} className="mb-2">
                {line}
              </p>
            ))}
          </div>
        </div>

        {/* Additional Details */}
        <div className="bg-white p-6 rounded-lg border border-gray-100">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Additional Information
          </h2>
          <div className="space-y-5 gap-4">
            <div className="flex justify-start space-x-2">
              <span className="text-black font-bold">Openings:</span>
              <span className="text-gray-900 ">{job.openings}</span>
            </div>
            <div className="flex justify-start space-x-2">
              <span className="text-black font-bold">Difficulty:</span>
              <span className="text-gray-900 capitalize">{job.difficulty}</span>
            </div>
            {job.perks && (
              <div className="flex justify-start space-x-2">
                <span className="text-black font-bold">Perks:</span>
                <span className="text-gray-900">{job.perks}</span>
              </div>
            )}
            <div className="flex justify-start space-x-2">
              <span className="text-black font-bold">Status:</span>
              <span
                className={`px-2 py-1 h-8 rounded-lg text-xs font-medium ${
                  job.is_active
                    ? "bg-green-100 text-green-800"
                    : "bg-red-100 text-red-800"
                }`}
              >
                {job.is_active ? "Active" : "Inactive"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Apply section */}
      <div className="my-8  p-6 rounded-lg border border-gray-100  ">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Ready to Apply?
        </h2>
        <p className="text-gray-700 mb-4">
          Join our team and help us build the future. We're looking for talented
          individuals who are passionate about technology and innovation.
        </p>
        <button
          onClick={handleApply}
          className="px-6 py-3 bg-indigo-600 text-white rounded-md cursor-pointer hover:bg-indigo-700 transition-colors font-medium"
        >
          Apply Now
        </button>
      </div>
      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fadeIn {
          animation: fadeIn 0.5s ease-out forwards;
        }
      `}</style>

      <div className="flex justify-center">
        {/* Main Application Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Apply for {job.role_title}</DialogTitle>
              <DialogDescription>
                Complete the form below to submit your application.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="name" className="text-right">
                  Full Name
                </Label>
                <Input
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className="col-span-3"
                  required
                />
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="email" className="text-right">
                  Email
                </Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className="col-span-3"
                  required
                />
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="resume" className="text-right">
                  Resume
                </Label>
                <div className="col-span-3 cursor-pointer items-end justify-center">
                  <Input
                    id="resume"
                    name="resume"
                    type="file"
                    accept=".pdf"
                    onChange={handleFileChange}
                    className="col-span-3 cursor-pointer"
                    required
                  />
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                onClick={handleSubmit}
                disabled={
                  isSubmitting ||
                  !formData.name ||
                  !formData.email ||
                  !formData.resume
                }
                className="cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <svg
                      className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    Submitting...
                  </>
                ) : (
                  "Submit Application"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Interview Guidelines Dialog - Separate Dialog */}
        <Dialog
          open={showInterviewDialog}
          onOpenChange={setShowInterviewDialog}
        >
          <DialogContent className="sm:max-w-lg max-h-lg h-full overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center">
                  <Target className="w-4 h-4 text-indigo-600" />
                </div>
                Interview Guidelines & Process
              </DialogTitle>
              <DialogDescription>
                Please read the following important information before starting
                your interview.
              </DialogDescription>
            </DialogHeader>

            <div className="py-4 space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h4 className="font-semibold text-green-800 mb-2">
                  ✅ Interview Process
                </h4>
                <ul className="text-sm text-green-700 space-y-1">
                  <li>
                    • You will be asked a series of questions related to the job
                    role
                  </li>
                  <li>• Answer all questions to the best of your ability</li>
                  <li>
                    • A summary of your interview will be generated based on
                    your responses
                  </li>
                  <li>
                    • You can view your interview summary using your email and
                    interview ID:{" "}
                    <span className="font-mono bg-green-100 px-1 rounded">
                      {interviewId}
                    </span>
                  </li>
                </ul>
              </div>

              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <h4 className="font-semibold text-red-800 mb-2">
                  ⚠️ Anti-Cheat Monitoring
                </h4>
                <ul className="text-sm text-red-700 space-y-1">
                  <li>
                    • <strong>No tab switching:</strong> Do not switch to other
                    browser tabs during the interview
                  </li>
                  <li>
                    • <strong>No window switching:</strong> Stay focused on the
                    interview window
                  </li>
                  <li>
                    • <strong>Face tracking:</strong> Your camera will monitor
                    your face throughout the interview
                  </li>
                  <li>
                    • <strong>Single participant:</strong> Ensure you are alone
                    and no one else is visible in the camera
                  </li>
                </ul>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <h4 className="font-semibold text-yellow-800 mb-2">
                  📋 Before You Start
                </h4>
                <ul className="text-sm text-yellow-700 space-y-1">
                  <li>• Ensure stable internet connection</li>
                  <li>• Find a quiet, well-lit environment</li>
                  <li>
                    • Position yourself at an appropriate distance from the
                    camera
                  </li>
                  <li>• Close all unnecessary applications and browser tabs</li>
                </ul>
              </div>

              <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-3 text-center">
                <p className="text-sm text-indigo-700">
                  <strong>Your Interview ID:</strong>{" "}
                  <span className="font-mono bg-indigo-100 px-2 py-1 rounded">
                    {interviewId}
                  </span>
                </p>
                <p className="text-xs text-indigo-600 mt-1">
                  Save this ID to access your interview summary later
                </p>
              </div>
            </div>

            <DialogFooter>
              <Button
                onClick={handleApplyInterview}
                className="bg-indigo-600 hover:bg-indigo-700 w-full cursor-pointer"
              >
                I Understand - Start My Interview
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
