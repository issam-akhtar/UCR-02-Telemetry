import { useQuery, useQueryClient } from "@tanstack/react-query";
import { adaptHistoricalData } from "../adapters/historicalAdapters";
import { useContext } from "react";
import { ChartSettingsContext } from "../context/ChartSettingsContext";
import { fetchHistoricalData } from "../services/api";

/**
 * useHistoricalData
 * @param {Object} params - Parameters for data fetching.
 */
export const useHistoricalData = ({
  endpoint,
  filters = {},
  page = 1,
  pageSize: customPageSize,
  pollingInterval: customPollingInterval,
  allData = false,
}) => {
  const {
    pageSize: contextPageSize,
    defaultFilters,
    historicalRefreshRate,
  } = useContext(ChartSettingsContext);
  const queryClient = useQueryClient();

  const finalPageSize = customPageSize || contextPageSize;
  const finalFilters = { ...defaultFilters, ...filters };
  const finalPollingInterval =
    customPollingInterval !== undefined
      ? customPollingInterval
      : historicalRefreshRate;

  let queryParamsObj = { ...finalFilters };
  if (!allData) {
    queryParamsObj = {
      ...queryParamsObj,
      page: page.toString(),
      pageSize: finalPageSize.toString(),
    };
  }
  const queryParams = new URLSearchParams(queryParamsObj).toString();
  const queryKey = [endpoint, finalFilters, page, finalPageSize, allData];

  const { data, error, isLoading, refetch } = useQuery({
    queryKey,
    queryFn: async () => {
      const rawData = await fetchHistoricalData(
        `${endpoint}${queryParams ? "?" + queryParams : ""}`
      );
      const adaptedData = adaptHistoricalData(endpoint, rawData);
      return adaptedData;
    },
    refetchInterval: finalPollingInterval > 0 ? finalPollingInterval : false,
    staleTime: 30000,
  });

  const mergeRealtimeData = (realtimeData) => {
    queryClient.setQueryData(queryKey, (oldData) => {
      const merged = oldData ? [...oldData, realtimeData] : [realtimeData];
      const unique = Array.from(
        new Map(merged.map((item) => [item.timestamp, item])).values()
      );
      unique.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
      return unique;
    });
  };

  return {
    data: data || [],
    loading: isLoading,
    error,
    refresh: refetch,
    mergeRealtimeData,
  };
};
