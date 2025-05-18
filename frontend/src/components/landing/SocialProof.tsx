/* eslint-disable @typescript-eslint/no-unused-vars */
import React from 'react';

interface Testimonial {
    name: string;
    quote: string;
    company: string;
    image?: string; // Optional image URL for the person
}

interface CaseStudy {
    title: string;
    summary: string;
    link: string;
    logo: string; // Company logo for the case study
}

const SocialProofSection = () => {
    // Placeholder data - replace with your actual data
    const testimonials: Testimonial[] = [
        {
            name: "Sarah M.",
            quote: "Our hiring process is now 50% faster thanks to [Your Platform Name]. The AI provides incredibly insightful candidate evaluations.",
            company: "Tech Innovators Inc.",
            image: "/zomato_logo.png"
        },
        {
            name: "David K.",
            quote: "The structured interviews have significantly reduced bias in our hiring, leading to a more diverse and equitable workforce.",
            company: "Global Enterprises Corp.",
            image: "/next.svg"
        },
        {
            name: "Jessica L.",
            quote: "The quality of our hires has improved dramatically.  We're seeing better candidate fit and higher retention rates.",
            company: "FutureVision Solutions",
            image: "/next.svg"
        }
    ];

    const caseStudies: CaseStudy[] = [
        {
            title: "Streamlining Hiring at Acme Corp",
            summary: "Acme Corp reduced time-to-hire by 40% and improved candidate satisfaction using [Your Platform Name].",
            link: "/case-studies/acme-corp",
            logo: "/logos/acme-corp.png"
        },
        {
            title: "Improving Diversity at Beta Inc.",
            summary: "Beta Inc. increased the diversity of their new hires by 25% after implementing our AI interview platform.",
            link: "/case-studies/beta-inc",
            logo: "/logos/beta-inc.png"
        },
    ];

    const clientLogos: string[] = [
        "/logos/client1.png",
        "/logos/client2.png",
        "/logos/client3.png",
        "/logos/client4.png",
        "/logos/client5.png",
        "/logos/client6.png",
    ];

    return (
        <section className="bg-white/5 backdrop-blur-md py-12 px-4 sm:px-6 lg:px-8 rounded-xl">
            <div className="max-w-7xl mx-auto">
                <h2 className="text-2xl sm:text-3xl font-semibold text-white text-center mb-8">
                    What Our Customers Say
                </h2>

                {/* Option 1: Testimonials */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {testimonials.map((testimonial, index) => (
                        <div
                            key={index}
                            className="bg-white/10 backdrop-blur-md rounded-lg p-6 border border-white/10 shadow-md"
                        >
                            <div className="flex items-center gap-4 mb-4">
                                {testimonial.image && (
                                    <img
                                        src={testimonial.image}
                                        alt={`${testimonial.name}`}
                                        className="w-12 h-12 rounded-full object-cover"
                                    />
                                )}
                                <div>
                                    <h4 className="text-white font-semibold">{testimonial.name}</h4>
                                    <p className="text-gray-400 text-sm">{testimonial.company}</p>
                                </div>
                            </div>
                            <blockquote className="text-gray-300 italic">
                                &ldquo;{testimonial.quote}&rdquo;
                            </blockquote>
                        </div>
                    ))}
                </div>

                {/* Option 2: Case Studies */}
                {caseStudies.length > 0 && (
                    <>
                        <h3 className="text-xl font-semibold text-white text-center mt-12 mb-6">
                            Case Studies
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            {caseStudies.map((study, index) => (
                                <div
                                    key={index}
                                    className="bg-white/10 backdrop-blur-md rounded-lg p-6 border border-white/10 shadow-md flex items-center gap-6"
                                >
                                    <img
                                        src={study.logo}
                                        alt={`${study.title} Logo`}
                                        className="w-24 h-auto"
                                    />
                                    <div>
                                        <h4 className="text-white font-semibold">{study.title}</h4>
                                        <p className="text-gray-300">{study.summary}</p>
                                        <a
                                            href={study.link}
                                            className="text-blue-400 hover:text-blue-300 transition-colors inline-flex items-center mt-2"
                                        >
                                            Learn More
                                            <svg
                                                xmlns="http://www.w3.org/2000/svg"
                                                className="h-4 w-4 ml-1"
                                                fill="none"
                                                viewBox="0 0 24 24"
                                                stroke="currentColor"
                                            >
                                                <path
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    strokeWidth={2}
                                                    d="M17 8l4 4m0 0l-4 4m4-4H3"
                                                />
                                            </svg>
                                        </a>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </>
                )}

                {/* Option 3: Client Logos
                {clientLogos.length > 0 && (
                    <>
                        <h3 className="text-xl font-semibold text-white text-center mt-12 mb-6">
                            Trusted by
                        </h3>
                        <div className="flex flex-wrap justify-center gap-8">
                            {clientLogos.map((logo, index) => (
                                <img
                                    key={index}
                                    src={logo}
                                    alt={`Client Logo ${index + 1}`}
                                    className="h-12 opacity-60 hover:opacity-100 transition-opacity"
                                />
                            ))}
                        </div>
                    </>
                )} */}
            </div>
        </section>
    );
};

export default SocialProofSection;
