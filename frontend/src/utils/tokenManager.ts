/* eslint-disable @typescript-eslint/no-empty-object-type */
// utils/tokenManager.ts
import Cookies from 'js-cookie';

interface UserData {
    id: string;
    name: string;
    email: string;
    role?: string;
}

interface AuthData {
    access_token: string;
    expires_in: number;
    token_type: string;
    user_data: UserData;
    user_type: string;
}

export const TokenManager = {
    // Store authentication data
    setAuthData: (authData: AuthData) => {
        // Calculate expiration date
        const expirationDate = new Date();
        expirationDate.setSeconds(expirationDate.getSeconds() + authData.expires_in);

        // Store token in httpOnly-like cookie (secure for production)
        Cookies.set('access_token', authData.access_token, {
            expires: expirationDate,
            secure: process.env.NODE_ENV === 'production', // Only HTTPS in production
            sameSite: 'strict',
            path: '/'
        });

        // Store user data in a separate cookie (not sensitive)
        Cookies.set('user_data', JSON.stringify(authData.user_data), {
            expires: expirationDate,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            path: '/'
        });

        // Store user type
        Cookies.set('user_type', authData.user_type, {
            expires: expirationDate,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            path: '/'
        });
    },

    // Get access token
    getAccessToken: (): string | null => {
        return Cookies.get('access_token') || null;
    },

    // Get user data
    getUserData: (): UserData | null => {
        const userData = Cookies.get('user_data');
        if (!userData) return null;

        try {
            return JSON.parse(userData);
        } catch {
            return null;
        }
    },

    // Get user type
    getUserType: (): string | null => {
        return Cookies.get('user_type') || null;
    },

    // Check if user is authenticated
    isAuthenticated: (): boolean => {
        return !!TokenManager.getAccessToken();
    },

    // Clear all auth data (logout)
    clearAuthData: () => {
        Cookies.remove('access_token', { path: '/' });
        Cookies.remove('user_data', { path: '/' });
        Cookies.remove('user_type', { path: '/' });
    },

    // In tokenManager.ts, update this method:
    getAuthHeader: (): Record<string, string> => {
        const token = TokenManager.getAccessToken();
        return token ? { Authorization: `Bearer ${token}` } : {};
    }
};