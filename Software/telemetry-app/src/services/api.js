import axios from 'axios';

// Create axios instance with consistent configuration
export const axiosInstance = axios.create({
  baseURL: `http://${window.location.hostname}:50002/api`,
  timeout: 5000,
});

// Add response interceptor for better error handling
axiosInstance.interceptors.response.use(
  response => response,
  error => {
    if (process.env.NODE_ENV === 'development') {
      console.warn('API request failed:', error.message);
    }
    return Promise.reject(error);
  }
);

export default axiosInstance;
