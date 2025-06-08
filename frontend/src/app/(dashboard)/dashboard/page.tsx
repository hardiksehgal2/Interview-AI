"use client"

import { withAuth } from '@/wrapper/authWrapper'
import React from 'react'
import { JobTable } from './components/table/JobTable'

const dashboard = () => {
  return (
    <div className='bg-white min-h-screen'>
      Welcome to dashboard
      <JobTable/>
    </div>
  )
}

export default withAuth(dashboard)
