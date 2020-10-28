const deleteAlert = (db, options) => {
  return db.query(`
    DELETE FROM alerts
    WHERE sensors_id = $1
    AND users_id = $2;
  `, [options.sensors_id, options.users_id])
  .then((res) => res.rows)
};

module.exports = deleteAlert;