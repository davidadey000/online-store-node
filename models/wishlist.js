const mongoose = require("mongoose");
const Joi = require("joi");
const Schema = mongoose.Schema;

const wishlistSchema = new Schema({
  user: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  products: [
    {
      productId: {
        type: Schema.Types.ObjectId,
        ref: "Product",
        required: true,
      },
      addedAt: {
        type: Date,
        default: Date.now,
      },
    },
  ],
});

const Wishlist = mongoose.model("Wishlist", wishlistSchema);

function validateWishlistProduct(wishlist) {
  const schema = Joi.object({
    productId: Joi.string().required(),
  });
  return schema.validate(wishlist);
}

module.exports = {
  Wishlist,
  validate: validateWishlistProduct,
};
