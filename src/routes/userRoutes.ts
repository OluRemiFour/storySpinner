export {};
const express = require("express");
const route = express.Router();

const { userSignup, login } = require("../controller/userControl");

route.post("/signup", userSignup);
route.post("/login", login);

module.exports = route;
