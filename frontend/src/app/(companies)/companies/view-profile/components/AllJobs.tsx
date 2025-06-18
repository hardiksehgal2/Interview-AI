/* eslint-disable @typescript-eslint/no-unused-vars */
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AxiosInstances from '@/services/AxiosInstance';
import { 
  MapPin, 
  Clock, 
  DollarSign, 
  Users, 
  ChevronDown,
  Briefcase,
  Calendar,
  Star,
  Bookmark
} from 'lucide-react';

interface Job {
  _id: string;
  role_title: string;
  description: string;
  skills: Record<string, string>;
  requirements: {
    description: string;
  };
  accuracy_threshold: number;
  salary_min: number;
  salary_max: number;
  location: string;
  employment_type: string;
  experience_level: string;
  is_active: boolean;
  difficulty: string;
  openings: number;
  duration: string | null;
  perks: string;
  responsibilities: string;
  company_id: string;
  created_by: string;
  applications_count: number;
  created_at: string;
  updated_at: string | null;
}

interface AllJobsProps {
  companyId: string;
  companyName?: string;
}

const AllJobs: React.FC<AllJobsProps> = ({ companyId, companyName = "Company" }) => {
  const router = useRouter();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [filteredJobs, setFilteredJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  // Filter states
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all');
  const [selectedLocation, setSelectedLocation] = useState<string>('all');
  const [selectedExperience, setSelectedExperience] = useState<string>('all');

  useEffect(() => {
    const fetchJobs = async () => {
      if (!companyId) {
        setError('Company ID is missing');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const response = await AxiosInstances.get(`/companies/${companyId}/jobs/`);
        
        if (response.data && Array.isArray(response.data)) {
          const activeJobs = response.data.filter((job: Job) => job.is_active);
          setJobs(activeJobs);
          setFilteredJobs(activeJobs);
        } else {
          setJobs([]);
          setFilteredJobs([]);
        }
      } catch (err) {
        console.error('Error fetching jobs:', err);
        setError('Failed to load jobs');
      } finally {
        setLoading(false);
      }
    };

    fetchJobs();
  }, [companyId]);

  // Apply filters
  useEffect(() => {
    let filtered = [...jobs];

    if (selectedDepartment !== 'all') {
      filtered = filtered.filter(job => 
        job.role_title.toLowerCase().includes(selectedDepartment.toLowerCase())
      );
    }

    if (selectedLocation !== 'all') {
      filtered = filtered.filter(job => 
        job.location.toLowerCase().includes(selectedLocation.toLowerCase())
      );
    }

    if (selectedExperience !== 'all') {
      filtered = filtered.filter(job => 
        job.experience_level === selectedExperience
      );
    }

    setFilteredJobs(filtered);
  }, [jobs, selectedDepartment, selectedLocation, selectedExperience]);

  const formatEmploymentType = (type: string): string => {
    return type.split('_')
      .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const formatSalary = (min: number, max: number): string => {
    const formatNumber = (num: number): string => {
      if (num >= 100000) {
        return `${(num / 100000).toFixed(1)}L`;
      }
      if (num >= 1000) {
        return `${(num / 1000).toFixed(0)}K`;
      }
      return num.toString();
    };

    return `₹${formatNumber(min)} - ₹${formatNumber(max)}`;
  };

  const getDaysAgo = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) return '1 day ago';
    if (diffDays < 30) return `${diffDays} days ago`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
    return `${Math.floor(diffDays / 365)} years ago`;
  };

  const getDepartments = (): string[] => {
    const departments = new Set<string>();
    jobs.forEach(job => {
      // Extract department from role title (simplified logic)
      if (job.role_title.toLowerCase().includes('frontend') || 
          job.role_title.toLowerCase().includes('backend') ||
          job.role_title.toLowerCase().includes('developer') ||
          job.role_title.toLowerCase().includes('engineer')) {
        departments.add('Engineering');
      }
      if (job.role_title.toLowerCase().includes('design')) {
        departments.add('Design');
      }
      if (job.role_title.toLowerCase().includes('marketing')) {
        departments.add('Marketing');
      }
      if (job.role_title.toLowerCase().includes('sales')) {
        departments.add('Sales');
      }
      if (job.role_title.toLowerCase().includes('hr') || 
          job.role_title.toLowerCase().includes('human')) {
        departments.add('Human Resources');
      }
    });
    return Array.from(departments);
  };

  const getLocations = (): string[] => {
    const locations = new Set(jobs.map(job => job.location));
    return Array.from(locations);
  };

  const getExperienceLevels = (): string[] => {
    const levels = new Set(jobs.map(job => job.experience_level));
    return Array.from(levels);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="text-lg text-gray-600">Loading jobs...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col justify-center items-center py-12 gap-4">
        <p className="text-lg text-red-600">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            {filteredJobs.length} Job opening{filteredJobs.length !== 1 ? 's' : ''} at {companyName}
          </h2>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        {/* Department Filter */}
        <div className="relative">
          <select
            value={selectedDepartment}
            onChange={(e) => setSelectedDepartment(e.target.value)}
            className="appearance-none bg-white border border-gray-300 rounded-lg px-4 py-2 pr-8 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">Department</option>
            {getDepartments().map(dept => (
              <option key={dept} value={dept}>{dept}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        </div>

        {/* Location Filter */}
        <div className="relative">
          <select
            value={selectedLocation}
            onChange={(e) => setSelectedLocation(e.target.value)}
            className="appearance-none bg-white border border-gray-300 rounded-lg px-4 py-2 pr-8 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">Location</option>
            {getLocations().map(location => (
              <option key={location} value={location}>{location}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        </div>

        {/* Experience Filter */}
        <div className="relative">
          <select
            value={selectedExperience}
            onChange={(e) => setSelectedExperience(e.target.value)}
            className="appearance-none bg-white border border-gray-300 rounded-lg px-4 py-2 pr-8 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">Experience</option>
            {getExperienceLevels().map(level => (
              <option key={level} value={level}>
                {level.charAt(0).toUpperCase() + level.slice(1)} Level
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        </div>
      </div>

      {/* Jobs List */}
      <div className="space-y-4">
        {filteredJobs.length > 0 ? (
          filteredJobs.map((job) => (
            <div
              key={job._id}
              className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => router.push(`/companies/view-jobs?company_id=${job.company_id}&job_id=${job._id}`)}
            >
              <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                {/* Job Info */}
                <div className="flex-1">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="text-xl font-semibold text-gray-900 hover:text-blue-600 transition-colors">
                        {job.role_title}
                      </h3>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-gray-600 font-medium">{companyName}</span>
                        <Star className="w-4 h-4 text-yellow-400 fill-current" />
                        <span className="text-sm text-gray-500">4.2</span>
                        <span className="text-sm text-gray-400">(Reviews)</span>
                      </div>
                    </div>
                    <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                      <Bookmark className="w-5 h-5 text-gray-400" />
                    </button>
                  </div>

                  {/* Job Details */}
                  <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 mb-3">
                    <div className="flex items-center gap-1">
                      <Briefcase className="w-4 h-4" />
                      <span>{job.experience_level.charAt(0).toUpperCase() + job.experience_level.slice(1)} Level</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <DollarSign className="w-4 h-4" />
                      <span>{formatSalary(job.salary_min, job.salary_max)}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <MapPin className="w-4 h-4" />
                      <span>{job.location}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Users className="w-4 h-4" />
                      <span>{job.openings} opening{job.openings !== 1 ? 's' : ''}</span>
                    </div>
                  </div>

                  {/* Job Description */}
                  <p className="text-gray-700 text-sm line-clamp-2 mb-3">
                    {job.description}
                  </p>

                  {/* Skills */}
                  <div className="flex flex-wrap gap-2 mb-3">
                    {Object.values(job.skills)
                      .filter(skill => skill && skill.trim() !== '')
                      .slice(0, 5)
                      .map((skill, index) => (
                        <span
                          key={index}
                          className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-blue-50 text-blue-700"
                        >
                          {skill}
                        </span>
                      ))
                    }
                    {Object.values(job.skills).filter(skill => skill && skill.trim() !== '').length > 5 && (
                      <span className="text-xs text-gray-500">
                        +{Object.values(job.skills).filter(skill => skill && skill.trim() !== '').length - 5} more
                      </span>
                    )}
                  </div>

                  {/* Posted Date */}
                  <div className="flex items-center gap-1 text-xs text-gray-500">
                    <Calendar className="w-3 h-3" />
                    <span>{getDaysAgo(job.created_at)}</span>
                  </div>
                </div>

                {/* Company Logo Placeholder */}
                <div className="flex-shrink-0 lg:ml-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                    <span className="text-white text-lg font-bold">
                      {companyName.charAt(0).toUpperCase()}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-12">
            <Briefcase className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No jobs found</h3>
            <p className="text-gray-600">
              {jobs.length === 0 
                ? "This company hasn't posted any jobs yet." 
                : "No jobs match your current filters. Try adjusting your search criteria."
              }
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AllJobs;