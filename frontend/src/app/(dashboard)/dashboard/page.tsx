"use client"

import { withAuth } from '@/wrapper/authWrapper'
import React from 'react'

const dashboard = () => {
  return (
    <div>
      Welcome to dashboard
    </div>
  )
}

export default withAuth(dashboard)
