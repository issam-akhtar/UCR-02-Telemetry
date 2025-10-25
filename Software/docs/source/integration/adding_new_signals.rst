Adding New Signals
=================

This document provides a step-by-step guide for adding new signals to the UCR-02-Telemetry system.

Introduction
-----------

Adding new signals to the UCR-02-Telemetry system involves multiple steps across the data pipeline. This guide provides a comprehensive walkthrough of the end-to-end process.

End-to-End Process
----------------

1. DBC Update
~~~~~~~~~~~

First, update the DBC file with the new signal definitions:

.. code-block:: text

   BO_ 203 NewSensor: 8 ECU
   SG_ temperature : 0|16@1+ (0.1,-40) [-40|150] "°C" Vector__XXX
   SG_ pressure : 16|16@1+ (0.01,0) [0|1000] "kPa" Vector__XXX

2. Generate JSON Configuration
~~~~~~~~~~~~~~~~~~~~~~~~~~~

Convert the updated DBC to JSON:

.. code-block:: bash

   python scripts/convert_dbc_to_json.py --dbc=configs/UCR-01.dbc --output=configs/UCR-01.json

3. Add Signal Processing
~~~~~~~~~~~~~~~~~~~~~

Update ``pkg/processdata/processdata.go`` to handle the new signals:

.. code-block:: go

   case 203: // NewSensor
       processNewSensorData(decoded)

   // Add the handler function
   func processNewSensorData(decoded map[string]interface{}) {
       record := &types.NewSensorData{
           Temperature: getFloat(decoded, "temperature"),
           Pressure: getFloat(decoded, "pressure"),
           Timestamp: time.Now().UTC(),
       }
       AddNewSensorDataToBatch(record)
   }

4. Create Type Definition
~~~~~~~~~~~~~~~~~~~~~~

Add the new type in ``pkg/types/types.go``:

.. code-block:: go

   type NewSensorData struct {
       Temperature float64   `json:"temperature"`
       Pressure    float64   `json:"pressure"`
       Timestamp   time.Time `json:"timestamp"`
   }

5. Add Database Table
~~~~~~~~~~~~~~~~~~

Create a new table in ``db/telem_data.sql``:

.. code-block:: sql

   CREATE TABLE IF NOT EXISTS new_sensor_data (
       id SERIAL PRIMARY KEY,
       temperature FLOAT NOT NULL,
       pressure FLOAT NOT NULL,
       timestamp TIMESTAMPTZ NOT NULL
   );
   
   -- Create TimescaleDB hypertable
   SELECT create_hypertable('new_sensor_data', 'timestamp', if_not_exists => TRUE);

6. Implement DB Operations
~~~~~~~~~~~~~~~~~~~~~~~

Add database functions in ``pkg/db/db.go``:

.. code-block:: go

   // InsertNewSensorDataBatch inserts a batch of new sensor records
   func (db *DB) InsertNewSensorDataBatch(records []*types.NewSensorData) error {
       // Implementation for batch insert
   }

7. Update Batch Processing
~~~~~~~~~~~~~~~~~~~~~~~

Add batch operation in ``pkg/processdata/processdata.go``:

.. code-block:: go

   // AddNewSensorDataToBatch adds a record to the batch
   func AddNewSensorDataToBatch(record *types.NewSensorData) {
       newSensorBatchMutex.Lock()
       defer newSensorBatchMutex.Unlock()
       
       newSensorBatch = append(newSensorBatch, record)
       
       if len(newSensorBatch) >= batchSize {
           FlushNewSensorBatch()
       }
   }
   
   // FlushNewSensorBatch sends the batch to the database
   func FlushNewSensorBatch() {
       // Implementation for flushing batch
   }

8. Add REST API Endpoint
~~~~~~~~~~~~~~~~~~~~~

Create an API endpoint in ``internal/handlers/historical.go``:

.. code-block:: go

   // GetNewSensorData returns historical new sensor data
   func (h *Handler) GetNewSensorData(c *gin.Context) {
       // Implementation for retrieving historical data
   }

9. Add Protobuf Definition
~~~~~~~~~~~~~~~~~~~~~~~

Update ``proto/telemetry.proto`` with the new message type:

.. code-block:: protobuf

   message NewSensorData {
       float temperature = 1;
       float pressure = 2;
       string time = 3;
   }

10. Update Frontend
~~~~~~~~~~~~~~~

Add frontend components to display the new data:

.. code-block:: jsx

   // Import the hook
   import { useRealTimeData } from "../hooks/useRealTimeData";
   
   function NewSensorDisplay() {
       const newSensorData = useRealTimeData("new_sensor_data");
       
       return (
           <div>
               <h3>New Sensor Data</h3>
               <p>Temperature: {newSensorData?.temperature} °C</p>
               <p>Pressure: {newSensorData?.pressure} kPa</p>
           </div>
       );
   }

Testing New Signals
-----------------

To verify your new signals:

1. Start the telemetry server
2. Use the CSV simulator to send test data
3. Check the database for proper data storage
4. Verify real-time updates in the frontend

Troubleshooting
-------------

Common issues:

* **Signal not appearing**: Check DBC JSON conversion and frame ID handling
* **Database errors**: Verify table schema matches the Go struct
* **Frontend not updating**: Check WebSocket subscription and component props