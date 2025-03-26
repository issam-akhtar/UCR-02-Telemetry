import axios from 'axios';

export const axiosInstance = axios.create({
  baseURL: `http://${window.location.hostname}:50002/api`,
  timeout: 5000,
});
