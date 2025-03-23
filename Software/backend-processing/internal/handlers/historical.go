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
	"telem-system/pkg/db"

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

var validate = validator.New()

// getQueryInt is a helper to parse an integer query parameter with a default value.
func getQueryInt(q map[string][]string, key string, defaultVal int) (int, error) {
	if values, ok := q[key]; ok && len(values) > 0 && values[0] != "" {
		return strconv.Atoi(values[0])
	}
	return defaultVal, nil
}

// parsePaginationParams extracts and validates pagination parameters from the URL.
func parsePaginationParams(r *http.Request) (limit, offset int, err error) {
	q := r.URL.Query()
	params := PaginationParams{
		Page:     defaultPage,
		PageSize: defaultPageSize,
	}

	// Use "limit" (preferred) or fall back to "pageSize" for backwards compatibility.
	if val, errConv := getQueryInt(q, "limit", 0); errConv == nil && val != 0 {
		params.PageSize = val
	} else if val, errConv := getQueryInt(q, "pageSize", 0); errConv == nil && val != 0 {
		params.PageSize = val
	} else if errConv != nil {
		return 0, 0, errConv
	}

	// Parse "page" parameter.
	if val, errConv := getQueryInt(q, "page", defaultPage); errConv == nil {
		params.Page = val
	} else {
		return 0, 0, errConv
	}

	// Cap maximum page size.
	if params.PageSize > maxPageSize {
		params.PageSize = maxPageSize
	}

	if err = validate.Struct(params); err != nil {
		return
	}

	limit = params.PageSize
	offset = (params.Page - 1) * params.PageSize
	return
}

// makePaginatedHandler creates a generic HTTP handler for paginated queries.
func makePaginatedHandler[T any](fetchFunc func(ctx context.Context, limit, offset int) ([]T, error)) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		// Set CORS header (adjust in production as needed).
		w.Header().Set("Access-Control-Allow-Origin", "*")
		limit, offset, err := parsePaginationParams(r)
		if err != nil {
			render.Render(w, r, ErrInvalidRequest(err))
			return
		}
		data, err := fetchFunc(r.Context(), limit, offset)
		if err != nil {
			render.Render(w, r, ErrRender(err))
			return
		}
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
