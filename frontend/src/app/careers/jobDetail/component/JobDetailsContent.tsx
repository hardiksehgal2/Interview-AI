/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react/no-unescaped-entities */
'use client'
import { useRouter } from 'next/navigation';

import { useState, useEffect } from 'react'
import {  useSearchParams } from 'next/navigation'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'  // Import remark-gfm for GitHub Flavored Markdown (tables, etc)
import rehypeRaw from 'rehype-raw'  // For raw HTML support
import rehypeSanitize from 'rehype-sanitize'  // For sanitizing HTML
import AxiosInstances from '@/services/AxiosInstance'

import toast, { Toaster } from 'react-hot-toast';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import Link from 'next/link'
import { Target } from 'lucide-react'

// Define job interface
interface Job {
    id: string;
    jd_text: string;
    domain: string;
}

 export function JobDetailsContent() {
    const router = useRouter();
    const searchParams = useSearchParams();

    // Get id and domain from query parameters
    const id = searchParams.get('id');
    const domain = searchParams.get('domain');
    const [interviewId, setInterviewId] = useState<string | null>(null);
    const [job, setJob] = useState<Job | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [isDialogOpen, setIsDialogOpen] = useState<boolean>(false);
    const [submitSuccess, setSubmitSuccess] = useState<boolean>(false);
    const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
    const [formData, setFormData] = useState<{
        name: string;
        email: string;
        resume: File | null;
        jobId: string | null;
    }>({
        name: "",
        email: "",
        resume: null,
        jobId: id || null,
    });

    useEffect(() => {
        const fetchJobDetails = async () => {
            if (!id) {
                setError('Job ID is missing');
                setLoading(false);
                return;
            }

            try {
                setLoading(true);
                // Fetch job by ID
                const response = await AxiosInstances.get(`/jd/${domain}`);

                if (response.data && Array.isArray(response.data) && response.data.length > 0) {
                    // Get the first item from the array
                    setJob(response.data[0]);
                    console.log("job data", response.data[0]);
                } else {
                    setError('Job not found');
                }
            } catch (err) {
                console.error('Error fetching job details:', err);
                setError('Failed to load job details');
            } finally {
                setLoading(false);
            }
        };

        fetchJobDetails();
    }, [domain, id]);
    const handleApplyInterview =()=>{
        router.push(`/careers/jobDetail/interview?id=${interviewId}`)
    }

    // Format domain name for display (e.g., "gen-ai" becomes "Gen Ai")
    const formatDomainName = (domainStr: string | null): string => {
        if (!domainStr) return '';

        return domainStr.split('-')
            .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    };

    // Handle apply button click
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            setFormData(prev => ({
                ...prev,
                resume: e.target.files![0]
            }));
        }
    };

    const handleSubmit = async (e: React.MouseEvent<HTMLButtonElement>) => {
        e.preventDefault();
        setIsSubmitting(true);
        setSubmitSuccess(false);


        // Create form data with the keys expected by the backend
        const formDataToSend = new FormData();
        formDataToSend.append('candidate_name', formData.name);
        formDataToSend.append('candidate_email', formData.email);
        if (formData.resume) {
            formDataToSend.append('resume_file', formData.resume);
        }
        if (formData.jobId) {
            formDataToSend.append('jd_id', formData.jobId);
        }

        try {
            // Show toast message that questions are being generated
            toast.success(
                "Questions are being generated, this may take few seconds...",
            );

            // Send the application data to the API
            const response = await AxiosInstances.post('/resumes/apply/', formDataToSend, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });

            // Handle successful response
            if (response.data && response.data.interview_id) {
                // Store the interview ID
                setInterviewId(response.data.interview_id);

                // Show success toast
                toast.success("Application submitted successfully!", {
                    id: "application-submission"
                });

                setSubmitSuccess(true);
                setFormData({
                    name: "",
                    email: "",
                    resume: null,
                    jobId: id || null
                });

                // Reset form after successful submission
                // setTimeout(() => {
                    setSubmitSuccess(true);
                //     setIsDialogOpen(false);
                    // setFormData({
                    //     name: "",
                    //     email: "",
                    //     resume: null,
                    //     jobId: id || null
                    // });
                // }, 3000);
            } else {
                // Unexpected response format
                toast.error("Unexpected response from server", {
                    id: "application-submission"
                });
            }
        } catch (error: any) {
            console.error("Error submitting application:", error);

            // Show error toast with message from API if available
            toast.error(
                error.response?.data?.message || "Failed to submit application. Please try again.",
                { id: "application-submission" }
            );
        } finally {
            setIsSubmitting(false);
        }
    };

    // Extract title from markdown content
    const extractTitle = (markdownText: string): string => {
        if (!markdownText) return 'Job Opening';

        // Look for first heading
        const titleMatch = markdownText.match(/^##?\s+(.+)$/m);
        return titleMatch ? titleMatch[1] : 'Job Opening';
    };
    const handleApply = () => {
        setIsDialogOpen(true);
    };

    // Custom components for rendering markdown
    const components = {
        // Customize table rendering
        table: ({ node, ...props }: any) => (
            <div className="overflow-x-auto my-6">
                <table className="min-w-full divide-y divide-gray-300 border rounded-lg" {...props} />
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
            <td className="px-6 py-4 whitespace-normal text-sm text-gray-500" {...props} />
        ),
        // Customize headings
        h2: ({ node, ...props }: any) => (
            <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4" {...props} />
        ),
        h3: ({ node, ...props }: any) => (
            <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-3" {...props} />
        ),
        // Customize lists
        ul: ({ node, ...props }: any) => (
            <ul className="list-disc pl-5 my-4 space-y-2 text-gray-700" {...props} />
        ),
        ol: ({ node, ...props }: any) => (
            <ol className="list-decimal pl-5 my-4 space-y-2 text-gray-700" {...props} />
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
        return (
            <div className="flex justify-center items-center min-h-screen">
                <p className="text-lg">Loading job details...</p>
            </div>
        );
    }

    if (error || !job) {
        return (
            <div className="flex flex-col justify-center items-center min-h-screen gap-4">
                <p className="text-lg text-red-600">{error || 'Job not found'}</p>
                <button
                    onClick={() => router.push('/careers')}
                    className="px-4 py-2 bg-gray-900 text-white rounded-md hover:bg-gray-800 transition-colors"
                >
                    Back to Careers
                </button>
            </div>
        );
    }

    return (
        <div className="w-full mx-auto px-8 lg:px-16 py-8">
            <Toaster
                position="top-right"
                reverseOrder={false}
            />
            {/* Back button */}
            <button
                onClick={() => router.push('/careers')}
                className="mb-6 flex items-center cursor-pointer text-indigo-600 hover:text-indigo-800 transition-colors"
            >
                <svg className="w-4 h-4 mr-1" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M19 12H5M5 12L12 19M5 12L12 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Back to all jobs
            </button>

            {/* Job title */}
            <h1 className="text-3xl font-bold text-gray-900 mb-4">
                {extractTitle(job.jd_text)}
            </h1>

            {/* Job metadata */}
            <div className="mb-6">
                <div className="flex flex-wrap gap-2 mb-4">
                    <div className="inline-flex items-center px-3 py-1 rounded-full border border-gray-300 text-sm">
                        <svg className="w-4 h-4 mr-1" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M12 12L12 14M12 6L12 10M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        100% remote
                    </div>
                    <div className="inline-flex items-center px-3 py-1 rounded-full border border-gray-300 text-sm">
                        <svg className="w-4 h-4 mr-1" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
                            <path d="M12 7V12L15 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        Full-time
                    </div>
                    {domain && (
                        <div className="inline-flex items-center px-3 py-1 rounded-full border border-gray-300 text-sm">
                            {formatDomainName(domain)}
                        </div>
                    )}
                </div>
            </div>

            {/* Job description rendered from markdown with enhanced styling */}
            <div className="prose prose-lg max-w-none mb-10 bg-white p-6 rounded-lg border border-gray-100">
                <ReactMarkdown
                    components={components}
                    remarkPlugins={[remarkGfm]}
                    rehypePlugins={[rehypeRaw, rehypeSanitize]}
                >
                    {job.jd_text}
                </ReactMarkdown>
            </div>

            {/* Apply section */}
            <div className="my-8  p-6 rounded-lg border border-gray-100  ">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Ready to Apply?</h2>
                <p className="text-gray-700 mb-4">
                    Join our team and help us build the future. We're looking for talented individuals who are passionate about technology and innovation.
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
                            <DialogTitle>Apply for {extractTitle(job.jd_text)}</DialogTitle>
                            <DialogDescription>
                                Complete the form below to submit your application.
                            </DialogDescription>
                        </DialogHeader>
                        

                        {submitSuccess ? (
                            <DialogContent>
                            
                            <div className=" text-center">
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
                                <p className="text-gray-600">Your Questions are prepared. Your interview ID is: <span className='font-semibold'>{interviewId}</span></p>
                                <Button onClick={handleApplyInterview} className='bg-indigo-600 mt-8 cursor-pointer hover:bg-indigo-700'>Start Your Interview</Button>
                            </div>
                            </DialogContent>
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

                                <div className="grid grid-cols-4  items-center gap-4">
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