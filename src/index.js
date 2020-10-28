require('dotenv').config()
const express = require("express");
const app = express();
const bodyParser = require("body-parser")
app.use(bodyParser.json())

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
    user: 'SeeO2AirQuality@gmail.com',
    pass: process.env.EMAIL_PASS
  }
});
const chalk = require('chalk');
const io = require('socket.io')(8002);

const PORT = 8001;

//When a client connects
io.on('connect', (socket)=>{

  console.log('SENDING INFO TO KNEW FREND :)');
  queries.selectAllSensors(db)
  .then((response)=>{
    socket.emit("SendSensors",response);
  })

  //When Frontend wants historical data for a sensor
  socket.on('getHistoricalData', (data)=>{
    queries.selectSensorData(db, {sensors_id: data})
    .then((response)=>{
      socket.emit('receiveHistoricalData', response);
    })
  })

  //Create a new email alert
  socket.on('newAlert', (data)=>{
    console.log(data)
    queries.insertAlert(db, {email: data.email, sensors_id: data.sensors_id})
    .then((response)=>{
      socket.emit('alertCreated', 'And so begins a contract bound in blood...');
    })
    .catch((err)=>{
      socket.emit('alertCreated', `OOOOOH NOOOO!!!!!!\n${err}`);
    })
  })

  //Create a new sensor
  socket.on('newSensor', (data)=>{
    console.log(data)
    axios.get(data.url)
    .then((res)=>{
      const data = res.data;
      //Check if the url they've entered is valid
      if(data.co2 === undefined || data.tvoc === undefined){
        socket.emit('alertCreated', `The url you've entered does not seem to be returning the correct data`);
      } else {
        queries.insertSensor(db, {email: data.email, name: data.name, url: data.url, latitude: data.latitude, longitude: data.longitude})
        .then(() =>{
          console.log('YEES');
          socket.emit('alertCreated', "You've successfully connected your sensor to our server and helped us reach global conquest");
        })
      }
    })
    .catch((err)=>{
      console.log(err)
      socket.emit('alertCreated', `Hmmm... seems like we couldn't connect to your sensor server. This could be caused by the server being down or being entered incorrectly`);
    })
  })
})

//Default urls, will be overriden if the backend receives the appropriate post request
const sensorURLs = {
  sensor1 : "https://arduinokeith123.loca.lt",
  sensor2 : "https://arduinomark123.loca.lt",
  sensor3 :"https://arduinojayden123.loca.lt"
}

//Override the default urls, sensor server will post here and update sensorURLs object with the ngrok url
app.post("/", async (req,res) => {
  console.log(req.body)
  const id = req.body.id;
  const url = req.body.url;
  switch(id){
    case 1:
      sensorURLs.sensor1 = url
    break
    case 2:
      sensorURLs.sensor2 = url
    break
    case 3:
      sensorURLs.sensor3 = url
    break
    default:
  }
  res.json({message: `Succesfully registered ngrok url ${url} to sensor id ${id}`})
  console.log(sensorURLs)
})


//Get latest sensor reading
//Hard coded switch statement will work for small number of arduinos. Need to refactor if registering new sensor stretch goal is desired.
app.get("/:id", async (req, res) => {
  const id = req.params.id
  let sensorServerURL = ""
  switch (id) {
    case "1":
      sensorServerURL = sensorURLs.sensor1
      break;
    case "2":
      sensorServerURL = sensorURLs.sensor2
      break;
    case "3":
      sensorServerURL = sensorURLs.sensor3
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
});

//Un-subscribe from an alert
app.get("/alerts/:users_id/remove/:sensors_id", async (req, res) =>{
  queries.deleteAlert(db, {sensors_id: req.params.sensors_id, users_id: req.params.users_id})
  .then(()=>{
    res.redirect('http://localhost:3002')
  })
})

//Un-subscribe from all alerts for a user
app.get("/alerts/:users_id/remove/", async (req, res) =>{
  queries.deleteAllAlerts(db, {users_id: req.params.users_id})
  .then(()=>{
    res.redirect('http://localhost:3002')
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

    queries.insertSensorData(db, {sensors_id: sensor.id, co2: sensorResponse.data.co2, tvoc: sensorResponse.data.tvoc, pm25: sensorResponse.data.pm25 || null})
    .then((response)=>{
      console.log(chalk.green(`Successfully inserted data for ${chalk.inverse(sensor.name)}'s sensor: Co2:${chalk.inverse(sensorResponse.data.co2)} Tvoc:${chalk.inverse(sensorResponse.data.tvoc)} Pm25:${chalk.inverse(sensorResponse.data.pm25)}\n`))
    })
    .catch((err)=>{
      console.log(chalk.red(`Failed inserting data:\n-----Response:-----\n ${err}\n`));
    })

    //If the co2 level is to high, alert users
    if(sensorResponse.data.co2 > 400){
      console.log(chalk.yellow(`Co2 levels to high for ${chalk.inverse(sensor.name)}'s senser, alerting users...`));

      queries.selectSensorAlerts(db, {sensors_id: sensor.id})
      .then((response)=>{
        //Will email users if they haven't been already
        if(sensor.safe === true){
          response.forEach((user)=>{
            emailUser(user)
          })

          queries.updateSensorSafe(db, {id: sensor.id, safe: false})
        }
      })
      .catch((err)=>{
        console.log(chalk.inverse(err));
      });

    } else if(sensor.safe === false){
      //Set The sensor back to safe if it previously wasn't
      queries.updateSensorSafe(db, {id: sensor.id, safe: true})
    }
  })
  .catch((err)=>{
    console.log(chalk.red(`Failed to connect to ${chalk.inverse(sensor.name)}'s sensor at ${chalk.inverse(sensor.url)}\n-----Response:-----\n ${err}\n`));
  })
}

//Email users that the co2 levels are bad
const emailUser = (user)=>{
  const mailOptions = {
    from: 'SeeO2AirQuality@gmail.com',
    to: user.email,
    subject: 'Air quality has dropped',
    html: `
    <h1>BAD AIR</h1>
    <p>You air is not quality :(</p>
    <a href="http://localhost:8001/alerts/${user.users_id}/remove/${user.sensors_id}">I don't want this alert anymore</a>
    <a href="http://localhost:8001/alerts/${user.users_id}/remove/">I don't want any alerts ever again</a>
    `
  };
  transporter.sendMail(mailOptions, (error, info)=>{
    if (error) {
      console.log(chalk.red(`Failed to send email to ${chalk.inverse(user.email)} \n-----Response-----\n ${error}`));
    } else {
      console.log('Email sent: ' + chalk.inverse(info.response));
    }
  });
}