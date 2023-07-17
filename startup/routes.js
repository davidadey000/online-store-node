const express = require('express');
const users = require("../routes/users");
const auth = require("../routes/auth");
const products = require("../routes/products");
const categories = require("../routes/categories");
const carts = require("../routes/carts")
const orders = require("../routes/orders")
const error = require("../middleware/error");

module.exports = function (app) {
  app.use(express.urlencoded({ extended: true }));
  app.use(express.json());
  app.use("/api/auth", auth);
  app.use("/api/users", users);
  app.use("/api/products", products);
  app.use("/api/categories", categories);
  app.use("/api/carts", carts);
  app.use("/api/orders", orders)
  app.use(error);
};
