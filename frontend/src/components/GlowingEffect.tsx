"use client";

import { Box, Lock, Search, Settings, Sparkles } from "lucide-react";
import { GlowingEffect } from "@/components/ui/glowing-effect";
import { motion } from 'motion/react';
import { useInView } from 'motion/react';
import { useRef } from 'react';
export function GlowingEffectDemo() {
    return (
        <ul className="grid grid-cols-1 grid-rows-none gap-4 md:grid-cols-12 md:grid-rows-3 lg:gap-4 xl:max-h-[34rem] xl:grid-rows-2">
            <GridItem
                area="md:[grid-area:1/1/2/7] xl:[grid-area:1/1/2/5]"
                icon={<Box className="h-4 w-4 text-black dark:text-neutral-400" />}
                title="10x Faster Hiring Process"
                description="Streamline your process and reduce time-to-hire with AI-powered automation."
            />

            <GridItem
                area="md:[grid-area:1/7/2/13] xl:[grid-area:2/1/3/5]"
                icon={<Settings className="h-4 w-4 text-black dark:text-neutral-400" />}
                title="Better Hires"
                description="AI analysis reveals skills traditional interviews miss"
            />

            <GridItem
                area="md:[grid-area:2/1/3/7] xl:[grid-area:1/5/3/8]"
                icon={<Lock className="h-4 w-4 text-black dark:text-neutral-400" />}
                title="Reduced Bias"
                description="Ensure fair and objective evaluations with structured, standardized interviews."

            />

            <GridItem
                area="md:[grid-area:2/7/3/13] xl:[grid-area:1/8/2/13]"
                icon={<Sparkles className="h-4 w-4 text-black dark:text-neutral-400" />}
                title="Improved Candidate Experience"
                description="Offer a modern, engaging interview process that reflects positively on your brand."

            />

            <GridItem
                area="md:[grid-area:3/1/4/13] xl:[grid-area:2/8/3/13]"
                icon={<Search className="h-4 w-4 text-black dark:text-neutral-400" />}
                title="Reduce Hiring Costs by 60%"
                description="Lower your recruitment costs by automating time-intensive tasks and optimizing resource allocation."

            />
        </ul>
    );
}

interface GridItemProps {
    area: string;
    icon: React.ReactNode;
    title: string;
    description: React.ReactNode;
}

const GridItem = ({ area, icon, title, description }: GridItemProps) => {
    const itemRef = useRef(null);
    const isInView = useInView(itemRef, { once: true, margin: "-50px" });
    
    // Extract grid position to create stagger delay
    const getDelayFromArea = (area: string) => {
        if (area.includes('1/1/2/7') || area.includes('1/1/2/5')) return 0.1; // First item
        if (area.includes('1/7/2/13') || area.includes('1/8/2/13')) return 0.2; // Second item  
        if (area.includes('2/1/3/7') || area.includes('1/5/3/8')) return 0.3; // Third item
        if (area.includes('2/7/3/13') || area.includes('2/1/3/5')) return 0.4; // Fourth item
        return 0.5; // Fifth item
    };

    return (
        <motion.li 
            ref={itemRef}
            className={`min-h-[14rem] list-none ${area}`}
            initial={{ opacity: 0, y: 40, scale: 0.95 }}
            animate={isInView ? { opacity: 1, y: 0, scale: 1 } : { opacity: 0, y: 40, scale: 0.95 }}
            transition={{ 
                duration: 0.5, 
                ease: "easeOut",
                delay: getDelayFromArea(area)
            }}
        >
            <motion.div 
                className="relative h-full rounded-2xl bg-slate-50 border p-2 md:rounded-3xl md:p-3"
                whileHover={{ 
                    scale: 1.02,
                    y: -4,
                    transition: { duration: 0.2, ease: "easeOut" }
                }}
            >
                <GlowingEffect
                    spread={40}
                    glow={true}
                    disabled={false}
                    proximity={64}
                    inactiveZone={0.01}
                />
                <div className="border-0.75 relative bg-white flex h-full flex-col justify-between gap-6 overflow-hidden rounded-xl p-6 md:p-6 dark:shadow-[0px_0px_27px_0px_#2D2D2D]">
                    <div className="relative flex flex-1 flex-col justify-between gap-3">
                        <motion.div 
                            className="w-fit rounded-lg border border-gray-600 p-2"
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={isInView ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.8 }}
                            transition={{ 
                                delay: getDelayFromArea(area) + 0.2,
                                duration: 0.3
                            }}
                            whileHover={{ 
                                scale: 1.1, 
                                rotate: 5,
                                transition: { duration: 0.2 }
                            }}
                        >
                            {icon}
                        </motion.div>
                        <div className="space-y-3">
                            <motion.h3 
                                className="-tracking-4 pt-0.5 font-sans text-xl/[1.375rem] font-semibold text-balance text-black md:text-2xl/[1.875rem] dark:text-white"
                                initial={{ opacity: 0, x: -20 }}
                                animate={isInView ? { opacity: 1, x: 0 } : { opacity: 0, x: -20 }}
                                transition={{ 
                                    delay: getDelayFromArea(area) + 0.3,
                                    duration: 0.4
                                }}
                            >
                                {title}
                            </motion.h3>
                            <motion.h2 
                                className="font-sans text-sm/[1.125rem] text-black md:text-base/[1.375rem] dark:text-neutral-400 [&_b]:md:font-semibold [&_strong]:md:font-semibold"
                                initial={{ opacity: 0, x: -20 }}
                                animate={isInView ? { opacity: 1, x: 0 } : { opacity: 0, x: -20 }}
                                transition={{ 
                                    delay: getDelayFromArea(area) + 0.4,
                                    duration: 0.4
                                }}
                            >
                                {description}
                            </motion.h2>
                        </div>
                    </div>
                </div>
            </motion.div>
        </motion.li>
    );
};
