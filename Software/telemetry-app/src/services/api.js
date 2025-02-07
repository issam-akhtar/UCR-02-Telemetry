import axios from "axios";

const API_BASE = "http://localhost:9000/api";

/**
 * Fetch historical data from the API.
 * @param {string} endpoint - The API endpoint (e.g., "tcuData")
 * @returns {Promise<Array>} - The historical data as an array of data objects.
 */
export const fetchHistoricalData = async (endpoint) => {
  try {
    const { data } = await axios.get(`${API_BASE}/${endpoint}`);
    return data;
  } catch (error) {
    console.error("API Error:", error);
    return [];
  }
};
