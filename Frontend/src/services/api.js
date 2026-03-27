import axios from 'axios';

const apiBaseUrl =
    import.meta.env.VITE_API_BASE_URL ||
    (import.meta.env.DEV ? 'http://localhost:5005/api' : '/api');

const api = axios.create({
    baseURL: apiBaseUrl
});

// Request interceptor to add JWT token
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Response interceptor to handle errors
api.interceptors.response.use(
    (response) => response,
    (error) => {
        const status = error.response?.status;
        const requestUrl = error.config?.url || '';
        const isAuthLoginRequest = requestUrl.includes('/auth/login');

        if (status === 401 && !isAuthLoginRequest) {
            console.warn('🔌 Session expired or unauthorized. Redirecting to login...');
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            // Redirect to login (native redirect to avoid complex router logic here)
            if (window.location.pathname !== '/login') {
                window.location.href = '/login';
            }
        }
        return Promise.reject(error);
    }
);

export default api;
