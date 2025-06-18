'use client'

import { Suspense } from 'react';
import { ViewJobs } from './components/ViewJobs';
export default function JobDetails() {
    return (
        <Suspense fallback={<div className="flex justify-center items-center h-screen">Loading job details...</div>}>
            <ViewJobs />
        </Suspense>
    );
}
