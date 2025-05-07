require("dotenv").config();
const express = require("express");
const morgan = require("morgan");
const mongoose = require("mongoose");
const path = require("path");
const cors = require("cors");
import { Request, Response } from "express";
const storyRoutes = require("./routes/storyRoutes");
const userRoutes = require("./routes/userRoutes");

const app = express();
app.use(express.json());
if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
}

app.use(
  cors({
    origin: "*",
  })
);

mongoose
  .connect(process.env.MONGODB_URL)
  .then(() => console.log("✅ Connected to MongoDB"))
  .catch(({ err }: any) => console.error("❌ MongoDB Connection Error:", err));

app.use("/images", express.static(path.join(__dirname, "public/images")));
app.use("/api/v1/story", storyRoutes);
app.use("/api/v1/user", userRoutes);

app.get("/", (req: Request, res: Response) => {
  res.status(200).json({
    status: "success",
    message: "Server is running",
  });
});

app.use(/(.*)/, (req: Request, res: Response) => {
  res.status(404).json({
    status: "Fail",
    message: "Routes not found!!!",
  });
});

const port = process.env.PORT || 3000;

app.listen(port, () => {
  console.log(`Server is listening to port ${port}`);
});
