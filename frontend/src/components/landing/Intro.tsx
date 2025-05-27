import React, { useEffect, useState } from 'react';
import { TypewriterEffectSmooth } from '../ui/typewriter-effect';
import { useRouter } from 'next/navigation'

const Intro = () => {
  const router = useRouter();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Trigger animation when component mounts
    setIsVisible(true);
  }, []);

  const words = [
    {
      text: "AI conducts interviews while you focus on ",
    },
    {
      text: "top talent",
      className: "text-purple-600",
    },
  ];
  const handleSubmit = () => {
    router.push("/careers")
  }

  return (
    <div
      className={`max-w-4xl mx-auto py-16 flex flex-col items-start text-center md:text-left
        transition-transform transition-opacity duration-700 ease-out
        ${isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-20'}`}
    >
      {/* Process Steps */}
      <div className="flex gap-2 mb-8 justify-center md:justify-start">
        <div className="bg-amber-200 px-4 py-2 rounded-full text-sm md:text-base text-gray-800 font-medium">
         AI Interviews
        </div>
        <div className="bg-purple-200 px-4 py-2 rounded-full text-sm md:text-base text-gray-800 font-medium">
        Smart Reports
        </div>
        <div className="bg-blue-200 px-4 py-2 rounded-full text-sm md:text-base text-gray-800 font-medium">
        Instant result
        </div>
      </div>

      {/* Main Heading */}
      <h1 className="text-4xl md:text-6xl font-bold text-gray-800 mb-4 md:mb-6">
        The future of<br className="hidden md:block" />Interview
      </h1>

      {/* Subheading */}
      <div className="text-lg md:text-2xl mb-6 text-center md:text-left">
        <TypewriterEffectSmooth words={words} />
      </div>

      {/* CTA Buttons */}
      <div className="flex flex-col sm:flex-row gap-4 justify-center md:justify-start">
        <button className="bg-indigo-600 text-white cursor-pointer px-6 py-3 rounded-full font-medium hover:bg-indigo-700 transition-colors w-full sm:w-auto"
          onClick={handleSubmit}>
          Get Started
        </button>
      </div>
    </div>
  );
};

export default Intro;
