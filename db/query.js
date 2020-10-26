const selectSensorData = require('./queries/1_selectSensorData');
const selectSensorAlerts = require('./queries/2_selectSensorAlerts');
const selectAllSensors = require('./queries/3_selectAllSensors');
const insertSensorData = require('./queries/4_insertSensorData');
const updateSensorSafe = require('./queries/5_updateSensorSafe.js');

module.exports = {
  selectAllSensors,
  selectSensorAlerts,
  selectSensorData,
  insertSensorData,
  updateSensorSafe
}