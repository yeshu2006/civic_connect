import api from './api.js';

export const getAnalyticsOverview = async () => {
  const response = await api.get('/analytics/overview');
  return response.data;
};

export const getDepartmentAnalytics = async () => {
  const response = await api.get('/analytics/departments');
  return response.data;
};

export const getMonthlyTrends = async () => {
  const response = await api.get('/analytics/trends');
  return response.data;
};

export const getDistributions = async () => {
  const response = await api.get('/analytics/distributions');
  return response.data;
};
