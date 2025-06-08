/* eslint-disable @typescript-eslint/no-explicit-any */
import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { TokenManager } from '@/utils/tokenManager';

class AxiosService {
  private axiosInstance: AxiosInstance;

  constructor(baseURL: string) {
    this.axiosInstance = axios.create({
      baseURL,
    });

    // REQUEST INTERCEPTOR: Automatically add auth headers to every request
    this.axiosInstance.interceptors.request.use(
      (config) => {
        // Get the Bearer token from cookies and add to headers
        const authHeaders = TokenManager.getAuthHeader();

        // Properly merge headers using Object.assign or individual assignment
        Object.assign(config.headers, authHeaders);

        return config;
      },
      (error) => Promise.reject(error)
    );

    // RESPONSE INTERCEPTOR: Handle token expiration and errors
    this.axiosInstance.interceptors.response.use(
      (response: AxiosResponse) => response,
      (error) => {
        console.error('API error:', error);

        // If token is expired/invalid (401), clear auth data and redirect to login
        if (error.response?.status === 401) {
          TokenManager.clearAuthData();
          // Only redirect if we're in the browser
          if (typeof window !== 'undefined') {
            window.location.href = '/login';
          }
        }

        return Promise.reject(error);
      }
    );
  }

  public get<T = any>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.axiosInstance.get<T>(url, config);
  }

  public post<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.axiosInstance.post<T>(url, data, config);
  }

  public put<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.axiosInstance.put<T>(url, data, config);
  }

  public delete<T = any>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.axiosInstance.delete<T>(url, config);
  }
}

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';

const AxiosInstances = new AxiosService(apiBaseUrl);

export default AxiosInstances;