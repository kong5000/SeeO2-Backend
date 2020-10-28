const deleteAllAlerts = (db, options) => {
  return db.query(`
    DELETE FROM alerts
    Where users_id = $1;
  `, [options.users_id])
  .then((res) => res.rows)
};

module.exports = deleteAllAlerts;