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
  role: {
    type: String,
    enum: ["customer", "admin", "seller"],
    default: "customer",
  },
});


userSchema.methods.generateAuthToken = function(){
  const token = jwt.sign({ _id: this._id, role: this.role }, config.get("jwtPrivateKey"));
  return token;
}

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

exports.User = User;
exports.validate = validateUser;
