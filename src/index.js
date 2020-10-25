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
const nodeMailer = require('nodemailer');
const transporter = nodeMailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'jaydenrtucker@gmail.com',
    pass: process.argv[3]
  }
});
const chalk = require('chalk');

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
  console.log(`Connecting to ${chalk.inverse(sensor.name)}'s sensor at ${chalk.inverse(sensor.url)}...\n`)
  
  axios.get(sensor.url, { timeout: 3000 })
  .then((sensorResponse)=>{
    //Insert the response data to the database
    console.log(chalk.green(`Successfully connected to ${chalk.inverse(sensor.name)}'s sensor at ${chalk.inverse(sensor.url)}. Querying and inserting data...\n`));

    queries.insertSensorData(db, {sensors_id: sensor.id, co2: sensorResponse.data.co2, tvoc: sensorResponse.data.tvoc})
    .then((response)=>{
      console.log(chalk.green(`Successfully inserted data for ${chalk.inverse(sensor.name)}'s sensor: Co2:${chalk.inverse(sensorResponse.data.co2)} Tvoc:${chalk.inverse(sensorResponse.data.tvoc)}\n`))
    })
    .catch((err)=>{
      console.log(chalk.red(`Failed inserting data:\n-----Response:-----\n ${err}\n`));
    })

    //If the co2 level is to high, alert users
    if(sensorResponse.data.co2 > 400){
      console.log(chalk.yellow(`Co2 levels to high for ${chalk.inverse(sensor.name)}'s senser, alerting users...`));

      queries.selectSensorAlerts(db, {sensors_id: sensor.id})
      .then((response)=>{
        //Will email users
        response.forEach((user)=>{
          emailUser(user)
        })
      })
      .catch((err)=>{
        console.log(chalk.inverse(err));
      });

    }
  })
  .catch((err)=>{
    console.log(chalk.red(`Failed to connect to ${chalk.inverse(sensor.name)}'s sensor at ${chalk.inverse(sensor.url)}\n-----Response:-----\n ${err}\n`));
  })
}

//Email users taht the co2 levels are bad
const emailUser = (user)=>{
  const mailOptions = {
    from: 'jaydenrtucker@gmail.com',
    to: user.email,
    subject: 'Chinese communist party',
    html: `<h1>BAD AIR</h1>`
  };
  transporter.sendMail(mailOptions, (error, info)=>{
    if (error) {
      console.log(chalk.red(`Failed to send email to ${chalk.inverse(user.email)} \n-----Response-----\n ${error}`));
    } else {
      console.log('Email sent: ' + chalk.inverse(info.response));
    }
  });
}