/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";
import Intro from "@/components/landing/Intro";
import { NavbarDemo } from "@/components/NavbarMain";
import gradientAnimation from "@/../public/animations/gradient.json";
import dynamic from "next/dynamic";
import ResearchFlow from "@/components/landing/ResearchFlow";
import ClickSpark from "@/components/ClickSpark";
import { InfiniteMovingCards } from "@/components/ui/infinite-moving-cards";
import SplitText from "@/components/SplitText/SplitText";
import { GlowingEffectDemo } from "@/components/GlowingEffect";
import FooterDemo from "@/components/Footer";
import { useEffect, useState } from "react";

const handleAnimationComplete = () => {
  console.log("All letters have animated!");
};

const LottieView = dynamic(
  async () => (await import("lottie-react")).default,
  {
    ssr: false,
    loading: () => (
      <div
        className="w-full h-64 bg-gray-200 animate-pulse rounded-lg"
        style={{
          transform: 'translateZ(0)',
          backfaceVisibility: 'hidden',
          WebkitBackfaceVisibility: 'hidden'
        }}
      />
    )
  }
);


export default function Home() {
  const [isVisible, setIsVisible] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    // Delay animation trigger for better Safari performance
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  // Safari-optimized Lottie options
  const defaultOptions = {
    animationData: gradientAnimation,
    loop: true,
    autoplay: true,
    renderer: "svg" as const, // SVG renderer works better in Safari
    rendererSettings: {
      preserveAspectRatio: "xMidYMid slice",
      progressiveLoad: true, // Better for Safari
      hideOnTransparent: true,
    }
  };


  // Safari-optimized inline styles
  const safariOptimizedContainer = {
    transform: 'translateZ(0)',
    backfaceVisibility: 'hidden' as const,
    WebkitBackfaceVisibility: 'hidden' as const,
    willChange: isVisible ? 'transform, opacity' : 'auto',
  };

  const lottieTransitionStyle = {
    ...safariOptimizedContainer,
    transition: 'transform 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94), opacity 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
    opacity: isVisible ? 1 : 0,
    transform: isVisible
      ? 'translateX(0) translateZ(0)'
      : 'translateX(20px) translateZ(0)',
  };
  const testimonials = [
    {
      quote:
        "JustHire's AI interview platform cut our screening time by 80%. The voice interaction feels natural and the anti-cheating features give us complete confidence in candidate authenticity. Game-changer for our hiring process.",
      name: "Zomato",
      title: "Zomato",
      image: "/zomato_logo.png",
    },
    {
      quote:
        "We used to spend weeks scheduling and conducting initial interviews. JustHire's automated system screens candidates 24/7 with detailed analysis reports. Our hiring managers now focus only on the best candidates.",
      name: "Chai & Code",
      title: "Chai & Code",
      image: "/chai.jpg",
    },
    {
      quote:
        "The job-description based question generation is incredibly smart. Candidates get relevant questions while we get comprehensive insights about their strengths and weaknesses. Highly recommend for any growing company.",
      name: "Google India",
      title: "Google India",
      image: "/google.webp",
    },
  ];

  {
    /* Your content here */
  }
  return (
    <>
      <style jsx global>{`
        /* Safari-specific smooth scrolling */
        html {
          -webkit-overflow-scrolling: touch;
          scroll-behavior: smooth;
        }
        
        /* Optimize backdrop blur for Safari */
        .backdrop-blur-md {
          -webkit-backdrop-filter: blur(12px);
          backdrop-filter: blur(12px);
        }
        
        /* Force hardware acceleration on key elements */
        .safari-optimized {
          transform: translateZ(0);
          -webkit-transform: translateZ(0);
          backface-visibility: hidden;
          -webkit-backface-visibility: hidden;
          perspective: 1000px;
          -webkit-perspective: 1000px;
        }
        
        /* Optimize text rendering for Safari */
        .text-optimize {
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
          text-rendering: optimizeLegibility;
        }
      `}</style>
      <NavbarDemo />
      <ClickSpark
        sparkColor="#036ffc"
        sparkSize={16}
        sparkRadius={25}
        sparkCount={13}
        duration={400}
      >
        <div className="flex flex-col lg:flex-row justify-evenly items-center py-10 px-6 lg:px-16 min-h-screen">
          <div className="w-full lg:w-1/2 mb-8 lg:mb-0">
            <Intro />
          </div>
          <div className="w-full lg:w-1/2 flex justify-center items-center">
            {isMounted && (
              <div
                className="w-md hidden lg:block"
                style={lottieTransitionStyle}
              >
                <LottieView
                  animationData={defaultOptions.animationData}
                  loop={defaultOptions.loop}
                  autoplay={defaultOptions.autoplay}
                  renderer={defaultOptions.renderer}
                  rendererSettings={defaultOptions.rendererSettings}
                  style={{
                    transform: 'translateZ(0)',
                    backfaceVisibility: 'hidden',
                    WebkitBackfaceVisibility: 'hidden',
                  }}
                />
              </div>
            )}
          </div>
        </div>
        <div className="">
          <ResearchFlow />
        </div>

        <div className="text-center my-10">
          <SplitText
            text="Testimonials of our client"
            className="text-center text-2xl md:text-4xl  font-bold text-gray-800 "
            delay={50}
            animationFrom={{ opacity: 0, transform: "translate3d(0,50px,0)" }}
            animationTo={{ opacity: 1, transform: "translate3d(0,0,0)" }}
            // easing="easeOutCubic"
            threshold={0.2}
            rootMargin="-50px"
            onLetterAnimationComplete={handleAnimationComplete}
          />
        </div>
        {/* <h1 className="text-center text-4xl md:text-6xl mt-20 font-bold text-gray-800 mb-4 md:mb-6 ">Testimonials of our client</h1> */}
        <div className="my-10 rounded-md flex flex-col antialiased bg-white dark:bg-black dark:bg-grid-white/[0.05] items-center justify-center relative overflow-hidden">
          <InfiniteMovingCards
            items={testimonials}
            direction="right"
            speed="fast"
          />
        </div>
        {/* <SocialProofSection /> */}
        <div className="text-center my-10">
          <SplitText
            text="JustHired Advantage"
            className="text-center text-2xl md:text-4xl  font-bold text-gray-800 "
            delay={50}
            animationFrom={{ opacity: 0, transform: "translate3d(0,50px,0)" }}
            animationTo={{ opacity: 1, transform: "translate3d(0,0,0)" }}
            // easing="easeOutCubic"
            threshold={0.2}
            rootMargin="-50px"
            onLetterAnimationComplete={handleAnimationComplete}
          />
        </div>
        <div className="px-16 my-10">
          <GlowingEffectDemo />
        </div>
        <FooterDemo />
      </ClickSpark>
    </>
  );
}
