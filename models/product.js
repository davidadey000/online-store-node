const mongoose = require("mongoose");
const Joi = require("joi");

const productSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    minlength: 5,
    trim: true,
    maxlength: 255,
  },
  price: {
    type: Number,
    required: true,
    min: 0,
  },
  discount: {
    type: Number,
    min: 0,
    default: 0, // Default discount is 0 (no discount)
  },
  description: {
    type: String,
    required: true,
    minlength: 10,
    maxlength: 1000,
  },
  imageUrls: {
    type: [String], // Array of strings to store multiple image URLs
    required: true,
    trim: true,
    maxlength: 1000,
  },
  mainImageUrl: {
    type: String, // Store the URL of the main image
    required: true,
    trim: true,
    maxlength: 1000,
  },
  numberInStock: {
    type: Number,
    required: true,
    min: 0,
    max: 255,
  },
  categories: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
    },
  ],
  additionalAttributes: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },
});

const Product = mongoose.model("Product", productSchema);

function validateProduct(body) {
  const schema = Joi.object({
    title: Joi.string().min(5).max(50).required(),
    categoryIds: Joi.array().items(Joi.objectId()).required(),
    numberInStock: Joi.number().min(0).max(255).required(),
    price: Joi.number().min(0).required(),
    discount: Joi.number().min(0).default(0), // Validate and set the default value for the discount
    description: Joi.string().min(10).max(1000).required(),
    imageUrls: Joi.array().items(Joi.string().trim().max(1000)).required(),
    mainImageUrl: Joi.string().max(1000).required(),
    additionalAttributes: Joi.object().pattern(
      Joi.string(),
      Joi.alternatives().try(Joi.number(), Joi.string())
    ),
  });
  return schema.validate(body);
}

exports.validate = validateProduct;
exports.Product = Product;
