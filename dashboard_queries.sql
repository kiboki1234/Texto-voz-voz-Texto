/*
Consultas base para el Dashboard Meteorologico UPEC.

Estas consultas estan pensadas para leer la base clonada de YDOC Insight sin
modificarla. Pueden convertirse en vistas, endpoints de backend o consultas de
un dashboard tipo React API.
*/

USE [Insights];
GO

/* 1. Perfil rapido de tablas utiles */
SELECT
    t.name AS table_name,
    SUM(ps.row_count) AS row_count
FROM sys.tables t
JOIN sys.dm_db_partition_stats ps
    ON ps.object_id = t.object_id
   AND ps.index_id IN (0, 1)
WHERE t.is_ms_shipped = 0
GROUP BY t.name
ORDER BY SUM(ps.row_count) DESC, t.name;
GO

/* 2. Estaciones para mapa/listado */
SELECT
    l.LOCID AS station_id,
    l.LOCNAME AS station_name,
    l.LOCCODE AS station_code,
    l.DAQCODE AS device_code,
    da.DESCRIPTION AS rtu_info,
    MAX(rv.TIMEOFMEASUREMENT) AS latest_time,
    COUNT(DISTINCT t.TAGID) AS tag_count
FROM dbo.locations l
LEFT JOIN dbo.DigitalAssets da
    ON da.LOCID = l.LOCID
   AND da.ASSETNAME = 'RTUINFO'
LEFT JOIN dbo.tags t
    ON t.LOCID = l.LOCID
LEFT JOIN dbo.recentvalues rv
    ON rv.TAGID = t.TAGID
WHERE l.LOCID <> 2
GROUP BY
    l.LOCID,
    l.LOCNAME,
    l.LOCCODE,
    l.DAQCODE,
    da.DESCRIPTION
ORDER BY l.LOCNAME;
GO

/* 3. Catalogo de variables por estacion */
SELECT
    l.LOCID AS station_id,
    l.LOCNAME AS station_name,
    t.TAGID AS tag_id,
    t.ORDERNR AS display_order,
    t.TAGCODE AS variable_code,
    t.TAGNAME AS variable_name,
    p.PARID AS parameter_id,
    p.PARNAME AS parameter_name,
    COALESCE(p.UNIT, p.DISPUNIT,
        CASE WHEN t.TAGCODE IN ('N', 'P', 'K') THEN 'mg/Kg' END
    ) AS unit,
    CASE
        WHEN t.TAGCODE IN ('AVGTA', 'MINTA', 'MAXTA') THEN 'temperature'
        WHEN t.TAGCODE IN ('AVGRH', 'MINRH', 'MAXRH') THEN 'humidity'
        WHEN t.TAGCODE = 'PR' THEN 'rainfall'
        WHEN t.TAGCODE IN ('AVGSR', 'MINSR', 'MAXSR') THEN 'solar_radiation'
        WHEN t.TAGCODE IN ('AVGWSS', 'MINWSS', 'MAXWSS', 'AVGWSM', 'MINWSM', 'MAXWSM', 'AVGWS', 'MINWS', 'MAXWS') THEN 'wind_speed'
        WHEN t.TAGCODE IN ('AVGWDS', 'MINWDS', 'MAXWDS', 'AVGWDM', 'MINWDM', 'MAXWDM', 'AVGWD', 'MINWD', 'MAXWD') THEN 'wind_direction'
        WHEN t.TAGCODE = 'DC' THEN 'battery'
        WHEN t.TAGCODE IN ('AVGHH', 'MINHH', 'MAXHH', 'HH') THEN 'leaf_humidity'
        WHEN t.TAGCODE IN ('N', 'P', 'K') THEN 'soil_nutrients'
        ELSE 'other'
    END AS category
FROM dbo.tags t
JOIN dbo.locations l
    ON l.LOCID = t.LOCID
LEFT JOIN dbo.params p
    ON p.PARID = t.PARID
WHERE l.LOCID <> 2
ORDER BY l.LOCNAME, t.ORDERNR, t.TAGID;
GO

/* 4. Ultimos valores en formato largo, ideal para API */
SELECT
    l.LOCID AS station_id,
    l.LOCNAME AS station_name,
    rv.TIMEOFMEASUREMENT AS measured_at,
    t.TAGID AS tag_id,
    t.TAGCODE AS variable_code,
    t.TAGNAME AS variable_name,
    rv.MEASUREDVALUE AS value,
    COALESCE(p.UNIT, p.DISPUNIT,
        CASE WHEN t.TAGCODE IN ('N', 'P', 'K') THEN 'mg/Kg' END
    ) AS unit
FROM dbo.recentvalues rv
JOIN dbo.tags t
    ON t.TAGID = rv.TAGID
JOIN dbo.locations l
    ON l.LOCID = t.LOCID
LEFT JOIN dbo.params p
    ON p.PARID = t.PARID
WHERE l.LOCID <> 2
ORDER BY l.LOCNAME, t.ORDERNR, t.TAGID;
GO

/* 5. Resumen ancho por estacion para tarjetas */
WITH latest AS (
    SELECT
        l.LOCID,
        l.LOCNAME,
        t.TAGCODE,
        rv.TIMEOFMEASUREMENT,
        rv.MEASUREDVALUE
    FROM dbo.recentvalues rv
    JOIN dbo.tags t
        ON t.TAGID = rv.TAGID
    JOIN dbo.locations l
        ON l.LOCID = t.LOCID
    WHERE l.LOCID <> 2
)
SELECT
    LOCID AS station_id,
    LOCNAME AS station_name,
    MAX(TIMEOFMEASUREMENT) AS latest_time,
    MAX(CASE WHEN TAGCODE = 'AVGTA' THEN MEASUREDVALUE END) AS temperature_avg,
    MAX(CASE WHEN TAGCODE = 'MINTA' THEN MEASUREDVALUE END) AS temperature_min,
    MAX(CASE WHEN TAGCODE = 'MAXTA' THEN MEASUREDVALUE END) AS temperature_max,
    MAX(CASE WHEN TAGCODE = 'AVGRH' THEN MEASUREDVALUE END) AS humidity_avg,
    MAX(CASE WHEN TAGCODE = 'PR' THEN MEASUREDVALUE END) AS rainfall,
    MAX(CASE WHEN TAGCODE = 'AVGSR' THEN MEASUREDVALUE END) AS solar_radiation_avg,
    MAX(CASE WHEN TAGCODE IN ('AVGWSS', 'AVGWSM', 'AVGWS') THEN MEASUREDVALUE END) AS wind_speed_avg,
    MAX(CASE WHEN TAGCODE IN ('AVGWDS', 'AVGWDM', 'AVGWD') THEN MEASUREDVALUE END) AS wind_direction_avg,
    MAX(CASE WHEN TAGCODE = 'DC' THEN MEASUREDVALUE END) AS battery_voltage,
    MAX(CASE WHEN TAGCODE IN ('AVGHH', 'HH') THEN MEASUREDVALUE END) AS leaf_humidity_avg,
    MAX(CASE WHEN TAGCODE = 'N' THEN MEASUREDVALUE END) AS nitrogen,
    MAX(CASE WHEN TAGCODE = 'P' THEN MEASUREDVALUE END) AS phosphorus,
    MAX(CASE WHEN TAGCODE = 'K' THEN MEASUREDVALUE END) AS potassium
FROM latest
GROUP BY LOCID, LOCNAME
ORDER BY LOCNAME;
GO

/* 6. Historico en formato largo por estacion y rango */
DECLARE @StationId int = 102;
DECLARE @From datetime = DATEADD(DAY, -7, (SELECT MAX(TIMEOFMEASUREMENT) FROM dbo.measurements));
DECLARE @To datetime = (SELECT MAX(TIMEOFMEASUREMENT) FROM dbo.measurements);

SELECT
    l.LOCID AS station_id,
    l.LOCNAME AS station_name,
    m.TIMEOFMEASUREMENT AS measured_at,
    t.TAGID AS tag_id,
    t.TAGCODE AS variable_code,
    t.TAGNAME AS variable_name,
    m.MEASUREDVALUE AS value,
    COALESCE(p.UNIT, p.DISPUNIT,
        CASE WHEN t.TAGCODE IN ('N', 'P', 'K') THEN 'mg/Kg' END
    ) AS unit
FROM dbo.measurements m
JOIN dbo.tags t
    ON t.TAGID = m.TAGID
JOIN dbo.locations l
    ON l.LOCID = t.LOCID
LEFT JOIN dbo.params p
    ON p.PARID = t.PARID
WHERE l.LOCID = @StationId
  AND m.TIMEOFMEASUREMENT >= @From
  AND m.TIMEOFMEASUREMENT <= @To
ORDER BY m.TIMEOFMEASUREMENT, t.ORDERNR, t.TAGID;
GO

/* 7. Historico ancho tipo PDF para una estacion */
DECLARE @StationIdForPivot int = 102;
DECLARE @PivotFrom datetime = DATEADD(DAY, -1, (SELECT MAX(TIMEOFMEASUREMENT) FROM dbo.measurements));
DECLARE @PivotTo datetime = (SELECT MAX(TIMEOFMEASUREMENT) FROM dbo.measurements);

SELECT
    m.TIMEOFMEASUREMENT AS measured_at,
    MAX(CASE WHEN t.TAGCODE = 'N' THEN m.MEASUREDVALUE END) AS nitrogen,
    MAX(CASE WHEN t.TAGCODE = 'P' THEN m.MEASUREDVALUE END) AS phosphorus,
    MAX(CASE WHEN t.TAGCODE = 'K' THEN m.MEASUREDVALUE END) AS potassium,
    MAX(CASE WHEN t.TAGCODE = 'PR' THEN m.MEASUREDVALUE END) AS rainfall,
    MAX(CASE WHEN t.TAGCODE = 'DC' THEN m.MEASUREDVALUE END) AS battery_voltage,
    MAX(CASE WHEN t.TAGCODE = 'AVGTA' THEN m.MEASUREDVALUE END) AS temp_avg,
    MAX(CASE WHEN t.TAGCODE = 'MINTA' THEN m.MEASUREDVALUE END) AS temp_min,
    MAX(CASE WHEN t.TAGCODE = 'MAXTA' THEN m.MEASUREDVALUE END) AS temp_max,
    MAX(CASE WHEN t.TAGCODE = 'AVGRH' THEN m.MEASUREDVALUE END) AS humidity_avg,
    MAX(CASE WHEN t.TAGCODE = 'AVGSR' THEN m.MEASUREDVALUE END) AS solar_radiation_avg,
    MAX(CASE WHEN t.TAGCODE IN ('AVGWSS', 'AVGWSM', 'AVGWS') THEN m.MEASUREDVALUE END) AS wind_speed_avg,
    MAX(CASE WHEN t.TAGCODE IN ('AVGWDS', 'AVGWDM', 'AVGWD') THEN m.MEASUREDVALUE END) AS wind_direction_avg,
    MAX(CASE WHEN t.TAGCODE IN ('AVGHH', 'HH') THEN m.MEASUREDVALUE END) AS leaf_humidity_avg
FROM dbo.measurements m
JOIN dbo.tags t
    ON t.TAGID = m.TAGID
WHERE t.LOCID = @StationIdForPivot
  AND m.TIMEOFMEASUREMENT >= @PivotFrom
  AND m.TIMEOFMEASUREMENT <= @PivotTo
GROUP BY m.TIMEOFMEASUREMENT
ORDER BY m.TIMEOFMEASUREMENT;
GO

/* 8. Agregado horario para graficas livianas */
DECLARE @StationIdHourly int = 102;
DECLARE @HourlyFrom datetime = DATEADD(DAY, -14, (SELECT MAX(TIMEOFMEASUREMENT) FROM dbo.measurements));
DECLARE @HourlyTo datetime = (SELECT MAX(TIMEOFMEASUREMENT) FROM dbo.measurements);

SELECT
    DATEADD(HOUR, DATEDIFF(HOUR, 0, m.TIMEOFMEASUREMENT), 0) AS hour_bucket,
    l.LOCID AS station_id,
    l.LOCNAME AS station_name,
    t.TAGCODE AS variable_code,
    t.TAGNAME AS variable_name,
    AVG(m.MEASUREDVALUE) AS avg_value,
    MIN(m.MEASUREDVALUE) AS min_value,
    MAX(m.MEASUREDVALUE) AS max_value,
    COUNT(*) AS sample_count
FROM dbo.measurements m
JOIN dbo.tags t
    ON t.TAGID = m.TAGID
JOIN dbo.locations l
    ON l.LOCID = t.LOCID
WHERE l.LOCID = @StationIdHourly
  AND m.TIMEOFMEASUREMENT >= @HourlyFrom
  AND m.TIMEOFMEASUREMENT <= @HourlyTo
GROUP BY
    DATEADD(HOUR, DATEDIFF(HOUR, 0, m.TIMEOFMEASUREMENT), 0),
    l.LOCID,
    l.LOCNAME,
    t.TAGCODE,
    t.TAGNAME
ORDER BY hour_bucket, variable_code;
GO

/* 9. Validacion DER: relaciones logicas principales sin huerfanos */
SELECT 'tags.LOCID -> locations.LOCID' AS relation_name, COUNT(*) AS checked_rows,
       SUM(CASE WHEN l.LOCID IS NULL THEN 1 ELSE 0 END) AS orphan_rows
FROM dbo.tags t
LEFT JOIN dbo.locations l ON l.LOCID = t.LOCID
WHERE t.LOCID IS NOT NULL
UNION ALL
SELECT 'tags.PARID -> params.PARID', COUNT(*),
       SUM(CASE WHEN p.PARID IS NULL THEN 1 ELSE 0 END)
FROM dbo.tags t
LEFT JOIN dbo.params p ON p.PARID = t.PARID
WHERE t.PARID IS NOT NULL
UNION ALL
SELECT 'measurements.TAGID -> tags.TAGID', COUNT(*),
       SUM(CASE WHEN t.TAGID IS NULL THEN 1 ELSE 0 END)
FROM dbo.measurements m
LEFT JOIN dbo.tags t ON t.TAGID = m.TAGID
WHERE m.TAGID IS NOT NULL
UNION ALL
SELECT 'recentvalues.TAGID -> tags.TAGID', COUNT(*),
       SUM(CASE WHEN t.TAGID IS NULL THEN 1 ELSE 0 END)
FROM dbo.recentvalues rv
LEFT JOIN dbo.tags t ON t.TAGID = rv.TAGID
WHERE rv.TAGID IS NOT NULL;
GO
