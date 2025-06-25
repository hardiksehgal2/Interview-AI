// frontend/src/app/(companies)/companies/view-profile/page.tsx
'use client'
import React, { Suspense } from 'react'
import ViewProfileContent from './components/ViewProfileContent';

const ViewProfile = () => {
  return (
    <Suspense fallback={
      <div className="flex justify-center items-center min-h-screen">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="text-lg text-gray-600">Loading company profile...</p>
        </div>
      </div>
    }>
      <ViewProfileContent />
    </Suspense>
  );
};

export default ViewProfile;