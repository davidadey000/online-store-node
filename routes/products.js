const express = require("express");
const authorize = require("../middleware/authorize");
const auth = require("../middleware/auth");
const router = express.Router();
const { Product, validate } = require("../models/product");
const slugify = require("slugify");
const { Category } = require("../models/category");

router.get("/", async (req, res) => {
  const products = await Product.find().sort("title");
  res.send(products);
});

router.get("/random/", async (req, res) => {
  // Get the total count of products in the database
  const totalCount = await Product.countDocuments();

  // Generate an array of 12 random indices (numbers) within the range of the total count
  const randomIndices = Array.from({ length: 12 }, () =>
    Math.floor(Math.random() * totalCount)
  );

  // Find the 12 random products using the random indices
  const randomProducts = await Product.find().limit(12).skip(randomIndices[0]);

  // Calculate discountedPrice and discount for each product
  const productsWithDiscount = randomProducts.map((product) => {
    const discountedPrice =
      product.price - (product.price * product.discount) / 100;
    return {
      ...product._doc,
      discountedPrice, // Add discountedPrice field to the product
    };
  });

  res.status(200).json(productsWithDiscount);
});


// Route to get products under a certain category using the slug
router.get("/category/:categorySlug", async (req, res) => {
  const categorySlug = req.params.categorySlug;

    // Find the category using the provided slug
    const category = await Category.findOne({ slug: categorySlug });

    if (!category) {
      return res.status(404).json({ message: "Category not found." });
    }

    // Find products with the matching category ID
    const products = await Product.find({ categories: category._id });

    // If no products are found, return an empty array
    if (!products || products.length === 0) {
      return res
        .status(404)
        .json({ message: "No products found under this category." });
    }

    // Calculate discountedPrice and discount for each product
    const productsWithDiscount = products.map((product) => {
      const discountedPrice =
        product.price - (product.price * product.discount) / 100;
      return {
        ...product._doc,
        discountedPrice,
      };
    });

    // Prepare the final response with dynamic collectionName and products
    const response = {
      name: category.name, // Get the collection name from the category object
      products: productsWithDiscount,
    };

    // Return the response
    res.status(200).json(response);
 
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

  // Generate the slug from the product title
  const slug = slugify(req.body.title, { lower: true });

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
    slug: slug,
  });

  await product.save();

  res.send(product);
});

router.put("/:id", auth, async (req, res) => {
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

router.get("/:slug", async (req, res) => {
  const product = await Product.findOne({ slug: req.params.slug });

  if (!product)
    return res
      .status(404)
      .send("The product with the given slug could not be found");

  // Calculate the discounted price during the GET request
  const discountedPrice = parseFloat(
    (product.price - (product.price * product.discount) / 100).toFixed(2)
  );

  // Calculate the saved amount, rounded to two decimal places
  const savedAmount = parseFloat((product.price - discountedPrice).toFixed(2));

  // Include the discounted price and saved amount in the response
  res.send({ ...product.toObject(), discountedPrice, savedAmount });
});

// Slug Route
router.put("/slug/:id", async (req, res) => {
    const productId = req.params.id;

    // Find the product by ID
    const product = await Product.findById(productId);

    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }
    

    // Slugify the product title and add it to the product object
    const slug = slugify(product.title, { lower: true });
    product.slug = slug;

    // Save the updated product with the slug field
    await product.save();

    res.json(product);
 
});

module.exports = router;

module.exports = router;
