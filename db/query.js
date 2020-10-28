const selectSensorData = require('./queries/1_selectSensorData');
const selectSensorAlerts = require('./queries/2_selectSensorAlerts');
const selectAllSensors = require('./queries/3_selectAllSensors');
const insertSensorData = require('./queries/4_insertSensorData');
const updateSensorSafe = require('./queries/5_updateSensorSafe.js');
const insertAlert = require('./queries/6_insertAlert.js');
const insertSensor = require('./queries/7_insertSensor.js');
const deleteAlert = require('./queries/8_deleteAlert');
const deleteAllAlerts = require('./queries/9_deleteAllAlerts');

module.exports = {
  selectAllSensors,
  selectSensorAlerts,
  selectSensorData,
  insertSensorData,
  updateSensorSafe,
  insertAlert,
  insertSensor,
  deleteAlert,
  deleteAllAlerts
}