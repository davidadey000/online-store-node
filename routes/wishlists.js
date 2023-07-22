const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const authorize = require("../middleware/authorize");
const { Wishlist, validate } = require("../models/wishlist");
const {Product}  = require("../models/product")

// Get user's wishlist
router.get("/wishlist/", auth, async (req, res) => {
  const wishlist = await Wishlist.findOne({ user: req.user._id }).populate(
    "products.productId",
    "title price imageUrl discount numberInStock mainImageUrl"
  ); // Populate product details

  if (!wishlist) {
    return res.status(404).send("Wishlist not found");
  }

  // Restructure the products array before sending it
  const modifiedWishlist = {
    ...wishlist.toObject(),
    products: wishlist.products.map((product) => {
      const { title, price, imageUrl, discount, numberInStock, mainImageUrl } = product.productId;
      const discountedPrice = price - (price * discount) / 100;

      return {
        _id: product.productId._id,
        title,
        price,
        discountedPrice, // Add the discounted price to the product object
        imageUrl,
        discount,
        numberInStock,
        mainImageUrl,
      };
    }),
  };

  res.send(modifiedWishlist);
});


// Add product to wishlist
router.post("/wishlist/", auth, async (req, res) => {
  const { error } = validate(req.body);
  if (error) {
    return res.status(400).send(error.details[0].message);
  }
  const { productId } = req.body;

  try {
    let wishlist = await Wishlist.findOne({ user: req.user._id });

    const productData = await Product.findById(productId);
    if (!productData) {
      return res.status(400).send(`Product with ID ${productId} not found`);
    }

    if (!wishlist) {
      // Create a new wishlist if it doesn't exist
      wishlist = new Wishlist({
        user: req.user._id,
        products: [{ productId }],
      });
    } else {
      // Check if the product already exists in the wishlist
      const existingProduct = wishlist.products.find(
        (p) => p.productId.toString() === productId
      );

      if (existingProduct) {
        return res.status(400).send("Product already exists in the wishlist");
      }

      // Add the product to the existing wishlist
      wishlist.products.push({ productId });
    }

    await wishlist.save();

    res.send(wishlist);
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .send("An error occurred while adding the product to the wishlist");
  }
});

// Remove product from wishlist
router.delete("/wishlist/:productId", auth, async (req, res) => {
  const { productId } = req.params;

  const wishlist = await Wishlist.findOne({ user: req.user._id });

  if (!wishlist) {
    return res.status(404).send("Wishlist not found");
  }

  const productIndex = wishlist.products.findIndex(
    (p) => p.productId.toString() === productId
  );

  if (productIndex === -1) {
    return res.status(404).send("Product not found in the wishlist");
  }

  wishlist.products.splice(productIndex, 1);
  await wishlist.save();

  res.send(wishlist);
});

module.exports = router;
