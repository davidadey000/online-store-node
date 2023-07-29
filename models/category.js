const mongoose = require("mongoose");
const Joi = require("joi");

const categorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    minlength: 5,
    maxlength: 50,
  },  slug: {
    type: String,
    required: true,
    minlength: 5,
    maxlength: 100,
    unique: true
  },
})

const Category = mongoose.model(
  "Category",
  categorySchema
);

function validateCategory(body) {
  const schema = Joi.object({
    name: Joi.string().min(3).required(),
  });
  return schema.validate(body);
}

exports.validate = validateCategory;
exports.Category = Category;
exports.categorySchema = categorySchema
