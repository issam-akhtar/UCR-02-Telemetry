// handlers.go
//
// Telemetry System API Handlers
// This package defines HTTP handlers for the Telemetry System API.
// It uses the chi router to expose paginated endpoints for fetching telemetry data
// from the database. A generic paginated handler minimizes boilerplate.
package handlers

import (
	"context"
	"net/http"
	"strconv"
	"sync"
	"telem-system/pkg/db"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/render"
	"github.com/go-playground/validator/v10"
)

const (
	defaultPage     = 1
	defaultPageSize = 2000
	maxPageSize     = 35000
)

// ErrResponse is used to render error responses.
type ErrResponse struct {
	HTTPStatusCode int    `json:"-"`
	StatusText     string `json:"status"`
	ErrorText      string `json:"error,omitempty"`
}

// Render sets the HTTP status for error responses.
func (e *ErrResponse) Render(w http.ResponseWriter, r *http.Request) error {
	render.Status(r, e.HTTPStatusCode)
	return nil
}

// Pre-defined errors to avoid allocations
var (
	errInvalidPage     = &ErrResponse{HTTPStatusCode: http.StatusBadRequest, StatusText: "Invalid request.", ErrorText: "invalid page parameter"}
	errInvalidPageSize = &ErrResponse{HTTPStatusCode: http.StatusBadRequest, StatusText: "Invalid request.", ErrorText: "invalid page size parameter"}
)

// ErrInvalidRequest returns a bad request error response.
func ErrInvalidRequest(err error) render.Renderer {
	return &ErrResponse{
		HTTPStatusCode: http.StatusBadRequest,
		StatusText:     "Invalid request.",
		ErrorText:      err.Error(),
	}
}

// ErrRender returns an internal server error response.
func ErrRender(err error) render.Renderer {
	return &ErrResponse{
		HTTPStatusCode: http.StatusInternalServerError,
		StatusText:     "Error rendering response.",
		ErrorText:      err.Error(),
	}
}

// PaginationParams holds pagination parameters.
type PaginationParams struct {
	Page     int `validate:"min=1"`
	PageSize int `validate:"min=1,max=35000"`
}

// Initialize validator once
var validate = validator.New()

// Cache for recently validated params to avoid repeated validations
var (
	paramsCache      = make(map[string]PaginationParams)
	paramsCacheMutex sync.RWMutex
	cacheMaxSize     = 100 // Adjust based on expected number of different pagination requests
)

// getCachedValidParams returns cached pagination parameters if available
func getCachedValidParams(cacheKey string) (PaginationParams, bool) {
	paramsCacheMutex.RLock()
	defer paramsCacheMutex.RUnlock()

	params, found := paramsCache[cacheKey]
	return params, found
}

// cacheValidParams adds valid pagination parameters to cache
func cacheValidParams(cacheKey string, params PaginationParams) {
	paramsCacheMutex.Lock()
	defer paramsCacheMutex.Unlock()

	// Simple eviction if cache gets too large
	if len(paramsCache) >= cacheMaxSize {
		// Delete a random entry (first one we find)
		for k := range paramsCache {
			delete(paramsCache, k)
			break
		}
	}

	paramsCache[cacheKey] = params
}

// getQueryInt is a high-performance helper to parse an integer query parameter with a default value.
func getQueryInt(r *http.Request, key string, defaultVal int) (int, error) {
	// Get value directly from URL Query
	val := r.URL.Query().Get(key)
	if val == "" {
		return defaultVal, nil
	}

	// Fast path for common values to avoid allocations during strconv.Atoi
	switch val {
	case "1":
		return 1, nil
	case "10":
		return 10, nil
	case "20":
		return 20, nil
	case "50":
		return 50, nil
	case "100":
		return 100, nil
	case "500":
		return 500, nil
	case "1000":
		return 1000, nil
	case "2000":
		return 2000, nil
	default:
		return strconv.Atoi(val)
	}
}

// parsePaginationParams extracts and validates pagination parameters from the URL.
func parsePaginationParams(r *http.Request) (limit, offset int, err error) {
	// Create a cache key from request parameters
	cacheKey := r.URL.Query().Encode()

	// Check cache first
	if params, found := getCachedValidParams(cacheKey); found {
		return params.PageSize, (params.Page - 1) * params.PageSize, nil
	}

	// Initialize params with defaults
	params := PaginationParams{
		Page:     defaultPage,
		PageSize: defaultPageSize,
	}

	// Parse "limit" parameter, fall back to "pageSize" for backwards compatibility
	if pageSize, errSize := getQueryInt(r, "limit", 0); errSize == nil && pageSize > 0 {
		params.PageSize = pageSize
	} else if pageSize, errSize := getQueryInt(r, "pageSize", 0); errSize == nil && pageSize > 0 {
		params.PageSize = pageSize
	} else if errSize != nil && pageSize != 0 {
		return 0, 0, errSize
	}

	// Cap maximum page size
	if params.PageSize > maxPageSize {
		params.PageSize = maxPageSize
	}

	// Parse "page" parameter
	if page, errPage := getQueryInt(r, "page", defaultPage); errPage == nil {
		params.Page = page
	} else {
		return 0, 0, errPage
	}

	// Validate parameters
	if err = validate.Struct(params); err != nil {
		return 0, 0, err
	}

	// Cache the validated params
	cacheValidParams(cacheKey, params)

	limit = params.PageSize
	offset = (params.Page - 1) * params.PageSize
	return
}

// Query result cache to avoid repeated identical queries
type resultCacheEntry struct {
	data       interface{}
	expiration time.Time
}

var (
	resultCache      = make(map[string]resultCacheEntry)
	resultCacheMutex sync.RWMutex
	cacheTTL         = 2 * time.Second // Short TTL for real-time data
)

// makePaginatedHandler creates a generic HTTP handler for paginated queries.
func makePaginatedHandler[T any](fetchFunc func(ctx context.Context, limit, offset int) ([]T, error)) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		// Set CORS header (adjust in production as needed)
		w.Header().Set("Access-Control-Allow-Origin", "*")

		// Set cache control headers to improve client caching
		w.Header().Set("Cache-Control", "private, max-age=2") // Very short cache for real-time data

		// Parse pagination parameters
		limit, offset, err := parsePaginationParams(r)
		if err != nil {
			// Use pre-defined error responses for common cases
			if _, ok := err.(*strconv.NumError); ok {
				if r.URL.Query().Get("page") != "" {
					render.Render(w, r, errInvalidPage)
				} else {
					render.Render(w, r, errInvalidPageSize)
				}
				return
			}

			render.Render(w, r, ErrInvalidRequest(err))
			return
		}

		// Create a cache key for this specific request
		cacheKey := r.URL.Path + "?" + r.URL.Query().Encode()

		// Check if we have a cached result
		resultCacheMutex.RLock()
		entry, found := resultCache[cacheKey]
		resultCacheMutex.RUnlock()

		// If found and not expired, use cached result
		if found && time.Now().Before(entry.expiration) {
			render.JSON(w, r, entry.data)
			return
		}

		// Set a reasonable timeout for the database query
		ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
		defer cancel()

		// Fetch data from database
		data, err := fetchFunc(ctx, limit, offset)
		if err != nil {
			render.Render(w, r, ErrRender(err))
			return
		}

		// Cache the result
		resultCacheMutex.Lock()
		// Ensure cache doesn't grow too large (simple eviction strategy)
		if len(resultCache) > 1000 {
			// Clear entire cache if it gets too large
			resultCache = make(map[string]resultCacheEntry)
		}
		resultCache[cacheKey] = resultCacheEntry{
			data:       data,
			expiration: time.Now().Add(cacheTTL),
		}
		resultCacheMutex.Unlock()

		// Return the data
		render.JSON(w, r, data)
	}
}

// RegisterRoutes registers all telemetry API endpoints.
func RegisterRoutes(r chi.Router, queries *db.Queries) {
	r.Get("/api/tcuData", makePaginatedHandler(queries.FetchTCUDataPaginated))
	r.Get("/api/cellData", makePaginatedHandler(queries.FetchCellDataPaginated))
	r.Get("/api/thermData", makePaginatedHandler(queries.FetchThermDataPaginated))
	r.Get("/api/bamocarData", makePaginatedHandler(queries.FetchBamocarDataPaginated))
	r.Get("/api/bamocarTxData", makePaginatedHandler(queries.FetchBamocarTxDataPaginated))
	r.Get("/api/bamoCarReTransmitData", makePaginatedHandler(queries.FetchBamoCarReTransmitDataPaginated))
	r.Get("/api/encoderData", makePaginatedHandler(queries.FetchEncoderDataPaginated))
	r.Get("/api/packCurrentData", makePaginatedHandler(queries.FetchPackCurrentDataPaginated))
	r.Get("/api/packVoltageData", makePaginatedHandler(queries.FetchPackVoltageDataPaginated))
	r.Get("/api/pdmCurrentData", makePaginatedHandler(queries.FetchPDMCurrentDataPaginated))
	r.Get("/api/pdmReTransmitData", makePaginatedHandler(queries.FetchPDMReTransmitDataPaginated))
	r.Get("/api/insGPSData", makePaginatedHandler(queries.FetchINSGPSDataPaginated))
	r.Get("/api/insIMUData", makePaginatedHandler(queries.FetchINSIMUDataPaginated))
	r.Get("/api/frontFrequencyData", makePaginatedHandler(queries.FetchFrontFrequencyDataPaginated))
	r.Get("/api/frontStrainGauges1Data", makePaginatedHandler(queries.FetchFrontStrainGauges1DataPaginated))
	r.Get("/api/frontStrainGauges2Data", makePaginatedHandler(queries.FetchFrontStrainGauges2DataPaginated))
	r.Get("/api/rearStrainGauges1Data", makePaginatedHandler(queries.FetchRearStrainGauges1DataPaginated))
	r.Get("/api/rearStrainGauges2Data", makePaginatedHandler(queries.FetchRearStrainGauges2DataPaginated))
	r.Get("/api/rearAnalogData", makePaginatedHandler(queries.FetchRearAnalogDataPaginated))
	r.Get("/api/rearAeroData", makePaginatedHandler(queries.FetchRearAeroDataPaginated))
	r.Get("/api/frontAeroData", makePaginatedHandler(queries.FetchFrontAeroDataPaginated))
	r.Get("/api/gpsBestPosData", makePaginatedHandler(queries.FetchGPSBestPosDataPaginated))
	r.Get("/api/rearFrequencyData", makePaginatedHandler(queries.FetchRearFrequencyDataPaginated))
	r.Get("/api/aculvFd1Data", makePaginatedHandler(queries.FetchACULVFD1DataPaginated))
	r.Get("/api/aculvFd2Data", makePaginatedHandler(queries.FetchACULVFD2DataPaginated))
	r.Get("/api/aculv1Data", makePaginatedHandler(queries.FetchACULV1DataPaginated))
	r.Get("/api/aculv2Data", makePaginatedHandler(queries.FetchACULV2DataPaginated))
	r.Get("/api/pdm1Data", makePaginatedHandler(queries.FetchPDM1DataPaginated))
	r.Get("/api/bamocarRxData", makePaginatedHandler(queries.FetchBamocarRxDataPaginated))
	r.Get("/api/frontAnalogData", makePaginatedHandler(queries.FetchFrontAnalogDataPaginated))
}
