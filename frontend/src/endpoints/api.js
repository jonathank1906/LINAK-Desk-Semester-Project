import axios from 'axios';

const BASE_URL = 'http://localhost:8000/api/'

const LOGIN_URL = `${BASE_URL}login/`
const REGISTER_URL = `${BASE_URL}register/`
const LOGOUT_URL = `${BASE_URL}logout/`
const NOTES_URL = `${BASE_URL}todos/`
const AUTHENTICATED_URL = `${BASE_URL}authenticated/`
const REFRESH_URL = `${BASE_URL}token/refresh/`

axios.defaults.withCredentials = true;

// Track refresh state
let isRefreshing = false;
let failedQueue = [];

// Process queued requests after refresh
const processQueue = (error, token = null) => {
    failedQueue.forEach(prom => {
        if (error) {
            prom.reject(error);
        } else {
            prom.resolve(token);
        }
    });
    failedQueue = [];
};

// Setup axios interceptor for automatic token refresh
axios.interceptors.response.use(
    response => response,
    async error => {
        const originalRequest = error.config;
        
        // Check if error is 401 and we haven't already tried to refresh
        if (error.response?.status === 401 && !originalRequest._retry) {
            
            if (isRefreshing) {
                // Already refreshing, queue this request
                return new Promise((resolve, reject) => {
                    failedQueue.push({ resolve, reject });
                }).then(() => {
                    return axios(originalRequest);
                }).catch(err => {
                    return Promise.reject(err);
                });
            }

            originalRequest._retry = true;
            isRefreshing = true;

            try {
                // Attempt to refresh the access token
                await axios.post(REFRESH_URL, {}, { withCredentials: true });
                
                // Refresh successful, process queued requests
                processQueue(null);
                
                // Retry the original request
                return axios(originalRequest);
            } catch (refreshError) {
                // Refresh failed - clear queue and reject
                processQueue(refreshError);
                
                // Optional: Clear user state and redirect to login
                // This could trigger a global event or callback
                console.error('Token refresh failed:', refreshError);
                
                return Promise.reject(refreshError);
            } finally {
                isRefreshing = false;
            }
        }
        
        return Promise.reject(error);
    }
);

// Proactive token refresh - call this periodically
let refreshInterval = null;

export const startTokenRefresh = () => {
    // Refresh token every 45 seconds (before 1-minute expiry)
    if (refreshInterval) {
        clearInterval(refreshInterval);
    }
    
    refreshInterval = setInterval(async () => {
        try {
            await axios.post(REFRESH_URL, {}, { withCredentials: true });
            console.log('Token refreshed proactively');
        } catch (error) {
            console.error('Proactive token refresh failed:', error);
            // If proactive refresh fails, stop trying and let the interceptor handle it
            stopTokenRefresh();
        }
    }, 45000); // 45 seconds
};

export const stopTokenRefresh = () => {
    if (refreshInterval) {
        clearInterval(refreshInterval);
        refreshInterval = null;
    }
};

export const login = async (email, password) => {
    try {
        const response = await axios.post(
            LOGIN_URL, 
            { email, password },
            { withCredentials: true }
        );
        
        // Start proactive token refresh after successful login
        startTokenRefresh();
        
        return response.data;
    } catch (error) {
        console.error("Login failed:", error);
        return { success: false };
    }
};

export const get_notes = async () => {
    const response = await axios.get(NOTES_URL, { withCredentials: true });
    return response.data;
};

export const logout = async () => {
    // Stop token refresh on logout
    stopTokenRefresh();
    
    try {
        const response = await axios.post(LOGOUT_URL, {}, { withCredentials: true });
        return response.data;
    } catch (error) {
        console.error("Logout failed:", error);
        return null;
    }
};

export const register = async (username, email, password) => {
    const response = await axios.post(REGISTER_URL, { username, email, password }, { withCredentials: true });
    return response.data;
};

export const authenticated_user = async () => {
    const response = await axios.get(AUTHENTICATED_URL, { withCredentials: true });
    return response.data;
};