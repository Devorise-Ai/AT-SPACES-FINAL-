import api from './api';

export interface LoginResponse {
    token: string;
    user: {
        id: number;
        email: string;
        role: string;
        status: string;
    };
}

export const authService = {
    login: async (credentials: { email: string; password: string }) => {
        const response = await api.post<LoginResponse>('/auth/login', credentials);
        return response.data;
    },
};
