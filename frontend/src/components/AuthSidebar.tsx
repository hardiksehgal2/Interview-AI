/* eslint-disable @typescript-eslint/no-unused-vars */
/* components/AuthSidebar.tsx */
"use client";
import React from "react";
import { usePathname, useRouter } from "next/navigation";
import {
    Sidebar,
    SidebarBody,
    SidebarLink
} from "@/components/ui/sidebar";
import {
    IconBriefcase,
    IconUsers,
    IconUser,
    IconLogout,
    IconDashboard
} from "@tabler/icons-react";
import { useAuth } from "@/hooks/useAuth";
import Image from "next/image";
interface AuthSidebarProps {
    children: React.ReactNode;
}

export const AuthSidebar = ({ children }: AuthSidebarProps) => {
    const pathname = usePathname();
    const router = useRouter();
    const { userData, logout } = useAuth();

    // Navigation items
    const navItems = [
        {
            label: "Dashboard",
            href: "/dashboard",
            icon: <IconDashboard className="text-neutral-700 dark:text-neutral-200 h-5 w-5 shrink-0" />,
        },
        {
            label: "Jobs",
            href: "/jobpost",
            icon: <IconBriefcase className="text-neutral-700 dark:text-neutral-200 h-5 w-5 shrink-0" />,
        },
        {
            label: "All Applicants",
            href: "#",
            icon: <IconUsers className="text-neutral-700 dark:text-neutral-200 h-5 w-5 shrink-0" />,
        },
        {
            label: "Profile",
            href: "#",
            icon: <IconUser className="text-neutral-700 dark:text-neutral-200 h-5 w-5 shrink-0" />,
        },
    ];

    const handleNavClick = (href: string, label: string) => {
        if (href === "#") {
            console.log(`Clicked on ${label} - Coming soon!`);
            // You can show a toast or modal here
            return;
        }
        router.push(href);
    };

    const handleLogout = () => {
        if (confirm("Are you sure you want to logout?")) {
            logout();
        }
    };

    return (
        <div className="h-screen flex flex-col md:flex-row bg-gray-100 dark:bg-neutral-900">
            <Sidebar animate={true}>
                <SidebarBody className="justify-between gap-10">
                    <div className="flex flex-col overflow-y-auto overflow-x-hidden">
                        {/* Logo */}
                        <div className=" mb-10 flex items-center">
                            <Image
                                src="/justhired_logo.png"
                                alt="JustHired Logo"
                                width={120}
                                height={40}
                                className="object-contain h-10 w-auto"
                                priority
                            />
                            <p>JustHired</p>
                        </div>

                        {/* Navigation Links */}
                        <div className="flex flex-col gap-2">
                            {navItems.map((item, idx) => (
                                <div
                                    key={idx}
                                    onClick={() => handleNavClick(item.href, item.label)}
                                    className="cursor-pointer"
                                >
                                    <SidebarLink
                                        link={{
                                            ...item,
                                            href: item.href === "#" ? pathname : item.href,
                                        }}
                                        className={`
                                            ${pathname === item.href
                                                ? "bg-neutral-200 dark:bg-neutral-700 rounded-md text-center"
                                                : "hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded-md"
                                            }
                                            ${item.href === "#"
                                                ? "opacity-70 hover:opacity-100"
                                                : ""
                                            }
                                        `}
                                    />
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Logout Button */}
                    <div
                        onClick={handleLogout}
                        className="cursor-pointer bg-red-200 rounded-lg"
                    >
                        <SidebarLink
                            link={{
                                label: "Logout",
                                href: "/login",
                                icon: <IconLogout className="text-black text-center h-5 w-5 shrink-0" />,
                            }}
                        />
                    </div>
                </SidebarBody>
            </Sidebar>

            {/* Main Content Area - Fixed for mobile */}
            <div className="flex-1 overflow-y-auto pt-16 md:pt-0">
                <main >
                    {children}
                </main>
            </div>
        </div>
    );
};