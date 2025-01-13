const { body } = require("express-validator");

exports.validateRegistration = [
  body("username").notEmpty().withMessage("username is required"),
  body("email").isEmail().withMessage("Valid email is required"),
  body("password")
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters"),
];

exports.validateLogin = [
  body("email").isEmail().withMessage("Valid email is required"),
  body("password").notEmpty().withMessage("Password is required"),
];

exports.validateBankroll = [
  body("name").notEmpty().withMessage("Bankroll name is required"),
  body("startingCapital")
    .isNumeric()
    .withMessage("Starting capital must be a number"),
  body("currency").isObject().withMessage("Currency must be an object"),
  body("currency.code").notEmpty().withMessage("Currency code is required"),
  body("currency.label").notEmpty().withMessage("Currency label is required"),
  body("currency.symbol").notEmpty().withMessage("Currency symbol is required"),
];

exports.validateBet = [
  body("date").notEmpty().withMessage("Date is required"),
  body("sport").notEmpty().withMessage("Sport is required"),
  body("label").notEmpty().withMessage("Label of bet is required"),
  body("stake").isNumeric().withMessage("Stake must be a number"),
  body("odds").isNumeric().withMessage("Odds must be a number"),
];
