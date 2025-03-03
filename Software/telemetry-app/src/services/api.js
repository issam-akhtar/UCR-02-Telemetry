import axios from 'axios';

export const axiosInstance = axios.create({
  baseURL: `http://${window.location.hostname}:9092/api`,
  timeout: 5000,
});
