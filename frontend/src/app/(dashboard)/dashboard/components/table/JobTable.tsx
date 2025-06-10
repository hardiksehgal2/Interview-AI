/* eslint-disable @typescript-eslint/no-unused-vars */
"use client"

import * as React from "react"
import {
    ColumnDef,
    ColumnFiltersState,
    flexRender,
    getCoreRowModel,
    getFilteredRowModel,
    getSortedRowModel,
    SortingState,
    useReactTable,
} from "@tanstack/react-table"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { ArrowUpDown, MoreHorizontal, Eye, Edit, Trash2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import AxiosInstances from "@/services/AxiosInstance"
import { TokenManager } from "@/utils/tokenManager"
import ViewJob from "./ViewJob"
import EditJob from "./EditJob"

export interface Job {
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




export function JobTable() {
    const [sorting, setSorting] = React.useState<SortingState>([])
    const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
    const [rowSelection, setRowSelection] = React.useState({})
    const [data, setData] = React.useState<Job[]>([])
    const [loading, setLoading] = React.useState(true)
    const [totalPages, setTotalPages] = React.useState(0)
    const [currentPage, setCurrentPage] = React.useState(0)
    const [pageSize] = React.useState(10)
    const [selectedJobId, setSelectedJobId] = React.useState<string | null>(null)
    const [isViewJobOpen, setIsViewJobOpen] = React.useState(false)
    const [deleteJobId, setDeleteJobId] = React.useState<string | null>(null)
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false)
    const [isDeleting, setIsDeleting] = React.useState(false)
    const [editJobId, setEditJobId] = React.useState<string | null>(null)
    const [isEditJobOpen, setIsEditJobOpen] = React.useState(false)

    const handleEditJob = (jobId: string) => {
        setEditJobId(jobId)
        setTimeout(() => {
            setIsEditJobOpen(true)
        }, 0)
    }

    const handleEditJobClose = () => {
        setIsEditJobOpen(false)
        setEditJobId(null)
    }

    const handleJobUpdated = () => {
        // Refetch the current page data after job is updated
        fetchJobs(currentPage)
    }
    // Add these functions before the columns definition
    const handleDeleteJob = (jobId: string) => {
        setDeleteJobId(jobId)
        setIsDeleteDialogOpen(true)
    }

    const confirmDeleteJob = async () => {
        if (!deleteJobId) return

        try {
            setIsDeleting(true)
            await AxiosInstances.delete(`/jobs/${deleteJobId}`)

            // Refetch the current page data
            await fetchJobs(currentPage)

            // If current page becomes empty and it's not the first page, go to previous page
            if (data.length === 1 && currentPage > 0) {
                await fetchJobs(currentPage - 1)
            }

            setIsDeleteDialogOpen(false)
            setDeleteJobId(null)
        } catch (error) {
            console.error("Error deleting job:", error)
        } finally {
            setIsDeleting(false)
        }
    }

    const cancelDeleteJob = () => {
        setIsDeleteDialogOpen(false)
        setDeleteJobId(null)
    }
    // Add this function to handle dialog close
    const handleViewJobClose = () => {
        setIsViewJobOpen(false)
        setSelectedJobId(null)
    }

    const fetchJobs = React.useCallback(async (page: number = 0) => {
        try {
            setLoading(true)
            const userData = TokenManager.getUserData()
            if (!userData?.id) {
                console.error("No company ID found")
                return
            }

            const skip = page * pageSize
            const response = await AxiosInstances.get(
                `/companies/${userData.id}/jobs/?skip=${skip}&limit=${pageSize}`
            )

            console.log("API Response:", response.data) // Debug log

            // Handle both response formats - array or object
            let jobsData: Job[] = []
            let totalCount = 0

            if (Array.isArray(response.data)) {
                // Direct array response
                jobsData = response.data
                totalCount = response.data.length + (page * pageSize) // Estimate total
            } else if (response.data.jobs) {
                // Object with jobs property
                jobsData = response.data.jobs
                totalCount = response.data.total || response.data.jobs.length
            }

            setData(jobsData)
            setTotalPages(Math.ceil(totalCount / pageSize))
            setCurrentPage(page)
        } catch (error) {
            console.error("Error fetching jobs:", error)
            setData([])
            setTotalPages(0)
        } finally {
            setLoading(false)
        }
    }, [pageSize])

    const columns: ColumnDef<Job>[] = [
        {
            accessorKey: "role_title",
            header: () => <div className="text-start">Job Title</div>,
            cell: ({ row }) => (
                <div className="font-medium">{row.getValue("role_title")}</div>
            ),
        },
        {
            accessorKey: "employment_type",
            header: "Employment Type",
            cell: ({ row }) => {
                const type = row.getValue("employment_type") as string
                const typeFormatted = type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())

                const getTypeColor = (type: string) => {
                    switch (type) {
                        case "full_time": return "bg-green-100 text-green-800"
                        case "part_time": return "bg-blue-100 text-blue-800"
                        case "contract": return "bg-orange-100 text-orange-800"
                        case "internship": return "bg-purple-100 text-purple-800"
                        default: return "bg-gray-100 text-gray-800"
                    }
                }

                return (
                    <Badge className={getTypeColor(type)}>
                        {typeFormatted}
                    </Badge>
                )
            },
        },
        {
            accessorKey: "openings",
            header: () => <div className="text-center">Openings</div>,
            cell: ({ row }) => {
                return <div className="text-center font-medium">{row.getValue("openings")}</div>
            },
        },
        {
            accessorKey: "location",
            header: () => <div className="text-center">Location</div>,
            cell: ({ row }) => (
                <div className="text-sm text-center">{row.getValue("location")}</div>
            ),
        },
        {
            accessorKey: "experience_level",
            header: "Experience",
            cell: ({ row }) => {
                const level = row.getValue("experience_level") as string
                const levelFormatted = level.charAt(0).toUpperCase() + level.slice(1)

                return (
                    <div className="ml-4">
                        <Badge variant="outline">
                            {levelFormatted}
                        </Badge>
                    </div>
                )
            },
        },
        {
            accessorKey: "applications_count",
            header: () => <div className="text-center">Applications</div>,
            cell: ({ row }) => {
                return <div className="text-center">{row.getValue("applications_count")}</div>
            },
        },
        {
            accessorKey: "is_active",
            header: "Status",
            cell: ({ row }) => {
                const isActive = row.getValue("is_active") as boolean

                return (
                    <Badge className={isActive ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}>
                        {isActive ? "Active" : "Inactive"}
                    </Badge>
                )
            },
        },
        {
            accessorKey: "created_at",
            header: () => <div className="text-start">Posted Date</div>,
            cell: ({ row }) => {
                const date = new Date(row.getValue("created_at"))
                const formatted = date.toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                })
                return <div className="text-sm">{formatted}</div>
            },
        },
        {
            id: "actions",
            enableHiding: false,
            cell: ({ row }) => {
                const job = row.original

                const handleViewApplications = () => {
                    setSelectedJobId(job._id)
                    setTimeout(() => {
                        setIsViewJobOpen(true)
                    }, 0)
                }

                return (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                                <span className="sr-only">Open menu</span>
                                <MoreHorizontal className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-white rounded-lg">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="cursor-pointer" onClick={handleViewApplications}>
                                <Eye className="mr-2 h-4 w-4" />
                                View Applications
                            </DropdownMenuItem>
                            <DropdownMenuItem className="cursor-pointer" onClick={() => handleEditJob(job._id)}>
                                <Edit className="mr-2 h-4 w-4" />
                                Edit Job
                            </DropdownMenuItem>

                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                                className="cursor-pointer text-red-600"
                                onClick={() => handleDeleteJob(job._id)}
                            >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete Job
                            </DropdownMenuItem>

                        </DropdownMenuContent>
                    </DropdownMenu>
                )
            },
        }
    ]
    React.useEffect(() => {
        fetchJobs(0)
    }, [fetchJobs])

    const table = useReactTable({
        data,
        columns,
        onSortingChange: setSorting,
        onColumnFiltersChange: setColumnFilters,
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        onRowSelectionChange: setRowSelection,
        state: {
            sorting,
            columnFilters,
            rowSelection,
        },
        manualPagination: true,
        pageCount: totalPages,
    })

    const handlePreviousPage = () => {
        if (currentPage > 0) {
            fetchJobs(currentPage - 1)
        }
    }

    const handleNextPage = () => {
        if (currentPage < totalPages - 1) {
            fetchJobs(currentPage + 1)
        }
    }

    if (loading) {
        return (
            <div className="w-full">
                <div className="flex items-center justify-center h-64">
                    <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
                </div>
            </div>
        )
    }

    return (
        <div className="w-full bg-white border rounded-lg">
            <div className="flex items-center py-4 px-4">
                <Input
                    placeholder="Filter job titles..."
                    value={(table.getColumn("role_title")?.getFilterValue() as string) ?? ""}
                    onChange={(event) =>
                        table.getColumn("role_title")?.setFilterValue(event.target.value)
                    }
                    className="max-w-sm"
                />
            </div>

            <div className="rounded-md border mx-4">
                <Table>
                    <TableHeader>
                        {table.getHeaderGroups().map((headerGroup) => (
                            <TableRow key={headerGroup.id}>
                                {headerGroup.headers.map((header) => {
                                    return (
                                        <TableHead key={header.id}>
                                            {header.isPlaceholder
                                                ? null
                                                : flexRender(
                                                    header.column.columnDef.header,
                                                    header.getContext()
                                                )}
                                        </TableHead>
                                    )
                                })}
                            </TableRow>
                        ))}
                    </TableHeader>
                    <TableBody>
                        {table.getRowModel()?.rows?.length ? (
                            table.getRowModel().rows.map((row) => (
                                <TableRow
                                    key={row.id}
                                    data-state={row.getIsSelected() && "selected"}
                                    className="hover:bg-gray-50"
                                >
                                    {row.getVisibleCells().map((cell) => (
                                        <TableCell key={cell.id}>
                                            {flexRender(
                                                cell.column.columnDef.cell,
                                                cell.getContext()
                                            )}
                                        </TableCell>
                                    ))}
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell
                                    colSpan={columns.length}
                                    className="h-24 text-center"
                                >
                                    {loading ? "Loading..." : "No jobs found."}
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>

            <div className="flex items-center justify-between space-x-2 py-4 px-4">
                <div className="text-sm text-gray-600">
                    Page {currentPage + 1} of {totalPages}
                </div>
                <div className="space-x-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handlePreviousPage}
                        disabled={currentPage === 0}
                    >
                        Previous
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleNextPage}
                        disabled={currentPage >= totalPages - 1}
                    >
                        Next
                    </Button>
                </div>
            </div>
            <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure you want to delete this job?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete the job posting
                            and remove all associated data.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={cancelDeleteJob} disabled={isDeleting}>
                            Cancel
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={confirmDeleteJob}
                            disabled={isDeleting}
                            className="bg-red-600 hover:bg-red-700"
                        >
                            {isDeleting ? "Deleting..." : "Yes, Delete"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
            {/* Add ViewJob component here */}
            <ViewJob
                jobId={selectedJobId}
                isOpen={isViewJobOpen}
                onClose={handleViewJobClose}
            />
            <EditJob
                jobId={editJobId}
                isOpen={isEditJobOpen}
                onClose={handleEditJobClose}
                onJobUpdated={handleJobUpdated}
            />
        </div>
    )
}