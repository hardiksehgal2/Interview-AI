/* eslint-disable @typescript-eslint/no-unused-vars */
import Image from 'next/image';
import React from 'react';
import { motion } from 'motion/react';
import { useInView } from 'motion/react';
import { useRef } from 'react';
interface ProcessCardProps {
    number: string;
    title: string;
    description: string;
    content: string | React.ReactNode;
    imagePath?: string | null;
}

const ProcessCard: React.FC<ProcessCardProps> = ({
    number,
    title,
    description,
    content,
    imagePath = null,
}) => {
    const cardRef = useRef(null);
    const isInView = useInView(cardRef, { once: true, margin: "-100px" });

    return (
        <motion.div 
            ref={cardRef}
            initial={{ opacity: 0, y: 60, scale: 0.8 }}
            animate={isInView ? { opacity: 1, y: 0, scale: 1 } : { opacity: 0, y: 60, scale: 0.8 }}
            transition={{ 
                duration: 0.2, 
                ease: "easeOut",
                delay: parseInt(number) * 0.2 // Stagger animation based on card number
            }}
            whileHover={{ 
                scale: 1.05, 
                y: -8,
                transition: { duration: 0.1, ease: "easeOut" }
            }}
            className="bg-white/5 backdrop-blur-md rounded-xl p-6 flex flex-col relative overflow-hidden border border-white/10 shadow-lg cursor-pointer"
        >
            {/* Number circle */}
            <motion.div 
                className="bg-gradient-to-br from-white/10 to-white/20 rounded-full w-12 h-12 flex items-center justify-center mb-6"
                whileHover={{ rotate: 360, scale: 1.1 }}
                transition={{ duration: 0.5 }}
            >
                <span className="text-white font-medium">{number}</span>
            </motion.div>

            {/* Title and description */}
            <motion.h3 
                className="text-white text-2xl font-semibold mb-4"
                initial={{ opacity: 0 }}
                animate={isInView ? { opacity: 1 } : { opacity: 0 }}
                transition={{ delay: parseInt(number) * 0.2 + 0.3 }}
            >
                {title}
            </motion.h3>
            <motion.p 
                className="text-gray-300 mb-6"
                initial={{ opacity: 0 }}
                animate={isInView ? { opacity: 1 } : { opacity: 0 }}
                transition={{ delay: parseInt(number) * 0.2 + 0.4 }}
            >
                {description}
            </motion.p>

            {/* Content card */}
            <motion.div 
                className="bg-white/10 backdrop-blur-md rounded-lg p-6 w-full border border-white/10"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={isInView ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.9 }}
                transition={{ delay: parseInt(number) * 0.2 + 0.5 }}
                whileHover={{ 
                    backgroundColor: "rgba(255, 255, 255, 0.15)",
                    transition: { duration: 0.2 }
                }}
            >
                {typeof content === 'string' ? (
                    <p className="text-white">{content}</p>
                ) : (
                    content
                )}

                {/* Optional image */}
                {imagePath && (
                    <div className="mt-4">
                        <Image
                            src={imagePath}
                            alt="Content visualization"
                            width={500}
                            height={300}
                            className="w-full rounded-md"
                            priority={false}
                        />
                    </div>
                )}
            </motion.div>
        </motion.div>
    );
};

interface ProcessItem {
    number: string;
    title: string;
    description: string;
    content: string | React.ReactNode;
    imagePath?: string | null;
}

interface ProcessFlowProps {
    items: ProcessItem[];
}

const ProcessFlow: React.FC<ProcessFlowProps> = ({ items }) => {
    return (
        <div className="w-full bg-gradient-to-br rounded-xl from-gray-900 via-indigo-900 to-black py-12 px-8 lg:px-16">
            <div className="w-full mx-8  rounded-xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">
                {items.map((item, index) => (
                    <ProcessCard
                        key={index}
                        number={item.number}
                        title={item.title}
                        description={item.description}
                        content={item.content}
                        imagePath={item.imagePath}
                    />
                ))}
            </div>
        </div>
    );
};



// Example implementation
const ResearchFlow: React.FC = () => {
    const items: ProcessItem[] = [
        {
            number: '01',
            title: 'Setup in 5 Minutes',
            description: 'Tailor the AI interview to your specific needs.',
            content: (
                <div className="space-y-4">
                    <p className="text-gray-300 mb-4">Provide the job description and candidate resumes.</p>
                    <div className="flex items-center mb-4">
                        <div className="w-6 h-6 bg-indigo-500/20 border border-indigo-500/30 rounded mr-2 flex items-center justify-center">
                            <span className="text-indigo-300 text-xs">→</span>
                        </div>
                        <span className="text-white">Upload documents</span>
                    </div>
                    <div className="space-y-2">
                        <div className="h-3 bg-gray-700 rounded w-full animate-shimmer"></div>
                        <div className="h-3 bg-gray-700 rounded w-full animate-shimmer"></div>
                        <div className="h-3 bg-gray-700 rounded w-3/4 animate-shimmer"></div>
                    </div>
                </div>
            ),
        },
        {
            number: '02',
            title: 'Conduct AI Interviews',
            description: "AI conducts voice interviews with JD-based questions and cheat detection",
            content: (
                <div className="space-y-4">
                    <div className="flex items-center mb-4">
                         <div className="w-6 h-6 mr-2 flex items-center justify-center">
                            <span className="text-indigo-400">👋</span>
                        </div>
                        <div>
                            <p className="text-white">AI interviewer engages with candidates.</p>
                            <p className="text-gray-400 text-sm">Candidates answer questions.</p>
                        </div>
                    </div>
                    <div className="space-y-2">
                        <div className="h-3 bg-gray-700 rounded w-full animate-shimmer"></div>
                        <div className="h-3 bg-gray-700 rounded w-full animate-shimmer"></div>
                        <div className="h-3 bg-gray-700 rounded w-2/3 animate-shimmer"></div>
                    </div>
                </div>
            ),
        },
        {
            number: '03',
            title: 'Get Detailed Reports Instantly',
            description: "Get a comprehensive analysis of candidate performance.",
            content: (
                <div className="space-y-4">
                    <div className="flex items-center mb-4">
                        <div className="w-6 h-6 bg-indigo-500/20 border border-indigo-500/30 rounded mr-2 flex items-center justify-center">
                            <span className="text-indigo-300 text-xs">🏷️</span>
                        </div>
                        <span className="text-white">View AI-powered insights.</span>
                    </div>
                    <div className="space-y-2 mb-4">
                        <div className="h-3 bg-gray-700 rounded w-full animate-shimmer"></div>
                        <div className="h-3 bg-gray-700 rounded w-full animate-shimmer"></div>
                        <div className="h-3 bg-gray-700 rounded w-3/4 animate-shimmer"></div>
                    </div>

                    <div className="flex justify-center mt-6">

                    </div>
                </div>
            ),
        },
    ];

    return (
        <div id="features" className="bg-transparent">
            <style jsx global>{`
                @keyframes shimmer {
                    0% {
                        background-position: -400px 0;
                    }
                    100% {
                        background-position: 400px 0;
                    }
                }
                .animate-shimmer {
                    background: linear-gradient(
                        90deg,
                        rgba(255, 255, 255, 0.06),
                        rgba(255, 255, 255, 0.12),
                        rgba(255, 255, 255, 0.06)
                    );
                    background-size: 800px 100px;
                    animation: shimmer 1.2s infinite linear;
                }
            `}</style>
            <div className="rounded-xl overflow-hidden">
                <ProcessFlow items={items} />
            </div>
        </div>
    );
};

export default ResearchFlow;