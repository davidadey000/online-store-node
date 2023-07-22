const express = require("express");
const authorize = require("../middleware/authorize");
const auth = require("../middleware/auth");
const router = express.Router();
const { Product, validate } = require("../models/product");
const { Category } = require("../models/category");

router.get("/", async (req, res) => {
  const products = await Product.find().sort("title");
  res.send(products);
});

router.post("/", auth, async (req, res) => {
  const { error } = validate(req.body);
  if (error) return res.status(400).send(error.details[0].message);

  const categories = await Category.find({
    _id: { $in: req.body.categoryIds },
  });

  if (categories.length !== req.body.categoryIds.length)
    return res.status(400).send("Invalid category.");

  const mainImageUrl = req.body.mainImageUrl;

  // Ensure that the mainImageUrl is present in the imageUrls array
  if (!req.body.imageUrls.includes(mainImageUrl)) {
    return res.status(400).send("Invalid main image URL.");
  }

  const product = new Product({
    title: req.body.title,
    categories: categories.map((category) => category._id),
    price: req.body.price,
    discount: req.body.discount,
    numberInStock: req.body.numberInStock,
    description: req.body.description,
    imageUrls: req.body.imageUrls,
    mainImageUrl: mainImageUrl,
    additionalAttributes: req.body.additionalAttributes,
  });

  await product.save();

  res.send(product);
});

router.put("/:id", async (req, res) => {
  const { error } = validate(req.body);
  if (error) return res.status(400).send(error.details[0].message);

  const product = await Product.findByIdAndUpdate(
    req.params.id,
    {
      title: req.body.title,
    },
    { new: true }
  );

  if (!product)
    return res
      .status(404)
      .send("The product with the given ID could not be found");

  res.send(product);
});

router.delete("/:id", [auth, authorize.admin], async (req, res) => {
  const product = await Product.findByIdAndRemove(req.params.id);

  if (!product)
    return res
      .status(404)
      .send("The product with the given ID could not be found");

  res.send(product);
});

router.get("/:id", async (req, res) => {
  const product = await Product.findById(req.params.id);

  if (!product)
    return res
      .status(404)
      .send("The product with the given ID could not be found");

  // Calculate the discounted price during the GET request
  const discountedPrice = parseFloat(
    (product.price - (product.price * product.discount) / 100).toFixed(2)
  );

  // Calculate the saved amount, rounded to two decimal places
  const savedAmount = parseFloat((product.price - discountedPrice).toFixed(2));

  // Include the discounted price and saved amount in the response
  res.send({ ...product.toObject(), discountedPrice, savedAmount });
});

module.exports = router;
