const express = require("express");
const authorize = require("../middleware/authorize");
const auth = require("../middleware/auth");
const router = express.Router();
const slugify = require("slugify");
const { Tag, validate } = require("../models/tag");

router.get("/", async (req, res) => {
  // throw new Error('Could not get the tags')
  const tags = await Tag.find().sort("name");
  res.send(tags);
});

router.post("/", auth, async (req, res) => {
  const { error } = validate(req.body);
  if (error) return res.status(400).send(error.details[0].message);

  const slug = slugify(req.body.name, { lower: true });

  let tag = new Tag({ name: req.body.name, slug: slug });
  tag = await tag.save();

  res.send(tag);
});

router.put("/:id", async (req, res) => {
  const { error } = validate(req.body);
  if (error) return res.status(400).send(error.details[0].message);

  const tag = await Tag.findByIdAndUpdate(
    req.params.id,
    {
      name: req.body.name,
    },
    { new: true }
  );

  if (!tag)
    return res
      .status(404)
      .send("The tag with the given ID could not be found");

  res.send(tag);
});

router.delete("/:id", [auth, authorize.admin], async (req, res) => {
  const tag = await Tag.findByIdAndRemove(req.params.id);

  if (!tag)
    return res
      .status(404)
      .send("The tag with the given ID could not be found");

  res.send(tag);
});

router.get("/:slug", async (req, res) => {
  const tag = await Tag.findOne({slug: req.params.slug});

  if (!tag)
    return res
      .status(404)
      .send("The tag with the given ID could not be found");
  res.send(tag);
});

// Slug Route
router.put("/slug/:id", async (req, res) => {
  const tagId = req.params.id;
  // Find the tag by ID
  const tag = await Tag.findById(tagId);

  if (!tag) {
    return res.status(404).json({ error: "Tag not found" });
  }

  // Slugify the tag title and add it to the tag object
  const slug = slugify(tag.name, { lower: true });
  tag.slug = slug;

  // Save the updated tag with the slug field
  await tag.save();

  res.json(tag);
});

module.exports = router;
