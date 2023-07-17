const _ = require("lodash");
const bcrypt = require("bcrypt");
const { User, validate } = require("../models/user");
const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");

router.get("/me", auth, async (req, res) => {
  const user = await User.findById(req.user._id).select("-password");
  res.send(user);
});

router.post("/", async (req, res) => {
  const { error } = validate(req.body);
  if (error) return res.status(400).send(error.details[0].message);

  try {
    let user = await User.findOne({ email: req.body.email }).exec();
    if (user) {
      return res.status(400).send("User already registered.");
    }

    user = new User(_.pick(req.body, ["name", "email", "password"]));

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(user.password, salt);

    await user.save();

    const token = user.generateAuthToken();

    res.header("x-auth-token", token).send(_.pick(user, ["name", "email"]));
  } catch (error) {
    console.error(error);
    res.status(500).send("An error occurred.");
  }
});

module.exports = router;
