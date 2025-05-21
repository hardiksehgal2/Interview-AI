'use client'

import { Suspense } from 'react';
import { JobDetailsContent } from './component/JobDetailsContent';
export default function JobDetails() {
    return (
        <Suspense fallback={<div className="flex justify-center items-center h-screen">Loading job details...</div>}>
            <JobDetailsContent />
        </Suspense>
    );
}
