import api from './api.js';

export const getIssues = async (params = {}) => {
  const response = await api.get('/issues', { params });
  return response.data;
};

export const getNearbyIssues = async (params = {}) => {
  const response = await api.get('/issues/nearby', { params });
  return response.data;
};

export const getIssueById = async (id) => {
  const response = await api.get(`/issues/${id}`);
  return response.data;
};

export const createIssue = async (formData) => {
  const response = await api.post('/issues', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
  return response.data;
};

export const updateIssue = async (id, data) => {
  const response = await api.put(`/issues/${id}`, data);
  return response.data;
};

export const deleteIssue = async (id) => {
  const response = await api.delete(`/issues/${id}`);
  return response.data;
};

export const checkDuplicates = async (data) => {
  const response = await api.post('/issues/check-duplicates', data);
  return response.data;
};

export const voteIssue = async (id) => {
  const response = await api.post(`/issues/${id}/vote`);
  return response.data;
};

export const unvoteIssue = async (id) => {
  const response = await api.delete(`/issues/${id}/vote`);
  return response.data;
};
