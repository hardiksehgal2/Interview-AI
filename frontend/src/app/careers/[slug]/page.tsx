// app/careers/[slug]/page.tsx
'use client'

import { Suspense } from 'react'
import JobDetailPage from '../components/JobDetailPage'

export default function Careers() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading job details...</div>}>
      <JobDetailPage />
    </Suspense>
  )
}