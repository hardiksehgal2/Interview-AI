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
    const isInView = useInView(cardRef, { 
        once: true, 
        margin: "-50px", // Reduced margin for earlier trigger
        amount: 0.2 // Trigger when 20% visible
    });

    // Safari-optimized styles
    const safariOptimizedStyle = {
        transform: 'translateZ(0)',
        backfaceVisibility: 'hidden' as const,
        WebkitBackfaceVisibility: 'hidden' as const,
        perspective: '1000px',
        WebkitPerspective: '1000px',
        willChange: 'transform, opacity',
    };

    return (
        <motion.div 
            ref={cardRef}
            initial={{ opacity: 0, y: 40, scale: 0.95 }} // Reduced values for smoother animation
            animate={isInView ? { opacity: 1, y: 0, scale: 1 } : { opacity: 0, y: 40, scale: 0.95 }}
            transition={{ 
                duration: 0.4, // Increased duration for smoother animation
                ease: [0.25, 0.46, 0.45, 0.94], // Custom easing for Safari
                delay: parseInt(number) * 0.15, // Reduced stagger delay
                type: "tween" // Force tween instead of spring for Safari
            }}
            whileHover={{ 
                scale: 1.02, // Reduced scale for better performance
                y: -4, // Reduced movement
                transition: { 
                    duration: 0.2, 
                    ease: "easeOut",
                    type: "tween"
                }
            }}
            style={safariOptimizedStyle}
            className="bg-white/5 backdrop-blur-md rounded-xl p-6 flex flex-col relative overflow-hidden border border-white/10 shadow-lg cursor-pointer"
        >
            {/* Number circle */}
            <motion.div 
                className="bg-gradient-to-br from-white/10 to-white/20 rounded-full w-12 h-12 flex items-center justify-center mb-6"
                whileHover={{ 
                    rotate: 180, // Reduced rotation for better performance
                    scale: 1.05, // Reduced scale
                    transition: { duration: 0.3, type: "tween" }
                }}
                style={safariOptimizedStyle}
            >
                <span className="text-white font-medium">{number}</span>
            </motion.div>

            {/* Title and description */}
            <motion.h3 
                className="text-white text-2xl font-semibold mb-4"
                initial={{ opacity: 0, y: 20 }}
                animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
                transition={{ 
                    delay: parseInt(number) * 0.15 + 0.2,
                    duration: 0.3,
                    type: "tween"
                }}
                style={safariOptimizedStyle}
            >
                {title}
            </motion.h3>
            
            <motion.p 
                className="text-gray-300 mb-6"
                initial={{ opacity: 0, y: 20 }}
                animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
                transition={{ 
                    delay: parseInt(number) * 0.15 + 0.3,
                    duration: 0.3,
                    type: "tween"
                }}
                style={safariOptimizedStyle}
            >
                {description}
            </motion.p>

            {/* Content card */}
            <motion.div 
                className="bg-white/10 backdrop-blur-md rounded-lg p-6 w-full border border-white/10"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={isInView ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.98 }}
                transition={{ 
                    delay: parseInt(number) * 0.15 + 0.4,
                    duration: 0.3,
                    type: "tween"
                }}
                whileHover={{ 
                    backgroundColor: "rgba(255, 255, 255, 0.15)",
                    transition: { duration: 0.2, type: "tween" }
                }}
                style={safariOptimizedStyle}
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
                            style={safariOptimizedStyle}
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
            <div className="w-full mx-8 rounded-xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">
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

// Example implementation with Safari-optimized shimmer animation
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
                        <div className="h-3 bg-gray-700 rounded w-full animate-shimmer-safari"></div>
                        <div className="h-3 bg-gray-700 rounded w-full animate-shimmer-safari"></div>
                        <div className="h-3 bg-gray-700 rounded w-3/4 animate-shimmer-safari"></div>
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
                        <div className="h-3 bg-gray-700 rounded w-full animate-shimmer-safari"></div>
                        <div className="h-3 bg-gray-700 rounded w-full animate-shimmer-safari"></div>
                        <div className="h-3 bg-gray-700 rounded w-2/3 animate-shimmer-safari"></div>
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
                        <div className="h-3 bg-gray-700 rounded w-full animate-shimmer-safari"></div>
                        <div className="h-3 bg-gray-700 rounded w-full animate-shimmer-safari"></div>
                        <div className="h-3 bg-gray-700 rounded w-3/4 animate-shimmer-safari"></div>
                    </div>
                    <div className="flex justify-center mt-6"></div>
                </div>
            ),
        },
    ];

    return (
        <div id="features" className="bg-transparent">
            <style jsx global>{`
                @keyframes shimmer-safari {
                    0% {
                        background-position: -200px 0;
                        transform: translateX(-100%);
                    }
                    100% {
                        background-position: 200px 0;
                        transform: translateX(100%);
                    }
                }
                .animate-shimmer-safari {
                    position: relative;
                    overflow: hidden;
                    background: rgba(255, 255, 255, 0.06);
                }
                .animate-shimmer-safari::before {
                    content: '';
                    position: absolute;
                    top: 0;
                    left: -100%;
                    width: 100%;
                    height: 100%;
                    background: linear-gradient(
                        90deg,
                        transparent,
                        rgba(255, 255, 255, 0.12),
                        transparent
                    );
                    animation: shimmer-safari 2s infinite;
                    transform: translateZ(0); /* Force hardware acceleration */
                    -webkit-transform: translateZ(0);
                }
                
                /* Safari-specific optimizations */
                @media screen and (-webkit-min-device-pixel-ratio: 0) {
                    .animate-shimmer-safari::before {
                        will-change: transform;
                        backface-visibility: hidden;
                        -webkit-backface-visibility: hidden;
                    }
                }
            `}</style>
            <div className="rounded-xl overflow-hidden">
                <ProcessFlow items={items} />
            </div>
        </div>
    );
};

export default ResearchFlow;