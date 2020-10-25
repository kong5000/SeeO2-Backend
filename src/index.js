require('dotenv').config()
const express = require("express");
const app = express();
const bodyParser = require("body-parser")
const axios = require("axios")

const PORT = 3001

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
  //Database access required here
})

app.listen(PORT, async () => {
  console.log(`Server listening on port ${PORT}!`)
  //Maybe some code here to periodically read arduino sensors and update the database
});