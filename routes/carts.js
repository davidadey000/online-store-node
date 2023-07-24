const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const authorize = require("../middleware/authorize");
const {
  Cart,
  validateCartProduct
} = require("../models/cart");
const { Product } = require("../models/product");

// Function to populate product details in the cart
async function populateCartDetails(user) {
  return await Cart.findOne({ user }).populate(
    "products.productId",
    "title price imageUrl discount numberInStock mainImageUrl"
  );
}

// Function to restructure the products array with additional details
function restructureCart(cart) {
  return {
    ...cart.toObject(),
    products: cart.products.map((product) => {
      const { title, price, imageUrl, discount, numberInStock, mainImageUrl } =
        product.productId;
      const quantity = product.quantity;
      const discountedPrice = parseFloat(
        (price - (price * discount) / 100).toFixed(2)
      );

      return {
        _id: product.productId._id,
        title,
        price,
        discountedPrice,
        imageUrl,
        discount,
        numberInStock,
        mainImageUrl,
        quantity,
      };
    }),
  };
}

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

  const modifiedCart = await populateCartDetails(req.user._id);
  if (!modifiedCart) {
    return res.status(404).send("Cart not found");
  }

  const responseCart = restructureCart(modifiedCart);
  res.send(responseCart);
});

// Get Cart
router.get("/cart/", auth, async (req, res) => {
  const cart = await populateCartDetails(req.user._id);

  if (!cart) {
    return res.status(404).send("Cart not found");
  }

  const modifiedCart = restructureCart(cart);
  res.send(modifiedCart);
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
    const existingProductIndex = cart.products.findIndex(
      (p) => p.productId.toString() === productId
    );

    if (existingProductIndex !== -1) {
      // If the product already exists, increase the quantity but ensure it doesn't exceed the available stock
      const existingProduct = cart.products[existingProductIndex];
      const newQuantity = existingProduct.quantity + quantity;

      if (newQuantity > productData.numberInStock) {
        return res
          .status(400)
          .send("Requested quantity exceeds available stock");
      }

      cart.products[existingProductIndex].quantity = newQuantity;
    } else {
      // Add the product to the existing cart
      cart.products.push({ productId, quantity });
    }
  }

  await cart.save();

  const modifiedCart = await populateCartDetails(req.user._id);
  if (!modifiedCart) {
    return res.status(404).send("Cart not found");
  }

  const responseCart = restructureCart(modifiedCart);
  res.send(responseCart);
});

// Update Product Quantity in Cart (Increment)
router.put("/cart/increment/:productId", auth, async (req, res) => {
  console.log(req.user._id)
  try {
    const cart = await Cart.findOneAndUpdate(
      { user: req.user._id, "products.productId": req.params.productId },
      { $inc: { "products.$.quantity": 1 } }, // Use $inc to increment the quantity by 1
      { new: true }
    );

    if (!cart) {
      return res.status(404).send("Cart or product not found");
    }

    const modifiedCart = await populateCartDetails(req.user._id);
    if (!modifiedCart) {
      return res.status(404).send("Cart not found");
    }

    const responseCart = restructureCart(modifiedCart);
    res.send(responseCart);
  } catch (error) {
    console.error("Error incrementing item quantity:", error);
    res.status(500).send("Error incrementing item quantity");
  }
});

// Update Product Quantity in Cart (Decrement)
router.put("/cart/decrement/:productId", auth, async (req, res) => {
  try {
    const cart = await Cart.findOneAndUpdate(
      { user: req.user._id, "products.productId": req.params.productId },
      { $inc: { "products.$.quantity": -1 } }, // Use $inc to decrement the quantity by 1
      { new: true }
    );

    if (!cart) {
      return res.status(404).send("Cart or product not found");
    }

    const modifiedCart = await populateCartDetails(req.user._id);
    if (!modifiedCart) {
      return res.status(404).send("Cart not found");
    }

    const responseCart = restructureCart(modifiedCart);
    res.send(responseCart);
  } catch (error) {
    console.error("Error decrementing item quantity:", error);
    res.status(500).send("Error decrementing item quantity");
  }
});


module.exports = router;
