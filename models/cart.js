const mongoose = require("mongoose");
const Joi = require("joi");

const cartSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    unique: true,
  },
  products: [
    {
      productId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product",
        required: true,
      },
      quantity: {
        type: Number,
        required: true,
        min: 1,
      },
    },
  ],
});

const Cart = mongoose.model("Cart", cartSchema);

function validateCartProduct(product) {
  const schema = Joi.object({
    productId: Joi.string().required(),
    quantity: Joi.number().integer().min(1).required(),
  });

  return schema.validate(product);
}



module.exports = {
  Cart,
  validateCartProduct
};
