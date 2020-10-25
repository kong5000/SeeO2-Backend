const insertSensorData = (db, options) => {
  return db.query(`
    INSERT INTO sensor_data(sensors_id, co2, tvoc)
    VALUES ($1, $2, $3);
  `, [options.sensors_id, options.co2, options.tvoc])
  .then((res) => res.rows)
};

module.exports = insertSensorData;