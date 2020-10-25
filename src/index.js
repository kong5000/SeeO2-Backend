require('dotenv').config()
const express = require("express");
const app = express();
const bodyParser = require("body-parser")
const axios = require("axios")
const { Pool } = require('pg');
const db = new Pool({
  connectionString: process.env.DB_URL
})
db.connect()
const queries = require('../db/query');
const { response } = require('express');

const PORT = 8001

//Get latest sensor reading
//Hard coded switch statement will work for small number of arduinos. Need to refactor if registering new sensor stretch goal is desired.
app.get("/:id", async (req, res) => {
  const id = req.params.id
  let sensorServerURL = ""
  switch (id) {
    case "1":
      sensorServerURL = "https://arduinokeith123.loca.lt"
      break;
    case "2":
      sensorServerURL = "https://arduinomark123.loca.lt"
      break;
    case "3":
      sensorServerURL = "https://arduinojayden123.loca.lt"
      break;
    default:
      return res.status(400).send({
        message: `No sensor with id ${id} found`
      })
  }
  try{
    const sensorResponse = await axios.get(sensorServerURL, { timeout: 3000 })
    console.log(sensorResponse.data)
    res.send(sensorResponse.data)
  }catch(e){
    res.status(400).send({
      message: 'Could not connect to sensor server'
    })
    console.log(e.message)
  }
});

//Get historical sensor data
app.get("/:id/history", async (req, res) => {
  queries.selectSensorData(db, {sensors_id: req.params.id})
  .then((results)=>{
    res.send(results)
  })
  .catch((err)=>{
    res.send(err)
  })
})

app.listen(PORT, async () => {
  console.log(`Server listening on port ${PORT}!\n`)

  //Find and query all sensors every ten minutes
  const queryTimer = setInterval(()=>{
    queries.selectAllSensors(db)
    .then((response)=>{

      //Query each sensor
      response.forEach(sensor => {
        querySensor(sensor);
      });
    })
  }, 600000)
});

//Function that queries a sensor, inserts data if connected, and emails users if co2 levels are to high
const querySensor = async (sensor)=>{
  console.log(`Connecting to ${sensor.name}'s sensor at ${sensor.url}...\n`)
  
  axios.get(sensor.url, { timeout: 3000 })
  .then((sensorResponse)=>{
    //Insert the response data to the database
    console.log(`Successfully connected to ${sensor.name}'s sensor at ${sensor.url}. Querying and inserting data...\n`);

    queries.insertSensorData(db, {sensors_id: sensor.id, co2: sensorResponse.data.co2, tvoc: sensorResponse.data.tvoc})
    .then((response)=>{
      console.log(`Successfully inserted data: Co2:${sensorResponse.data.co2} Tvoc:${sensorResponse.data.tvoc}\n`)
    })
    .catch((err)=>{
      console.log(`Failed inserting data:\n-----Response:-----\n ${err}\n`)
    })

    //If the co2 level is to high, alert users
    if(sensorResponse.data.co2 > 200){
      console.log('Co2 levels to high, alerting users...');

      queries.selectSensorAlerts(db, {sensors_id: 1})
      .then((response)=>{
        //Will email users
        console.log(response);
      })
      .catch((err)=>{
        console.log(err);
      });

    }
  })
  .catch((err)=>{
    console.log(`Failed to connect to ${sensor.name}'s sensor at ${sensor.url}\n-----Response:-----\n ${err}\n`);
  })
}