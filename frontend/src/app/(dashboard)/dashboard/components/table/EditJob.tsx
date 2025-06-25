/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-unused-vars */
import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from '@/components/ui/command';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { IconPlus, IconX, IconLoader2 } from '@tabler/icons-react';
import { ChevronDown, Search, Plus } from 'lucide-react';
import AxiosInstances from '@/services/AxiosInstance';
import toast from 'react-hot-toast';
import citiesData from "@/data/cities.json";
import skillsData from "@/data/tech_skills.json";

type EmploymentType = "full_time" | "part_time" | "contract" | "internship";
type ExperienceLevel = "entry" | "mid" | "senior" | "lead" | "executive";
type DifficultyLevel = "easy" | "medium" | "hard";

interface City {
    id: string;
    name: string;
    state: string;
}

interface EditJobFormData {
    role_title: string;
    description: string;
    skills: Record<string, string>;
    requirements: string;
    salary_min: number;
    salary_max: number;
    location: string;
    employment_type: EmploymentType;
    experience_level: ExperienceLevel;
    is_active: boolean;
    difficulty: DifficultyLevel;
    openings: number;
    duration: string;
    perks: string;
    responsibilities: string;
    accuracy_threshold: number;
}

interface EditJobProps {
    jobId: string | null;
    isOpen: boolean;
    onClose: () => void;
    onJobUpdated?: () => void;
}

const EditJob: React.FC<EditJobProps> = ({ jobId, isOpen, onClose, onJobUpdated }) => {
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [currentSkill, setCurrentSkill] = useState('');

    // Skills related state
    const [isSkillsOpen, setIsSkillsOpen] = useState(false);
    const [skillSearch, setSkillSearch] = useState('');

    // Location related state
    const [isCityOpen, setIsCityOpen] = useState(false);
    const [selectedCity, setSelectedCity] = useState<City | null>(null);

    const [formData, setFormData] = useState<EditJobFormData>({
        role_title: "",
        description: "",
        skills: {},
        requirements: "",
        salary_min: 0,
        salary_max: 0,
        location: "",
        employment_type: "full_time",
        experience_level: "entry",
        is_active: true,
        difficulty: "medium",
        openings: 1,
        duration: "",
        perks: "",
        responsibilities: "",
        accuracy_threshold: 70,
    });

    const {
        register,
        handleSubmit,
        setValue,
        watch,
        reset,
        formState: { errors }
    } = useForm<EditJobFormData>();

    const watchedEmploymentType = watch('employment_type');

    // Filter skills based on search
    const filteredSkills = Object.entries(skillsData as Record<string, string[]>).reduce((acc, [category, skills]) => {
        const matchingSkills = skills.filter(skill =>
            skill.toLowerCase().includes(skillSearch.toLowerCase()) &&
            !Object.values(formData.skills).includes(skill)
        );
        if (matchingSkills.length > 0) {
            acc.push(...matchingSkills);
        }
        return acc;
    }, [] as string[]);

    useEffect(() => {
        if (isOpen && jobId) {
            fetchJobData();
        }
    }, [isOpen, jobId]);

    useEffect(() => {
        if (!isOpen) {
            reset();
            setFormData({
                role_title: "",
                description: "",
                skills: {},
                requirements: "",
                salary_min: 0,
                salary_max: 0,
                location: "",
                employment_type: "full_time",
                experience_level: "entry",
                is_active: true,
                difficulty: "medium",
                openings: 1,
                duration: "",
                perks: "",
                responsibilities: "",
                accuracy_threshold: 70,
            });
            setCurrentSkill('');
            setSelectedCity(null);
            setSkillSearch('');
        }
    }, [isOpen, reset]);

    const fetchJobData = async () => {
        try {
            setLoading(true);
            const response = await AxiosInstances.get(`/jobs/${jobId}`);
            const jobData = response.data;

            // Set form data
            const updatedFormData = {
                role_title: jobData.role_title || '',
                description: jobData.description || '',
                skills: jobData.skills || {},
                requirements: jobData.requirements?.description || '',
                salary_min: jobData.salary_min || 0,
                salary_max: jobData.salary_max || 0,
                location: jobData.location || '',
                employment_type: jobData.employment_type || 'full_time',
                experience_level: jobData.experience_level || 'entry',
                is_active: jobData.is_active ?? true,
                difficulty: jobData.difficulty || 'medium',
                openings: jobData.openings || 1,
                duration: jobData.duration || '',
                perks: jobData.perks || '',
                responsibilities: jobData.responsibilities || '',
                accuracy_threshold: jobData.accuracy_threshold || 70,
            };

            setFormData(updatedFormData);

            // Set form values for react-hook-form
            Object.entries(updatedFormData).forEach(([key, value]) => {
                setValue(key as keyof EditJobFormData, value);
            });

            // Set selected city if location matches
            if (jobData.location) {
                const matchingCity = (citiesData as City[]).find(city =>
                    `${city.name}, ${city.state}` === jobData.location ||
                    city.name === jobData.location
                );
                if (matchingCity) {
                    setSelectedCity(matchingCity);
                }
            }
        } catch (error) {
            console.error('Error fetching job data:', error);
            toast.error('Failed to load job data');
            onClose();
        } finally {
            setLoading(false);
        }
    };

    // Skills management functions
    const handleSkillSelect = (skill: string) => {
        const newSkills = { ...formData.skills };
        const nextIndex = Object.keys(newSkills).length + 1;
        newSkills[`skill_${nextIndex}`] = skill;

        setFormData(prev => ({ ...prev, skills: newSkills }));
        setValue('skills', newSkills);
        setIsSkillsOpen(false);
        setSkillSearch('');
    };

    const handleAddCustomSkill = () => {
        if (skillSearch.trim() && !Object.values(formData.skills).includes(skillSearch.trim())) {
            const newSkills = { ...formData.skills };
            const nextIndex = Object.keys(newSkills).length + 1;
            newSkills[`skill_${nextIndex}`] = skillSearch.trim();

            setFormData(prev => ({ ...prev, skills: newSkills }));
            setValue('skills', newSkills);
            setSkillSearch('');
            setIsSkillsOpen(false);
        }
    };

    const addSkill = () => {
        if (currentSkill.trim() && !Object.values(formData.skills).includes(currentSkill.trim())) {
            const newSkills = { ...formData.skills };
            const nextIndex = Object.keys(newSkills).length + 1;
            newSkills[`skill_${nextIndex}`] = currentSkill.trim();

            setFormData(prev => ({ ...prev, skills: newSkills }));
            setValue('skills', newSkills);
            setCurrentSkill('');
        }
    };

    const removeSkill = (skillToRemove: string) => {
        const newSkills = { ...formData.skills };
        const keyToRemove = Object.keys(newSkills).find(key => newSkills[key] === skillToRemove);
        if (keyToRemove) {
            delete newSkills[keyToRemove];

            // Reindex skills to maintain sequential numbering
            const skillValues = Object.values(newSkills);
            const reindexedSkills: Record<string, string> = {};
            skillValues.forEach((skill, index) => {
                reindexedSkills[`skill_${index + 1}`] = skill;
            });

            setFormData(prev => ({ ...prev, skills: reindexedSkills }));
            setValue('skills', reindexedSkills);
        }
    };

    // Location management functions
    const handleCitySelect = (city: City) => {
        setSelectedCity(city);
        const locationString = `${city.name}, ${city.state}`;
        setFormData(prev => ({ ...prev, location: locationString }));
        setValue('location', locationString);
        setIsCityOpen(false);
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            addSkill();
        }
    };

    const onSubmit = async (data: EditJobFormData) => {
        try {
            setSubmitting(true);

            const payload = {
                role_title: data.role_title,
                description: data.description,
                skills: formData.skills,
                requirements: { description: data.requirements },
                accuracy_threshold: data.accuracy_threshold,
                salary_min: data.salary_min,
                salary_max: data.salary_max,
                location: formData.location,
                employment_type: data.employment_type,
                experience_level: data.experience_level,
                is_active: data.is_active,
                difficulty: data.difficulty,
                openings: data.openings,
                duration: data.duration,
                perks: data.perks,
                responsibilities: data.responsibilities,
            };

            const response = await AxiosInstances.put(`/jobs/${jobId}`, payload);

            if (response.status === 200) {
                toast.success('Job updated successfully! 🎉');
                onJobUpdated?.();
                onClose();
            }
        } catch (error) {
            console.error('Error updating job:', error);
            toast.error('Failed to update job. Please try again.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="min-w-xl lg:min-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="text-2xl font-bold">Edit Job</DialogTitle>
                    <DialogDescription>
                        Update the job details below. All fields are required unless marked optional.
                    </DialogDescription>
                </DialogHeader>

                {loading ? (
                    <div className="flex items-center justify-center py-12">
                        <IconLoader2 className="h-8 w-8 animate-spin text-blue-500" />
                        <span className="ml-2 text-gray-600">Loading job data...</span>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                        {/* Basic Information */}
                        <div className="space-y-4">
                            <h3 className="text-lg font-semibold text-gray-900">Basic Information</h3>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="role_title">Job Title *</Label>
                                    <Input
                                        id="role_title"
                                        {...register('role_title', { required: 'Job title is required' })}
                                        placeholder="e.g. Senior Frontend Developer"
                                    />
                                    {errors.role_title && (
                                        <p className="text-sm text-red-600">{errors.role_title.message}</p>
                                    )}
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="openings">Number of Openings *</Label>
                                    <Input
                                        id="openings"
                                        type="number"
                                        min="1"
                                        {...register('openings', {
                                            required: 'Number of openings is required',
                                            min: { value: 1, message: 'Must be at least 1' }
                                        })}
                                    />
                                    {errors.openings && (
                                        <p className="text-sm text-red-600">{errors.openings.message}</p>
                                    )}
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="description">Job Description *</Label>
                                <Textarea
                                    id="description"
                                    {...register('description', { required: 'Job description is required' })}
                                    placeholder="Provide a comprehensive description of the role..."
                                    className="h-32 resize-none"
                                />
                                {errors.description && (
                                    <p className="text-sm text-red-600">{errors.description.message}</p>
                                )}
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="space-y-2">
                                    <Label>Employment Type *</Label>
                                    <Select
                                        value={watchedEmploymentType}
                                        onValueChange={(value) => setValue('employment_type', value as EmploymentType)}
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="full_time">Full Time</SelectItem>
                                            <SelectItem value="part_time">Part Time</SelectItem>
                                            <SelectItem value="contract">Contract</SelectItem>
                                            <SelectItem value="internship">Internship</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <Label>Experience Level *</Label>
                                    <Select
                                        value={watch('experience_level')}
                                        onValueChange={(value) => setValue('experience_level', value as ExperienceLevel)}
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="entry">Entry Level</SelectItem>
                                            <SelectItem value="mid">Mid Level</SelectItem>
                                            <SelectItem value="senior">Senior Level</SelectItem>
                                            <SelectItem value="lead">Lead Level</SelectItem>
                                            <SelectItem value="executive">Executive</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                {watchedEmploymentType !== 'full_time' && (
                                    <div className="space-y-2">
                                        <Label htmlFor="duration">Duration *</Label>
                                        <Input
                                            id="duration"
                                            {...register('duration', {
                                                required: watchedEmploymentType === 'part_time' || watchedEmploymentType === 'contract' || watchedEmploymentType === 'internship' ? 'Duration is required for non-full-time positions' : false
                                            })}
                                            placeholder="e.g. 6 months"
                                        />
                                        {errors.duration && (
                                            <p className="text-sm text-red-600">{errors.duration.message}</p>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Location & Compensation */}
                        <div className="space-y-4">
                            <h3 className="text-lg font-semibold text-gray-900">Location & Compensation</h3>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="space-y-2">
                                    <Label>Location *</Label>
                                    <Popover open={isCityOpen} onOpenChange={setIsCityOpen}>
                                        <PopoverTrigger asChild>
                                            <button
                                                type="button"
                                                className={`w-full flex items-center justify-between px-3 py-2 text-left border rounded-md bg-white hover:bg-gray-50 ${errors.location ? 'border-red-500' : 'border-gray-300'}`}
                                            >
                                                <span className={selectedCity ? 'text-gray-900' : 'text-gray-500'}>
                                                    {selectedCity ? `${selectedCity.name}, ${selectedCity.state}` : formData.location || 'Select a city...'}
                                                </span>
                                                <ChevronDown className="h-4 w-4 text-gray-400" />
                                            </button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-80 max-h-80 p-0" align="start">
                                            <Command>
                                                <div className="flex items-center border-b px-3">
                                                    <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                                                    <CommandInput
                                                        placeholder="Search cities..."
                                                        className="flex h-10 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
                                                    />
                                                </div>
                                                <CommandEmpty>No city found.</CommandEmpty>
                                                <div className="max-h-60">
                                                    <CommandList>
                                                        <CommandGroup>
                                                            {(citiesData as City[]).map((city) => (
                                                                <CommandItem
                                                                    key={city.id}
                                                                    value={city.name}
                                                                    onSelect={() => handleCitySelect(city)}
                                                                    className="cursor-pointer"
                                                                >
                                                                    <div className="flex flex-col">
                                                                        <span className="font-medium">{city.name}</span>
                                                                        <span className="text-sm text-gray-500">{city.state}</span>
                                                                    </div>
                                                                </CommandItem>
                                                            ))}
                                                        </CommandGroup>
                                                    </CommandList>
                                                </div>
                                            </Command>
                                        </PopoverContent>
                                    </Popover>
                                    {errors.location && (
                                        <p className="text-sm text-red-600">{errors.location.message}</p>
                                    )}
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="salary_min">Minimum Salary</Label>
                                    <Input
                                        id="salary_min"
                                        type="number"
                                        min="0"
                                        {...register('salary_min', { valueAsNumber: true })}
                                        placeholder="50000"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="salary_max">Maximum Salary</Label>
                                    <Input
                                        id="salary_max"
                                        type="number"
                                        min="0"
                                        {...register('salary_max', { valueAsNumber: true })}
                                        placeholder="100000"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Skills & Requirements */}
                        <div className="space-y-4">
                            <h3 className="text-lg font-semibold text-gray-900">Skills & Requirements</h3>

                            <div className="space-y-2">
                                <Label>Required Skills *</Label>
                                <div className="flex gap-2">
                                    <Popover open={isSkillsOpen} onOpenChange={setIsSkillsOpen}>
                                        <PopoverTrigger asChild>
                                            <button
                                                type="button"
                                                className="flex-1 flex items-center justify-between px-3 py-2 text-left border rounded-md bg-white hover:bg-gray-50 border-gray-300"
                                            >
                                                <span className="text-gray-500">Search and select skills...</span>
                                                <ChevronDown className="h-4 w-4 text-gray-400" />
                                            </button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-80 max-h-80 p-0" align="start">
                                            <Command shouldFilter={false}>
                                                <div className="flex items-center border-b px-3">
                                                    <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                                                    <input
                                                        placeholder="Search skills or type custom skill..."
                                                        value={skillSearch}
                                                        onChange={(e) => setSkillSearch(e.target.value)}
                                                        className="flex h-10 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
                                                    />
                                                </div>
                                                <div className="max-h-60 ">
                                                    <CommandList>
                                                        {skillSearch.trim() && !filteredSkills.includes(skillSearch.trim()) && !Object.values(formData.skills).includes(skillSearch.trim()) && (
                                                            <CommandGroup>
                                                                <CommandItem
                                                                    onSelect={handleAddCustomSkill}
                                                                    className="cursor-pointer bg-blue-50 border-b"
                                                                >
                                                                    <Plus className="mr-2 h-4 w-4 text-blue-600" />
                                                                    <span className="text-blue-600 font-medium">Add &quot;{skillSearch.trim()}&quot; as custom skill</span>
                                                                </CommandItem>
                                                            </CommandGroup>
                                                        )}

                                                        {filteredSkills.length > 0 ? (
                                                            Object.entries(skillsData as Record<string, string[]>).map(([category, skills]) => {
                                                                const categorySkills = skills.filter(skill =>
                                                                    skill.toLowerCase().includes(skillSearch.toLowerCase()) &&
                                                                    !Object.values(formData.skills).includes(skill)
                                                                )

                                                                if (categorySkills.length === 0) return null

                                                                return (
                                                                    <CommandGroup key={category} heading={category}>
                                                                        {categorySkills.map((skill) => (
                                                                            <CommandItem
                                                                                key={skill}
                                                                                onSelect={() => handleSkillSelect(skill)}
                                                                                className="cursor-pointer"
                                                                            >
                                                                                {skill}
                                                                            </CommandItem>
                                                                        ))}
                                                                    </CommandGroup>
                                                                )
                                                            })
                                                        ) : skillSearch.trim() ? (
                                                            <CommandEmpty>No skills found.</CommandEmpty>
                                                        ) : (
                                                            <div className="p-4 text-sm text-gray-500 text-center">
                                                                Start typing to search for skills...
                                                            </div>
                                                        )}
                                                    </CommandList>
                                                </div>
                                            </Command>
                                        </PopoverContent>
                                    </Popover>

                                    <Input
                                        value={currentSkill}
                                        onChange={(e) => setCurrentSkill(e.target.value)}
                                        onKeyPress={handleKeyPress}
                                        placeholder="Or type here and press Enter"
                                        className="flex-1"
                                    />
                                    <Button
                                        type="button"
                                        onClick={addSkill}
                                        variant="outline"
                                        size="icon"
                                    >
                                        <IconPlus className="h-4 w-4" />
                                    </Button>
                                </div>
                                <div className="flex flex-wrap gap-2 mt-3">
                                    {Object.values(formData.skills).map((skill, index) => (
                                        <Badge
                                            key={index}
                                            variant="secondary"
                                            className="bg-purple-100 text-purple-800 hover:bg-purple-200"
                                        >
                                            {skill}
                                            <button
                                                type="button"
                                                onClick={() => removeSkill(skill)}
                                                className="ml-2 hover:text-red-600"
                                            >
                                                <IconX className="h-3 w-3" />
                                            </button>
                                        </Badge>
                                    ))}
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="requirements">Requirements</Label>
                                    <Textarea
                                        id="requirements"
                                        {...register('requirements')}
                                        placeholder="• Bachelor's degree in Computer Science&#10;• 3+ years of experience"
                                        className="h-32 resize-none"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="responsibilities">Key Responsibilities</Label>
                                    <Textarea
                                        id="responsibilities"
                                        {...register('responsibilities')}
                                        placeholder="• Develop and maintain web applications&#10;• Collaborate with teams"
                                        className="h-32 resize-none"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="perks">Perks & Benefits</Label>
                                <Textarea
                                    id="perks"
                                    {...register('perks')}
                                    placeholder="• Health insurance&#10;• Flexible working hours"
                                    className="h-24 resize-none"
                                />
                            </div>
                        </div>

                        {/* AI Settings */}
                        <div className="space-y-4">
                            <h3 className="text-lg font-semibold text-gray-900">AI Settings</h3>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="accuracy_threshold">
                                        Accuracy Threshold ({watch('accuracy_threshold')}%)
                                    </Label>
                                    <input
                                        type="range"
                                        min="50"
                                        max="100"
                                        {...register('accuracy_threshold', { valueAsNumber: true })}
                                        className="w-full h-2 bg-orange-200 rounded-lg appearance-none cursor-pointer"
                                    />
                                    <div className="flex justify-between text-xs text-gray-500">
                                        <span>Less Strict (50%)</span>
                                        <span>More Strict (100%)</span>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label>Difficulty Level</Label>
                                    <Select
                                        value={watch('difficulty')}
                                        onValueChange={(value) => setValue('difficulty', value as DifficultyLevel)}
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="easy">Easy</SelectItem>
                                            <SelectItem value="medium">Medium</SelectItem>
                                            <SelectItem value="hard">Hard</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label className="flex items-center space-x-2">
                                    <input
                                        type="checkbox"
                                        {...register('is_active')}
                                        className="rounded"
                                    />
                                    <span>Job is Active</span>
                                </Label>
                            </div>
                        </div>

                        {/* Submit Buttons */}
                        <div className="flex justify-end space-x-3 pt-6 border-t">
                            <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={submitting} className="bg-blue-600 hover:bg-blue-700">
                                {submitting ? (
                                    <>
                                        <IconLoader2 className="h-4 w-4 animate-spin mr-2" />
                                        Updating...
                                    </>
                                ) : (
                                    'Update Job'
                                )}
                            </Button>
                        </div>
                    </form>
                )}
            </DialogContent>
        </Dialog>
    );
};

export default EditJob;