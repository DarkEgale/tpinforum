import api from './axios';

export const createPost = async (postData) => {
    const response = await api.post('/create-post', postData);
    return response.data;
};

export const getPosts = async (params = {}) => {
    const response = await api.get('/posts', { params });
    return response.data;
};

export const getPost = async (postId) => {
    const response = await api.get(`/posts/${postId}`);
    return response.data;
};

export const updatePost = async (postId, postData) => {
    const response = await api.put(`/posts/${postId}`, postData);
    return response.data;
};

export const deletePost = async (postId) => {
    const response = await api.delete(`/posts/${postId}`);
    return response.data;
};

export const sharePost = async (postId) => {
    const response = await api.post(`/posts/${postId}/share`);
    return response.data;
};

export const savePost = async (postId) => {
    const response = await api.post(`/posts/${postId}/save`);
    return response.data;
};
