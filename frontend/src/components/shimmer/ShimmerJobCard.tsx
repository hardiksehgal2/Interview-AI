import React from "react";

const ShimmerJobCard = () => {
  return (
    <div className="animate-pulse space-y-4 p-6 h-full rounded-xl bg-white shadow border">
      {/* Header shimmer */}
      <div className="h-6 bg-gray-200 rounded w-1/3" />
      <div className="flex items-center gap-3 flex-wrap mt-2">
        <div className="h-5 bg-gray-200 rounded w-20" />
        <div className="h-5 bg-gray-200 rounded w-16" />
        <div className="h-5 bg-gray-200 rounded w-20" />
        <div className="h-5 bg-green-100 rounded w-24" />
      </div>

      {/* Job Description */}
      <div className="mt-6 space-y-2">
        <div className="h-4 bg-gray-200 rounded w-2/3" />
        <div className="h-4 bg-gray-200 rounded w-5/6" />
        <div className="h-4 bg-gray-200 rounded w-3/4" />
      </div>

      {/* Skills */}
      <div className="mt-6">
        <div className="h-5 bg-gray-200 rounded w-28 mb-2" />
        <div className="flex gap-2 flex-wrap">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-6 bg-gray-200 rounded-full w-20" />
          ))}
        </div>
      </div>

      {/* Requirements */}
      <div className="mt-6 space-y-2">
        <div className="h-5 bg-gray-200 rounded w-32" />
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-3 bg-gray-200 rounded w-full" />
        ))}
      </div>
      <div className="h-6 bg-gray-200 rounded w-1/3" />
      <div className="flex items-center gap-3 flex-wrap mt-2">
        <div className="h-5 bg-gray-200 rounded w-20" />
        <div className="h-5 bg-gray-200 rounded w-16" />
        <div className="h-5 bg-gray-200 rounded w-20" />
        <div className="h-5 bg-green-100 rounded w-24" />
      </div>

      {/* Job Description */}
      <div className="mt-6 space-y-2">
        <div className="h-4 bg-gray-200 rounded w-2/3" />
        <div className="h-4 bg-gray-200 rounded w-5/6" />
        <div className="h-4 bg-gray-200 rounded w-3/4" />
      </div>

      {/* Skills */}
      <div className="mt-6">
        <div className="h-5 bg-gray-200 rounded w-28 mb-2" />
        <div className="flex gap-2 flex-wrap">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-6 bg-gray-200 rounded-full w-20" />
          ))}
        </div>
      </div>

      {/* Requirements */}
      <div className="mt-6 space-y-2">
        <div className="h-5 bg-gray-200 rounded w-32" />
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-3 bg-gray-200 rounded w-full" />
        ))}
      </div>
    </div>
  );
};

export default ShimmerJobCard;
