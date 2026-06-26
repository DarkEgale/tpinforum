import api from './axios';

export const getUsers = async (params = {}) => {
    const response = await api.get('/users', { params });
    return response.data;
};

export const getUser = async (userId) => {
    const response = await api.get(`/users/${userId}`);
    return response.data;
};

export const createTeacher = async (teacherData) => {
    const response = await api.post('/admin/teachers', teacherData);
    return response.data;
};

export const updateUserStatus = async (userId, status) => {
    const response = await api.put(`/admin/users/${userId}/status`, { status });
    return response.data;
};

export const updateUserRole = async (userId, role) => {
    const response = await api.put(`/admin/users/${userId}/role`, { role });
    return response.data;
};

export const deleteUser = async (userId) => {
    const response = await api.delete(`/admin/users/${userId}`);
    return response.data;
};

export const getAnalytics = async () => {
    const response = await api.get('/admin/analytics');
    return response.data;
};

export const updateProfile = async (profileData) => {
    const response = await api.put('/auth/profile', profileData);
    return response.data;
};

export const changePassword = async (passwordData) => {
    const response = await api.put('/auth/change-password', passwordData);
    return response.data;
};

export const getNotices = async (params = {}) => {
    const response = await api.get('/notices', { params });
    return response.data;
};

export const createNotice = async (noticeData) => {
    const response = await api.post('/notices', noticeData);
    return response.data;
};

export const updateNotice = async (noticeId, noticeData) => {
    const response = await api.put(`/notices/${noticeId}`, noticeData);
    return response.data;
};

export const deleteNotice = async (noticeId) => {
    const response = await api.delete(`/notices/${noticeId}`);
    return response.data;
};

export const getResults = async (params = {}) => {
    const response = await api.get('/results', { params });
    return response.data;
};

export const searchResults = async (params = {}) => {
    const response = await api.get('/results/search', { params });
    return response.data;
};

export const createResult = async (resultData) => {
    const response = await api.post('/results', resultData);
    return response.data;
};

export const updateResult = async (resultId, resultData) => {
    const response = await api.put(`/results/${resultId}`, resultData);
    return response.data;
};

export const deleteResult = async (resultId) => {
    const response = await api.delete(`/results/${resultId}`);
    return response.data;
};

export const getChatHistory = async (roomId) => {
    const response = await api.get(`/chats/${roomId}`);
    return response.data;
};

export const markChatSeen = async (roomId) => {
    const response = await api.post(`/chats/${roomId}/seen`);
    return response.data;
};
