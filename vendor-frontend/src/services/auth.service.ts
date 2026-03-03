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
    login: async (credentials: { email?: string; phoneNumber?: string; password?: string }) => {
        const response = await api.post<LoginResponse>('/auth/login', credentials);
        return response.data;
    },

    register: async (data: any) => {
        const response = await api.post('/auth/register', { ...data, role: 'VENDOR' });
        return response.data;
    },

    verifyOtp: async (phoneNumber: string, otpCode: string) => {
        const response = await api.post<LoginResponse>('/auth/verify-otp', { phoneNumber, otpCode });
        return response.data;
    }
};
