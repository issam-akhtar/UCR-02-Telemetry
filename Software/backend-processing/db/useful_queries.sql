-- Retrieve all rows and columns from the tcu_data table
SELECT * FROM tcu_data;

-- Extract the epoch time (seconds since 1970-01-01) from the timestamp and truncate to two decimal places
SELECT EXTRACT(EPOCH FROM timestamp) as epoch_seconds,
       ROUND(EXTRACT(EPOCH FROM timestamp) * 100) / 100 as truncated_seconds
FROM tcu_data;

-- Format the timestamp to display just the seconds and microseconds
SELECT TO_CHAR(timestamp, 'SS.US') as readable_seconds
FROM tcu_data;

-- Calculate total seconds by converting minutes to seconds and adding the seconds part
SELECT EXTRACT(MINUTE FROM timestamp) * 60 +
       EXTRACT(SECOND FROM timestamp) as total_seconds
FROM tcu_data;

-- Common Table Expression (CTE) to find the minimum timestamp, which will act as the zero point
WITH base_time AS (
    SELECT MIN(timestamp) as zero_time
    FROM tcu_data
)
-- Main query to calculate the zero-based seconds
SELECT 
    -- Calculate the seconds since the zero point for each timestamp
    EXTRACT(EPOCH FROM timestamp) - EXTRACT(EPOCH FROM base_time.zero_time) as zero_based_seconds, 
    -- Include your data column (replace 'your_data_column' with the actual column name)
    timestamp
FROM tcu_data, base_time;


