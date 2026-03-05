import axios from 'axios';

const api = axios.create({
    baseURL: 'https://ourselves-ciao-rely-love.trycloudflare.com/api',
    headers: {
        'Content-Type': 'application/json',
    },
});

// Request interceptor to add the token to the header
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('vendor_token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Response interceptor for error handling
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            // Handle unauthorized (e.g., redirect to login)
            localStorage.removeItem('vendor_token');
            localStorage.removeItem('vendor_user');
            window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);

export default api;
