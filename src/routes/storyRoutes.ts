// export {};
const express = require("express");
const route = express.Router();

const generateStory = require("../controller/storyControl");
const { protect } = require("../controller/userControl");

route.post("/generateStory", protect, generateStory);

module.exports = route;
