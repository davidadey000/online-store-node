const express = require("express");
const authorize = require("../middleware/authorize");
const auth = require("../middleware/auth");
const router = express.Router();
const { Category, validate } = require("../models/category");

router.get("/", async (req, res) => {
  // throw new Error('Could not get the categories')
  const categories = await Category.find().sort("name");
  res.send(categories);
});

router.post("/", auth, async (req, res) => {
  const { error } = validate(req.body);
  if (error) return res.status(400).send(error.details[0].message);
  let category = new Category({ name: req.body.name });
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

router.get("/:id", async (req, res) => {
  const category = await Category.findById(req.params.id);

  if (!category)
    return res
      .status(404)
      .send("The category with the given ID could not be found");

  res.send(category);
});

module.exports = router;
