// components/JobCardSkeleton.tsx
import React from 'react';

export const JobCardSkeleton = () => {
  return (
    <div className="space-y-8">
      {/* Job Card 1 */}
      <div className="animate-pulse">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="h-6 bg-gray-200 rounded w-48 mb-3"></div>
            <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-5/6"></div>
          </div>
          <div className="h-8 w-16 bg-gray-200 rounded ml-6"></div>
        </div>
        <div className="flex gap-2">
          <div className="h-7 w-24 bg-gray-200 rounded-full"></div>
          <div className="h-7 w-20 bg-gray-200 rounded-full"></div>
          <div className="h-7 w-16 bg-gray-200 rounded-full"></div>
          <div className="h-7 w-28 bg-gray-200 rounded-full"></div>
        </div>
        <div className="border-b border-gray-200 mt-6"></div>
      </div>

      {/* Job Card 2 */}
      <div className="animate-pulse">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="h-6 bg-gray-200 rounded w-56 mb-3"></div>
            <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-4/5"></div>
          </div>
          <div className="h-8 w-16 bg-gray-200 rounded ml-6"></div>
        </div>
        <div className="flex gap-2">
          <div className="h-7 w-24 bg-gray-200 rounded-full"></div>
          <div className="h-7 w-20 bg-gray-200 rounded-full"></div>
          <div className="h-7 w-18 bg-gray-200 rounded-full"></div>
        </div>
        <div className="border-b border-gray-200 mt-6"></div>
      </div>

      {/* Job Card 3 */}
      <div className="animate-pulse">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="h-6 bg-gray-200 rounded w-52 mb-3"></div>
            <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          </div>
          <div className="h-8 w-16 bg-gray-200 rounded ml-6"></div>
        </div>
        <div className="flex gap-2">
          <div className="h-7 w-24 bg-gray-200 rounded-full"></div>
          <div className="h-7 w-20 bg-gray-200 rounded-full"></div>
          <div className="h-7 w-20 bg-gray-200 rounded-full"></div>
        </div>
      </div>
    </div>
  );
};