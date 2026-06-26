import api from './axios';

export const uploadToCloud = async (file, userField = '') => {
    const formData = new FormData();
    formData.append('file', file);
    if (userField) {
        formData.append('userField', userField);
    }

    const response = await api.post('/uploads/cloud', formData);
    return response.data;
};
