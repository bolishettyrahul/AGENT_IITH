import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export const analyzeStock = async (query) => {
  const payloadQuery = query?.trim() || '';
  try {
    const response = await axios.post(`${API_BASE}/analyze`, {
      ticker: payloadQuery.toUpperCase(),
      query: payloadQuery,
      timestamp: new Date().toISOString(),
    });
    return response.data;
  } catch (error) {
    if (error.response) {
      throw new Error(error.response.data.message || 'Failed to analyze stock');
    }
    throw new Error('Network error. Could not connect to API.');
  }
};
