import api from './api';

export const vendorService = {
    getOverview: async () => {
        const response = await api.get('/vendor/overview');
        return response.data;
    },

    getServices: async () => {
        const response = await api.get('/vendor/services');
        return response.data;
    },

    requestCapacityChange: async (data: { branchId: number; serviceId: number; proposedCapacity: number; reason: string }) => {
        const response = await api.post('/vendor/capacity-request', data);
        return response.data;
    },

    updatePricing: async (vendorServiceId: number, data: any) => {
        const response = await api.patch(`/vendor/pricing/${vendorServiceId}`, data);
        return response.data;
    },

    getFacilities: async () => {
        const response = await api.get('/vendor/facilities');
        return response.data;
    },

    updateFacility: async (id: number, data: any) => {
        const response = await api.patch(`/vendor/facilities/${id}`, data);
        return response.data;
    },

    getBookings: async (params?: { status?: string }) => {
        const response = await api.get('/vendor/bookings', { params });
        return response.data;
    },

    getBookingById: async (id: number) => {
        const response = await api.get(`/vendor/bookings/${id}`);
        return response.data;
    },

    updateBookingStatus: async (id: number, status: string) => {
        const response = await api.patch(`/vendor/bookings/${id}/status`, { status });
        return response.data;
    },

    getReportsOverview: async () => {
        const response = await api.get('/vendor/reports/overview');
        return response.data;
    },

    getProfile: async () => {
        const response = await api.get('/vendor/profile');
        return response.data;
    },

    updateProfile: async (data: any) => {
        const response = await api.put('/vendor/profile', data);
        return response.data;
    }
};
