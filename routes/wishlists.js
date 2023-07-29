const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const authorize = require("../middleware/authorize");
const { Wishlist, validate } = require("../models/wishlist");
const { Product } = require("../models/product");

function restructureWishlist(wishlist) {
  return {
    ...wishlist.toObject(),
    products: wishlist.products.map((product) => {
      const {
        _id,
        title,
        price,
        imageUrl,
        discount,
        numberInStock,
        mainImageUrl,
        slug,
      } = product.productId;
      const discountedPrice = price - (price * discount) / 100;
      const cartId = product._id;

      return {
        _id,
        cartId,
        title,
        price,
        discountedPrice,
        imageUrl,
        discount,
        numberInStock,
        mainImageUrl,
        slug,
      };
    }),
  };
}
async function populateWishlistDetails(user) {
  const wishlist = await Wishlist.findOne({ user }).populate(
    "products.productId",
    "title price imageUrl discount numberInStock mainImageUrl slug"
  );

  if (!wishlist) {
    return null;
  }

  wishlist.products.forEach((product) => {
    const { price, discount } = product.productId;
    product.discountedPrice = price - (price * discount) / 100;
  });

  return wishlist;
}

router.get("/wishlist/", auth, async (req, res) => {
  const wishlist = await populateWishlistDetails(req.user._id);

  if (!wishlist) {
    return res.status(404).send("Wishlist not found");
  }

  const modifiedWishlist = restructureWishlist(wishlist);
  res.send(modifiedWishlist);
});

router.post("/wishlist/", auth, async (req, res) => {
  const { error } = validate(req.body);
  if (error) {
    return res.status(400).send(error.details[0].message);
  }
  const { productId } = req.body;

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

    const modifiedWishlist = await populateWishlistDetails(req.user._id);
    if (!modifiedWishlist) {
      return res.status(404).send("Wishlist not found");
    }

    const responseWishlist = restructureWishlist(modifiedWishlist);
    res.send(responseWishlist);
  
});

router.delete("/wishlist/:productId", auth, async (req, res) => {
  const wishlist = await Wishlist.findOne({ user: req.user._id });

  if (!wishlist) {
    return res.status(404).send("Wishlist not found");
  }

  const productIndex = wishlist.products.findIndex(
    (p) => p.productId.toString() === req.params.productId
  );

  if (productIndex === -1) {
    return res.status(404).send("Product not found in the wishlist");
  }

  wishlist.products.splice(productIndex, 1);
  await wishlist.save();

  const modifiedWishlist = await populateWishlistDetails(req.user._id);
  if (!modifiedWishlist) {
    return res.status(404).send("Wishlist not found");
  }

  const responseWishlist = restructureWishlist(modifiedWishlist);
  res.send(responseWishlist);
});

module.exports = router;
