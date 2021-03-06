const selectSensorData = (db) => {
  return db.query(`
  SELECT sensors.*,
  (SELECT co2 FROM sensor_data WHERE sensors_id = sensors.id ORDER BY date DESC LIMIT 1),
  (SELECT tvoc FROM sensor_data WHERE sensors_id = sensors.id ORDER BY date DESC LIMIT 1),
  (SELECT pm25 FROM sensor_data WHERE sensors_id = sensors.id ORDER BY date DESC LIMIT 1),
  (SELECT pm10 FROM sensor_data WHERE sensors_id = sensors.id ORDER BY date DESC LIMIT 1),
  (SELECT date FROM sensor_data WHERE sensors_id = sensors.id ORDER BY date DESC LIMIT 1) as last_checked 
  FROM SENSORS
  WHERE NOT name = '';
  `)
  .then((res) => res.rows)
};

module.exports = selectSensorData;