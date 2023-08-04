const Joi = require("joi");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const config = require("config");

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    minlength: 5,
    maxlength: 50,
  },
  email: {
    type: String,
    required: true,
    minlength: 5,
    maxlength: 255,
    unique: true,
  },
  password: {
    type: String,
    required: true,
    minlength: 5,
    maxlength: 255,
  },
  shippingAddress: {
    type: String,
    required: true,
    minlength: 7,
    maxlength: 255,
  },
  phoneNumber: {
    type: String,
    required: true,
    minlength: 5,
    maxlength: 20,
  },
  gender: {
    type: String,
    enum: ["male", "female", "other"],
    required: true,
  },
  dateOfBirth: {
    type: Date,
    required: true,
  },
  role: {
    type: String,
    enum: ["customer", "admin", "seller"],
    default: "customer",
  },
});

userSchema.methods.generateAuthToken = function () {
  const token = jwt.sign(
    { _id: this._id, role: this.role },
    config.get("jwtPrivateKey")
  );
  return token;
};

const User = mongoose.model("User", userSchema);

function validateUser(body) {
  const schema = Joi.object({
    name: Joi.string().min(5).max(50).required(),
    email: Joi.string().min(5).max(255).required().email(),
    password: Joi.string().min(5).max(255).required(),
    shippingAddress: Joi.string().min(7).max(255).required(),
  });
  return schema.validate(body);
}

// Validation schema for Step 1
function validateStep1(body) {
  const schema = Joi.object({
    email: Joi.string().min(5).max(255).required().email(),
    password: Joi.string().min(5).max(255).required(),
  });
  return schema.validate(body);
}

function validatePersonalDetails(body) {
  const schema = Joi.object({
    token: Joi.string().required(),
    name: Joi.string().min(5).max(50).required(),
    shippingAddress: Joi.string().min(7).max(255).required(),
    phoneNumber: Joi.string().min(5).max(20).required(),
    gender: Joi.string().valid("male", "female", "other").required(),
    dateOfBirth: Joi.date().required(),
  });
  return schema.validate(body);
}

exports.User = User;
exports.validate = validateUser;
exports.validateStep1 = validateStep1;
exports.validatePersonalDetails = validatePersonalDetails;
