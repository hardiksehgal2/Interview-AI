"use client";

import ClickSpark from '@/components/ClickSpark'
import { DotPattern } from '@/components/magicui/dot-pattern'
import { NavbarDemo } from '@/components/NavbarMain'
import React, { useEffect, useState } from 'react'
import CareerIntro from './components/CareerIntro'
import { AnimatedTestimonialsDemo } from './components/AnimatedTestimonialsDemo'
import JobsListing from './components/JobsListing';
import { cn } from '@/lib/utils';
import BenefitsSection from './components/Benifits';
import FooterDemo from '@/components/Footer';

const Careers = () => {
    const [showTestimonials, setShowTestimonials] = useState(false);

    useEffect(() => {
        const timeout = setTimeout(() => {
            setShowTestimonials(true);
        }, 800); // ~1 second

        return () => clearTimeout(timeout);
    }, []);

    return (
        <>
            <ClickSpark
                sparkColor="#036ffc"
                sparkSize={16}
                sparkRadius={25}
                sparkCount={13}
                duration={400}
            >


                <div className="relative min-h-screen">
                    <NavbarDemo />
                    <DotPattern
                        className={cn(
                            "absolute inset-0 -z-10",
                            "[mask-image:radial-gradient(900px_circle_at_center,white,transparent)]"
                        )}
                    />

                    <div className='py-10 px-8 lg:px-16 min-h-screen'>

                        <div className="flex flex-col lg:flex-row justify-evenly items-center  gap-10">
                            {/* Text Section */}
                            <div className="w-full lg:w-1/2 ">
                                <CareerIntro />
                            </div>

                            {/* Testimonials Section - now visible on all screen sizes */}
                            <div className="w-full lg:w-1/2 flex justify-center items-center">
                                <div className="w-full max-w-md">
                                    {showTestimonials && <AnimatedTestimonialsDemo />}
                                </div>
                            </div>
                        </div>
                    </div>
                    <BenefitsSection />
                    <div className=' px-8 lg:px-16 '>

                    <JobsListing />
                    </div>
                </div>
        <FooterDemo/>

            </ClickSpark>
        </>
    );
};

export default Careers;
