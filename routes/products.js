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

  const product = new Product({
    title: req.body.title,
    categories: categories.map((category) => category._id),
    price: req.body.price,
    numberInStock: req.body.numberInStock,
    description: req.body.description,
    imageUrls: req.body.imageUrls,
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

  res.send(product);
});

module.exports = router;
