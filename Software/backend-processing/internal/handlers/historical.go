// internal/handlers/historical.go
package handlers

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"strconv"

	"telem-system/pkg/db"

	"github.com/jackc/pgx/v4/pgxpool"
)

// RegisterHandlers registers HTTP handlers for all data tables.
func RegisterHandlers(dbPool *pgxpool.Pool) {
	http.HandleFunc("/api/tcuData", func(w http.ResponseWriter, r *http.Request) {
		HandleTCUData(dbPool, w, r)
	})
	http.HandleFunc("/api/cellData", func(w http.ResponseWriter, r *http.Request) {
		HandleCellData(dbPool, w, r)
	})
	http.HandleFunc("/api/thermData", func(w http.ResponseWriter, r *http.Request) {
		HandleThermData(dbPool, w, r)
	})
	http.HandleFunc("/api/bamocarData", func(w http.ResponseWriter, r *http.Request) {
		HandleBamocarData(dbPool, w, r)
	})
	http.HandleFunc("/api/bamocarTxData", func(w http.ResponseWriter, r *http.Request) {
		HandleBamocarTxData(dbPool, w, r)
	})
	http.HandleFunc("/api/bamoCarReTransmitData", func(w http.ResponseWriter, r *http.Request) {
		HandleBamoCarReTransmitData(dbPool, w, r)
	})
	http.HandleFunc("/api/encoderData", func(w http.ResponseWriter, r *http.Request) {
		HandleEncoderData(dbPool, w, r)
	})
	http.HandleFunc("/api/packCurrentData", func(w http.ResponseWriter, r *http.Request) {
		HandlePackCurrentData(dbPool, w, r)
	})
	http.HandleFunc("/api/packVoltageData", func(w http.ResponseWriter, r *http.Request) {
		HandlePackVoltageData(dbPool, w, r)
	})
	http.HandleFunc("/api/pdmCurrentData", func(w http.ResponseWriter, r *http.Request) {
		HandlePDMCurrentData(dbPool, w, r)
	})
	http.HandleFunc("/api/pdmReTransmitData", func(w http.ResponseWriter, r *http.Request) {
		HandlePDMReTransmitData(dbPool, w, r)
	})
	http.HandleFunc("/api/insGPSData", func(w http.ResponseWriter, r *http.Request) {
		HandleINSGPSData(dbPool, w, r)
	})
	http.HandleFunc("/api/insIMUData", func(w http.ResponseWriter, r *http.Request) {
		HandleINSIMUData(dbPool, w, r)
	})
	http.HandleFunc("/api/frontFrequencyData", func(w http.ResponseWriter, r *http.Request) {
		HandleFrontFrequencyData(dbPool, w, r)
	})
	http.HandleFunc("/api/frontStrainGauges1Data", func(w http.ResponseWriter, r *http.Request) {
		HandleFrontStrainGauges1Data(dbPool, w, r)
	})
	http.HandleFunc("/api/frontStrainGauges2Data", func(w http.ResponseWriter, r *http.Request) {
		HandleFrontStrainGauges2Data(dbPool, w, r)
	})
	http.HandleFunc("/api/frontAnalogData", func(w http.ResponseWriter, r *http.Request) {
		HandleFrontAnalogData(dbPool, w, r)
	})
	http.HandleFunc("/api/aculvFd1Data", func(w http.ResponseWriter, r *http.Request) {
		HandleACULVFD1Data(dbPool, w, r)
	})
}

// HandleTCUData returns TCU data with optional pagination.
func HandleTCUData(dbPool *pgxpool.Pool, w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Content-Type", "application/json")

	limit, offset, err := parsePaginationParams(r)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	tcuData, err := db.FetchTCUDataPaginated(context.Background(), dbPool, limit, offset)
	if err != nil {
		http.Error(w, "Failed to fetch TCU data", http.StatusInternalServerError)
		log.Printf("HandleTCUData: fetch error: %v", err)
		return
	}
	log.Printf("HandleTCUData: fetched %d records (limit=%d, offset=%d)", len(tcuData), limit, offset)

	if len(tcuData) == 0 {
		log.Println("HandleTCUData: No TCU data available")
	}

	if err := json.NewEncoder(w).Encode(tcuData); err != nil {
		log.Printf("HandleTCUData: JSON encoding error: %v", err)
	}
}

// HandleCellData returns Cell data with optional pagination.
func HandleCellData(dbPool *pgxpool.Pool, w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Content-Type", "application/json")

	limit, offset, err := parsePaginationParams(r)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	cellData, err := db.FetchCellDataPaginated(context.Background(), dbPool, limit, offset)
	if err != nil {
		http.Error(w, "Failed to fetch Cell data", http.StatusInternalServerError)
		log.Printf("HandleCellData: fetch error: %v", err)
		return
	}

	log.Printf("HandleCellData: fetched %d records (limit=%d, offset=%d)", len(cellData), limit, offset)

	if len(cellData) == 0 {
		log.Println("HandleCellData: No Cell data available")
	}

	if err := json.NewEncoder(w).Encode(cellData); err != nil {
		log.Printf("HandleCellData: JSON encoding error: %v", err)
	}
}

// HandleThermData returns Thermistor data with optional pagination.
func HandleThermData(dbPool *pgxpool.Pool, w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Content-Type", "application/json")

	limit, offset, err := parsePaginationParams(r)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	thermData, err := db.FetchThermDataPaginated(context.Background(), dbPool, limit, offset)
	if err != nil {
		http.Error(w, "Failed to fetch Thermistor data", http.StatusInternalServerError)
		log.Printf("HandleThermData: fetch error: %v", err)
		return
	}

	log.Printf("HandleThermData: fetched %d records (limit=%d, offset=%d)", len(thermData), limit, offset)

	if len(thermData) == 0 {
		log.Println("HandleThermData: No Thermistor data available")
	}

	if err := json.NewEncoder(w).Encode(thermData); err != nil {
		log.Printf("HandleThermData: JSON encoding error: %v", err)
	}
}

// HandleBamocarData returns Bamocar data with optional pagination.
func HandleBamocarData(dbPool *pgxpool.Pool, w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Content-Type", "application/json")

	limit, offset, err := parsePaginationParams(r)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	bamocarData, err := db.FetchBamocarDataPaginated(context.Background(), dbPool, limit, offset)
	if err != nil {
		http.Error(w, "Failed to fetch Bamocar data", http.StatusInternalServerError)
		log.Printf("HandleBamocarData: fetch error: %v", err)
		return
	}

	log.Printf("HandleBamocarData: fetched %d records (limit=%d, offset=%d)", len(bamocarData), limit, offset)

	if len(bamocarData) == 0 {
		log.Println("HandleBamocarData: No Bamocar data available")
	}

	if err := json.NewEncoder(w).Encode(bamocarData); err != nil {
		log.Printf("HandleBamocarData: JSON encoding error: %v", err)
	}
}

// HandleBamocarTxData returns Bamocar Tx data with optional pagination.
func HandleBamocarTxData(dbPool *pgxpool.Pool, w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Content-Type", "application/json")

	limit, offset, err := parsePaginationParams(r)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	bamocarTxData, err := db.FetchBamocarTxDataPaginated(context.Background(), dbPool, limit, offset)
	if err != nil {
		http.Error(w, "Failed to fetch Bamocar Tx data", http.StatusInternalServerError)
		log.Printf("HandleBamocarTxData: fetch error: %v", err)
		return
	}

	log.Printf("HandleBamocarTxData: fetched %d records (limit=%d, offset=%d)", len(bamocarTxData), limit, offset)

	if len(bamocarTxData) == 0 {
		log.Println("HandleBamocarTxData: No Bamocar Tx data available")
	}

	if err := json.NewEncoder(w).Encode(bamocarTxData); err != nil {
		log.Printf("HandleBamocarTxData: JSON encoding error: %v", err)
	}
}

// HandleBamoCarReTransmitData returns Bamo Car Re-Transmit data with optional pagination.
func HandleBamoCarReTransmitData(dbPool *pgxpool.Pool, w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Content-Type", "application/json")

	limit, offset, err := parsePaginationParams(r)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	bamoCarReTransmitData, err := db.FetchBamoCarReTransmitDataPaginated(context.Background(), dbPool, limit, offset)
	if err != nil {
		http.Error(w, "Failed to fetch Bamo Car Re-Transmit data", http.StatusInternalServerError)
		log.Printf("HandleBamoCarReTransmitData: fetch error: %v", err)
		return
	}

	log.Printf("HandleBamoCarReTransmitData: fetched %d records (limit=%d, offset=%d)", len(bamoCarReTransmitData), limit, offset)

	if len(bamoCarReTransmitData) == 0 {
		log.Println("HandleBamoCarReTransmitData: No Bamo Car Re-Transmit data available")
	}

	if err := json.NewEncoder(w).Encode(bamoCarReTransmitData); err != nil {
		log.Printf("HandleBamoCarReTransmitData: JSON encoding error: %v", err)
	}
}

// HandleEncoderData returns Encoder data with optional pagination.
func HandleEncoderData(dbPool *pgxpool.Pool, w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Content-Type", "application/json")

	limit, offset, err := parsePaginationParams(r)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	encoderData, err := db.FetchEncoderDataPaginated(context.Background(), dbPool, limit, offset)
	if err != nil {
		http.Error(w, "Failed to fetch Encoder data", http.StatusInternalServerError)
		log.Printf("HandleEncoderData: fetch error: %v", err)
		return
	}

	log.Printf("HandleEncoderData: fetched %d records (limit=%d, offset=%d)", len(encoderData), limit, offset)

	if len(encoderData) == 0 {
		log.Println("HandleEncoderData: No Encoder data available")
	}

	if err := json.NewEncoder(w).Encode(encoderData); err != nil {
		log.Printf("HandleEncoderData: JSON encoding error: %v", err)
	}
}

// HandlePackCurrentData returns Pack Current data with optional pagination.
func HandlePackCurrentData(dbPool *pgxpool.Pool, w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Content-Type", "application/json")

	limit, offset, err := parsePaginationParams(r)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	packCurrentData, err := db.FetchPackCurrentDataPaginated(context.Background(), dbPool, limit, offset)
	if err != nil {
		http.Error(w, "Failed to fetch Pack Current data", http.StatusInternalServerError)
		log.Printf("HandlePackCurrentData: fetch error: %v", err)
		return
	}

	log.Printf("HandlePackCurrentData: fetched %d records (limit=%d, offset=%d)", len(packCurrentData), limit, offset)

	if len(packCurrentData) == 0 {
		log.Println("HandlePackCurrentData: No Pack Current data available")
	}

	if err := json.NewEncoder(w).Encode(packCurrentData); err != nil {
		log.Printf("HandlePackCurrentData: JSON encoding error: %v", err)
	}
}

// HandlePackVoltageData returns Pack Voltage data with optional pagination.
func HandlePackVoltageData(dbPool *pgxpool.Pool, w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Content-Type", "application/json")

	limit, offset, err := parsePaginationParams(r)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	packVoltageData, err := db.FetchPackVoltageDataPaginated(context.Background(), dbPool, limit, offset)
	if err != nil {
		http.Error(w, "Failed to fetch Pack Voltage data", http.StatusInternalServerError)
		log.Printf("HandlePackVoltageData: fetch error: %v", err)
		return
	}

	log.Printf("HandlePackVoltageData: fetched %d records (limit=%d, offset=%d)", len(packVoltageData), limit, offset)

	if len(packVoltageData) == 0 {
		log.Println("HandlePackVoltageData: No Pack Voltage data available")
	}

	if err := json.NewEncoder(w).Encode(packVoltageData); err != nil {
		log.Printf("HandlePackVoltageData: JSON encoding error: %v", err)
	}
}

// HandlePDMCurrentData returns PDM Current data with optional pagination.
func HandlePDMCurrentData(dbPool *pgxpool.Pool, w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Content-Type", "application/json")

	limit, offset, err := parsePaginationParams(r)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	pdmCurrentData, err := db.FetchPDMCurrentDataPaginated(context.Background(), dbPool, limit, offset)
	if err != nil {
		http.Error(w, "Failed to fetch PDM Current data", http.StatusInternalServerError)
		log.Printf("HandlePDMCurrentData: fetch error: %v", err)
		return
	}

	log.Printf("HandlePDMCurrentData: fetched %d records (limit=%d, offset=%d)", len(pdmCurrentData), limit, offset)

	if len(pdmCurrentData) == 0 {
		log.Println("HandlePDMCurrentData: No PDM Current data available")
	}

	if err := json.NewEncoder(w).Encode(pdmCurrentData); err != nil {
		log.Printf("HandlePDMCurrentData: JSON encoding error: %v", err)
	}
}

// HandlePDMReTransmitData returns PDM Re-Transmit data with optional pagination.
func HandlePDMReTransmitData(dbPool *pgxpool.Pool, w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Content-Type", "application/json")

	limit, offset, err := parsePaginationParams(r)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	pdmReTransmitData, err := db.FetchPDMReTransmitDataPaginated(context.Background(), dbPool, limit, offset)
	if err != nil {
		http.Error(w, "Failed to fetch PDM Re-Transmit data", http.StatusInternalServerError)
		log.Printf("HandlePDMReTransmitData: fetch error: %v", err)
		return
	}

	log.Printf("HandlePDMReTransmitData: fetched %d records (limit=%d, offset=%d)", len(pdmReTransmitData), limit, offset)

	if len(pdmReTransmitData) == 0 {
		log.Println("HandlePDMReTransmitData: No PDM Re-Transmit data available")
	}

	if err := json.NewEncoder(w).Encode(pdmReTransmitData); err != nil {
		log.Printf("HandlePDMReTransmitData: JSON encoding error: %v", err)
	}
}

// HandleINSGPSData returns INS GPS data with optional pagination.
func HandleINSGPSData(dbPool *pgxpool.Pool, w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Content-Type", "application/json")

	limit, offset, err := parsePaginationParams(r)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	insGPSData, err := db.FetchINSGPSDataPaginated(context.Background(), dbPool, limit, offset)
	if err != nil {
		http.Error(w, "Failed to fetch INS GPS data", http.StatusInternalServerError)
		log.Printf("HandleINSGPSData: fetch error: %v", err)
		return
	}

	log.Printf("HandleINSGPSData: fetched %d records (limit=%d, offset=%d)", len(insGPSData), limit, offset)

	if len(insGPSData) == 0 {
		log.Println("HandleINSGPSData: No INS GPS data available")
	}

	if err := json.NewEncoder(w).Encode(insGPSData); err != nil {
		log.Printf("HandleINSGPSData: JSON encoding error: %v", err)
	}
}

// HandleINSIMUData returns INS IMU data with optional pagination.
func HandleINSIMUData(dbPool *pgxpool.Pool, w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Content-Type", "application/json")

	limit, offset, err := parsePaginationParams(r)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	insIMUData, err := db.FetchINSIMUDataPaginated(context.Background(), dbPool, limit, offset)
	if err != nil {
		http.Error(w, "Failed to fetch INS IMU data", http.StatusInternalServerError)
		log.Printf("HandleINSIMUData: fetch error: %v", err)
		return
	}

	log.Printf("HandleINSIMUData: fetched %d records (limit=%d, offset=%d)", len(insIMUData), limit, offset)

	if len(insIMUData) == 0 {
		log.Println("HandleINSIMUData: No INS IMU data available")
	}

	if err := json.NewEncoder(w).Encode(insIMUData); err != nil {
		log.Printf("HandleINSIMUData: JSON encoding error: %v", err)
	}
}

// HandleFrontFrequencyData returns Front Frequency data with optional pagination.
func HandleFrontFrequencyData(dbPool *pgxpool.Pool, w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Content-Type", "application/json")

	limit, offset, err := parsePaginationParams(r)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	frontFreqData, err := db.FetchFrontFrequencyDataPaginated(context.Background(), dbPool, limit, offset)
	if err != nil {
		http.Error(w, "Failed to fetch Front Frequency data", http.StatusInternalServerError)
		log.Printf("HandleFrontFrequencyData: fetch error: %v", err)
		return
	}

	log.Printf("HandleFrontFrequencyData: fetched %d records (limit=%d, offset=%d)", len(frontFreqData), limit, offset)

	if len(frontFreqData) == 0 {
		log.Println("HandleFrontFrequencyData: No Front Frequency data available")
	}

	if err := json.NewEncoder(w).Encode(frontFreqData); err != nil {
		log.Printf("HandleFrontFrequencyData: JSON encoding error: %v", err)
	}
}

// HandleFrontStrainGauges1Data returns Front Strain Gauges 1 data with optional pagination.
func HandleFrontStrainGauges1Data(dbPool *pgxpool.Pool, w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Content-Type", "application/json")

	limit, offset, err := parsePaginationParams(r)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	frontStrainGauges1Data, err := db.FetchFrontStrainGauges1DataPaginated(context.Background(), dbPool, limit, offset)
	if err != nil {
		http.Error(w, "Failed to fetch Front Strain Gauges 1 data", http.StatusInternalServerError)
		log.Printf("HandleFrontStrainGauges1Data: fetch error: %v", err)
		return
	}

	log.Printf("HandleFrontStrainGauges1Data: fetched %d records (limit=%d, offset=%d)", len(frontStrainGauges1Data), limit, offset)

	if len(frontStrainGauges1Data) == 0 {
		log.Println("HandleFrontStrainGauges1Data: No Front Strain Gauges 1 data available")
	}

	if err := json.NewEncoder(w).Encode(frontStrainGauges1Data); err != nil {
		log.Printf("HandleFrontStrainGauges1Data: JSON encoding error: %v", err)
	}
}

// HandleFrontStrainGauges2Data returns Front Strain Gauges 2 data with optional pagination.
func HandleFrontStrainGauges2Data(dbPool *pgxpool.Pool, w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Content-Type", "application/json")

	limit, offset, err := parsePaginationParams(r)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	frontStrainGauges2Data, err := db.FetchFrontStrainGauges2DataPaginated(context.Background(), dbPool, limit, offset)
	if err != nil {
		http.Error(w, "Failed to fetch Front Strain Gauges 2 data", http.StatusInternalServerError)
		log.Printf("HandleFrontStrainGauges2Data: fetch error: %v", err)
		return
	}

	log.Printf("HandleFrontStrainGauges2Data: fetched %d records (limit=%d, offset=%d)", len(frontStrainGauges2Data), limit, offset)

	if len(frontStrainGauges2Data) == 0 {
		log.Println("HandleFrontStrainGauges2Data: No Front Strain Gauges 2 data available")
	}

	if err := json.NewEncoder(w).Encode(frontStrainGauges2Data); err != nil {
		log.Printf("HandleFrontStrainGauges2Data: JSON encoding error: %v", err)
	}
}

// HandleFrontAnalogData returns Front Analog data with optional pagination.
func HandleFrontAnalogData(dbPool *pgxpool.Pool, w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Content-Type", "application/json")

	limit, offset, err := parsePaginationParams(r)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	frontAnalogData, err := db.FetchFrontAnalogDataPaginated(context.Background(), dbPool, limit, offset)
	if err != nil {
		http.Error(w, "Failed to fetch Front Analog data", http.StatusInternalServerError)
		log.Printf("HandleFrontAnalogData: fetch error: %v", err)
		return
	}

	log.Printf("HandleFrontAnalogData: fetched %d records (limit=%d, offset=%d)", len(frontAnalogData), limit, offset)

	if len(frontAnalogData) == 0 {
		log.Println("HandleFrontAnalogData: No Front Analog data available")
	}

	if err := json.NewEncoder(w).Encode(frontAnalogData); err != nil {
		log.Printf("HandleFrontAnalogData: JSON encoding error: %v", err)
	}
}

// HandleACULVFD1Data returns ACULV FD 1 data with optional pagination.
func HandleACULVFD1Data(dbPool *pgxpool.Pool, w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Content-Type", "application/json")

	limit, offset, err := parsePaginationParams(r)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	aculvFD1Data, err := db.FetchACULVFD1DataPaginated(context.Background(), dbPool, limit, offset)
	if err != nil {
		http.Error(w, "Failed to fetch ACULV FD1 data", http.StatusInternalServerError)
		log.Printf("HandleACULVFD1Data: fetch error: %v", err)
		return
	}

	log.Printf("HandleACULVFD1Data: fetched %d records (limit=%d, offset=%d)", len(aculvFD1Data), limit, offset)

	if len(aculvFD1Data) == 0 {
		log.Println("HandleACULVFD1Data: No ACULV FD1 data available")
	}

	if err := json.NewEncoder(w).Encode(aculvFD1Data); err != nil {
		log.Printf("HandleACULVFD1Data: JSON encoding error: %v", err)
	}
}

func parsePaginationParams(r *http.Request) (limit int, offset int, err error) {
	query := r.URL.Query()
	pageStr := query.Get("page")
	pageSizeStr := query.Get("pageSize")

	const defaultLimit = 15000
	const maxLimit = 25000

	limit = defaultLimit
	offset = 0
	page := 1

	if pageSizeStr != "" {
		parsedLimit, err := strconv.Atoi(pageSizeStr)
		if err != nil || parsedLimit <= 0 {
			return 0, 0, fmt.Errorf("invalid 'pageSize' parameter")
		}

		if parsedLimit > maxLimit {
			limit = maxLimit
		} else {
			limit = parsedLimit
		}
	}

	if pageStr != "" {
		parsedPage, err := strconv.Atoi(pageStr)
		if err != nil || parsedPage < 1 {
			return 0, 0, fmt.Errorf("invalid 'page' parameter")
		}
		page = parsedPage
	}

	offset = (page - 1) * limit
	return limit, offset, nil
}
