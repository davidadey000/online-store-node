const mongoose = require("mongoose");
const Joi = require("joi");

const categorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    minlength: 5,
    maxlength: 50,
  },
  imageUrl: {
    type: String, // Store the URL of the main image
    required: true,
    trim: true,
    maxlength: 1000,
  },
  slug: {
    type: String,
    required: true,
    minlength: 5,
    maxlength: 100,
    unique: true,
  },
});

const Category = mongoose.model("Category", categorySchema);

function validateCategory(body) {
  const schema = Joi.object({
    name: Joi.string().min(3).required(),
    imageUrl: Joi.string().uri(),
  });
  return schema.validate(body);
}



exports.validate = validateCategory;
exports.Category = Category;
exports.categorySchema = categorySchema;
