const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const { Order, validate } = require("../models/order");

// Place Order
router.post("/", auth, async (req, res) => {
  // Validate the order data
  const { error } = validate(req.body);
  if (error) {
    return res.status(400).send(error.details[0].message);
  }

  // Destructure the validated order data
  const { user, products, totalAmount } = req.body;

  // Create a new order
  const order = new Order({
    user,
    products,
    totalAmount,
  });

  // Save the order to the database
  await order.save();

  res.send(order);
});

// Get all orders for a user
router.get("/orders", auth, async (req, res) => {
  try {
    const orders = await Order.find({ user: req.user._id }).sort({
      createdAt: -1,
    });

    res.send(orders);
  } catch (error) {
    console.error(error);
    res.status(500).send("An error occurred while fetching the orders");
  }
});

module.exports = router;
