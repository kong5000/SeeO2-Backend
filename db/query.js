const selectSensorData = require('./queries/1_selectSensorData');
const selectSensorAlerts = require('./queries/2_selectSensorAlerts');
const selectAllSensors = require('./queries/3_selectAllSensors');

module.exports = {
  selectAllSensors,
  selectSensorAlerts,
  selectSensorData
}