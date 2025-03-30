// processdata.go
// ----------------------------------------------------------------------
// Package processdata routes and processes incoming CAN telemetry data.
// It determines the message type from the CAN frame ID, decodes the message,
// inserts the telemetry data into the database, and broadcasts the data in real time.
// ----------------------------------------------------------------------
package processdata

import (
	"context"
	"fmt"
	"reflect"
	"strconv"
	"strings"
	"sync"
	"telem-system/pkg/db"
	"telem-system/pkg/types"
	"telem-system/pkg/utils"
	"telem-system/proto"
	"time"

	protobuf "google.golang.org/protobuf/proto"
	"google.golang.org/protobuf/types/known/structpb"
)

// Define batch processor structure
type BatchProcessor struct {
	data          []interface{}
	batchSize     int
	maxWait       time.Duration
	lastFlush     time.Time
	mu            sync.Mutex
	processorFunc func([]interface{})
}

// Global batch processors
var (
	// Existing batch processors
	cellBatchProcessor   *BatchProcessor
	thermBatchProcessor  *BatchProcessor
	packCurrentProcessor *BatchProcessor
	packVoltageProcessor *BatchProcessor
	bamocarProcessor     *BatchProcessor
	tcuProcessor         *BatchProcessor
	frontAnalogProcessor *BatchProcessor

	// New batch processors
	aculvfd1Processor     *BatchProcessor
	aculvfd2Processor     *BatchProcessor
	aculv1Processor       *BatchProcessor
	aculv2Processor       *BatchProcessor
	gpsBestPosProcessor   *BatchProcessor
	insGPSProcessor       *BatchProcessor
	insIMUProcessor       *BatchProcessor
	frontFreqProcessor    *BatchProcessor
	rearFreqProcessor     *BatchProcessor
	pdm1Processor         *BatchProcessor
	frontAeroProcessor    *BatchProcessor
	rearAeroProcessor     *BatchProcessor
	encoderProcessor      *BatchProcessor
	rearAnalogProcessor   *BatchProcessor
	bamocarTxProcessor    *BatchProcessor
	bamocarRxProcessor    *BatchProcessor
	bamoReTransProcessor  *BatchProcessor
	pdmCurrentProcessor   *BatchProcessor
	frontSGauge1Processor *BatchProcessor
	frontSGauge2Processor *BatchProcessor
	rearSGauge1Processor  *BatchProcessor
	rearSGauge2Processor  *BatchProcessor
	pdmReTransProcessor   *BatchProcessor
)

// InitBatchProcessors initializes all batch processors
func InitBatchProcessors(ctx context.Context, batchSize int, maxWait time.Duration) {
	// Initialize cell data batch processor
	cellBatchProcessor = &BatchProcessor{
		data:      make([]interface{}, 0, batchSize),
		batchSize: batchSize,
		maxWait:   maxWait,
		lastFlush: time.Now(),
		processorFunc: func(batch []interface{}) {
			cells := make([]types.Cell_Data, 0, len(batch))
			for _, item := range batch {
				if cellData, ok := item.(types.Cell_Data); ok {
					cells = append(cells, cellData)
				}
			}
			if len(cells) > 0 {
				db.InsertCellDataBatch(context.Background(), cells)
			}
		},
	}

	// Initialize therm data batch processor
	thermBatchProcessor = &BatchProcessor{
		data:      make([]interface{}, 0, batchSize),
		batchSize: batchSize,
		maxWait:   maxWait,
		lastFlush: time.Now(),
		processorFunc: func(batch []interface{}) {
			therms := make([]types.Therm_Data, 0, len(batch))
			for _, item := range batch {
				if thermData, ok := item.(types.Therm_Data); ok {
					therms = append(therms, thermData)
				}
			}
			if len(therms) > 0 {
				db.InsertThermDataBatch(context.Background(), therms)
			}
		},
	}

	// Initialize pack current batch processor
	packCurrentProcessor = &BatchProcessor{
		data:      make([]interface{}, 0, batchSize),
		batchSize: batchSize,
		maxWait:   maxWait,
		lastFlush: time.Now(),
		processorFunc: func(batch []interface{}) {
			items := make([]types.PackCurrent_Data, 0, len(batch))
			for _, item := range batch {
				if data, ok := item.(types.PackCurrent_Data); ok {
					items = append(items, data)
				}
			}
			if len(items) > 0 {
				db.InsertPackCurrentDataBatch(context.Background(), items)
			}
		},
	}

	// Initialize pack voltage batch processor
	packVoltageProcessor = &BatchProcessor{
		data:      make([]interface{}, 0, batchSize),
		batchSize: batchSize,
		maxWait:   maxWait,
		lastFlush: time.Now(),
		processorFunc: func(batch []interface{}) {
			items := make([]types.PackVoltage_Data, 0, len(batch))
			for _, item := range batch {
				if data, ok := item.(types.PackVoltage_Data); ok {
					items = append(items, data)
				}
			}
			if len(items) > 0 {
				db.InsertPackVoltageDataBatch(context.Background(), items)
			}
		},
	}

	// Initialize bamocar batch processor
	bamocarProcessor = &BatchProcessor{
		data:      make([]interface{}, 0, batchSize),
		batchSize: batchSize,
		maxWait:   maxWait,
		lastFlush: time.Now(),
		processorFunc: func(batch []interface{}) {
			items := make([]types.TCU2_data, 0, len(batch))
			for _, item := range batch {
				if data, ok := item.(types.TCU2_data); ok {
					items = append(items, data)
				}
			}
			if len(items) > 0 {
				convertedItems := make([]types.BamocarTxData_Data, len(items))
				for i, item := range items {
					convertedItems[i] = types.BamocarTxData_Data{
						Timestamp: item.Timestamp,
						REGID:     item.BamocarFRG,
						Data:      item.BamocarRFE,
					}
				}
				db.InsertBamocarDataBatch(context.Background(), convertedItems)
			}
		},
	}

	// Initialize TCU batch processor
	tcuProcessor = &BatchProcessor{
		data:      make([]interface{}, 0, batchSize),
		batchSize: batchSize,
		maxWait:   maxWait,
		lastFlush: time.Now(),
		processorFunc: func(batch []interface{}) {
			items := make([]types.TCU_Data, 0, len(batch))
			for _, item := range batch {
				if data, ok := item.(types.TCU_Data); ok {
					items = append(items, data)
				}
			}
			if len(items) > 0 {
				db.InsertTCUDataBatch(context.Background(), items)
			}
		},
	}

	// Initialize front analog batch processor
	frontAnalogProcessor = &BatchProcessor{
		data:      make([]interface{}, 0, batchSize),
		batchSize: batchSize,
		maxWait:   maxWait,
		lastFlush: time.Now(),
		processorFunc: func(batch []interface{}) {
			items := make([]types.FrontAnalog_Data, 0, len(batch))
			for _, item := range batch {
				if data, ok := item.(types.FrontAnalog_Data); ok {
					items = append(items, data)
				}
			}
			if len(items) > 0 {
				db.InsertFrontAnalogDataBatch(context.Background(), items)
			}
		},
	}

	// Initialize ACULV FD 1 batch processor
	aculvfd1Processor = &BatchProcessor{
		data:      make([]interface{}, 0, batchSize),
		batchSize: batchSize,
		maxWait:   maxWait,
		lastFlush: time.Now(),
		processorFunc: func(batch []interface{}) {
			items := make([]types.ACULV_FD_1_Data, 0, len(batch))
			for _, item := range batch {
				if data, ok := item.(types.ACULV_FD_1_Data); ok {
					items = append(items, data)
				}
			}
			if len(items) > 0 {
				// Use the batch insertion function
				if err := db.InsertACULVFD1DataBatch(context.Background(), items); err != nil {
					// Log error but continue
					fmt.Printf("Error inserting ACULV FD 1 batch: %v\n", err)
				}
			}
		},
	}

	// Initialize ACULV FD 2 batch processor
	aculvfd2Processor = &BatchProcessor{
		data:      make([]interface{}, 0, batchSize),
		batchSize: batchSize,
		maxWait:   maxWait,
		lastFlush: time.Now(),
		processorFunc: func(batch []interface{}) {
			items := make([]types.ACULV_FD_2_Data, 0, len(batch))
			for _, item := range batch {
				if data, ok := item.(types.ACULV_FD_2_Data); ok {
					items = append(items, data)
				}
			}
			if len(items) > 0 {
				if err := db.InsertACULVFD2DataBatch(context.Background(), items); err != nil {
					fmt.Printf("Error inserting ACULV FD 2 batch: %v\n", err)
				}
			}
		},
	}

	// Initialize ACULV1 batch processor
	aculv1Processor = &BatchProcessor{
		data:      make([]interface{}, 0, batchSize),
		batchSize: batchSize,
		maxWait:   maxWait,
		lastFlush: time.Now(),
		processorFunc: func(batch []interface{}) {
			items := make([]types.ACULV1_Data, 0, len(batch))
			for _, item := range batch {
				if data, ok := item.(types.ACULV1_Data); ok {
					items = append(items, data)
				}
			}
			if len(items) > 0 {
				if err := db.InsertACULV1DataBatch(context.Background(), items); err != nil {
					fmt.Printf("Error inserting ACULV1 batch: %v\n", err)
				}
			}
		},
	}

	// Initialize ACULV2 batch processor
	aculv2Processor = &BatchProcessor{
		data:      make([]interface{}, 0, batchSize),
		batchSize: batchSize,
		maxWait:   maxWait,
		lastFlush: time.Now(),
		processorFunc: func(batch []interface{}) {
			items := make([]types.ACULV2_Data, 0, len(batch))
			for _, item := range batch {
				if data, ok := item.(types.ACULV2_Data); ok {
					items = append(items, data)
				}
			}
			if len(items) > 0 {
				if err := db.InsertACULV2DataBatch(context.Background(), items); err != nil {
					fmt.Printf("Error inserting ACULV2 batch: %v\n", err)
				}
			}
		},
	}

	// Initialize GPS Best Pos batch processor
	gpsBestPosProcessor = &BatchProcessor{
		data:      make([]interface{}, 0, batchSize),
		batchSize: batchSize,
		maxWait:   maxWait,
		lastFlush: time.Now(),
		processorFunc: func(batch []interface{}) {
			items := make([]types.GPSBestPos_Data, 0, len(batch))
			for _, item := range batch {
				if data, ok := item.(types.GPSBestPos_Data); ok {
					items = append(items, data)
				}
			}
			if len(items) > 0 {
				if err := db.InsertGPSBestPosDataBatch(context.Background(), items); err != nil {
					fmt.Printf("Error inserting GPS Best Pos batch: %v\n", err)
				}
			}
		},
	}

	// Initialize INS GPS batch processor
	insGPSProcessor = &BatchProcessor{
		data:      make([]interface{}, 0, batchSize),
		batchSize: batchSize,
		maxWait:   maxWait,
		lastFlush: time.Now(),
		processorFunc: func(batch []interface{}) {
			items := make([]types.INS_GPS_Data, 0, len(batch))
			for _, item := range batch {
				if data, ok := item.(types.INS_GPS_Data); ok {
					items = append(items, data)
				}
			}
			if len(items) > 0 {
				if err := db.InsertINSGPSDataBatch(context.Background(), items); err != nil {
					fmt.Printf("Error inserting INS GPS batch: %v\n", err)
				}
			}
		},
	}

	// Initialize INS IMU batch processor
	insIMUProcessor = &BatchProcessor{
		data:      make([]interface{}, 0, batchSize),
		batchSize: batchSize,
		maxWait:   maxWait,
		lastFlush: time.Now(),
		processorFunc: func(batch []interface{}) {
			items := make([]types.INS_IMU_Data, 0, len(batch))
			for _, item := range batch {
				if data, ok := item.(types.INS_IMU_Data); ok {
					items = append(items, data)
				}
			}
			if len(items) > 0 {
				if err := db.InsertINSIMUDataBatch(context.Background(), items); err != nil {
					fmt.Printf("Error inserting INS IMU batch: %v\n", err)
				}
			}
		},
	}

	// Initialize Front Frequency batch processor
	frontFreqProcessor = &BatchProcessor{
		data:      make([]interface{}, 0, batchSize),
		batchSize: batchSize,
		maxWait:   maxWait,
		lastFlush: time.Now(),
		processorFunc: func(batch []interface{}) {
			items := make([]types.FrontFrequency_Data, 0, len(batch))
			for _, item := range batch {
				if data, ok := item.(types.FrontFrequency_Data); ok {
					items = append(items, data)
				}
			}
			if len(items) > 0 {
				if err := db.InsertFrontFrequencyDataBatch(context.Background(), items); err != nil {
					fmt.Printf("Error inserting Front Frequency batch: %v\n", err)
				}
			}
		},
	}

	// Initialize Rear Frequency batch processor
	rearFreqProcessor = &BatchProcessor{
		data:      make([]interface{}, 0, batchSize),
		batchSize: batchSize,
		maxWait:   maxWait,
		lastFlush: time.Now(),
		processorFunc: func(batch []interface{}) {
			items := make([]types.RearFrequency_Data, 0, len(batch))
			for _, item := range batch {
				if data, ok := item.(types.RearFrequency_Data); ok {
					items = append(items, data)
				}
			}
			if len(items) > 0 {
				if err := db.InsertRearFrequencyDataBatch(context.Background(), items); err != nil {
					fmt.Printf("Error inserting Rear Frequency batch: %v\n", err)
				}
			}
		},
	}

	// Initialize PDM1 batch processor
	pdm1Processor = &BatchProcessor{
		data:      make([]interface{}, 0, batchSize),
		batchSize: batchSize,
		maxWait:   maxWait,
		lastFlush: time.Now(),
		processorFunc: func(batch []interface{}) {
			items := make([]types.PDM1_Data, 0, len(batch))
			for _, item := range batch {
				if data, ok := item.(types.PDM1_Data); ok {
					items = append(items, data)
				}
			}
			if len(items) > 0 {
				if err := db.InsertPDM1DataBatch(context.Background(), items); err != nil {
					fmt.Printf("Error inserting PDM1 batch: %v\n", err)
				}
			}
		},
	}

	// Initialize Front Aero batch processor
	frontAeroProcessor = &BatchProcessor{
		data:      make([]interface{}, 0, batchSize),
		batchSize: batchSize,
		maxWait:   maxWait,
		lastFlush: time.Now(),
		processorFunc: func(batch []interface{}) {
			items := make([]types.FrontAero_Data, 0, len(batch))
			for _, item := range batch {
				if data, ok := item.(types.FrontAero_Data); ok {
					items = append(items, data)
				}
			}
			if len(items) > 0 {
				if err := db.InsertFrontAeroDataBatch(context.Background(), items); err != nil {
					fmt.Printf("Error inserting Front Aero batch: %v\n", err)
				}
			}
		},
	}

	// Initialize Rear Aero batch processor
	rearAeroProcessor = &BatchProcessor{
		data:      make([]interface{}, 0, batchSize),
		batchSize: batchSize,
		maxWait:   maxWait,
		lastFlush: time.Now(),
		processorFunc: func(batch []interface{}) {
			items := make([]types.RearAero_Data, 0, len(batch))
			for _, item := range batch {
				if data, ok := item.(types.RearAero_Data); ok {
					items = append(items, data)
				}
			}
			if len(items) > 0 {
				if err := db.InsertRearAeroDataBatch(context.Background(), items); err != nil {
					fmt.Printf("Error inserting Rear Aero batch: %v\n", err)
				}
			}
		},
	}

	// Initialize Encoder batch processor
	encoderProcessor = &BatchProcessor{
		data:      make([]interface{}, 0, batchSize),
		batchSize: batchSize,
		maxWait:   maxWait,
		lastFlush: time.Now(),
		processorFunc: func(batch []interface{}) {
			items := make([]types.Encoder_Data, 0, len(batch))
			for _, item := range batch {
				if data, ok := item.(types.Encoder_Data); ok {
					items = append(items, data)
				}
			}
			if len(items) > 0 {
				if err := db.InsertEncoderDataBatch(context.Background(), items); err != nil {
					fmt.Printf("Error inserting Encoder batch: %v\n", err)
				}
			}
		},
	}

	// Initialize Rear Analog batch processor
	rearAnalogProcessor = &BatchProcessor{
		data:      make([]interface{}, 0, batchSize),
		batchSize: batchSize,
		maxWait:   maxWait,
		lastFlush: time.Now(),
		processorFunc: func(batch []interface{}) {
			items := make([]types.RearAnalog_Data, 0, len(batch))
			for _, item := range batch {
				if data, ok := item.(types.RearAnalog_Data); ok {
					items = append(items, data)
				}
			}
			if len(items) > 0 {
				if err := db.InsertRearAnalogDataBatch(context.Background(), items); err != nil {
					fmt.Printf("Error inserting Rear Analog batch: %v\n", err)
				}
			}
		},
	}

	// Initialize Bamocar Tx batch processor
	bamocarTxProcessor = &BatchProcessor{
		data:      make([]interface{}, 0, batchSize),
		batchSize: batchSize,
		maxWait:   maxWait,
		lastFlush: time.Now(),
		processorFunc: func(batch []interface{}) {
			items := make([]types.BamocarTxData_Data, 0, len(batch))
			for _, item := range batch {
				if data, ok := item.(types.BamocarTxData_Data); ok {
					items = append(items, data)
				}
			}
			if len(items) > 0 {
				if err := db.InsertBamocarTxDataBatch(context.Background(), items); err != nil {
					fmt.Printf("Error inserting Bamocar Tx batch: %v\n", err)
				}
			}
		},
	}

	// Initialize Bamocar Rx batch processor
	bamocarRxProcessor = &BatchProcessor{
		data:      make([]interface{}, 0, batchSize),
		batchSize: batchSize,
		maxWait:   maxWait,
		lastFlush: time.Now(),
		processorFunc: func(batch []interface{}) {
			items := make([]types.BamocarRxData_Data, 0, len(batch))
			for _, item := range batch {
				if data, ok := item.(types.BamocarRxData_Data); ok {
					items = append(items, data)
				}
			}
			if len(items) > 0 {
				if err := db.InsertBamocarRxDataBatch(context.Background(), items); err != nil {
					fmt.Printf("Error inserting Bamocar Rx batch: %v\n", err)
				}
			}
		},
	}

	// Initialize Bamo Car Re Transmit batch processor
	bamoReTransProcessor = &BatchProcessor{
		data:      make([]interface{}, 0, batchSize),
		batchSize: batchSize,
		maxWait:   maxWait,
		lastFlush: time.Now(),
		processorFunc: func(batch []interface{}) {
			items := make([]types.BamoCarReTransmit_Data, 0, len(batch))
			for _, item := range batch {
				if data, ok := item.(types.BamoCarReTransmit_Data); ok {
					items = append(items, data)
				}
			}
			if len(items) > 0 {
				if err := db.InsertBamoCarReTransmitDataBatch(context.Background(), items); err != nil {
					fmt.Printf("Error inserting Bamo Car Re Transmit batch: %v\n", err)
				}
			}
		},
	}

	// Initialize PDM Current batch processor
	pdmCurrentProcessor = &BatchProcessor{
		data:      make([]interface{}, 0, batchSize),
		batchSize: batchSize,
		maxWait:   maxWait,
		lastFlush: time.Now(),
		processorFunc: func(batch []interface{}) {
			items := make([]types.PDMCurrent_Data, 0, len(batch))
			for _, item := range batch {
				if data, ok := item.(types.PDMCurrent_Data); ok {
					items = append(items, data)
				}
			}
			if len(items) > 0 {
				if err := db.InsertPDMCurrentDataBatch(context.Background(), items); err != nil {
					fmt.Printf("Error inserting PDM Current batch: %v\n", err)
				}
			}
		},
	}

	// Initialize Front Strain Gauges 1 batch processor
	frontSGauge1Processor = &BatchProcessor{
		data:      make([]interface{}, 0, batchSize),
		batchSize: batchSize,
		maxWait:   maxWait,
		lastFlush: time.Now(),
		processorFunc: func(batch []interface{}) {
			items := make([]types.FrontStrainGauges1_Data, 0, len(batch))
			for _, item := range batch {
				if data, ok := item.(types.FrontStrainGauges1_Data); ok {
					items = append(items, data)
				}
			}
			if len(items) > 0 {
				if err := db.InsertFrontStrainGauges1DataBatch(context.Background(), items); err != nil {
					fmt.Printf("Error inserting Front Strain Gauges 1 batch: %v\n", err)
				}
			}
		},
	}

	// Initialize Front Strain Gauges 2 batch processor
	frontSGauge2Processor = &BatchProcessor{
		data:      make([]interface{}, 0, batchSize),
		batchSize: batchSize,
		maxWait:   maxWait,
		lastFlush: time.Now(),
		processorFunc: func(batch []interface{}) {
			items := make([]types.FrontStrainGauges2_Data, 0, len(batch))
			for _, item := range batch {
				if data, ok := item.(types.FrontStrainGauges2_Data); ok {
					items = append(items, data)
				}
			}
			if len(items) > 0 {
				if err := db.InsertFrontStrainGauges2DataBatch(context.Background(), items); err != nil {
					fmt.Printf("Error inserting Front Strain Gauges 2 batch: %v\n", err)
				}
			}
		},
	}

	// Initialize Rear Strain Gauges 1 batch processor
	rearSGauge1Processor = &BatchProcessor{
		data:      make([]interface{}, 0, batchSize),
		batchSize: batchSize,
		maxWait:   maxWait,
		lastFlush: time.Now(),
		processorFunc: func(batch []interface{}) {
			items := make([]types.RearStrainGauges1_Data, 0, len(batch))
			for _, item := range batch {
				if data, ok := item.(types.RearStrainGauges1_Data); ok {
					items = append(items, data)
				}
			}
			if len(items) > 0 {
				if err := db.InsertRearStrainGauges1DataBatch(context.Background(), items); err != nil {
					fmt.Printf("Error inserting Rear Strain Gauges 1 batch: %v\n", err)
				}
			}
		},
	}

	// Initialize Rear Strain Gauges 2 batch processor
	rearSGauge2Processor = &BatchProcessor{
		data:      make([]interface{}, 0, batchSize),
		batchSize: batchSize,
		maxWait:   maxWait,
		lastFlush: time.Now(),
		processorFunc: func(batch []interface{}) {
			items := make([]types.RearStrainGauges2_Data, 0, len(batch))
			for _, item := range batch {
				if data, ok := item.(types.RearStrainGauges2_Data); ok {
					items = append(items, data)
				}
			}
			if len(items) > 0 {
				if err := db.InsertRearStrainGauges2DataBatch(context.Background(), items); err != nil {
					fmt.Printf("Error inserting Rear Strain Gauges 2 batch: %v\n", err)
				}
			}
		},
	}

	// Initialize PDM Re Transmit batch processor
	pdmReTransProcessor = &BatchProcessor{
		data:      make([]interface{}, 0, batchSize),
		batchSize: batchSize,
		maxWait:   maxWait,
		lastFlush: time.Now(),
		processorFunc: func(batch []interface{}) {
			items := make([]types.PDMReTransmit_Data, 0, len(batch))
			for _, item := range batch {
				if data, ok := item.(types.PDMReTransmit_Data); ok {
					items = append(items, data)
				}
			}
			if len(items) > 0 {
				if err := db.InsertPDMReTransmitDataBatch(context.Background(), items); err != nil {
					fmt.Printf("Error inserting PDM Re Transmit batch: %v\n", err)
				}
			}
		},
	}

	// Start batch flusher goroutines
	startBatchFlusher(ctx, cellBatchProcessor)
	startBatchFlusher(ctx, thermBatchProcessor)
	startBatchFlusher(ctx, packCurrentProcessor)
	startBatchFlusher(ctx, packVoltageProcessor)
	startBatchFlusher(ctx, bamocarProcessor)
	startBatchFlusher(ctx, tcuProcessor)
	startBatchFlusher(ctx, frontAnalogProcessor)
	startBatchFlusher(ctx, aculvfd1Processor)
	startBatchFlusher(ctx, aculvfd2Processor)
	startBatchFlusher(ctx, aculv1Processor)
	startBatchFlusher(ctx, aculv2Processor)
	startBatchFlusher(ctx, gpsBestPosProcessor)
	startBatchFlusher(ctx, insGPSProcessor)
	startBatchFlusher(ctx, insIMUProcessor)
	startBatchFlusher(ctx, frontFreqProcessor)
	startBatchFlusher(ctx, rearFreqProcessor)
	startBatchFlusher(ctx, pdm1Processor)
	startBatchFlusher(ctx, frontAeroProcessor)
	startBatchFlusher(ctx, rearAeroProcessor)
	startBatchFlusher(ctx, encoderProcessor)
	startBatchFlusher(ctx, rearAnalogProcessor)
	startBatchFlusher(ctx, bamocarTxProcessor)
	startBatchFlusher(ctx, bamocarRxProcessor)
	startBatchFlusher(ctx, bamoReTransProcessor)
	startBatchFlusher(ctx, pdmCurrentProcessor)
	startBatchFlusher(ctx, frontSGauge1Processor)
	startBatchFlusher(ctx, frontSGauge2Processor)
	startBatchFlusher(ctx, rearSGauge1Processor)
	startBatchFlusher(ctx, rearSGauge2Processor)
	startBatchFlusher(ctx, pdmReTransProcessor)
}

// startBatchFlusher starts a goroutine to periodically flush a batch processor
func startBatchFlusher(ctx context.Context, processor *BatchProcessor) {
	go func() {
		ticker := time.NewTicker(processor.maxWait / 2) // Check at half the max wait time
		defer ticker.Stop()

		for {
			select {
			case <-ticker.C:
				processor.mu.Lock()
				if len(processor.data) > 0 && (len(processor.data) >= processor.batchSize ||
					time.Since(processor.lastFlush) >= processor.maxWait) {
					// Copy the data and reset the slice
					batch := make([]interface{}, len(processor.data))
					copy(batch, processor.data)
					processor.data = processor.data[:0] // Reset without reallocating
					processor.lastFlush = time.Now()
					processor.mu.Unlock()

					// Process batch (outside of lock)
					processor.processorFunc(batch)
				} else {
					processor.mu.Unlock()
				}
			case <-ctx.Done():
				// Flush any remaining data
				processor.mu.Lock()
				if len(processor.data) > 0 {
					batch := make([]interface{}, len(processor.data))
					copy(batch, processor.data)
					processor.data = processor.data[:0]
					processor.mu.Unlock()
					processor.processorFunc(batch)
				} else {
					processor.mu.Unlock()
				}
				return
			}
		}
	}()
}

// Helper functions to add data to batch processors
func AddCellDataToBatch(data types.Cell_Data) {
	cellBatchProcessor.mu.Lock()
	cellBatchProcessor.data = append(cellBatchProcessor.data, data)
	cellBatchProcessor.mu.Unlock()
}

func AddThermDataToBatch(data types.Therm_Data) {
	thermBatchProcessor.mu.Lock()
	thermBatchProcessor.data = append(thermBatchProcessor.data, data)
	thermBatchProcessor.mu.Unlock()
}

func AddPackCurrentToBatch(data types.PackCurrent_Data) {
	packCurrentProcessor.mu.Lock()
	packCurrentProcessor.data = append(packCurrentProcessor.data, data)
	packCurrentProcessor.mu.Unlock()
}

func AddPackVoltageToBatch(data types.PackVoltage_Data) {
	packVoltageProcessor.mu.Lock()
	packVoltageProcessor.data = append(packVoltageProcessor.data, data)
	packVoltageProcessor.mu.Unlock()
}

func AddBamocarToBatch(data types.TCU2_data) {
	bamocarProcessor.mu.Lock()
	bamocarProcessor.data = append(bamocarProcessor.data, data)
	bamocarProcessor.mu.Unlock()
}

func AddTCUToBatch(data types.TCU_Data) {
	tcuProcessor.mu.Lock()
	tcuProcessor.data = append(tcuProcessor.data, data)
	tcuProcessor.mu.Unlock()
}

func AddFrontAnalogToBatch(data types.FrontAnalog_Data) {
	frontAnalogProcessor.mu.Lock()
	frontAnalogProcessor.data = append(frontAnalogProcessor.data, data)
	frontAnalogProcessor.mu.Unlock()
}

// New Add-to-batch functions
func AddACULVFD1ToBatch(data types.ACULV_FD_1_Data) {
	aculvfd1Processor.mu.Lock()
	aculvfd1Processor.data = append(aculvfd1Processor.data, data)
	aculvfd1Processor.mu.Unlock()
}

func AddACULVFD2ToBatch(data types.ACULV_FD_2_Data) {
	aculvfd2Processor.mu.Lock()
	aculvfd2Processor.data = append(aculvfd2Processor.data, data)
	aculvfd2Processor.mu.Unlock()
}

func AddACULV1ToBatch(data types.ACULV1_Data) {
	aculv1Processor.mu.Lock()
	aculv1Processor.data = append(aculv1Processor.data, data)
	aculv1Processor.mu.Unlock()
}

func AddACULV2ToBatch(data types.ACULV2_Data) {
	aculv2Processor.mu.Lock()
	aculv2Processor.data = append(aculv2Processor.data, data)
	aculv2Processor.mu.Unlock()
}

func AddGPSBestPosToBatch(data types.GPSBestPos_Data) {
	gpsBestPosProcessor.mu.Lock()
	gpsBestPosProcessor.data = append(gpsBestPosProcessor.data, data)
	gpsBestPosProcessor.mu.Unlock()
}

func AddINSGPSToBatch(data types.INS_GPS_Data) {
	insGPSProcessor.mu.Lock()
	insGPSProcessor.data = append(insGPSProcessor.data, data)
	insGPSProcessor.mu.Unlock()
}

func AddINSIMUToBatch(data types.INS_IMU_Data) {
	insIMUProcessor.mu.Lock()
	insIMUProcessor.data = append(insIMUProcessor.data, data)
	insIMUProcessor.mu.Unlock()
}

func AddFrontFrequencyToBatch(data types.FrontFrequency_Data) {
	frontFreqProcessor.mu.Lock()
	frontFreqProcessor.data = append(frontFreqProcessor.data, data)
	frontFreqProcessor.mu.Unlock()
}

func AddRearFrequencyToBatch(data types.RearFrequency_Data) {
	rearFreqProcessor.mu.Lock()
	rearFreqProcessor.data = append(rearFreqProcessor.data, data)
	rearFreqProcessor.mu.Unlock()
}

func AddPDM1ToBatch(data types.PDM1_Data) {
	pdm1Processor.mu.Lock()
	pdm1Processor.data = append(pdm1Processor.data, data)
	pdm1Processor.mu.Unlock()
}

func AddFrontAeroToBatch(data types.FrontAero_Data) {
	frontAeroProcessor.mu.Lock()
	frontAeroProcessor.data = append(frontAeroProcessor.data, data)
	frontAeroProcessor.mu.Unlock()
}

func AddRearAeroToBatch(data types.RearAero_Data) {
	rearAeroProcessor.mu.Lock()
	rearAeroProcessor.data = append(rearAeroProcessor.data, data)
	rearAeroProcessor.mu.Unlock()
}

func AddEncoderToBatch(data types.Encoder_Data) {
	encoderProcessor.mu.Lock()
	encoderProcessor.data = append(encoderProcessor.data, data)
	encoderProcessor.mu.Unlock()
}

func AddRearAnalogToBatch(data types.RearAnalog_Data) {
	rearAnalogProcessor.mu.Lock()
	rearAnalogProcessor.data = append(rearAnalogProcessor.data, data)
	rearAnalogProcessor.mu.Unlock()
}

func AddBamocarTxToBatch(data types.BamocarTxData_Data) {
	bamocarTxProcessor.mu.Lock()
	bamocarTxProcessor.data = append(bamocarTxProcessor.data, data)
	bamocarTxProcessor.mu.Unlock()
}

func AddBamocarRxToBatch(data types.BamocarRxData_Data) {
	bamocarRxProcessor.mu.Lock()
	bamocarRxProcessor.data = append(bamocarRxProcessor.data, data)
	bamocarRxProcessor.mu.Unlock()
}

func AddBamoCarReTransmitToBatch(data types.BamoCarReTransmit_Data) {
	bamoReTransProcessor.mu.Lock()
	bamoReTransProcessor.data = append(bamoReTransProcessor.data, data)
	bamoReTransProcessor.mu.Unlock()
}

func AddPDMCurrentToBatch(data types.PDMCurrent_Data) {
	pdmCurrentProcessor.mu.Lock()
	pdmCurrentProcessor.data = append(pdmCurrentProcessor.data, data)
	pdmCurrentProcessor.mu.Unlock()
}

func AddFrontStrainGauges1ToBatch(data types.FrontStrainGauges1_Data) {
	frontSGauge1Processor.mu.Lock()
	frontSGauge1Processor.data = append(frontSGauge1Processor.data, data)
	frontSGauge1Processor.mu.Unlock()
}

func AddFrontStrainGauges2ToBatch(data types.FrontStrainGauges2_Data) {
	frontSGauge2Processor.mu.Lock()
	frontSGauge2Processor.data = append(frontSGauge2Processor.data, data)
	frontSGauge2Processor.mu.Unlock()
}

func AddRearStrainGauges1ToBatch(data types.RearStrainGauges1_Data) {
	rearSGauge1Processor.mu.Lock()
	rearSGauge1Processor.data = append(rearSGauge1Processor.data, data)
	rearSGauge1Processor.mu.Unlock()
}

func AddRearStrainGauges2ToBatch(data types.RearStrainGauges2_Data) {
	rearSGauge2Processor.mu.Lock()
	rearSGauge2Processor.data = append(rearSGauge2Processor.data, data)
	rearSGauge2Processor.mu.Unlock()
}

func AddPDMReTransmitToBatch(data types.PDMReTransmit_Data) {
	pdmReTransProcessor.mu.Lock()
	pdmReTransProcessor.data = append(pdmReTransProcessor.data, data)
	pdmReTransProcessor.mu.Unlock()
}

// buildPayload constructs a payload with the given type, timestamp and data.
func buildPayload(msgType string, t time.Time, data map[string]interface{}) map[string]interface{} {
	data["timestamp"] = t.Unix()
	return map[string]interface{}{
		"type":    msgType,
		"payload": data,
		"time":    t.Format("2006-01-02 15:04:05.000"),
	}
}

// broadcastTelemetry converts a map payload into a TelemetryMessage proto,
// marshals it into binary format and then calls ThrottledBroadcast.
// BroadcastFunc is assigned by main to push real‑time messages to the WebSocket hub.
var BroadcastFunc func(msg []byte)

// broadcastTelemetry converts a map payload into a TelemetryMessage proto,
// marshals it into binary format and then calls BroadcastFunc.
func broadcastTelemetry(payloadMap map[string]interface{}) {
	typ, _ := payloadMap["type"].(string)
	// Use the top‑level time field (not nested in payload)
	timeStr, _ := payloadMap["time"].(string)
	payloadContent, ok := payloadMap["payload"].(map[string]interface{})
	if !ok {
		payloadContent = make(map[string]interface{})
	}
	st, err := structpb.NewStruct(payloadContent)
	if err != nil {
		return
	}
	msg := &proto.TelemetryMessage{
		Type:    typ,
		Payload: st,
		Time:    timeStr,
	}
	bin, err := protobuf.Marshal(msg)
	if err != nil {
		return
	}

	// Use BroadcastFunc which is set to ThrottledBroadcast in main.go
	if BroadcastFunc != nil {
		BroadcastFunc(bin)
	}
}

// HandleDataInsertions routes decoded CAN frame data to its appropriate processing function.
func HandleDataInsertions(
	frameID uint32,
	decoded map[string]string,
	cellDataBuffers map[float64]*types.Cell_Data,
	recordCount int,
	path string,
) {
	switch frameID {
	case 4:
		processPackCurrentData(decoded)
	case 5:
		processPackVoltageData(decoded)
	case 6:
		processTCUData(decoded)
	case 8:
		processACULVFD1Data(decoded)
	case 30:
		processACULVFD2Data(decoded)
	case 40:
		processACULV1Data(decoded)
	case 41:
		processACULV2Data(decoded)
	case 50, 51, 52, 53, 54, 55, 56, 57:
		// Cell data is handled separately in main.go
		// Fix: Don't call yourself recursively through processdata.HandleDataInsertions
		if cellDataBuffers != nil {
			// Process cell data directly
			processCellDataInBuffer(frameID, decoded, cellDataBuffers, path)
		}
	case 60:
		processThermData(decoded, 1)
	case 61:
		processThermData(decoded, 2)
	case 62:
		processThermData(decoded, 3)
	case 63:
		processThermData(decoded, 4)
	case 64:
		processThermData(decoded, 5)
	case 65:
		processThermData(decoded, 6)
	case 66:
		processThermData(decoded, 7)
	case 67:
		processThermData(decoded, 8)
	case 68:
		processThermData(decoded, 9)
	case 69:
		processThermData(decoded, 10)
	case 70:
		processThermData(decoded, 11)
	case 71:
		processThermData(decoded, 12)
	case 80:
		processGPSBestPosData(decoded)
	case 81:
		processINS_GPS_Data(decoded)
	case 82:
		processINS_IMUData(decoded)
	case 100:
		processBamocarData(decoded)
	case 101:
		processFrontFrequencyData(decoded)
	case 102:
		processRearFrequencyData(decoded)
	case 1280:
		processPDM1Data(decoded)
	case 1536:
		processFrontAeroData(decoded)
	case 1537:
		processRearAeroData(decoded)
	case 200:
		processEncoderData(decoded)
	case 258:
		processRearAnalogData(decoded)
	case 259:
		processFrontAnalogData(decoded)
	case 385:
		processBamocarTxData(decoded)
	case 513:
		processBamocarRxData(decoded)
	case 600:
		processBamoCarReTransmitData(decoded)
	case 1312:
		processPDMCurrentData(decoded)
	case 1552:
		processFrontStrainGauges1Data(decoded)
	case 1553:
		processFrontStrainGauges2Data(decoded)
	case 1554:
		processRearStrainGauges1Data(decoded)
	case 1555:
		processRearStrainGauges2Data(decoded)
	case 1680:
		processPDMReTransmitData(decoded)
	default:
		// Unrecognized frame; no action taken.
	}
}

// Helper function to process cell data directly within the package
func processCellDataInBuffer(frameID uint32, decoded map[string]string, cellDataBuffers map[float64]*types.Cell_Data, mode string) {
	// Use key 0 as the aggregator
	if mode == "csv" {
		processCellValuesFromCSV(uint32(frameID), decoded, cellDataBuffers)
	} else {
		processCellValuesFromLive(frameID, decoded, cellDataBuffers)
	}
}

// Separate function to process cell values for CSV mode
func processCellValuesFromCSV(frameID uint32, decoded map[string]string, cellDataBuffers map[float64]*types.Cell_Data) {
	for k, v := range decoded {
		if strings.HasPrefix(k, "Cell") {
			if idx, err := strconv.Atoi(strings.TrimPrefix(k, "Cell")); err == nil {
				f, err := strconv.ParseFloat(v, 64)
				if err == nil {
					setCellValue(cellDataBuffers[0], idx, f)
				}
			}
		}
	}
}

// Separate function to process cell values for live mode
func processCellValuesFromLive(frameID uint32, decoded map[string]string, cellDataBuffers map[float64]*types.Cell_Data) {
	for k, v := range decoded {
		if strings.HasPrefix(k, "Cell") {
			if idx, err := strconv.Atoi(strings.TrimPrefix(k, "Cell")); err == nil {
				f, err := strconv.ParseFloat(v, 64)
				if err == nil {
					setCellValue(cellDataBuffers[0], idx, f)
				}
			}
		}
	}
}

// --- Processing Functions ---
// Each function now has two responsibilities:
// 1. Broadcast data in real-time
// 2. Add data to batch processor instead of direct DB insertion

func processRearStrainGauges2Data(decoded map[string]string) {
	t := time.Now()
	d := types.RearStrainGauges2_Data{
		Timestamp: t,
		Gauge1:    utils.ParseIntSignal(decoded, "gauge1"),
		Gauge2:    utils.ParseIntSignal(decoded, "gauge2"),
		Gauge3:    utils.ParseIntSignal(decoded, "gauge3"),
		Gauge4:    utils.ParseIntSignal(decoded, "gauge4"),
		Gauge5:    utils.ParseIntSignal(decoded, "gauge5"),
		Gauge6:    utils.ParseIntSignal(decoded, "gauge6"),
	}

	// Add to batch processor
	AddRearStrainGauges2ToBatch(d)

	payload := buildPayload("rear_strain_gauges_2", t, map[string]interface{}{
		"gauge1": d.Gauge1,
		"gauge2": d.Gauge2,
		"gauge3": d.Gauge3,
		"gauge4": d.Gauge4,
		"gauge5": d.Gauge5,
		"gauge6": d.Gauge6,
	})
	broadcastTelemetry(payload)
}

func processRearStrainGauges1Data(decoded map[string]string) {
	t := time.Now()
	d := types.RearStrainGauges1_Data{
		Timestamp: t,
		Gauge1:    utils.ParseIntSignal(decoded, "Gauge1"),
		Gauge2:    utils.ParseIntSignal(decoded, "Gauge2"),
		Gauge3:    utils.ParseIntSignal(decoded, "Gauge3"),
		Gauge4:    utils.ParseIntSignal(decoded, "Gauge4"),
		Gauge5:    utils.ParseIntSignal(decoded, "Gauge5"),
		Gauge6:    utils.ParseIntSignal(decoded, "Gauge6"),
	}

	// Add to batch processor
	AddRearStrainGauges1ToBatch(d)

	payload := buildPayload("rear_strain_gauges_1", t, map[string]interface{}{
		"gauge1": d.Gauge1,
		"gauge2": d.Gauge2,
		"gauge3": d.Gauge3,
		"gauge4": d.Gauge4,
		"gauge5": d.Gauge5,
		"gauge6": d.Gauge6,
	})
	broadcastTelemetry(payload)
}

func processBamocarRxData(decoded map[string]string) {
	t := time.Now()
	data := types.BamocarRxData_Data{
		Timestamp: t,
		REGID:     utils.ParseIntSignal(decoded, "REGID"),
		Byte1:     utils.ParseIntSignal(decoded, "Byte1"),
		Byte2:     utils.ParseIntSignal(decoded, "Byte2"),
		Byte3:     utils.ParseIntSignal(decoded, "Byte3"),
		Byte4:     utils.ParseIntSignal(decoded, "Byte4"),
		Byte5:     utils.ParseIntSignal(decoded, "Byte5"),
	}

	// Add to batch processor
	AddBamocarRxToBatch(data)

	payload := buildPayload("bamocar_rx_data", t, map[string]interface{}{
		"regid": data.REGID,
		"byte1": data.Byte1,
		"byte2": data.Byte2,
		"byte3": data.Byte3,
		"byte4": data.Byte4,
		"byte5": data.Byte5,
	})
	broadcastTelemetry(payload)
}

func processThermData(decoded map[string]string, thermID int) {
	t := time.Now()
	th := types.Therm_Data{
		Timestamp:    t,
		ThermistorID: thermID,
		Therm1:       utils.ParseFloatSignal(decoded, "Therm1"),
		Therm2:       utils.ParseFloatSignal(decoded, "Therm2"),
		Therm3:       utils.ParseFloatSignal(decoded, "Therm3"),
		Therm4:       utils.ParseFloatSignal(decoded, "Therm4"),
		Therm5:       utils.ParseFloatSignal(decoded, "Therm5"),
		Therm6:       utils.ParseFloatSignal(decoded, "Therm6"),
		Therm7:       utils.ParseFloatSignal(decoded, "Therm7"),
		Therm8:       utils.ParseFloatSignal(decoded, "Therm8"),
		Therm9:       utils.ParseFloatSignal(decoded, "Therm9"),
		Therm10:      utils.ParseFloatSignal(decoded, "Therm10"),
		Therm11:      utils.ParseFloatSignal(decoded, "Therm11"),
		Therm12:      utils.ParseFloatSignal(decoded, "Therm12"),
		Therm13:      utils.ParseFloatSignal(decoded, "Therm13"),
		Therm14:      utils.ParseFloatSignal(decoded, "Therm14"),
		Therm15:      utils.ParseFloatSignal(decoded, "Therm15"),
		Therm16:      utils.ParseFloatSignal(decoded, "Therm16"),
	}

	// Add to batch processor
	AddThermDataToBatch(th)

	payload := buildPayload("thermistor", t, map[string]interface{}{
		"thermistor_id": th.ThermistorID,
		"therm1":        th.Therm1,
		"therm2":        th.Therm2,
		"therm3":        th.Therm3,
		"therm4":        th.Therm4,
		"therm5":        th.Therm5,
		"therm6":        th.Therm6,
		"therm7":        th.Therm7,
		"therm8":        th.Therm8,
		"therm9":        th.Therm9,
		"therm10":       th.Therm10,
		"therm11":       th.Therm11,
		"therm12":       th.Therm12,
		"therm13":       th.Therm13,
		"therm14":       th.Therm14,
		"therm15":       th.Therm15,
		"therm16":       th.Therm16,
	})
	broadcastTelemetry(payload)
}

func processTCUData(decoded map[string]string) {
	t := time.Now()
	tcu := types.TCU_Data{
		Timestamp: t,
		APPS1:     utils.ParseFloatSignal(decoded, "APPS1"),
		APPS2:     utils.ParseFloatSignal(decoded, "APPS2"),
		BSE:       utils.ParseFloatSignal(decoded, "BSE"),
		Status:    utils.ParseIntSignal(decoded, "Status"),
	}

	// Add to batch processor
	AddTCUToBatch(tcu)

	payload := buildPayload("tcu", t, map[string]interface{}{
		"apps1":  tcu.APPS1,
		"apps2":  tcu.APPS2,
		"bse":    tcu.BSE,
		"status": tcu.Status,
	})
	broadcastTelemetry(payload)
}

func processPackCurrentData(decoded map[string]string) {
	t := time.Now()
	d := types.PackCurrent_Data{
		Timestamp: t,
		Current:   utils.ParseFloatSignal(decoded, "PackCurrent"),
	}

	// Add to batch processor
	AddPackCurrentToBatch(d)

	payload := buildPayload("pack_current", t, map[string]interface{}{
		"current": d.Current,
	})
	broadcastTelemetry(payload)
}

func processPackVoltageData(decoded map[string]string) {
	t := time.Now()
	d := types.PackVoltage_Data{
		Timestamp: t,
		Voltage:   utils.ParseFloatSignal(decoded, "PackVoltage"),
	}

	// Add to batch processor
	AddPackVoltageToBatch(d)

	payload := buildPayload("pack_voltage", t, map[string]interface{}{
		"voltage": d.Voltage,
	})
	broadcastTelemetry(payload)
}

func processBamocarData(decoded map[string]string) {
	t := time.Now()
	b := types.TCU2_data{
		Timestamp:  t,
		BamocarFRG: utils.ParseIntSignal(decoded, "BamocarFRG"),
		BamocarRFE: utils.ParseIntSignal(decoded, "BamocarRFE"),
		BrakeLight: utils.ParseIntSignal(decoded, "BrakeLight"),
	}

	// Add to batch processor
	AddBamocarToBatch(b)

	payload := buildPayload("bamocar", t, map[string]interface{}{
		"bamocar_frg": b.BamocarFRG,
		"bamocar_rfe": b.BamocarRFE,
		"brake_light": b.BrakeLight,
	})
	broadcastTelemetry(payload)
}

func processFrontAnalogData(decoded map[string]string) {
	t := time.Now()
	d := types.FrontAnalog_Data{
		Timestamp:     t,
		LeftRad:       utils.ParseIntSignal(decoded, "LeftRad"),
		RightRad:      utils.ParseIntSignal(decoded, "RightRad"),
		FrontRightPot: utils.ParseFloatSignal(decoded, "FrontRightPot"),
		FrontLeftPot:  utils.ParseFloatSignal(decoded, "FrontLeftPot"),
		RearRightPot:  utils.ParseFloatSignal(decoded, "RearRightPot"),
		RearLeftPot:   utils.ParseFloatSignal(decoded, "RearLeftPot"),
		SteeringAngle: utils.ParseFloatSignal(decoded, "SteeringAngle"),
		Analog8:       utils.ParseIntSignal(decoded, "Analog8"),
	}

	// Add to batch processor
	AddFrontAnalogToBatch(d)

	payload := buildPayload("front_analog", t, map[string]interface{}{
		"left_rad":        d.LeftRad,
		"right_rad":       d.RightRad,
		"front_right_pot": d.FrontRightPot,
		"front_left_pot":  d.FrontLeftPot,
		"rear_right_pot":  d.RearRightPot,
		"rear_left_pot":   d.RearLeftPot,
		"steering_angle":  d.SteeringAngle,
		"analog8":         d.Analog8,
	})
	broadcastTelemetry(payload)
}

// --- Helper Functions for Cell Data using Reflection ---
func setCellValue(agg *types.Cell_Data, idx int, val float64) {
	v := reflect.ValueOf(agg).Elem()
	fieldName := "Cell" + strconv.Itoa(idx)
	f := v.FieldByName(fieldName)
	if f.IsValid() && f.CanSet() && f.Kind() == reflect.Float64 {
		f.SetFloat(val)
	}
}

func getCellValue(agg *types.Cell_Data, idx int) float64 {
	v := reflect.ValueOf(agg).Elem()
	fieldName := "Cell" + strconv.Itoa(idx)
	f := v.FieldByName(fieldName)
	if f.IsValid() && f.Kind() == reflect.Float64 {
		return f.Float()
	}
	return 0
}

// BroadcastCells broadcasts cell data for real-time display
func BroadcastCells(agg *types.Cell_Data) {
	signals := make(map[string]interface{}, 128)
	signals["type"] = "cell"
	for i := 1; i <= 128; i++ {
		key := "cell" + strconv.Itoa(i)
		signals[key] = fmt.Sprintf("%.3f", getCellValue(agg, i))
	}
	wrapper := map[string]interface{}{
		"type":    "cell",
		"payload": signals,
		"time":    utils.CurrentTimestampString(),
	}
	broadcastTelemetry(wrapper)
}

// processACULVFD1Data handles frame ID 8 using the ACULV_FD_1_Data type.
func processACULVFD1Data(decoded map[string]string) {
	t := time.Now()
	d := types.ACULV_FD_1_Data{
		Timestamp:            t,
		AMSStatus:            utils.ParseIntSignal(decoded, "AMSStatus"),
		FLD:                  utils.ParseIntSignal(decoded, "FLD"),
		StateOfCharge:        utils.ParseFloatSignal(decoded, "StateOfCharge"),
		AccumulatorVoltage:   utils.ParseFloatSignal(decoded, "AccumulatorVoltage"),
		TractiveVoltage:      utils.ParseFloatSignal(decoded, "TractiveVoltage"),
		CellCurrent:          utils.ParseFloatSignal(decoded, "CellCurrent"),
		IsolationMonitoring:  utils.ParseIntSignal(decoded, "IsolationMonitoring"),
		IsolationMonitoring1: utils.ParseFloatSignal(decoded, "IsolationMonitoring1"),
	}

	// Add to batch processor
	AddACULVFD1ToBatch(d)

	payload := buildPayload("aculv_fd_1", t, map[string]interface{}{
		"ams_status":            d.AMSStatus,
		"fld":                   d.FLD,
		"state_of_charge":       d.StateOfCharge,
		"accumulator_voltage":   d.AccumulatorVoltage,
		"tractive_voltage":      d.TractiveVoltage,
		"cell_current":          d.CellCurrent,
		"isolation_monitoring":  d.IsolationMonitoring,
		"isolation_monitoring1": d.IsolationMonitoring1,
	})
	broadcastTelemetry(payload)
}

// processACULVFD2Data handles frame ID 30 using the ACULV_FD_2_Data type.
func processACULVFD2Data(decoded map[string]string) {
	t := time.Now()
	d := types.ACULV_FD_2_Data{
		Timestamp:   t,
		FanSetPoint: utils.ParseFloatSignal(decoded, "FanSetPoint"),
		RPM:         utils.ParseFloatSignal(decoded, "RPM"),
	}

	// Add to batch processor
	AddACULVFD2ToBatch(d)

	payload := buildPayload("aculv_fd_2", t, map[string]interface{}{
		"fan_set_point": d.FanSetPoint,
		"rpm":           d.RPM,
	})
	broadcastTelemetry(payload)
}

// processACULV1Data handles frame ID 40 using the ACULV1_Data type.
func processACULV1Data(decoded map[string]string) {
	t := time.Now()
	d := types.ACULV1_Data{
		Timestamp:     t,
		ChargeStatus1: utils.ParseFloatSignal(decoded, "ChargeStatus1"),
		ChargeStatus2: utils.ParseFloatSignal(decoded, "ChargeStatus2"),
	}

	// Add to batch processor
	AddACULV1ToBatch(d)

	payload := buildPayload("aculv1", t, map[string]interface{}{
		"charge_status1": d.ChargeStatus1,
		"charge_status2": d.ChargeStatus2,
	})
	broadcastTelemetry(payload)
}

// processACULV2Data handles frame ID 41 using the ACULV2_Data type.
func processACULV2Data(decoded map[string]string) {
	t := time.Now()
	d := types.ACULV2_Data{
		Timestamp:     t,
		ChargeRequest: utils.ParseIntSignal(decoded, "ChargeRequest"),
	}

	// Add to batch processor
	AddACULV2ToBatch(d)

	payload := buildPayload("aculv2", t, map[string]interface{}{
		"charge_request": d.ChargeRequest,
	})
	broadcastTelemetry(payload)
}

// processGPSBestPosData handles frame ID 80 using the GPSBestPos_Data type.
func processGPSBestPosData(decoded map[string]string) {
	t := time.Now()
	d := types.GPSBestPos_Data{
		Timestamp:    t,
		Latitude:     utils.ParseFloatSignal(decoded, "Latitude"),
		Longitude:    utils.ParseFloatSignal(decoded, "Longitude"),
		Altitude:     utils.ParseFloatSignal(decoded, "Altitude"),
		StdLatitude:  utils.ParseFloatSignal(decoded, "StdLatitude"),
		StdLongitude: utils.ParseFloatSignal(decoded, "StdLongitude"),
		StdAltitude:  utils.ParseFloatSignal(decoded, "StdAltitude"),
		GPSStatus:    utils.ParseIntSignal(decoded, "GPSStatus"),
	}

	// Add to batch processor
	AddGPSBestPosToBatch(d)

	payload := buildPayload("gps_best_pos", t, map[string]interface{}{
		"latitude":      d.Latitude,
		"longitude":     d.Longitude,
		"altitude":      d.Altitude,
		"std_latitude":  d.StdLatitude,
		"std_longitude": d.StdLongitude,
		"std_altitude":  d.StdAltitude,
		"gps_status":    d.GPSStatus,
	})
	broadcastTelemetry(payload)
}

// processINS_GPS_Data handles frame ID 81 using the INS_GPS_Data type.
func processINS_GPS_Data(decoded map[string]string) {
	t := time.Now()
	d := types.INS_GPS_Data{
		Timestamp:   t,
		GNSSWeek:    utils.ParseIntSignal(decoded, "GNSSWeek"),
		GNSSSeconds: utils.ParseFloatSignal(decoded, "GNSSSeconds"),
		GNSSLat:     utils.ParseFloatSignal(decoded, "GNSSLat"),
		GNSSLong:    utils.ParseFloatSignal(decoded, "GNSSLong"),
		GNSSHeight:  utils.ParseFloatSignal(decoded, "GNSSHeight"),
	}

	// Add to batch processor
	AddINSGPSToBatch(d)

	payload := buildPayload("ins_gps", t, map[string]interface{}{
		"gnss_week":    d.GNSSWeek,
		"gnss_seconds": d.GNSSSeconds,
		"gnss_lat":     d.GNSSLat,
		"gnss_long":    d.GNSSLong,
		"gnss_height":  d.GNSSHeight,
	})
	broadcastTelemetry(payload)
}

// processINS_IMUData handles frame ID 82 using the INS_IMU_Data type.
func processINS_IMUData(decoded map[string]string) {
	t := time.Now()
	d := types.INS_IMU_Data{
		Timestamp: t,
		NorthVel:  utils.ParseFloatSignal(decoded, "NorthVel"),
		EastVel:   utils.ParseFloatSignal(decoded, "EastVel"),
		UpVel:     utils.ParseFloatSignal(decoded, "UpVel"),
		Roll:      utils.ParseFloatSignal(decoded, "Roll"),
		Pitch:     utils.ParseFloatSignal(decoded, "Pitch"),
		Azimuth:   utils.ParseFloatSignal(decoded, "Azimuth"),
		Status:    utils.ParseIntSignal(decoded, "Status"),
	}

	// Add to batch processor
	AddINSIMUToBatch(d)

	payload := buildPayload("ins_imu", t, map[string]interface{}{
		"north_vel": d.NorthVel,
		"east_vel":  d.EastVel,
		"up_vel":    d.UpVel,
		"roll":      d.Roll,
		"pitch":     d.Pitch,
		"azimuth":   d.Azimuth,
		"status":    d.Status,
	})
	broadcastTelemetry(payload)
}

// processFrontFrequencyData handles frame ID 101 using the FrontFrequency_Data type.
func processFrontFrequencyData(decoded map[string]string) {
	t := time.Now()
	d := types.FrontFrequency_Data{
		Timestamp:  t,
		RearRight:  utils.ParseFloatSignal(decoded, "RearRight"),
		FrontRight: utils.ParseFloatSignal(decoded, "FrontRight"),
		RearLeft:   utils.ParseFloatSignal(decoded, "RearLeft"),
		FrontLeft:  utils.ParseFloatSignal(decoded, "FrontLeft"),
	}

	// Add to batch processor
	AddFrontFrequencyToBatch(d)

	payload := buildPayload("front_frequency", t, map[string]interface{}{
		"rear_right":  d.RearRight,
		"front_right": d.FrontRight,
		"rear_left":   d.RearLeft,
		"front_left":  d.FrontLeft,
	})
	broadcastTelemetry(payload)
}

// processRearFrequencyData handles frame ID 102 using the RearFrequency_Data type.
func processRearFrequencyData(decoded map[string]string) {
	t := time.Now()
	d := types.RearFrequency_Data{
		Timestamp: t,
		Freq1:     utils.ParseFloatSignal(decoded, "Freq1"),
		Freq2:     utils.ParseFloatSignal(decoded, "Freq2"),
		Freq3:     utils.ParseFloatSignal(decoded, "Freq3"),
		Freq4:     utils.ParseFloatSignal(decoded, "Freq4"),
	}

	// Add to batch processor
	AddRearFrequencyToBatch(d)

	payload := buildPayload("rear_frequency", t, map[string]interface{}{
		"freq1": d.Freq1,
		"freq2": d.Freq2,
		"freq3": d.Freq3,
		"freq4": d.Freq4,
	})
	broadcastTelemetry(payload)
}

// processPDM1Data handles frame ID 1280 using the PDM1_Data type.
func processPDM1Data(decoded map[string]string) {
	t := time.Now()
	d := types.PDM1_Data{
		Timestamp:           t,
		CompoundID:          utils.ParseIntSignal(decoded, "CompoundID"),
		PDMIntTemperature:   utils.ParseIntSignal(decoded, "PDMIntTemperature"),
		PDMBattVoltage:      utils.ParseFloatSignal(decoded, "PDMBattVoltage"),
		GlobalErrorFlag:     utils.ParseIntSignal(decoded, "GlobalErrorFlag"),
		TotalCurrent:        utils.ParseIntSignal(decoded, "TotalCurrent"),
		InternalRailVoltage: utils.ParseFloatSignal(decoded, "InternalRailVoltage"),
		ResetSource:         utils.ParseIntSignal(decoded, "ResetSource"),
	}

	// Add to batch processor
	AddPDM1ToBatch(d)

	payload := buildPayload("pdm1", t, map[string]interface{}{
		"compound_id":           d.CompoundID,
		"pdm_int_temperature":   d.PDMIntTemperature,
		"pdm_batt_voltage":      d.PDMBattVoltage,
		"global_error_flag":     d.GlobalErrorFlag,
		"total_current":         d.TotalCurrent,
		"internal_rail_voltage": d.InternalRailVoltage,
		"reset_source":          d.ResetSource,
	})
	broadcastTelemetry(payload)
}

// processFrontAeroData handles frame ID 1536 using the FrontAero_Data type.
func processFrontAeroData(decoded map[string]string) {
	t := time.Now()
	d := types.FrontAero_Data{
		Timestamp:    t,
		Pressure1:    utils.ParseIntSignal(decoded, "Pressure1"),
		Pressure2:    utils.ParseIntSignal(decoded, "Pressure2"),
		Pressure3:    utils.ParseIntSignal(decoded, "Pressure3"),
		Temperature1: utils.ParseIntSignal(decoded, "Temperature1"),
		Temperature2: utils.ParseIntSignal(decoded, "Temperature2"),
		Temperature3: utils.ParseIntSignal(decoded, "Temperature3"),
	}

	// Add to batch processor
	AddFrontAeroToBatch(d)

	payload := buildPayload("front_aero", t, map[string]interface{}{
		"pressure1":    d.Pressure1,
		"pressure2":    d.Pressure2,
		"pressure3":    d.Pressure3,
		"temperature1": d.Temperature1,
		"temperature2": d.Temperature2,
		"temperature3": d.Temperature3,
	})
	broadcastTelemetry(payload)
}

// processRearAeroData handles frame ID 1537 using the RearAero_Data type.
func processRearAeroData(decoded map[string]string) {
	t := time.Now()
	d := types.RearAero_Data{
		Timestamp:    t,
		Pressure1:    utils.ParseIntSignal(decoded, "Pressure1"),
		Pressure2:    utils.ParseIntSignal(decoded, "Pressure2"),
		Pressure3:    utils.ParseIntSignal(decoded, "Pressure3"),
		Temperature1: utils.ParseIntSignal(decoded, "Temperature1"),
		Temperature2: utils.ParseIntSignal(decoded, "Temperature2"),
		Temperature3: utils.ParseIntSignal(decoded, "Temperature3"),
	}

	// Add to batch processor
	AddRearAeroToBatch(d)

	payload := buildPayload("rear_aero", t, map[string]interface{}{
		"pressure1":    d.Pressure1,
		"pressure2":    d.Pressure2,
		"pressure3":    d.Pressure3,
		"temperature1": d.Temperature1,
		"temperature2": d.Temperature2,
		"temperature3": d.Temperature3,
	})
	broadcastTelemetry(payload)
}

// processEncoderData handles frame ID 200 using the Encoder_Data type.
func processEncoderData(decoded map[string]string) {
	t := time.Now()
	d := types.Encoder_Data{
		Timestamp: t,
		Encoder1:  utils.ParseIntSignal(decoded, "Encoder1"),
		Encoder2:  utils.ParseIntSignal(decoded, "Encoder2"),
		Encoder3:  utils.ParseIntSignal(decoded, "Encoder3"),
		Encoder4:  utils.ParseIntSignal(decoded, "Encoder4"),
	}

	// Add to batch processor
	AddEncoderToBatch(d)

	payload := buildPayload("encoder", t, map[string]interface{}{
		"encoder1": d.Encoder1,
		"encoder2": d.Encoder2,
		"encoder3": d.Encoder3,
		"encoder4": d.Encoder4,
	})
	broadcastTelemetry(payload)
}

// processRearAnalogData handles frame ID 258 using the RearAnalog_Data type.
func processRearAnalogData(decoded map[string]string) {
	t := time.Now()
	d := types.RearAnalog_Data{
		Timestamp: t,
		Analog1:   utils.ParseIntSignal(decoded, "Analog1"),
		Analog2:   utils.ParseIntSignal(decoded, "Analog2"),
		Analog3:   utils.ParseIntSignal(decoded, "Analog3"),
		Analog4:   utils.ParseIntSignal(decoded, "Analog4"),
		Analog5:   utils.ParseIntSignal(decoded, "Analog5"),
		Analog6:   utils.ParseIntSignal(decoded, "Analog6"),
		Analog7:   utils.ParseIntSignal(decoded, "Analog7"),
		Analog8:   utils.ParseIntSignal(decoded, "Analog8"),
	}

	// Add to batch processor
	AddRearAnalogToBatch(d)

	payload := buildPayload("rear_analog", t, map[string]interface{}{
		"analog1": d.Analog1,
		"analog2": d.Analog2,
		"analog3": d.Analog3,
		"analog4": d.Analog4,
		"analog5": d.Analog5,
		"analog6": d.Analog6,
		"analog7": d.Analog7,
		"analog8": d.Analog8,
	})
	broadcastTelemetry(payload)
}

// processBamocarTxData handles frame ID 385 using the BamocarTxData_Data type.
func processBamocarTxData(decoded map[string]string) {
	t := time.Now()
	d := types.BamocarTxData_Data{
		Timestamp: t,
		REGID:     utils.ParseIntSignal(decoded, "REGID"),
		Data:      utils.ParseIntSignal(decoded, "Data"),
	}

	// Add to batch processor
	AddBamocarTxToBatch(d)

	payload := buildPayload("bamocar_tx_data", t, map[string]interface{}{
		"regid": d.REGID,
		"data":  d.Data,
	})
	broadcastTelemetry(payload)
}

// processBamoCarReTransmitData handles frame ID 600 using the BamoCarReTransmit_Data type.
func processBamoCarReTransmitData(decoded map[string]string) {
	t := time.Now()
	d := types.BamoCarReTransmit_Data{
		Timestamp:      t,
		MotorTemp:      utils.ParseIntSignal(decoded, "MotorTemp"),
		ControllerTemp: utils.ParseIntSignal(decoded, "ControllerTemp"),
	}

	// Add to batch processor
	AddBamoCarReTransmitToBatch(d)

	payload := buildPayload("bamo_car_re_transmit", t, map[string]interface{}{
		"motor_temp":      d.MotorTemp,
		"controller_temp": d.ControllerTemp,
	})
	broadcastTelemetry(payload)
}

// processPDMCurrentData handles frame ID 1312 using the PDMCurrent_Data type.
func processPDMCurrentData(decoded map[string]string) {
	t := time.Now()
	d := types.PDMCurrent_Data{
		Timestamp:            t,
		AccumulatorCurrent:   utils.ParseIntSignal(decoded, "AccumulatorCurrent"),
		TCUCurrent:           utils.ParseIntSignal(decoded, "TCUCurrent"),
		BamocarCurrent:       utils.ParseIntSignal(decoded, "BamocarCurrent"),
		PumpsCurrent:         utils.ParseIntSignal(decoded, "PumpsCurrent"),
		TSALCurrent:          utils.ParseIntSignal(decoded, "TSALCurrent"),
		DAQCurrent:           utils.ParseIntSignal(decoded, "DAQCurrent"),
		DisplayKvaserCurrent: utils.ParseIntSignal(decoded, "DisplayKvaserCurrent"),
		ShutdownResetCurrent: utils.ParseIntSignal(decoded, "ShutdownResetCurrent"),
	}

	// Add to batch processor
	AddPDMCurrentToBatch(d)

	payload := buildPayload("pdm_current", t, map[string]interface{}{
		"accumulator_current":    d.AccumulatorCurrent,
		"tcu_current":            d.TCUCurrent,
		"bamocar_current":        d.BamocarCurrent,
		"pumps_current":          d.PumpsCurrent,
		"tsal_current":           d.TSALCurrent,
		"daq_current":            d.DAQCurrent,
		"display_kvaser_current": d.DisplayKvaserCurrent,
		"shutdown_reset_current": d.ShutdownResetCurrent,
	})
	broadcastTelemetry(payload)
}

// processFrontStrainGauges1Data handles frame ID 1552 using the FrontStrainGauges1_Data type.
func processFrontStrainGauges1Data(decoded map[string]string) {
	t := time.Now()
	d := types.FrontStrainGauges1_Data{
		Timestamp: t,
		Gauge1:    utils.ParseIntSignal(decoded, "Gauge1"),
		Gauge2:    utils.ParseIntSignal(decoded, "Gauge2"),
		Gauge3:    utils.ParseIntSignal(decoded, "Gauge3"),
		Gauge4:    utils.ParseIntSignal(decoded, "Gauge4"),
		Gauge5:    utils.ParseIntSignal(decoded, "Gauge5"),
		Gauge6:    utils.ParseIntSignal(decoded, "Gauge6"),
	}

	// Add to batch processor
	AddFrontStrainGauges1ToBatch(d)

	payload := buildPayload("front_strain_gauges_1", t, map[string]interface{}{
		"gauge1": d.Gauge1,
		"gauge2": d.Gauge2,
		"gauge3": d.Gauge3,
		"gauge4": d.Gauge4,
		"gauge5": d.Gauge5,
		"gauge6": d.Gauge6,
	})
	broadcastTelemetry(payload)
}

// processFrontStrainGauges2Data handles frame ID 1553 using the FrontStrainGauges2_Data type.
func processFrontStrainGauges2Data(decoded map[string]string) {
	t := time.Now()
	d := types.FrontStrainGauges2_Data{
		Timestamp: t,
		Gauge1:    utils.ParseIntSignal(decoded, "Gauge1"),
		Gauge2:    utils.ParseIntSignal(decoded, "Gauge2"),
		Gauge3:    utils.ParseIntSignal(decoded, "Gauge3"),
		Gauge4:    utils.ParseIntSignal(decoded, "Gauge4"),
		Gauge5:    utils.ParseIntSignal(decoded, "Gauge5"),
		Gauge6:    utils.ParseIntSignal(decoded, "Gauge6"),
	}

	// Add to batch processor
	AddFrontStrainGauges2ToBatch(d)

	payload := buildPayload("front_strain_gauges_2", t, map[string]interface{}{
		"gauge1": d.Gauge1,
		"gauge2": d.Gauge2,
		"gauge3": d.Gauge3,
		"gauge4": d.Gauge4,
		"gauge5": d.Gauge5,
		"gauge6": d.Gauge6,
	})
	broadcastTelemetry(payload)
}

// processPDMReTransmitData handles frame ID 1680 using the PDMReTransmit_Data type.
func processPDMReTransmitData(decoded map[string]string) {
	t := time.Now()
	d := types.PDMReTransmit_Data{
		Timestamp:           t,
		PDMIntTemperature:   utils.ParseIntSignal(decoded, "PDMIntTemperature"),
		PDMBattVoltage:      utils.ParseFloatSignal(decoded, "PDMBattVoltage"),
		GlobalErrorFlag:     utils.ParseIntSignal(decoded, "GlobalErrorFlag"),
		TotalCurrent:        utils.ParseIntSignal(decoded, "TotalCurrent"),
		InternalRailVoltage: utils.ParseFloatSignal(decoded, "InternalRailVoltage"),
		ResetSource:         utils.ParseIntSignal(decoded, "ResetSource"),
	}

	// Add to batch processor
	AddPDMReTransmitToBatch(d)

	payload := buildPayload("pdm_re_transmit", t, map[string]interface{}{
		"pdm_int_temperature":   d.PDMIntTemperature,
		"pdm_batt_voltage":      d.PDMBattVoltage,
		"global_error_flag":     d.GlobalErrorFlag,
		"total_current":         d.TotalCurrent,
		"internal_rail_voltage": d.InternalRailVoltage,
		"reset_source":          d.ResetSource,
	})
	broadcastTelemetry(payload)
}
