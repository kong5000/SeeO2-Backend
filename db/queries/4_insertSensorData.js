const insertSensorData = (db, options) => {
  return db.query(`
    INSERT INTO sensor_data(sensors_id, co2, tvoc, pm25)
    VALUES ($1, $2, $3, $4);
  `, [options.sensors_id, options.co2, options.tvoc, options.pm25])
  .then((res) => res.rows)
};

module.exports = insertSensorData;