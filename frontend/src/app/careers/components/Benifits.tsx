'use client'

import { useState, useEffect } from 'react'

// Benefits component with enhanced animations
export default function BenefitsSection() {
  // State for tracking visible elements during scroll
  const [isVisible, setIsVisible] = useState(false);

  // Set visibility after component mounts for entrance animations
  useEffect(() => {
    setIsVisible(true);
    
    // Set up intersection observer for scroll animations
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('animate-in');
        }
      });
    }, { threshold: 0.1 });
    
    // Target elements for scroll animations
    const animatedElements = document.querySelectorAll('.scroll-animate');
    animatedElements.forEach(el => observer.observe(el));
    
    return () => {
      animatedElements.forEach(el => observer.unobserve(el));
    };
  }, []);

  return (
    <div className="py-1 bg-white relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-blue-50 rounded-full opacity-20 -translate-y-1/2 translate-x-1/2 transform blur-3xl"></div>
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-purple-50 rounded-full opacity-20 translate-y-1/2 -translate-x-1/2 transform blur-3xl"></div>
      
      <div className="w-full mx-auto px-4 md:px-16 relative z-10">
        <div 
          className={`text-center mb-12 transition-all duration-1000 transform ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
          }`}
        >
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Benefits & Perks</h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            We believe in supporting our team with benefits that matter and help you thrive both personally and professionally.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {/* Health Insurance */}
          <div 
            className={`scroll-animate bg-white p-6 rounded-lg shadow-sm border border-gray-100 transition-all duration-500 hover:shadow-md hover:border-blue-100 transform hover:-translate-y-1 opacity-0 translate-y-10 delay-[100ms] ${
              isVisible ? 'animate-in ' : ''
            }`}
          >
            <div className="flex items-center mb-4 group">
              <div className="bg-blue-50 p-3 rounded-full mr-4 transition-all duration-300 group-hover:bg-blue-100">
                <svg className="w-6 h-6 text-blue-500 transition-transform duration-300 group-hover:scale-110" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 transition-colors duration-300 group-hover:text-blue-600">Comprehensive Health Insurance</h3>
            </div>
            <p className="text-gray-600">
              Full medical, dental, and vision coverage for you and your dependents with premium plans and low deductibles.
            </p>
          </div>

          {/* Retirement */}
          <div 
            className={`scroll-animate bg-white p-6 rounded-lg shadow-sm border border-gray-100 transition-all duration-500 hover:shadow-md hover:border-green-100 transform hover:-translate-y-1 opacity-0 translate-y-10 delay-[200ms] ${
              isVisible ? 'animate-in' : ''
            }`}
          >
            <div className="flex items-center mb-4 group">
              <div className="bg-green-50 p-3 rounded-full mr-4 transition-all duration-300 group-hover:bg-green-100">
                <svg className="w-6 h-6 text-green-500 transition-transform duration-300 group-hover:scale-110" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 transition-colors duration-300 group-hover:text-green-600">Retirement Plan</h3>
            </div>
            <p className="text-gray-600">
              Competitive 401(k) plan with employer matching up to 4% to help you prepare for your future.
            </p>
          </div>

          {/* PTO */}
          <div 
            className={`scroll-animate bg-white p-6 rounded-lg shadow-sm border border-gray-100 transition-all duration-500 hover:shadow-md hover:border-purple-100 transform hover:-translate-y-1 opacity-0 translate-y-10 delay-[300ms] ${
              isVisible ? 'animate-in' : ''
            }`}
          >
            <div className="flex items-center mb-4 group">
              <div className="bg-purple-50 p-3 rounded-full mr-4 transition-all duration-300 group-hover:bg-purple-100">
                <svg className="w-6 h-6 text-purple-500 transition-transform duration-300 group-hover:scale-110" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 transition-colors duration-300 group-hover:text-purple-600">Generous Time Off</h3>
            </div>
            <p className="text-gray-600">
              Unlimited PTO policy, plus company holidays and flexible scheduling to maintain a healthy work-life balance.
            </p>
          </div>

          {/* Parental Leave */}
          <div 
            className={`scroll-animate bg-white p-6 rounded-lg shadow-sm border border-gray-100 transition-all duration-500 hover:shadow-md hover:border-yellow-100 transform hover:-translate-y-1 opacity-0 translate-y-10 delay-[400ms] ${
              isVisible ? 'animate-in' : ''
            }`}
          >
            <div className="flex items-center mb-4 group">
              <div className="bg-yellow-50 p-3 rounded-full mr-4 transition-all duration-300 group-hover:bg-yellow-100">
                <svg className="w-6 h-6 text-yellow-500 transition-transform duration-300 group-hover:scale-110" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 transition-colors duration-300 group-hover:text-yellow-600">Parental Leave</h3>
            </div>
            <p className="text-gray-600">
              16 weeks of fully paid parental leave for all new parents, including adoptive and foster parents.
            </p>
          </div>

          {/* Professional Development */}
          <div 
            className={`scroll-animate bg-white p-6 rounded-lg shadow-sm border border-gray-100 transition-all duration-500 hover:shadow-md hover:border-red-100 transform hover:-translate-y-1 opacity-0 translate-y-10 delay-[500ms] ${
              isVisible ? 'animate-in' : ''
            }`}
          >
            <div className="flex items-center mb-4 group">
              <div className="bg-red-50 p-3 rounded-full mr-4 transition-all duration-300 group-hover:bg-red-100">
                <svg className="w-6 h-6 text-red-500 transition-transform duration-300 group-hover:scale-110" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 transition-colors duration-300 group-hover:text-red-600">Professional Development</h3>
            </div>
            <p className="text-gray-600">
              $2,000 annual learning budget for courses, conferences, and certifications to help you grow your skills.
            </p>
          </div>

          {/* Remote Work */}
          <div 
            className={`scroll-animate bg-white p-6 rounded-lg shadow-sm border border-gray-100 transition-all duration-500 hover:shadow-md hover:border-indigo-100 transform hover:-translate-y-1 opacity-0 translate-y-10 delay-[600ms] ${
              isVisible ? 'animate-in' : ''
            }`}
          >
            <div className="flex items-center mb-4 group">
              <div className="bg-indigo-50 p-3 rounded-full mr-4 transition-all duration-300 group-hover:bg-indigo-100">
                <svg className="w-6 h-6 text-indigo-500 transition-transform duration-300 group-hover:scale-110" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 transition-colors duration-300 group-hover:text-indigo-600">Remote-Friendly Culture</h3>
            </div>
            <p className="text-gray-600">
              Fully equipped home office stipend and flexibility to work from anywhere with an internet connection.
            </p>
          </div>
        </div>
        
        {/* Additional Perks Section */}
        <div className={`mt-16 transition-all duration-1000 transform ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
          }`}>
          <h3 className="text-2xl font-bold text-gray-900 mb-8 text-center">Additional Perks</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            {/* Mental Wellness Program */}
            <div className="p-4 group">
              <div className="bg-gray-50 p-4 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-3 transition-all duration-300 transform group-hover:scale-110 group-hover:bg-gray-100 group-hover:shadow-md">
                <svg className="w-8 h-8 text-gray-700 transition-all duration-300 group-hover:text-gray-900" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <h4 className="font-medium text-gray-900 transition-colors duration-300 group-hover:text-indigo-700">Mental Wellness Program</h4>
            </div>
            
            {/* Free Catered Lunches */}
            <div className="p-4 group">
              <div className="bg-gray-50 p-4 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-3 transition-all duration-300 transform group-hover:scale-110 group-hover:bg-gray-100 group-hover:shadow-md">
                <svg className="w-8 h-8 text-gray-700 transition-all duration-300 group-hover:text-gray-900" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 15.546c-.523 0-1.046.151-1.5.454a2.704 2.704 0 01-3 0 2.704 2.704 0 00-3 0 2.704 2.704 0 01-3 0 2.704 2.704 0 00-3 0 2.704 2.704 0 01-3 0 2.701 2.701 0 00-1.5-.454M9 6v2m3-2v2m3-2v2M9 3h.01M12 3h.01M15 3h.01M21 21v-7a2 2 0 00-2-2H5a2 2 0 00-2 2v7h18zm-3-9v-2a2 2 0 00-2-2H8a2 2 0 00-2 2v2h12z" />
                </svg>
              </div>
              <h4 className="font-medium text-gray-900 transition-colors duration-300 group-hover:text-indigo-700">Free Catered Lunches</h4>
            </div>
            
            {/* Fitness Allowance */}
            <div className="p-4 group">
              <div className="bg-gray-50 p-4 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-3 transition-all duration-300 transform group-hover:scale-110 group-hover:bg-gray-100 group-hover:shadow-md">
                <svg className="w-8 h-8 text-gray-700 transition-all duration-300 group-hover:text-gray-900" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h4 className="font-medium text-gray-900 transition-colors duration-300 group-hover:text-indigo-700">Fitness Allowance</h4>
            </div>
            
            {/* Company Retreats */}
            <div className="p-4 group">
              <div className="bg-gray-50 p-4 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-3 transition-all duration-300 transform group-hover:scale-110 group-hover:bg-gray-100 group-hover:shadow-md">
                <svg className="w-8 h-8 text-gray-700 transition-all duration-300 group-hover:text-gray-900" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
                </svg>
              </div>
              <h4 className="font-medium text-gray-900 transition-colors duration-300 group-hover:text-indigo-700">Company Retreats</h4>
            </div>
          </div>
        </div>
      </div>

      {/* Custom CSS for entrance animations */}
      <style jsx>{`
        .animate-in {
          opacity: 1 !important;
          transform: translateY(0) !important;
        }
        
        @keyframes float {
          0% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
          100% { transform: translateY(0px); }
        }
        
        .floating {
          animation: float 6s ease-in-out infinite;
        }
      `}</style>
    </div>
  )
}