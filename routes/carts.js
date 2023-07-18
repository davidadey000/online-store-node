const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const authorize = require("../middleware/authorize");
const { Cart, validateCartProduct, validateProductQuantity } = require("../models/cart");
const { Product } = require("../models/product");

// Remove Product from Cart
router.delete("/cart/:productId", auth, async (req, res) => {
  const cart = await Cart.findOne({ user: req.user._id });

  if (!cart) {
    return res.status(404).send("Cart not found");
  }

  const productIndex = cart.products.findIndex(
    (p) => p.productId.toString() === req.params.productId
  );

  if (productIndex === -1) {
    return res.status(404).send("Product not found in the cart");
  }

  cart.products.splice(productIndex, 1);
  await cart.save();

  res.send(cart);
});

// Get Cart
router.get("/cart/", auth, async (req, res) => {
  const cart = await Cart.findOne({ user: req.user._id })
    .populate("products.productId", "title price imageUrl"); // Populate product details

  if (!cart) return res.status(404).send("Cart not found");

  res.send(cart);
});

// Add Product to Cart
router.post("/cart/", auth, async (req, res) => {
  const { error } = validateCartProduct(req.body);
  if (error) {
    return res.status(400).send(error.details[0].message);
  }
  const { productId, quantity } = req.body;

  const productData = await Product.findById(productId);
  if (!productData) {
    return res.status(400).send(`Product with ID ${productId} not found`);
  }

  if (quantity > productData.numberInStock) {
    return res.status(400).send("Requested quantity exceeds available stock");
  }

  let cart = await Cart.findOne({ user: req.user._id });

  if (!cart) {
    // Create a new cart if it doesn't exist
    cart = new Cart({
      user: req.user._id,
      products: [{ productId, quantity }],
    });
  } else {
    // Check if the product already exists in the cart
    const existingProduct = cart.products.find(
      (p) => p.productId.toString() === productId
    );

    if (existingProduct) {
      return res.status(400).send("Product already exists in the cart");
    }

    // Add the product to the existing cart
    cart.products.push({ productId, quantity });
  }

  await cart.save();

  res.send(cart);
});


// Update Product Quantity in Cart
router.put("/cart/:productId", auth, async (req, res) => {
  const { error } = validateProductQuantity(req.body);
  if (error) {
    return res.status(400).send(error.details[0].message);
  }
  const cart = await Cart.findOneAndUpdate(
    { user: req.user._id, "products.productId": req.params.productId },
    { $set: { "products.$.quantity": req.body.quantity } },
    { new: true }
  );

  if (!cart) return res.status(404).send("Cart or product not found");

  res.send(cart);
});

module.exports = router;
