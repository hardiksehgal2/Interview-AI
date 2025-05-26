import { TypewriterEffectSmooth } from '@/components/ui/typewriter-effect';
import React from 'react';

const CareerIntro = () => {
  const words = [
    { text: "Grow Your Career at", className: "text-2xl md:text-4xl lg:text-5xl font-extrabold" },
    { text: "JustHired", className: "text-purple-600 text-2xl md:text-4xl lg:text-5xl font-extrabold" },
  ];
  const words2 = [
    { text: "Where Talent Thrives", className: "text-2xl md:text-4xl lg:text-5xl font-extrabold" },
  ];
  const subheadline1 = [
    { text: "We're committed to fostering a culture of collaboration and growth", className: "text-base md:text-lg lg:text-xl font-medium text-gray-700 dark:text-gray-200" }
  ];
  const subheadline2 = [
    { text: "Unlock your potential and build a rewarding career with us.", className: "text-base md:text-lg lg:text-xl font-medium text-gray-700 dark:text-gray-200" }
  ];

  return (
    <div className="flex flex-col items-center justify-center text-center mx-auto max-w-3xl ">
      {/* Main heading */}
      <TypewriterEffectSmooth 
        words={words} 
        className="text-lg md:text-2xl"
      />
      {/* Subheading */}
      <TypewriterEffectSmooth 
        words={words2} 
        className="text-2xl -mt-2 md:text-4xl lg:text-6xl font-extrabold"
      />
      {/* Subheadline Line 1 */}
      <TypewriterEffectSmooth 
        words={subheadline1}
        className="text-sm md:text-base"
      />
      {/* Subheadline Line 2 */}
      <TypewriterEffectSmooth 
        words={subheadline2}
        className="-mt-6 text-sm md:text-base "
      />
    </div>
  );
};

export default CareerIntro;
