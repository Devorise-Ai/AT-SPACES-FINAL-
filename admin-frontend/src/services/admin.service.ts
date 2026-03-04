import api from './api';

// =========================
// 1. DASHBOARD (Endpoint 1)
// =========================
export const getDashboardOverview = () =>
    api.get('/admin/overview').then(r => r.data);

// =========================
// 2-4. BRANCH MANAGEMENT (Endpoints 2, 3, 4)
// =========================
export const getBranches = (status?: string) =>
    api.get('/admin/branches', { params: status ? { status } : {} }).then(r => r.data);

export const getBranchDetails = (id: number) =>
    api.get(`/admin/branches/${id}`).then(r => r.data);

export const updateBranchStatus = (id: number, status: string) =>
    api.patch(`/admin/branches/${id}/status`, { status }).then(r => r.data);

// =========================
// 5-7. VENDOR MANAGEMENT (Endpoints 5, 6, 7)
// =========================
export const getVendors = (status?: string) =>
    api.get('/admin/vendors', { params: status ? { status } : {} }).then(r => r.data);

export const getVendorDetails = (id: number) =>
    api.get(`/admin/vendors/${id}`).then(r => r.data);

export const updateVendorStatus = (id: number, status: string) =>
    api.patch(`/admin/vendors/${id}/status`, { status }).then(r => r.data);

// =========================
// 8-10. APPROVAL REQUESTS (Endpoints 8, 9, 10)
// =========================
export const getPendingRequests = (params?: { type?: string; status?: string }) =>
    api.get('/admin/requests', { params }).then(r => r.data);

export const getRequestDetails = (id: number) =>
    api.get(`/admin/requests/${id}`).then(r => r.data);

export const reviewRequest = (id: number, decision: string, rejectionReason?: string) =>
    api.post(`/admin/requests/${id}/review`, { decision, rejectionReason }).then(r => r.data);

// =========================
// 11-15. ANALYTICS (Endpoints 11, 12, 13, 14, 15)
// =========================
export const getOccupancyAnalytics = () =>
    api.get('/admin/analytics/occupancy').then(r => r.data);

export const getServiceDistribution = () =>
    api.get('/admin/analytics/services').then(r => r.data);

export const getPerformanceIndicators = () =>
    api.get('/admin/analytics/performance').then(r => r.data);

export const getVendorPerformance = () =>
    api.get('/admin/analytics/vendors').then(r => r.data);

export const exportReport = (format: string, type?: string) =>
    api.get('/admin/reports/export', { params: { format, type } }).then(r => r.data);

// =========================
// 16-18. ADMIN PROFILE (Endpoints 16, 17, 18)
// =========================
export const getAdminProfile = () =>
    api.get('/admin/profile').then(r => r.data);

export const updateAdminProfile = (data: { email?: string; phoneNumber?: string; ownerName?: string }) =>
    api.put('/admin/profile', data).then(r => r.data);

export const updateAdminPassword = (data: { currentPassword: string; newPassword: string }) =>
    api.patch('/admin/profile/password', data).then(r => r.data);

// =========================
// 19-20. SECURITY (Endpoints 19, 20 — security logs + 2FA placeholder)
// =========================
export const getSecurityLogs = (limit?: number) =>
    api.get('/admin/security/logs', { params: limit ? { limit } : {} }).then(r => r.data);
