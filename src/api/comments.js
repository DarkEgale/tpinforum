import api from './axios';

export const createComment = async (commentData) => {
    const response = await api.post('/comments', commentData);
    return response.data;
};

export const getComments = async (postId) => {
    const response = await api.get(`/comments?postId=${postId}`);
    return response.data;
};

export const deleteComment = async (commentId) => {
    const response = await api.delete(`/comments/${commentId}`);
    return response.data;
};
