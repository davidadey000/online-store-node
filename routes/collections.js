const express = require("express");
const authorize = require("../middleware/authorize");
const auth = require("../middleware/auth");
const router = express.Router();
const slugify = require("slugify");
const { Collection, validate } = require("../models/collection");

router.get("/", async (req, res) => {
  // throw new Error('Could not get the collections')
  const collections = await Collection.find().sort("name");
  res.send(collections);
});

router.post("/", auth, async (req, res) => {
  const { error } = validate(req.body);
  if (error) return res.status(400).send(error.details[0].message);

  const slug = slugify(req.body.name, { lower: true });

  let collection = new Collection({ name: req.body.name, slug: slug });
  collection = await collection.save();

  res.send(collection);
});

router.put("/:id", async (req, res) => {
  const { error } = validate(req.body);
  if (error) return res.status(400).send(error.details[0].message);

  const collection = await Collection.findByIdAndUpdate(
    req.params.id,
    {
      name: req.body.name,
    },
    { new: true }
  );

  if (!collection)
    return res
      .status(404)
      .send("The collection with the given ID could not be found");

  res.send(collection);
});

router.delete("/:id", [auth, authorize.admin], async (req, res) => {
  const collection = await Collection.findByIdAndRemove(req.params.id);

  if (!collection)
    return res
      .status(404)
      .send("The collection with the given ID could not be found");

  res.send(collection);
});

router.get("/:slug", async (req, res) => {
  const collection = await Collection.findOne({slug: req.params.slug});

  if (!collection)
    return res
      .status(404)
      .send("The collection with the given ID could not be found");
  res.send(collection);
});

// Slug Route
router.put("/slug/:id", async (req, res) => {
  const collectionId = req.params.id;
  // Find the collection by ID
  const collection = await Collection.findById(collectionId);

  if (!collection) {
    return res.status(404).json({ error: "Collection not found" });
  }

  // Slugify the collection title and add it to the collection object
  const slug = slugify(collection.name, { lower: true });
  collection.slug = slug;

  // Save the updated collection with the slug field
  await collection.save();

  res.json(collection);
});

module.exports = router;
