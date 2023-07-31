const express = require("express");
const authorize = require("../middleware/authorize");
const auth = require("../middleware/auth");
const router = express.Router();
const slugify = require("slugify");
const { Category, validate } = require("../models/category");

router.get("/", async (req, res) => {
  // throw new Error('Could not get the categories')
  const categories = await Category.find().sort("name");
  res.send(categories);
});

router.post("/", auth, async (req, res) => {
  const { error } = validate(req.body);
  if (error) return res.status(400).send(error.details[0].message);

  const slug = slugify(req.body.name, { lower: true });

  let category = new Category({ name: req.body.name, slug: slug });
  category = await category.save();

  res.send(category);
});

router.put("/:id", async (req, res) => {
  const { error } = validate(req.body);
  if (error) return res.status(400).send(error.details[0].message);

  const category = await Category.findByIdAndUpdate(
    req.params.id,
    {
      name: req.body.name,
    },
    { new: true }
  );

  if (!category)
    return res
      .status(404)
      .send("The category with the given ID could not be found");

  res.send(category);
});

router.delete("/:id", [auth, authorize.admin], async (req, res) => {
  const category = await Category.findByIdAndRemove(req.params.id);

  if (!category)
    return res
      .status(404)
      .send("The category with the given ID could not be found");

  res.send(category);
});

router.get("/:slug", async (req, res) => {
  const category = await Category.findOne({slug: req.params.slug});

  if (!category)
    return res
      .status(404)
      .send("The category with the given ID could not be found");
  res.send(category);
});

// Slug Route
router.put("/slug/:id", async (req, res) => {
  const categoryId = req.params.id;
  // Find the category by ID
  const category = await Category.findById(categoryId);

  if (!category) {
    return res.status(404).json({ error: "Category not found" });
  }

  // Slugify the category title and add it to the category object
  const slug = slugify(category.name, { lower: true });
  category.slug = slug;

  // Save the updated category with the slug field
  await category.save();

  res.json(category);
});

module.exports = router;
