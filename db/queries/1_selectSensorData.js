const selectSensorData = (db, options) => {
  return db.query(`
    SELECT *, TO_CHAR(sensor_data.date, 'Month, DD, HH12:MI') as date FROM sensors
    JOIN sensor_data ON sensors.id = sensor_data.sensors_id
    WHERE sensors.id = $1
    ORDER BY sensor_data.date DESC;
  `, [options.sensors_id])
  .then((res) => res.rows)
};

module.exports = selectSensorData;