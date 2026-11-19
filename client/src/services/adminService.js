import api from './api.js';

export const getAdminDashboard = async () => {
  const response = await api.get('/admin/dashboard');
  return response.data;
};

export const getAdminIssues = async (params = {}) => {
  const response = await api.get('/admin/issues', { params });
  return response.data;
};

export const updateIssueStatus = async (id, data, isFormData = false) => {
  const headers = isFormData ? { 'Content-Type': 'multipart/form-data' } : {};
  const response = await api.patch(`/admin/issues/${id}/status`, data, { headers });
  return response.data;
};

export const updateIssueSeverity = async (id, severity) => {
  const response = await api.patch(`/admin/issues/${id}/severity`, { severity });
  return response.data;
};

export const assignIssue = async (id, assignedToId) => {
  const response = await api.patch(`/admin/issues/${id}/assign`, { assignedToId });
  return response.data;
};

export const getDepartmentsSummary = async () => {
  const response = await api.get('/admin/departments-summary');
  return response.data;
};

export const getUsers = async (params = {}) => {
  const response = await api.get('/admin/users', { params });
  return response.data;
};

export const updateUserRole = async (userId, data) => {
  const response = await api.patch(`/admin/users/${userId}/role`, data);
  return response.data;
};
