import axios from 'axios';

// In production on Railway, both frontend and backend run on the same domain,
// so we use relative paths (/api/...). The proxy in package.json handles local dev.
// If REACT_APP_API_URL is set, use it as the base URL (for separate deployments).
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || '',
  withCredentials: true,
});

export default api;
