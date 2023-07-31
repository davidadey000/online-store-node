const mongoose = require("mongoose");
const Joi = require("joi");

const tagSchema = new mongoose.Schema({
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

const Tag = mongoose.model(
  "Tag",
  tagSchema
);

function validateTag(body) {
  const schema = Joi.object({
    name: Joi.string().min(3).required(),
  });
  return schema.validate(body);
}

exports.validate = validateTag;
exports.Tag = Tag;
exports.tagSchema = tagSchema
