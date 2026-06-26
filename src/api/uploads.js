import api from './axios';

export const uploadToCloud = async (file) => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await api.post('/uploads/cloud', formData);
    return response.data;
};
