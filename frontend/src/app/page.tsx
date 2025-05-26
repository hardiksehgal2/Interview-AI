/* eslint-disable @typescript-eslint/no-unused-vars */
"use client"
import Intro from "@/components/landing/Intro";
import { NavbarDemo } from "@/components/NavbarMain";
import gradientAnimation from "@/../public/animations/gradient.json";
import dynamic from 'next/dynamic';
import ResearchFlow from "@/components/landing/ResearchFlow";
import ClickSpark from "@/components/ClickSpark";
import SocialProofSection from "@/components/landing/SocialProof";
import { InfiniteMovingCards } from "@/components/ui/infinite-moving-cards";
import SplitText from "@/components/SplitText/SplitText";
import { GlowingEffectDemo } from "@/components/GlowingEffect";
import FooterDemo from "@/components/Footer";

const handleAnimationComplete = () => {
  console.log('All letters have animated!');
};
const LottieView = dynamic(
  async () => (await import('lottie-react')).default,
  { ssr: false }
);

export default function Home() {
  const defaultOptions = {
    animationData: gradientAnimation,
    loop: true,
  };
  const testimonials = [
    {
      quote:
        "It was the best of times, it was the worst of times, it was the age of wisdom, it was the age of foolishness, it was the epoch of belief, it was the epoch of incredulity, it was the season of Light, it was the season of Darkness, it was the spring of hope, it was the winter of despair.",
      name: "Charles Dickens",
      title: "A Tale of Two Cities",
      // image:"/global.svg
      image: "/zomato_logo.png"
      // "
    },
    {
      quote:
        "To be, or not to be, that is the question: Whether 'tis nobler in the mind to suffer The slings and arrows of outrageous fortune, Or to take Arms against a Sea of troubles, And by opposing end them: to die, to sleep.",
      name: "William Shakespeare",
      title: "Hamlet",
      image: "/chai.jpg"

    },
    {
      quote: "All that we see or seem is but a dream within a dream.",
      name: "Edgar Allan Poe",
      title: "A Dream Within a Dream",
      image: "/google.webp"

    },
   
  ];

  {/* Your content here */ }
  return (
    <>
      <NavbarDemo />
      <ClickSpark
        sparkColor='#036ffc'
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
            <div className="w-md  hidden lg:block"><LottieView animationData={defaultOptions.animationData} loop={defaultOptions.loop} /></div>
          </div>
        </div>
        <div className=""><ResearchFlow /></div>


        <div className="text-center my-10">
        <SplitText
          text="Testimonials of our client"
          className="text-center text-2xl md:text-4xl  font-bold text-gray-800 "
          delay={50}
          animationFrom={{ opacity: 0, transform: 'translate3d(0,50px,0)' }}
          animationTo={{ opacity: 1, transform: 'translate3d(0,0,0)' }}
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
          animationFrom={{ opacity: 0, transform: 'translate3d(0,50px,0)' }}
          animationTo={{ opacity: 1, transform: 'translate3d(0,0,0)' }}
          // easing="easeOutCubic"
          threshold={0.2}
          rootMargin="-50px"
          onLetterAnimationComplete={handleAnimationComplete}
        />
        </div>
        <div className="px-16 my-10">

        <GlowingEffectDemo/>
        </div>
        <FooterDemo/>
      </ClickSpark>

    </>
  );
}