const mongoose = require("mongoose");
const Joi = require("joi");

const collectionSchema = new mongoose.Schema({
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

const Collection = mongoose.model(
  "Collection",
  collectionSchema
);

function validateCollection(body) {
  const schema = Joi.object({
    name: Joi.string().min(3).required(),
  });
  return schema.validate(body);
}

exports.validate = validateCollection;
exports.Collection = Collection;
exports.collectionSchema = collectionSchema
