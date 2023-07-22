require("express-async-errors");
const helmet = require("helmet");
const morgan = require("morgan");
const config = require("config");
const cors = require("cors");
const winston = require('winston');
const Joi = require('joi')
Joi.objectId = require('joi-objectid')(Joi)
const express = require("express");
const app = express();

// middleware
app.use(cors());
app.use(helmet());
app.use(morgan("tiny"));

require('./startup/routes')(app);
require('./startup/db')()

process.on('uncaughtException', (ex) => {
  console.log('WE GOT AN UNCAUGHT EXCEPTION');
  winston.error(ex.message, ex)
})
process.on('uncaughtException', (ex) => {
  console.log('WE GOT AN UNHANDLED PROMISE');
  winston.error(ex.message, ex)
})


winston.add(new winston.transports.File({ filename: 'logfile.log' }));

if (!config.get("jwtPrivateKey")) {
  console.error("FATAL ERROR: jwtPrivateKey is not defined");
  process.exit(1);
}


console.log("Application Name: " + config.get("name"));
if (app.get("env") === "development") {
  app.use(morgan("tiny"));
  console.log("Morgan enabled...");
}

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Listening on port ${port}...`));
