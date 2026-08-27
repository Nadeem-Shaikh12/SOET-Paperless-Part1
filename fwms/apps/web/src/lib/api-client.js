const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api/v1';


export class ApiError extends Error {

  constructor(message, code, statusCode, details) {
    super(message);
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
  }
}

let accessToken = null;
let isRefreshing = false;
let refreshSubscribers = [];

export function setAccessToken(token) {
  accessToken = token;
}

export function getAccessToken() {
  return accessToken;
}

function onRefreshed(token) {
  refreshSubscribers.forEach((callback) => callback(token));
  refreshSubscribers = [];
}

function addRefreshSubscriber(callback) {
  refreshSubscribers.push(callback);
}

export async function apiClient(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  
  const headers = new Headers(options.headers || {});
  headers.set('Content-Type', 'application/json');
  
  if (accessToken) {
    headers.set('Authorization', `Bearer ${accessToken}`);
  }

  // Include credentials for refresh token cookie
  const config = {
    ...options,
    headers,
    credentials: 'include',
  };

  const response = await fetch(url, config);

  // Handle 401 - Token Expiry
  if (response.status === 401) {
    const errorData = await response.json().catch(() => ({}));
    
    // If we're already trying to refresh (e.g. login endpoint or logout endpoint), don't intercept
    if (endpoint === '/auth/refresh' || endpoint === '/auth/login') {
      throw new ApiError(
        errorData?.error?.message || 'Unauthorized',
        errorData?.error?.code || 'UNAUTHORIZED',
        response.status,
        errorData?.error?.details
      );
    }

    if (!isRefreshing) {
      isRefreshing = true;
      try {
        const refreshResponse = await fetch(`${API_BASE_URL}/auth/refresh`, {
          method: 'POST',
          credentials: 'include',
        });

        if (!refreshResponse.ok) {
          throw new Error('Refresh failed');
        }

        const data = await refreshResponse.json();
        setAccessToken(data.accessToken);
        isRefreshing = false;
        onRefreshed(data.accessToken);
      } catch {
        isRefreshing = false;
        setAccessToken(null);
        // Force redirect to login could happen here or in the store
        if (typeof window !== 'undefined') {
          window.location.href = '/login?expired=true';
        }
        throw new ApiError('Session expired', 'SESSION_EXPIRED', 401);
      }
    }

    // Wait for the refresh to complete before retrying the original request
    return new Promise((resolve, reject) => {
      addRefreshSubscriber(async (newToken) => {
        headers.set('Authorization', `Bearer ${newToken}`);
        try {
          const retriedResponse = await fetch(url, config);
          if (!retriedResponse.ok) {
             const errorData = await retriedResponse.json().catch(() => ({}));
             reject(new ApiError(errorData?.error?.message || 'Error', errorData?.error?.code || 'ERROR', retriedResponse.status, errorData?.error?.details));
          } else {
             resolve(retriedResponse.json());
          }
        } catch (err) {
          reject(err);
        }
      });
    });
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new ApiError(
      errorData?.error?.message || 'An error occurred',
      errorData?.error?.code || 'UNKNOWN_ERROR',
      response.status,
      errorData?.error?.details
    );
  }

  // Some endpoints (like delete or logout) might return 200/204 with no JSON
  try {
    return await response.json();
  } catch {
    return {};
  }
}
