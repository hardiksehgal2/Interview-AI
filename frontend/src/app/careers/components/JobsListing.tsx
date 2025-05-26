/* eslint-disable @typescript-eslint/no-unused-vars */
'use client'

import { useState, useEffect } from 'react'
import { TypewriterEffectSmooth } from '@/components/ui/typewriter-effect'
import AxiosInstances from '@/services/AxiosInstance'
import { useRouter } from 'next/navigation'
import { JobCardSkeleton } from '@/components/Shimmer'

// Define job interface with TypeScript types
interface Job {
    id: string;
    jd_text: string;
    domain: string;
}

// Words for typewriter effect


export default function JobsListing() {
    const router = useRouter();

    // State for job listings with proper typing
    const [jobs, setJobs] = useState<Job[]>([]);
    // State for domains extracted from jobs
    const [domains, setDomains] = useState<string[]>([]);
    // State for active filter
    const [activeFilter, setActiveFilter] = useState<string>('View all');
    // State for loading status
    const [loading, setLoading] = useState<boolean>(true);

    // Fetch jobs from API on component mount
    useEffect(() => {
        const fetchJobs = async () => {
            try {
                setLoading(true);
                const response = await AxiosInstances.get('/jd/all/');

                if (response.data && response.data.length > 0) {
                    setJobs(response.data);

                    // Extract unique domains for filter buttons
                    const uniqueDomains = [...new Set(response.data.map((job: Job) => job.domain))] as string[];
                    setDomains(uniqueDomains);
                }
            } catch (error) {
                console.error('Error fetching job data:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchJobs();
    }, []);

    // Format domain name for display (e.g., "gen-ai" becomes "Gen Ai")
    const formatDomainName = (domain: string): string => {
        if (!domain) return '';

        return domain.split('-')
            .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    };

    // Extract title from markdown content
    const extractTitle = (markdownText: string): string => {
        if (!markdownText) return 'Job Opening';

        // Look for first heading
        const titleMatch = markdownText.match(/^##?\s+(.+)$/m);
        return titleMatch ? titleMatch[1] : 'Job Opening';
    };
    const handleApply = (domain: string, id: string) => {
        // frontend/src/app/careers/jobDetail/page.tsx
        router.push(`/careers/jobDetail?id=${id}&domain=${domain}`)
    }
    // Extract first two lines of description (excluding the title)
    const extractDescription = (markdownText: string): string => {
        if (!markdownText) return '';

        // Split by lines and skip headers
        const lines = markdownText.split('\n').filter(line => !line.startsWith('#') && line.trim());

        // Get first two substantial lines
        const firstLines = lines.slice(0, 2).join(' ');

        return firstLines.length > 150
            ? firstLines.substring(0, 150) + '...'
            : firstLines;
    };

    // Filter jobs based on selected domain
    const filteredJobs = activeFilter === 'View all'
        ? jobs
        : jobs.filter(job => formatDomainName(job.domain) === activeFilter);

    // Create filter options array with "View all" first, then sorted domains
    const filterOptions: string[] = ['View all', ...domains.map(domain => formatDomainName(domain))];

    return (
        <div className="bg-white mx-auto px-4 md:px-16 py-8">
            <div className="flex justify-center mb-6">
                <h3 className="text-3xl font-bold text-gray-900 mb-8 text-center">Apply Now</h3>
            </div>

            {/* Filter navigation */}
            <div className="flex flex-wrap gap-2 mb-8 overflow-x-auto">
                {filterOptions.map((option) => (
                    <button
                        key={option}
                        onClick={() => setActiveFilter(option)}
                        className={`px-4 py-2 rounded-full text-sm font-medium transition-colors whitespace-nowrap ${activeFilter === option
                            ? 'bg-gray-900 text-white'
                            : 'bg-white text-gray-800 border border-gray-300 hover:bg-gray-100'
                            }`}
                    >
                        {option}
                    </button>
                ))}
            </div>

            {/* Loading state */}
            {loading && (
                <div className="text-center py-12">
                    <JobCardSkeleton /> 

                    {/* Example: three blocks stacked vertically */}
                    {/* <Shimmer count={3} heightClass="h-6" direction="col" gapClass="space-y-4" /> */}
                </div>
            )}

            {/* Job listings */}
            <div className="space-y-8">
                {filteredJobs.map((job) => (
                    <div key={job.id} className="border-b border-gray-200 pb-8">
                        <div className="flex justify-between items-start mb-2">
                            <h2 className="text-2xl font-bold text-gray-900">
                                {extractTitle(job.jd_text)}
                            </h2>
                            <button
                                onClick={() => handleApply(job.domain, job.id)}
                                className="inline-flex cursor-pointer items-center text-lg font-medium text-gray-900 hover:text-blue-600 transition-colors duration-300 group"
                            >
                                Apply <span className="ml-2 transform group-hover:translate-x-1 transition-transform duration-300">↗</span>
                            </button>
                        </div>
                        <p className="text-lg text-gray-700 mb-4">
                            {extractDescription(job.jd_text)}
                        </p>
                        <div className="flex flex-wrap gap-2">
                            <div className="inline-flex items-center px-3 py-1 rounded-full border border-gray-300 text-sm hover:bg-gray-50 transition-colors duration-300">
                                <svg className="w-4 h-4 mr-1" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M12 12L12 14M12 6L12 10M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                                100% remote
                            </div>
                            <div className="inline-flex items-center px-3 py-1 rounded-full border border-gray-300 text-sm hover:bg-gray-50 transition-colors duration-300">
                                <svg className="w-4 h-4 mr-1" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
                                    <path d="M12 7V12L15 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                                Full-time
                            </div>

                            {/* Domain tag */}
                            <div className="inline-flex items-center px-3 py-1 rounded-full border border-gray-300 text-sm hover:bg-gray-50 transition-colors duration-300">
                                {formatDomainName(job.domain)}
                            </div>

                            {/* View Details Link */}
                            <button
                                className="inline-flex cursor-pointer items-center px-3 py-1 rounded-full border border-blue-300 text-sm text-blue-600 hover:bg-blue-50 transition-colors duration-300"
                                onClick={() => handleApply(job.domain, job.id)}

                            >
                                View Details
                            </button>
                        </div>
                    </div>
                ))}

                {filteredJobs.length === 0 && !loading && (
                    <div className="text-center py-12">
                        <p className="text-lg text-gray-600">No open positions in this category at the moment.</p>
                    </div>
                )}
            </div>
        </div>
    )
}