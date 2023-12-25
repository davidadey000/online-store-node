const express = require("express");
const authorize = require("../middleware/authorize");
const auth = require("../middleware/auth");
const router = express.Router();
const { Product, validate, validatePut } = require("../models/product");
const slugify = require("slugify");
const { Category } = require("../models/category");
const { Collection } = require("../models/collection");

router.get("/", async (req, res) => {
  const products = await Product.find().sort("title");
  res.send(products);
});

router.get("/price/:priceFigure", async (req, res) => {
  const priceFigure = req.params.priceFigure; // Get the price figure from the URL path

  if (!priceFigure) {
    return res
      .status(400)
      .json({ error: "Price figure is missing in the URL." });
  }

  // Convert the price figure to a number (e.g., remove the "₦" symbol if present)
  const price = parseFloat(priceFigure.replace("₦", ""));

  // Fetch products that have a price less than the specified figure
  const products = await Product.find({ price: { $lt: price } });
    // Calculate discountedPrice and discount for each product
  const productsWithDiscount = products.map((product) => {
    const discountedPrice =
      product.price - (product.price * product.discount) / 100;
    return {
      ...product._doc,
      discountedPrice,
    };
  });

  const response = { name: `Below ${priceFigure}`, products: productsWithDiscount };
  // Return the filtered products to the frontend
  console.log(response)
  res.json(response);

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

// Route to get products under a certain collection using the slug
router.get("/collection/:collectionSlug", async (req, res) => {
  const collectionSlug = req.params.collectionSlug;

  // Find the collection using the provided slug
  const collection = await Collection.findOne({ slug: collectionSlug });

  if (!collection) {
    return res.status(404).json({ message: "Collection not found." });
  }

  // Find products with the matching collection ID
  const products = await Product.find({ collections: collection._id });

  // If no products are found, return an empty array
  if (!products || products.length === 0) {
    return res
      .status(404)
      .json({ message: "No products found under this collection." });
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
    name: collection.name, // Get the collection name from the collection object
    products: productsWithDiscount,
  };

  // Return the response
  res.status(200).json(response);
});

router.get("/tags/:slug", async (req, res) => {
  const productSlug = req.params.slug;
  const limit = req.query.limit ? parseInt(req.query.limit) : 0;
  const sortBy = req.query.sortBy || "createdAt"; // Default sort by createdAt if not provided

  // Find the product by slug
  const product = await Product.findOne({ slug: productSlug });
  if (!product) {
    return res.status(404).json({ error: "Product not found" });
  }

  // Get the tags of the current product
  const currentProductTags = product.tags;

  // Prepare the query to find other products that have at least one tag in common with the current product
  const query = {
    _id: { $ne: product._id }, // Exclude the current product from the similar products
    tags: { $in: currentProductTags },
  };

  // Find similar products with optional limit and sorting
  let similarProducts;
  if (limit > 0) {
    similarProducts = await Product.find(query)
      .limit(limit)
      .sort({ [sortBy]: 1 });
  } else {
    similarProducts = await Product.find(query).sort({ [sortBy]: 1 });
  }

  // If no similar products are found, return an empty array
  if (!similarProducts || similarProducts.length === 0) {
    return res.status(404).json({ message: "No similar products found." });
  }

  // Calculate discountedPrice and discount for each similar product
  const similarProductsWithDiscount = similarProducts.map((product) => {
    const discountedPrice =
      product.price - (product.price * product.discount) / 100;
    return {
      ...product._doc,
      discountedPrice,
    };
  });

  // Prepare the final response with similar products
  const response = {
    name: "View Similar Products",
    products: similarProductsWithDiscount,
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
  const { error } = validatePut(req.body);
  if (error) return res.status(400).send(error.details[0].message);

  const productId = req.params.id;

  // Find the product by ID
  const product = await Product.findById(productId);
  if (!product) {
    return res.status(404).json({ error: "Product not found" });
  }

  // Update the product fields with the new values from req.body
  for (const key in req.body) {
    product[key] = req.body[key];
  }

  const updatedProduct = await product.save();
  res.send(updatedProduct);
});

router.delete("/:id", [auth, authorize.admin], async (req, res) => {
  const product = await Product.findByIdAndRemove(req.params.id);

  if (!product)
    return res
      .status(404)
      .send("The product with the given ID could not be found");

  res.send(product);
});


router.get("/search", async (req, res) => {
  
  const searchTerm = req.query.query;

  if (!searchTerm) {
    return res.status(400).json({ error: "Search term is missing." });
  }

  // Use a case-insensitive regex to find products with titles matching the search term
  const searchResults = await Product.find({
    title: { $regex: new RegExp(searchTerm, "i") },
  });

  // If no results are found, return an empty array
  if (!searchResults || searchResults.length === 0) {
    return res.status(404).json({ message: "No matching products found." });
  }

  // Calculate discountedPrice and discount for each product
  const productsWithDiscount = searchResults.map((product) => {
    const discountedPrice =
      product.price - (product.price * product.discount) / 100;
    return {
      ...product._doc,
      discountedPrice,
    };
  });

  // Prepare the final response with search term and matching products
  const response = {
    searchTerm,
    products: productsWithDiscount,
  };

  console.log(response)
  // Return the response
  res.status(200).json(response);

});

module.exports = router;


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
