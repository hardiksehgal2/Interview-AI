/* eslint-disable @typescript-eslint/no-unused-vars */
import React, { useEffect, useState } from 'react'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { CalendarDays, MapPin, Users, DollarSign, Clock, Target, Briefcase } from "lucide-react"
import AxiosInstances from "@/services/AxiosInstance"
import { motion } from 'framer-motion'

interface Job {
    _id: string
    role_title: string
    description: string
    skills: Record<string, string>
    requirements: {
        description: string
    }
    accuracy_threshold: number
    salary_min: number
    salary_max: number
    location: string
    employment_type: "full_time" | "part_time" | "contract" | "internship"
    experience_level: "entry" | "mid" | "senior" | "lead" | "executive"
    is_active: boolean
    difficulty: "easy" | "medium" | "hard"
    openings: number
    duration?: string
    perks?: string
    responsibilities: string
    company_id: string
    created_by: string
    applications_count: number
    created_at: string
    updated_at: string | null
}

interface ViewJobProps {
    jobId: string | null
    isOpen: boolean
    onClose: () => void
}

const ViewJob: React.FC<ViewJobProps> = ({ jobId, isOpen, onClose }) => {
    const [job, setJob] = useState<Job | null>(null)
    const [loading, setLoading] = useState(false)



    useEffect(() => {
        if (jobId && isOpen) {
            fetchJobDetails()
        }
    }, [jobId, isOpen])

    const fetchJobDetails = async () => {
        if (!jobId) return

        try {
            setLoading(true)
            const response = await AxiosInstances.get(`/jobs/${jobId}`)
            setJob(response.data)
        } catch (error) {
            console.error("Error fetching job details:", error)
        } finally {
            setLoading(false)
        }
    }

    const formatEmploymentType = (type: string) => {
        return type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())
    }

    const formatSalary = (min: number, max: number) => {
        return `${min.toLocaleString()} - ${max.toLocaleString()}`
    }

    const getSkillsArray = (skills: Record<string, string>) => {
        return Object.values(skills).filter(skill => skill && skill.trim() !== '')
    }

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
        })
    }

    const getTypeColor = (type: string) => {
        switch (type) {
            case "full_time": return "bg-green-100 text-green-800"
            case "part_time": return "bg-blue-100 text-blue-800"
            case "contract": return "bg-orange-100 text-orange-800"
            case "internship": return "bg-purple-100 text-purple-800"
            default: return "bg-gray-100 text-gray-800"
        }
    }

    const getDifficultyColor = (difficulty: string) => {
        switch (difficulty) {
            case "easy": return "bg-green-100 text-green-800"
            case "medium": return "bg-yellow-100 text-yellow-800"
            case "hard": return "bg-red-100 text-red-800"
            default: return "bg-gray-100 text-gray-800"
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="min-w-xl lg:min-w-4xl max-h-[90vh] overflow-y-auto ">
                <DialogHeader>
                    <DialogTitle className="text-2xl font-bold">
                        {loading ? "Loading..." : job?.role_title}
                    </DialogTitle>

                </DialogHeader>

                {loading ? (
                    <div className="flex items-center justify-center h-64">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
                    </div>
                ) : job ? (
                    <div className="space-y-6">
                        {/* Job Overview */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            <Card>
                                <CardContent className="flex items-center p-4">
                                    <MapPin className="h-5 w-5 text-gray-500 mr-2" />
                                    <div>
                                        <p className="text-sm text-gray-500">Location</p>
                                        <p className="font-medium">{job.location}</p>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardContent className="flex items-center p-4">
                                    <DollarSign className="h-5 w-5 text-gray-500 mr-2" />
                                    <div>
                                        <p className="text-sm text-gray-500">Salary Range</p>
                                        <p className="font-medium">{formatSalary(job.salary_min, job.salary_max)}</p>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardContent className="flex items-center p-4">
                                    <Users className="h-5 w-5 text-gray-500 mr-2" />
                                    <div>
                                        <p className="text-sm text-gray-500">Openings</p>
                                        <p className="font-medium">{job.openings}</p>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardContent className="flex items-center p-4">
                                    <CalendarDays className="h-5 w-5 text-gray-500 mr-2" />
                                    <div>
                                        <p className="text-sm text-gray-500">Posted Date</p>
                                        <p className="font-medium">{formatDate(job.created_at)}</p>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Status and Type Badges */}
                        <div className="flex flex-wrap gap-2">
                            <Badge className={getTypeColor(job.employment_type)}>
                                <Briefcase className="h-3 w-3 mr-1" />
                                {formatEmploymentType(job.employment_type)}
                            </Badge>
                            <Badge variant="outline">
                                {job.experience_level.charAt(0).toUpperCase() + job.experience_level.slice(1)} Level
                            </Badge>
                            <Badge className={getDifficultyColor(job.difficulty)}>
                                <Target className="h-3 w-3 mr-1" />
                                {job.difficulty.charAt(0).toUpperCase() + job.difficulty.slice(1)}
                            </Badge>
                            <Badge className={job.is_active ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}>
                                {job.is_active ? "Active" : "Inactive"}
                            </Badge>
                            {job.duration && (
                                <Badge variant="outline">
                                    <Clock className="h-3 w-3 mr-1" />
                                    {job.duration}
                                </Badge>
                            )}
                        </div>

                        <Separator />

                        {/* Job Description */}
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            whileHover={{ scale: 1.02 }}
                            transition={{ type: "spring", stiffness: 300, damping: 20 }}
                        >

                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-lg">Job Description</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-gray-700 whitespace-pre-line">{job.description}</p>
                                </CardContent>
                            </Card>
                        </motion.div>

                        {/* Skills Required */}
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            whileHover={{ scale: 1.02 }}
                            transition={{ type: "spring", stiffness: 300, damping: 20 }}
                        >
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-lg">Required Skills</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="flex flex-wrap gap-2">
                                        {getSkillsArray(job.skills).map((skill, index) => (
                                            <Badge key={index} variant="secondary">
                                                {skill}
                                            </Badge>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        </motion.div>


                        {/* Requirements */}
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            whileHover={{ scale: 1.02 }}
                            transition={{ type: "spring", stiffness: 300, damping: 20 }}
                        >
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-lg">Requirements</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-gray-700 whitespace-pre-line">{job.requirements.description}</p>
                                </CardContent>
                            </Card>
                        </motion.div>

                        {/* Responsibilities */}
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            whileHover={{ scale: 1.02 }}
                            transition={{ type: "spring", stiffness: 300, damping: 20 }}
                        >
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-lg">Responsibilities</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-gray-700 whitespace-pre-line">{job.responsibilities}</p>
                                </CardContent>
                            </Card>
                        </motion.div>

                        {/* Perks & Benefits */}
                        {job.perks && (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                whileHover={{ scale: 1.02 }}
                                transition={{ type: "spring", stiffness: 300, damping: 20 }}
                            >
                                <Card className="transition-transform">
                                    <CardHeader>
                                        <CardTitle className="text-lg">Perks & Benefits</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <p className="text-gray-700 whitespace-pre-line">{job.perks}</p>
                                    </CardContent>
                                </Card>
                            </motion.div>
                        )}

                        {/* Additional Info */}
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            whileHover={{ scale: 1.02 }}
                            transition={{ type: "spring", stiffness: 300, damping: 20 }}
                        >
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-lg">Additional Information</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <p className="text-sm text-gray-500">Accuracy Threshold</p>
                                            <p className="font-medium">{job.accuracy_threshold}%</p>
                                        </div>
                                        <div>
                                            <p className="text-sm text-gray-500">Applications Received</p>
                                            <p className="font-medium ">{job.applications_count}</p>
                                        </div>
                                        {/* <div>
                    <p className="text-sm text-gray-500">Job ID</p>
                    <p className="font-medium font-mono text-xs">{job._id}</p>
                  </div> */}
                                        {job.updated_at && (
                                            <div>
                                                <p className="text-sm text-gray-500">Last Updated</p>
                                                <p className="font-medium">{formatDate(job.updated_at)}</p>
                                            </div>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        </motion.div>

                    </div>
                ) : (
                    <div className="text-center py-8">
                        <p className="text-gray-500">Failed to load job details</p>
                    </div>
                )}

            </DialogContent>

        </Dialog>
    )
}

export default ViewJob