/* eslint-disable @typescript-eslint/no-explicit-any */
/* components/AuthWrapper.tsx */
"use client";
import { createContext, useContext, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { TokenManager } from "@/utils/tokenManager";
import { AuthSidebar } from "@/components/AuthSidebar";

interface AuthWrapperProps {
  children: React.ReactNode;
  requireAuth?: boolean;      // default: true
  redirectTo?: string;        // default: "/login"
  showSidebar?: boolean;      // default: true for protected pages
}

interface UserData {
  id: string;
  name: string;
  email: string;
  role?: string;
}

interface AuthContextType {
  isAuthenticated: boolean;
  userData: UserData | null;
  isLoading: boolean;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthWrapper = ({
  children,
  requireAuth = true,
  redirectTo = "/login",
  showSidebar = true,
}: AuthWrapperProps) => {
  const router = useRouter();
  const pathname = usePathname();
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userData, setUserData] = useState<UserData | null>(null);

  const logout = () => {
    TokenManager.clearAuthData();
    setIsAuthenticated(false);
    setUserData(null);
    router.replace('/login');
  };

  useEffect(() => {
    // 1️⃣ read token once per path change
    const authenticated = TokenManager.isAuthenticated();
    const user = TokenManager.getUserData();

    setIsAuthenticated(authenticated);
    setUserData(user);

    // 2️⃣ redirect if page *requires* auth but user is not logged in
    if (requireAuth && !authenticated) {
      router.replace(redirectTo);
      return;
    }

    // 3️⃣ redirect away from /login or /register when already logged in
    if (
      authenticated &&
      (pathname === "/login" || pathname === "/register")
    ) {
      router.replace("/dashboard");
      return;
    }

    // 4️⃣ finished checking
    setIsLoading(false);
  }, [pathname, requireAuth, redirectTo, router]);

  /* ─────────────────────────── render ─────────────────────────── */

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (requireAuth && !isAuthenticated) {
    // we already redirected, but avoid flashing children
    return null;
  }

  const authContextValue = {
    isAuthenticated,
    userData,
    isLoading,
    logout,
  };

  // Render with or without sidebar based on props
  if (requireAuth && showSidebar && isAuthenticated) {
    return (
      <AuthContext.Provider value={authContextValue}>
        <AuthSidebar>
          {children}
        </AuthSidebar>
      </AuthContext.Provider>
    );
  }

  // Render without sidebar (for login/register/public pages)
  return (
    <AuthContext.Provider value={authContextValue}>
      {children}
    </AuthContext.Provider>
  );
};

/* Convenience hook */
export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthWrapper");
  return ctx;
};

/* Higher-order wrapper for pages */
export const withAuth = (
  Component: React.ComponentType<any>,
  options: { 
    requireAuth?: boolean; 
    redirectTo?: string; 
    showSidebar?: boolean;
  } = {}
) => {
  const Protected = (props: any) => (
    <AuthWrapper
      requireAuth={options.requireAuth ?? true}
      redirectTo={options.redirectTo ?? "/login"}
      showSidebar={options.showSidebar ?? true}
    >
      <Component {...props} />
    </AuthWrapper>
  );
  Protected.displayName = `withAuth(${Component.displayName || Component.name})`;
  return Protected;
};