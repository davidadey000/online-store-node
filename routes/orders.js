const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const authorize = require("../middleware/authorize");
const { Order, validate } = require("../models/order");
const { Cart } = require("../models/cart");
const { Product } = require("../models/product");
const winston = require("winston");

// Import Stripe and configure with your API key
const stripe = require("stripe")(
  "sk_test_51N14NREDNiG9zz7s8bVjhjtFKQHajV65mP0N8dyUcLZ7Yc8bcAhHAS0GTvyut8eDVL3nP8WHdi90KQvd9YLVtZX400f5GHlifi"
);


// Get all orders for a user
router.get("/", auth, async (req, res) => {
  const orders = await Order.find({ user: req.user._id })
    .populate(
      "productId",
      "title price imageUrl mainImageUrl additionalAttributes slug"
    )
    .sort({
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

// Generate a Stripe Checkout payment link for the cart
router.post("/payment-link", auth, async (req, res) => {
  const user = req.user._id;
  const cart = await Cart.findOne({ user }).populate("products.productId");

  if (!cart) {
    return res.status(404).send("Cart not found");
  }

  // Step 1: Check product availability in stock
  const unavailableProducts = cart.products.filter((product) => {
    const availableQuantity = product.productId.numberInStock;
    return product.quantity > availableQuantity;
  });

  if (unavailableProducts.length > 0) {
    return res.status(400).send("Some products are not available in stock.");
  }

  const lineItems = cart.products.map((product) => {
    const discountedPrice =
      product.productId.price -
      product.productId.price * (product.productId.discount / 100);

    return {
      price_data: {
        currency: "usd",
        product_data: {
          name: product.productId.title,
        },
        unit_amount: Math.round(discountedPrice * 100), // Stripe requires amount in cents
      },
      quantity: product.quantity,
    };
  });

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: lineItems,
      mode: "payment",
      success_url: "http://localhost:3001/orders", // Redirect URL after successful payment
      cancel_url: "http://localhost:3001/cart", // Redirect URL if user cancels
      client_reference_id: user.toString(),
    });

    res.send({ paymentLink: session.url }); // Send the updated URL with the appended query parameter
  } catch (error) {
    console.error("Error creating Stripe Checkout session:", error);
    return res
      .status(500)
      .send("An error occurred while creating the payment link.");
  }
});

module.exports = router;

// Handle Stripe webhook for payment events
router.post(
  "/webhook",
  express.raw({ type: "application/json" }),
  async (req, res) => {
    const payload = req.body;
    const event = payload;
    try {
      const eventType = event.type;

      if (eventType === "checkout.session.completed") {
        const session = event.data.object;

        // Use session.client_reference_id to get the user ID
        const userId = session.client_reference_id;

        // Retrieve cart and products
        const cart = await Cart.findOne({ user: userId }).populate(
          "products.productId"
        );

        if (!cart || cart.products.length === 0) {
          winston.error("Cart not found or empty");
          return res.sendStatus(400);
        }

        // Create orders from cart products
        for (const cartProduct of cart.products) {
          const { productId, quantity } = cartProduct;
          const productData = await Product.findById(productId);

          if (!productData) {
            winston.error(`Product with ID ${productId} not found`);
            continue;
          }

          // Validate the order object before creating the order
          const mockObject = {
            productId: productData._id.toString(), // Convert to string here
            quantity,
            status: "pending", // Assuming default status for webhook orders
            totalAmount: productData.price * quantity,
          };

          const { error } = validate(mockObject);
          if (error) {
            winston.error("Validation error:", error);
            continue; // Skip creating this order if validation fails
          }

          // Create the order and decrement product stock
          const order = new Order({
            user: userId,
            ...mockObject,
          });

          await order.save();

          // Decrement product stock
          productData.numberInStock -= quantity;
          await productData.save();
        }

        // Clear the user's cart
        cart.products = [];
        await cart.save();
      }

      res.sendStatus(200);
    } catch (error) {
      winston.error("Error processing webhook:", error);
      return res
        .status(500)
        .send("An error occurred while processing the webhook.");
    }
  }
);


module.exports = router;
