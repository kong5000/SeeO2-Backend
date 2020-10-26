const updateSensorSafe = (db, options) => {
  return db.query(`
    UPDATE sensors
    SET safe = $1
    WHERE id = $2;
  `, [options.safe, options.id])
  .then((res) => res.rows)
};

module.exports = updateSensorSafe;