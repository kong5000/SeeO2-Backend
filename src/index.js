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
const io = require('socket.io')('https://see-o2-backend.herokuapp.com');

const PORT = process.env.PORT || 8001;

//When a client connects
io.on('connect', (socket)=>{

  console.log('SENDING INFO TO KNEW FREND :)');
  queries.selectAllSensors(db)
  .then((response)=>{
    socket.emit("SendSensors",response);
  })

  //When Frontend wants historical data for a sensor
  socket.on('getHistoricalData', (data)=>{
    queries.selectSensorData(db, {sensors_id: data.id, timezone: data.timezone})
    .then((response)=>{
      socket.emit('receiveHistoricalData', {data: response, offset: (data.offset + 1), timezone: data.timezone});
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
  socket.on('newSensor', (sensorData)=>{

    console.log(sensorData)
    axios.get(sensorData.url)
    .then((res)=>{
      const data = res.data;
      //Check if the url they've entered is valid
      if(data.co2 === undefined && data.pm25 === undefined){
        socket.emit('alertCreated', `The url you've entered does not seem to be returning the correct data`);
      } else {
        queries.insertSensor(db, {email: '', name: '', url: sensorData.url, latitude: 0, longitude: 0})
        .then((response) =>{
          socket.emit('alertCreated', `An email has been sent with a link to confirm your sensor`);
          console.log(response)
          newSensorEmail(sensorData, response)
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
  Keith : "https://arduinokeith123.loca.lt",
  Mark : "https://arduinomark123.loca.lt",
  Jayden :"https://arduinojayden123.loca.lt"
}

//Override the default urls, sensor server will post here and update sensorURLs object with the ngrok url
app.post("/", async (req,res) => {
  console.log(req.body)
  const id = req.body.id;
  const url = req.body.url;
  switch(id){
    case '1':
      sensorURLs.Keith = url
    break
    case '2':
      sensorURLs.Mark = url
    break
    case '3':
      sensorURLs.Jayden = url
    break
    default:
  }
  res.json({message: `Succesfully registered url ${url} to sensor id ${id}`})
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

//Update Sensor Data
app.get("/sensors/:users_id/update/:id/:name/:url/:latitude/:longitude", async (req, res) =>{
  options = {name: '', url: '', latitude: 0, longitude: 0, id: req.params.id}
  req.params.name !== "null" ? options.name = req.params.name : delete options.name
  req.params.url !== "null" ? options.url = req.params.url : delete options.url
  req.params.latitude !== "null" ? options.latitude = req.params.latitude : delete options.latitude
  req.params.longitude !== "null" ? options.longitude = req.params.longitude : delete options.longitude
  queries.updateSensorInfo(db, options)
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
  let url = sensor.url
  if(sensorURLs[sensor.name] !== sensor.url){
    url = sensorURLs[sensor.name]
  }
  console.log(`Connecting to ${chalk.inverse(sensor.name)}'s sensor at ${chalk.inverse(url)}...\n`)
  console.log("id",sensor.id)
  axios.get(url, { timeout: 3000 })
  .then((sensorResponse)=>{

    //Insert the response data to the database
    console.log(chalk.green(`Successfully connected to ${chalk.inverse(sensor.name)}'s sensor at ${chalk.inverse(url)}. Querying and inserting data...\n`));

    queries.insertSensorData(db, {sensors_id: sensor.id, co2: sensorResponse.data.co2 || -99, tvoc: sensorResponse.data.tvoc || -99, pm25: sensorResponse.data.pm25, pm10: sensorResponse.data.pm10})
    .then((response)=>{
      console.log(chalk.green(`Successfully inserted data for ${chalk.inverse(sensor.name)}'s sensor: Co2:${chalk.inverse(sensorResponse.data.co2)} Tvoc:${chalk.inverse(sensorResponse.data.tvoc)} Pm25:${chalk.inverse(sensorResponse.data.pm25)} Pm10:${chalk.inverse(sensorResponse.data.pm10)}\n`))
    })
    .catch((err)=>{
      console.log(chalk.red(`Failed inserting data:\n-----Response:-----\n ${err}\n`));
    })

    queries.insertSensorData(db, {sensors_id: sensor.id, co2: sensorResponse.data.co2 || -99, tvoc: sensorResponse.data.tvoc || -99, pm25: sensorResponse.data.pm25, pm10: sensorResponse.data.pm10})

    //If the co2 level is to high, alert users
    if(sensorResponse.data.pm25 > 35){
      console.log(chalk.yellow(`Pm25 levels to high for ${chalk.inverse(sensor.name)}'s senser, alerting users...`));

      queries.selectSensorAlerts(db, {sensors_id: sensor.id})
      .then((response)=>{
        //Will email users if they haven't been already
        if(sensor.safe === true){
          response.forEach((user)=>{
            emailUser(user, sensor)
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
    console.log(chalk.red(`Failed to connect to ${chalk.inverse(sensor.name)}'s sensor at ${chalk.inverse(sensor.url)}\n-----Response:-----\n ${err}\nInserting empty data...\n`));
    queries.insertSensorData(db, {sensors_id: sensor.id, co2: -99, tvoc: -99, pm25: -99, pm10: -99});
  })
}

//Email users that the co2 levels are bad
const emailUser = (user, sensor)=>{
  const mailOptions = {
    from: 'SeeO2AirQuality@gmail.com',
    to: user.email,
    subject: 'Air quality has dropped',
    html: `
    <div style="font-size: 1.5em; font-weught: 700; color: #163d5f; background-image: url('cid:unique@kreata.ee'); background-position: bottom; background-size: 75%; padding: 20px;">
      <p>The air quality at <strong>${sensor.name}'s</strong> sensor is unsafe. The latest reading at the time of this email is <strong>PM25: ${sensor.pm25}</strong>. Please keep an eye on our website for further information.</p>
      <br>
      <a style="font-size: 0.5em" href="http://localhost:8001/alerts/${user.users_id}/remove/${user.sensors_id}">Stop receiving alerts for this sensor</a>
      <br>
      <a style="font-size: 0.5em" href="http://localhost:8001/alerts/${user.users_id}/remove/">Stop receiving all alerts</a>

      <div style="background-image: url('cid:word@drow.ee'); width: 400px; height: 167px;">
      </div>
    </div>
    `,
    attachments: [{
      filename: 'background.png',
      path: 'http://localhost:3002/static/media/cloud_background.1254c655.jpg',
      cid: 'unique@kreata.ee'
    },
    {
      filename: 'logo.png',
      path: 'http://localhost:3002/static/media/SeeO2_logo.4b3d866c.png',
      cid: 'word@drow.ee'
    }]
  };
  transporter.sendMail(mailOptions, (error, info)=>{
    if (error) {
      console.log(chalk.red(`Failed to send email to ${chalk.inverse(user.email)} \n-----Response-----\n ${error}`));
    } else {
      console.log('Email sent: ' + chalk.inverse(info.response));
    }
  });
}

const newSensorEmail = (sensor, sensorIds) => {
  const mailOptions = {
    from: 'SeeO2AirQuality@gmail.com',
    to: sensor.email,
    subject: 'Confirm Sensor',
    html: `
    <div style="font-size: 1.5em; font-weught: 700; color: #163d5f; background-image: url('cid:unique@kreata.ee'); background-position: bottom; background-size: 75%; padding: 20px;">
      <p>Please confirm that the information below is correct and click the button to add your sensor!</p>
      <ul>
        <li>Name: ${sensor.name}</li>
        <li>Url: ${sensor.url}</li>
        <li>Latitude: ${sensor.latitude}</li>
        <li>Longitude: ${sensor.longitude}</li>
      </ul>

      <a 
      style="background-color: #163d5f; color: lightblue; border-radius: 5px; border: 5px solid #163d5f; margin-left: 40px; font-size: 1em; cursor: pointer; text-decoration: none"
      href="http://localhost:8001/sensors/${sensorIds.users_id}/update/${sensorIds.sensors_id}/${sensor.name}/null/${sensor.latitude}/${sensor.longitude}">
        Confirm
      </a>

      <div style="background-image: url('cid:word@drow.ee'); width: 400px; height: 167px;">
      </div>
    </div>
    `,
    attachments: [{
      filename: 'background.png',
      path: 'http://localhost:3002/static/media/cloud_background.1254c655.jpg',
      cid: 'unique@kreata.ee'
    },
    {
      filename: 'logo.png',
      path: 'http://localhost:3002/static/media/SeeO2_logo.4b3d866c.png',
      cid: 'word@drow.ee'
    }]
  };
  transporter.sendMail(mailOptions, (error, info)=>{
    if (error) {
      console.log(chalk.red(`Failed to send email to ${chalk.inverse(sensor.email)} \n-----Response-----\n ${error}`));
    } else {
      console.log('Email sent: ' + chalk.inverse(info.response));
    }
  });
}