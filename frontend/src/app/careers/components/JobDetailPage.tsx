'use client'
// src/app/careers/components/JobDetailPage.tsx
import { useEffect } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { jobs } from './JobsListing'
import { useRouter } from 'next/navigation'

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

export default function JobDetailPage() {
  const params = useParams();
  const slug = params.slug as string;
  const router = useRouter();
  // Find the job based on the slug in the URL
  const job = jobs.find((job: Job) => job.slug === slug);
  
  // Scroll to top on page load
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);
  const handleApply = () => {
    // Redirect to the application page with the current job slug
    router.push(`/apply/${slug}`);
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
                <path d="M12 12L12 14M12 6L12 10M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              {job.isRemote ? '100% remote' : 'On-site'}
            </div>
            <div className="inline-flex items-center px-3 py-1 rounded-full bg-gray-100 text-gray-800 text-sm">
              <svg className="w-4 h-4 mr-1" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2"/>
                <path d="M12 7V12L15 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
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
    </div>
  );
}