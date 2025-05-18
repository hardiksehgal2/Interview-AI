'use client'

import { useState } from 'react'
import Link from 'next/link'
import { TypewriterEffectSmooth } from '@/components/ui/typewriter-effect'

// Define job roles
type JobRole = 'AI Developer' | 'Full Stack Developer' | 'Backend Engineer'

// Define filter options based on roles plus "View all"
type FilterOption = 'View all' | JobRole

// Define job categories (keeping this for job metadata)
type JobCategory = 'Development' | 'Design' | 'Marketing' | 'Customer Service' | 'Operations' | 'Finance' | 'Management'

// Define job interface with slug for routing
interface Job {
    id: number
    role: JobRole
    level: string
    category: JobCategory
    isRemote: boolean
    isFullTime: true
    slug: string  // Added slug for cleaner URLs
    description?: string // Optional detailed description
    responsibilities?: string[] // Optional responsibilities list
    requirements?: string[] // Optional requirements list
}

const words = [
    { text: "Apply Now 🎊", className: "text-2xl lg:text-4xl text-center font-extrabold" },
];

// Enhanced jobs data with slugs and more details
const jobs: Job[] = [
    {
        id: 1,
        role: 'AI Developer',
        level: 'mid-level',
        category: 'Development',
        isRemote: true,
        isFullTime: true,
        slug: 'ai-developer',
        description: 'Join our AI team to build cutting-edge vector search and machine learning solutions using our advanced technology stack that includes vector databases, embedding models, and scalable cloud infrastructure.',
        responsibilities: [
            'Develop and optimize vector embedding models to enhance AI understanding',
            'Work with high-performance vector databases like Quadrant DB for efficient data storage and retrieval',
            'Build and maintain graph-based AI knowledge storage using Neo4j',
            'Manage AI inference and computation through MCP Server',
            'Deploy and scale AI applications using AWS cloud infrastructure',
            'Collaborate with product teams to integrate vector search capabilities into our applications',
            'Stay current with latest advancements in vector databases and embedding technologies'
        ],
        requirements: [
            'Experience with vector databases and embedding technologies',
            'Proficiency with Neo4j Graph DB or similar graph-based knowledge storage systems',
            'Strong understanding of vector embedding models and their applications in AI',
            'Experience with AWS for scalable cloud deployment of AI applications',
            'Familiarity with MCP Server or similar AI inference management tools',
            'Understanding of scalable AI architectures and performance optimization',
            'BS or MS in Computer Science, Machine Learning, or related field'
        ]
    },
    {
        id: 2,
        role: 'Full Stack Developer',
        level: 'experienced',
        category: 'Development',
        isRemote: true,
        isFullTime: true,
        slug: 'full-stack-developer',
        description: 'We\'re seeking an experienced full stack developer to help build and scale our modern web and mobile applications using a diverse technology stack including React, Flutter, and Node.js.',
        responsibilities: [
            'Design and implement responsive frontend interfaces using React.js, Next.js, and Flutter',
            'Develop robust backend systems with Node.js, Express.js, and Fast API',
            'Create and maintain RESTful APIs and real-time communication with Socket.IO',
            'Build reusable components and libraries following best practices',
            'Implement efficient state management solutions using Zustand, Redux Tool Kit, Bloc, or GET',
            'Set up and maintain CI/CD pipelines with GitHub Actions',
            'Work with MongoDB and Firebase for data persistence',
            'Containerize applications using Docker for consistent deployment',
            'Optimize applications for maximum speed and scalability',
            'Collaborate with designers, AI specialists, and other developers'
        ],
        requirements: [
            'Proficiency in multiple programming languages including JavaScript, TypeScript, Python, Java, and Dart',
            'Strong experience with React.js, Next.js, and Flutter for frontend development',
            'Expertise in HTML5, CSS, and Tailwind CSS for responsive design',
            'Backend experience with Node.js, Express.js, and Fast API',
            'Experience with MongoDB and Firebase database systems',
            'Solid understanding of state management with Zustand, Redux Tool Kit, Bloc, or GET',
            'Familiarity with real-time communication using Socket.IO',
            'Knowledge of containerization using Docker',
            'Experience with Git version control and CI/CD workflows via GitHub Actions',
            'Strong foundation in data structures, algorithms, and object-oriented programming',
            'Understanding of cloud infrastructure and deployment',
            'Experience working in Linux environments',
            'Ability to integrate with various APIs and work with JSON data formats'
        ]
    },
    {
        id: 3,
        role: 'Backend Engineer',
        level: 'mid-level',
        category: 'Development',
        isRemote: true,
        isFullTime: true,
        slug: 'backend-engineer',
        description: 'Help us build robust, scalable backend systems that power our applications.',
        responsibilities: [
            'Design, develop, and maintain scalable microservices and API endpoints using Node.js, Express, and other modern frameworks',
            'Create and optimize database schemas, queries, and data access patterns for both SQL and NoSQL databases',
            'Implement comprehensive security measures including authentication, authorization, and data encryption',
            'Develop and maintain data processing pipelines for real-time and batch operations',
            'Collaborate with DevOps to implement CI/CD pipelines and ensure reliable deployments across environments',
            'Implement caching strategies and performance optimizations to improve system response times',
            'Design and implement fault-tolerant systems with appropriate logging, monitoring, and alerting',
            'Collaborate with frontend developers to ensure seamless API integration',
            'Contribute to technical documentation including API specifications and system architecture',
            'Participate in code reviews and mentor junior developers to maintain high code quality standards'
          ],
          requirements: [
            'Strong proficiency in backend languages such as JavaScript/TypeScript, Python, or Go',
            'Experience with server-side frameworks like Express, NestJS, Django, FastAPI, or similar',
            'Solid understanding of RESTful API design principles and microservices architecture',
            'Strong knowledge of database systems (MongoDB, PostgreSQL, MySQL) and query optimization',
            'Experience implementing authentication and security best practices (OAuth, JWT, rate limiting)',
            'Familiarity with message queues and event-driven architectures (Kafka, RabbitMQ, Redis)',
            'Experience with containerization and orchestration tools (Docker, Kubernetes)',
            'Understanding of cloud platforms (AWS, GCP, or Azure) and infrastructure as code',
            'Experience with automated testing, including unit, integration, and API tests',
            'Familiarity with monitoring tools and performance profiling',
            'Knowledge of CI/CD practices and experience with deployment automation',
            'Strong problem-solving skills and ability to debug complex issues',
            'BS/MS in Computer Science or equivalent practical experience'
          ],
    }
];

// Define filter options
const filterOptions: FilterOption[] = [
    'View all',
    'AI Developer',
    'Full Stack Developer',
    'Backend Engineer'
];

// Export jobs data to be used in job detail pages
export { jobs };

export default function CareersPage() {
    // State for the active filter option
    const [activeFilter, setActiveFilter] = useState<FilterOption>('View all');

    // Filter jobs based on the selected option
    const filteredJobs = activeFilter === 'View all'
        ? jobs
        : jobs.filter(job => job.role === activeFilter);

    return (
        <div className="bg-white mx-auto px-4 md:px-16 py-8">
            <div className="flex justify-center mb-6">
                <TypewriterEffectSmooth
                    words={words}
                    className="text-lg md:text-2xl text-center"
                />
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

            {/* Job listings with links to detail pages */}
            <div className="space-y-8">
                {filteredJobs.map((job) => (
                    <div key={job.id} className="border-b border-gray-200 pb-8">
                        <div className="flex justify-between items-start mb-2">
                            <h2 className="text-2xl font-bold text-gray-900">
                                <Link
                                    href={`/careers/${job.slug}`}
                                    className="hover:text-blue-600 transition-colors duration-300"
                                >
                                    {job.role}
                                </Link>
                            </h2>
                            <Link
                                href={`/careers/${job.slug}`}
                                className="inline-flex items-center text-lg font-medium text-gray-900 hover:text-blue-600 transition-colors duration-300 group"
                            >
                                Apply <span className="ml-2 transform group-hover:translate-x-1 transition-transform duration-300">↗</span>
                            </Link>
                        </div>
                        <p className="text-lg text-gray-700 mb-4">
                            {job.description || `We're looking for ${job.level === 'mid-level' ? 'a' : 'an'} ${job.level} ${job.role.toLowerCase()} to join our team.`}
                        </p>
                        <div className="flex flex-wrap gap-2">
                            <div className="inline-flex items-center px-3 py-1 rounded-full border border-gray-300 text-sm hover:bg-gray-50 transition-colors duration-300">
                                <svg className="w-4 h-4 mr-1" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M12 12L12 14M12 6L12 10M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                                {job.isRemote ? '100% remote' : 'On-site'}
                            </div>
                            <div className="inline-flex items-center px-3 py-1 rounded-full border border-gray-300 text-sm hover:bg-gray-50 transition-colors duration-300">
                                <svg className="w-4 h-4 mr-1" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
                                    <path d="M12 7V12L15 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                                {job.isFullTime ? 'Full-time' : 'Part-time'}
                            </div>

                            {/* View Details Link */}
                            <Link
                                href={`/careers/${job.slug}`}
                                className="inline-flex items-center px-3 py-1 rounded-full border border-blue-300 text-sm text-blue-600 hover:bg-blue-50 transition-colors duration-300"
                            >
                                View Details
                            </Link>
                        </div>
                    </div>
                ))}

                {filteredJobs.length === 0 && (
                    <div className="text-center py-12">
                        <p className="text-lg text-gray-600">No open positions in this category at the moment.</p>
                    </div>
                )}
            </div>
        </div>
    )
}