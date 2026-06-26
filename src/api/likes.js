import api from './axios';

export const toggleLike = async (postId, userId) => {
    const response = await api.post('/likes/toggle', { postId, userId });
    return response.data;
};

export const getLike = async (postId, userId) => {
    const response = await api.get(`/likes/check?postId=${postId}&userId=${userId}`);
    return response.data;
};

export const getLikesCount = async (postId) => {
    const response = await api.get(`/likes/count?postId=${postId}`);
    return response.data;
};