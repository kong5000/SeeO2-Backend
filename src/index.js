require('dotenv').config()
const express = require("express");
const app = express();
const bodyParser = require("body-parser")

app.get("/", async (req, res) => {


});

app.listen(3000, async () => {
  console.log("Server listening on port 3000!")
});