import axios from 'axios';

const api = axios.create({
    baseURL: '/api'
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
        const message = String(error.response?.data?.error || '').toLowerCase();
        const shouldResetSession =
            status === 401 ||
            (status === 403 && message.includes('inactive or disabled'));

        if (shouldResetSession) {
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
