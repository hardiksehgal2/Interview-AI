/* eslint-disable @typescript-eslint/no-unused-vars */
'use client'

import { useState, useEffect, useRef } from 'react'
import { motion } from 'motion/react'
import { useInView } from 'motion/react'
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

export default function JobsListing() {
    const router = useRouter();
    const sectionRef = useRef(null);
    const isInView = useInView(sectionRef, { once: true, margin: "-50px" });

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
        <motion.div 
            ref={sectionRef}
            className="bg-white mx-auto px-4 md:px-16 py-8"
            initial={{ opacity: 0 }}
            animate={isInView ? { opacity: 1 } : { opacity: 0 }}
            transition={{ duration: 0.6 }}
        >
            {/* Header */}
            <motion.div 
                className="flex justify-center mb-6"
                initial={{ opacity: 0, y: 20 }}
                animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
                transition={{ duration: 0.6, delay: 0.2 }}
            >
                <h3 className="text-3xl font-bold text-gray-900 mb-8 text-center">Apply Now</h3>
            </motion.div>

            {/* Filter navigation */}
            <motion.div 
                className="flex flex-wrap gap-2 mb-8 overflow-x-auto"
                initial={{ opacity: 0, y: 20 }}
                animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
                transition={{ duration: 0.6, delay: 0.3 }}
            >
                {filterOptions.map((option, index) => (
                    <motion.button
                        key={option}
                        onClick={() => setActiveFilter(option)}
                        className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 whitespace-nowrap ${activeFilter === option
                            ? 'bg-gray-900 text-white'
                            : 'bg-white text-gray-800 border border-gray-300 hover:bg-gray-100'
                            }`}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={isInView ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.8 }}
                        transition={{ 
                            duration: 0.4, 
                            delay: 0.4 + (index * 0.05) // Subtle stagger
                        }}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                    >
                        {option}
                    </motion.button>
                ))}
            </motion.div>

            {/* Loading state */}
            {loading && (
                <motion.div 
                    className="text-center py-12"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                >
                    <JobCardSkeleton /> 
                </motion.div>
            )}

            {/* Job listings */}
            <motion.div 
                className="space-y-8"
                initial={{ opacity: 0 }}
                animate={isInView ? { opacity: 1 } : { opacity: 0 }}
                transition={{ duration: 0.6, delay: 0.5 }}
            >
                {filteredJobs.map((job, index) => (
                    <motion.div 
                        key={job.id} 
                        className="border-b border-gray-200 pb-8"
                        initial={{ opacity: 0, y: 30 }}
                        animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
                        transition={{ 
                            duration: 0.5, 
                            delay: 0.6 + (index * 0.1) // Stagger job cards
                        }}
                        whileHover={{ 
                            scale: 1.01,
                            transition: { duration: 0.2 }
                        }}
                    >
                        <div className="flex justify-between items-start mb-2">
                            <motion.h2 
                                className="text-2xl font-bold text-gray-900"
                                initial={{ opacity: 0, x: -20 }}
                                animate={isInView ? { opacity: 1, x: 0 } : { opacity: 0, x: -20 }}
                                transition={{ duration: 0.4, delay: 0.7 + (index * 0.1) }}
                            >
                                {extractTitle(job.jd_text)}
                            </motion.h2>
                            <motion.button
                                onClick={() => handleApply(job.domain, job.id)}
                                className="inline-flex cursor-pointer items-center text-lg font-medium text-gray-900 hover:text-blue-600 transition-colors duration-300 group"
                                initial={{ opacity: 0, x: 20 }}
                                animate={isInView ? { opacity: 1, x: 0 } : { opacity: 0, x: 20 }}
                                transition={{ duration: 0.4, delay: 0.7 + (index * 0.1) }}
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                            >
                                Apply <span className="ml-2 transform group-hover:translate-x-1 transition-transform duration-300">↗</span>
                            </motion.button>
                        </div>
                        
                        <motion.p 
                            className="text-lg text-gray-700 mb-4"
                            initial={{ opacity: 0 }}
                            animate={isInView ? { opacity: 1 } : { opacity: 0 }}
                            transition={{ duration: 0.4, delay: 0.8 + (index * 0.1) }}
                        >
                            {extractDescription(job.jd_text)}
                        </motion.p>
                        
                        <motion.div 
                            className="flex flex-wrap gap-2"
                            initial={{ opacity: 0, y: 10 }}
                            animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
                            transition={{ duration: 0.4, delay: 0.9 + (index * 0.1) }}
                        >
                            <motion.div 
                                className="inline-flex items-center px-3 py-1 rounded-full border border-gray-300 text-sm hover:bg-gray-50 transition-colors duration-300"
                                whileHover={{ scale: 1.05, backgroundColor: "#f9fafb" }}
                            >
                                <svg className="w-4 h-4 mr-1" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M12 12L12 14M12 6L12 10M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                                100% remote
                            </motion.div>
                            
                            <motion.div 
                                className="inline-flex items-center px-3 py-1 rounded-full border border-gray-300 text-sm hover:bg-gray-50 transition-colors duration-300"
                                whileHover={{ scale: 1.05, backgroundColor: "#f9fafb" }}
                            >
                                <svg className="w-4 h-4 mr-1" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
                                    <path d="M12 7V12L15 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                                Full-time
                            </motion.div>

                            {/* Domain tag */}
                            <motion.div 
                                className="inline-flex items-center px-3 py-1 rounded-full border border-gray-300 text-sm hover:bg-gray-50 transition-colors duration-300"
                                whileHover={{ scale: 1.05, backgroundColor: "#f9fafb" }}
                            >
                                {formatDomainName(job.domain)}
                            </motion.div>

                            {/* View Details Link */}
                            <motion.button
                                className="inline-flex cursor-pointer items-center px-3 py-1 rounded-full border border-blue-300 text-sm text-blue-600 hover:bg-blue-50 transition-colors duration-300"
                                onClick={() => handleApply(job.domain, job.id)}
                                whileHover={{ 
                                    scale: 1.05, 
                                    backgroundColor: "#eff6ff",
                                    borderColor: "#2563eb"
                                }}
                                whileTap={{ scale: 0.95 }}
                            >
                                View Details
                            </motion.button>
                        </motion.div>
                    </motion.div>
                ))}

                {filteredJobs.length === 0 && !loading && (
                    <motion.div 
                        className="text-center py-12"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                    >
                        <p className="text-lg text-gray-600">No open positions in this category at the moment.</p>
                    </motion.div>
                )}
            </motion.div>
        </motion.div>
    )
}