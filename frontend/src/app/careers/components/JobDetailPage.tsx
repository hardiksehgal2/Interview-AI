/* eslint-disable react/no-unescaped-entities */
/* eslint-disable @typescript-eslint/no-unused-vars */
'use client'
// src/app/careers/components/JobDetailPage.tsx
import { ChangeEvent, useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { jobs } from './JobsListing'
import { useRouter } from 'next/navigation'
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from '@/components/ui/textarea'
import AxiosInstances from '@/services/AxiosInstance'
import axios from 'axios'
// Define the interfaces to match JobsListing.tsx
interface Job {
  id: number
  role: string
  level: string
  category: string
  isRemote: boolean
  isFullTime: boolean
  slug: string
  description?: string
  responsibilities?: string[]
  requirements?: string[]
}
interface ApplicationForm {
  name: string;
  email: string;
  resume: File | null;
  coverLetter: string;
}

export default function JobDetailPage() {
  const params = useParams();
  const slug = params.slug as string;
  const router = useRouter();

  // Find the job based on the slug in the URL
  const job = jobs.find((job: Job) => job.slug === slug);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState<ApplicationForm>({
    name: '',
    email: '',
    resume: null,
    coverLetter: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  // Handle form input changes
  const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  // Handle file input change
  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type === 'application/pdf') {
      setFormData({ ...formData, resume: file });
    } else {
      alert('Only PDF files are allowed.');
      e.target.value = ''; // reset file input
    }
  };
  
  // Handle form submission
  // Handle form submission
const handleSubmit = async () => {
  setIsSubmitting(true);

  const submitData = new FormData();
  submitData.append('name', formData.name);
  submitData.append('email', formData.email);
  
  // Format and send the requirements instead of cover letter
  const jobRequirements = job?.requirements 
    ? job.requirements.join('\n') 
    : 'No specific requirements for this position.';
  
  submitData.append('job_description', jobRequirements);

  if (formData.resume) {
    submitData.append('resume', formData.resume);
  }
  console.log("form data ", formData)
  try {
    // IMPORTANT: Don't set Content-Type header when sending FormData
    const response = await axios.post('http://localhost:8001/user-info', submitData,{
      headers: {
        
      }
    });

    setFormData({
      name: '',
      email: '',
      resume: null,
      coverLetter: '',
    });
    setSubmitSuccess(true);

    setTimeout(() => {
      setIsDialogOpen(false);
      setSubmitSuccess(false);
    }, 3000);
  } catch (error) {
    console.error('Error submitting application:', error);
    // alert('There was a problem submitting your application.');
  } finally {
    setIsSubmitting(false);
  }
};

  // Scroll to top on page load
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);
  
  const handleApply = () => {
    setIsDialogOpen(true)
  }
  
  // If job not found, show a message
  if (!job) {
    return (
      <div className="min-h-screen bg-white py-16 px-4 md:px-16 text-center">
        <h1 className="text-2xl font-bold text-red-600 mb-4">Job Not Found</h1>
        <p className="text-lg text-gray-700 mb-6">The job position you&apos;re looking for doesn&apos;t exist or has been removed.</p>
        <Link
          href="/careers"
          className="inline-flex items-center px-4 py-2 bg-gray-900 text-white rounded-full hover:bg-gray-800 transition-colors duration-300"
        >
          ← Back to Careers
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white py-12 px-8 md:px-16">
      <div className="max-w-7xl mx-auto">
        {/* Back button */}
        <Link
          href="/careers"
          className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-8 group transition-colors duration-300"
        >
          <span className="mr-2 transform group-hover:-translate-x-1 transition-transform duration-300">←</span> Back to All Positions
        </Link>

        {/* Job header */}
        <div className="mb-10">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4 animate-fadeIn">{job.role}</h1>
          <div className="flex flex-wrap gap-2 mb-6">
            <div className="inline-flex items-center px-3 py-1 rounded-full bg-gray-100 text-gray-800 text-sm">
              <svg className="w-4 h-4 mr-1" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 12L12 14M12 6L12 10M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              {job.isRemote ? '100% remote' : 'On-site'}
            </div>
            <div className="inline-flex items-center px-3 py-1 rounded-full bg-gray-100 text-gray-800 text-sm">
              <svg className="w-4 h-4 mr-1" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
                <path d="M12 7V12L15 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              {job.isFullTime ? 'Full-time' : 'Part-time'}
            </div>
            <div className="inline-flex items-center px-3 py-1 rounded-full bg-gray-100 text-gray-800 text-sm">
              <svg className="w-4 h-4 mr-1" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              {job.level} level
            </div>
            <div className="inline-flex items-center px-3 py-1 rounded-full bg-gray-100 text-gray-800 text-sm">
              <svg className="w-4 h-4 mr-1" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
              </svg>
              {job.category}
            </div>
          </div>
          <p className="text-xl text-gray-700">{job.description}</p>
        </div>

        {/* Job details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 mb-12">
          {/* Responsibilities */}
          <div className="bg-gray-50 p-6 rounded-lg shadow-sm border border-gray-100 transform transition duration-500 hover:shadow-md hover:-translate-y-1">
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
              <span className="mr-2">
                <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </span>
              Responsibilities
            </h2>
            {job.responsibilities && (
              <ul className="space-y-2">
                {job.responsibilities.map((item: string, index: number) => (
                  <li key={index} className="flex items-start">
                    <span className="text-green-500 mr-2 mt-1">•</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Requirements */}
          <div className="bg-gray-50 p-6 rounded-lg shadow-sm border border-gray-100 transform transition duration-500 hover:shadow-md hover:-translate-y-1">
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
              <span className="mr-2">
                <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                </svg>
              </span>
              Requirements
            </h2>
            {job.requirements && (
              <ul className="space-y-2">
                {job.requirements.map((item: string, index: number) => (
                  <li key={index} className="flex items-start">
                    <span className="text-blue-500 mr-2 mt-1">•</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Apply button */}
        <div className="flex justify-center">
          <button
            className="px-8 py-3 cursor-pointer bg-blue-600 text-white rounded-full text-lg font-medium hover:bg-blue-700 transition-colors duration-300 transform hover:scale-105 shadow-md hover:shadow-lg"
            onClick={handleApply}
          >
            Apply for this Position
          </button>
        </div>

        {/* Related Jobs */}
        <div className="mt-16">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Other Open Positions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {jobs
              .filter((j: Job) => j.slug !== job.slug)
              .slice(0, 2)
              .map((relatedJob: Job) => (
                <Link
                  href={`/careers/${relatedJob.slug}`}
                  key={relatedJob.id}
                  className="p-6 border border-gray-200 rounded-lg hover:border-blue-300 hover:shadow-md transition-all duration-300 group"
                >
                  <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors duration-300">{relatedJob.role}</h3>
                  <p className="text-gray-600 mb-3 line-clamp-2">{relatedJob.description}</p>
                  <div className="flex items-center text-blue-600">
                    View Position <span className="ml-2 transform group-hover:translate-x-1 transition-transform duration-300">→</span>
                  </div>
                </Link>
              ))
            }
          </div>
        </div>
      </div>

      {/* Custom CSS for animations */}
      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.5s ease-out forwards;
        }
      `}</style>

      <div className="flex justify-center">
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Apply for {job.role}</DialogTitle>
              <DialogDescription>
                Complete the form below to submit your application.
              </DialogDescription>
            </DialogHeader>

            {submitSuccess ? (
              <div className="py-6 text-center">
                <svg
                  className="w-16 h-16 text-green-500 mx-auto mb-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Application Submitted!</h3>
                <p className="text-gray-600">Thank you for your interest. We'll be in touch soon.</p>
              </div>
            ) : (
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
                  <div className="col-span-3">
                    <Input
                      id="resume"
                      name="resume"
                      type="file"
                      accept=".pdf"
                      onChange={handleFileChange}
                      className="col-span-3 cursor-pointer"
                      required
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Only PDF format is accepted
                    </p>
                  </div>
                </div>

                {/* <div className="grid grid-cols-4 items-start gap-4">
                  <Label className="text-right">
                    Job Requirements
                  </Label>
                  <div className="col-span-3 bg-gray-50 p-3 rounded border border-gray-200 text-sm text-gray-700">
                    <ul className="space-y-1">
                      {job.requirements?.map((req, index) => (
                        <li key={index} className="flex items-start">
                          <span className="text-blue-500 mr-2">•</span>
                          <span>{req}</span>
                        </li>
                      ))}
                    </ul>
                    <p className="text-xs text-gray-500 mt-2 italic">
                      These requirements will be submitted with your application
                    </p>
                  </div>
                </div> */}
              </div>
            )}

            <DialogFooter>
              {!submitSuccess && (
                <>
                  <Button
                    variant="outline"
                    onClick={() => setIsDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    onClick={handleSubmit}
                    disabled={isSubmitting || !formData.name || !formData.email || !formData.resume}
                    className='cursor-pointer'
                  >
                    {isSubmitting ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Submitting...
                      </>
                    ) : (
                      'Submit Application'
                    )}
                  </Button>
                </>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

    </div>
  );
}