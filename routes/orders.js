const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const authorize = require("../middleware/authorize");
const { Order, validate } = require("../models/order");
const { Cart } = require("../models/cart");
const { Product } = require("../models/product");

// Place Order
router.post("/", auth, async (req, res) => {
  // Fetch the user's cart
  const cart = await Cart.findOne({ user: req.user._id });

  if (!cart) {
    return res.status(404).send("Cart not found");
  }

  // Check if the cart's products array is empty
  if (cart.products.length === 0) {
    return res.status(400).send("Cart is empty");
  }

  // Extract the products from the cart
  const products = cart.products;

  // Calculate the total amount based on the cart contents
  let totalAmount = 0;
  for (const product of products) {
    const { productId, quantity } = product;
    const productData = await Product.findById(productId);
    if (!productData) {
      return res.status(400).send(`Product with ID ${productId} not found`);
    }
    totalAmount += productData.price * quantity;

    // Subtract the order quantity from the product quantity
    productData.numberInStock -= quantity;
    await productData.save();
  }

  // Create a new order
  const order = new Order({
    user: req.user._id,
    products,
    totalAmount,
  });

  // Save the order to the database
  await order.save();

  // Clear the user's cart
  cart.products = [];
  await cart.save();

  res.send(order);
});

// Get all orders for a user
router.get("/", auth, async (req, res) => {
  const orders = await Order.find({ user: req.user._id }).populate("products.productId", "title price imageUrl").sort({
    createdAt: -1,
  });

  res.send(orders);
});

// Delete an order
router.delete("/:orderId", auth, authorize.admin, async (req, res) => {
  const orderId = req.params.orderId;

  // Find the order by ID and ensure it belongs to the authenticated user
  const order = await Order.findOneAndDelete({
    _id: orderId,
    user: req.user._id,
  });

  if (!order) {
    return res.status(404).send("Order not found");
  }

  res.send(order);
});

// Update an order
router.put("/:orderId", auth, authorize.admin, async (req, res) => {

    const { error } = validate(req.body);
    if (error) {
      return res.status(400).send(error.details[0].message);
    }

    const orderId = req.params.orderId;

    // Find the order by ID and ensure it belongs to the authenticated user
    const order = await Order.findOne({
      _id: orderId,
    });

    if (!order) {
      return res.status(404).send("Order not found");
    }

    // Update the order with the new data
    order.products = req.body.products;
    order.totalAmount = req.body.totalAmount;

    await order.save();

    res.send(order);
 
});

module.exports = router;
