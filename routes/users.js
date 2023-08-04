const _ = require("lodash");
const bcrypt = require("bcrypt");
const {
  User,
  validate,
  validatePersonalDetails,
  validateStep1,
} = require("../models/user");
const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const mongoose = require("mongoose");
const config = require("config");

router.get("/me", auth, async (req, res) => {
  const user = await User.findById(req.user._id).select("-password");
  res.send(user);
});

// router.post("/", async (req, res) => {
//   const { error } = validate(req.body);
//   if (error) return res.status(400).send(error.details[0].message);

//   let user = await User.findOne({ email: req.body.email }).exec();
//   if (user) {
//     return res.status(400).send("User already registered.");
//   }

//   user = new User(_.pick(req.body, ["name", "email", "password", "shippingAddress"]));

//   const salt = await bcrypt.genSalt(10);
//   user.password = await bcrypt.hash(user.password, salt);

//   await user.save();

//   const token = user.generateAuthToken();

//   res.header("x-auth-token", token).send(_.pick(user, ["name", "email"]));
// });

// Endpoint to check if the email exists in the database
router.get("/checkEmail", async (req, res) => {
  const { email } = req.query;
  if (!email) {
    return res.status(400).send("Email parameter is missing.");
  }

  const user = await User.findOne({ email }).exec();
  if (user) {
    // If the email exists, return a JSON response indicating that the email exists
    return res.json({ exists: true });
  } else {
    // If the email does not exist, return a JSON response indicating that the email does not exist
    return res.json({ exists: false });
  }
});

const tempStorage = {};
console.log(tempStorage);

const jwt = require("jsonwebtoken");

// Step 1 of sign-up process - Store email and hashed password temporarily
router.post("/step1", async (req, res) => {
  const { error } = validateStep1(req.body);
  if (error) return res.status(400).send(error.details[0].message);

  const { email, password } = req.body;

  // Hash the password
  const salt = await bcrypt.genSalt(10);

  const hashedPassword = await bcrypt.hash(password, salt);

  const user = new User({
    email: email,
    password: hashedPassword, // Store hashed password
  });

  // Generate a unique temporary identifier for the user data
  const tempUserId = new mongoose.Types.ObjectId();
  tempStorage[tempUserId] = user;

  // Create a token with the user's temporary ID
  const token = jwt.sign({ tempUserId }, config.get("jwtPrivateKey"));

  res.send({ token });
});

// Step 2 of sign-up process - Store personal details and finalize user record
router.post("/step2", async (req, res) => {
  const { error } = validatePersonalDetails(req.body);
  if (error) return res.status(400).send(error.details[0].message);

  const { token, name, shippingAddress, phoneNumber, gender, dateOfBirth } =
    req.body;

  try {
    // Verify the token and extract the payload (tempUserId)
    const decodedToken = jwt.verify(token, config.get("jwtPrivateKey"));
    const tempUserId = decodedToken.tempUserId;

    // Retrieve user data from temp storage using the temporary identifier
    const user = tempStorage[tempUserId];

    if (!user) {
      return res.status(404).send("User data not found.");
    }

    // Update the user data with personal details
    user.name = name;
    user.shippingAddress = shippingAddress;
    user.phoneNumber = phoneNumber;
    user.gender = gender;
    user.dateOfBirth = new Date(dateOfBirth); // Convert to Date object


    // Save the complete user record to the database
    await user.save();

    // Clean up temp storage
    delete tempStorage[tempUserId];

    res.send(user);
  } catch (err) {
    return res.status(400).send("Invalid token.");
  }
});

module.exports = router;
