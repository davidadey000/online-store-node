const winston = require('winston');
const mongoose = require("mongoose");

module.exports = function () {
  mongoose
    .connect("mongodb://127.0.0.1/onlinestore")
    .then(() => console.log("Connected to MongoDB..."))
    
};
