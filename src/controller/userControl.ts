const mongoose = require("mongoose");
import { Types } from "mongoose";
const User = require("../model/userModel");
const jwt = require("jsonwebtoken");
import { Response, Request } from "express";

const jwtToken = (id: string) => {
  return jwt.sign({ id }, process.env.JWT_SECRET!, {
    expiresIn: process.env.EXPIRE_TIME,
  });
};

exports.userSignup = async function (req: Request, res: Response) {
  try {
    if (!req.body) {
      return res.status(400).json({ message: "Request body is required" });
    }

    const { name, email, password, confirmPassword } = req.body;

    if (!name || !email || !password || !confirmPassword) {
      return res
        .status(400)
        .json({ status: "Fail", message: "All fields are required" });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({
        status: "Fail",
        message: "Password does not match",
      });
    }

    const existingUser = await User.findOne({ email }).select("+password");
    if (existingUser) {
      return res.status(409).json({
        status: "Fail",
        message: "User already exists",
      });
    }

    await User.create(req.body);

    res.status(201).json({
      status: "Success",
      message: "User created successfully",
    });
  } catch (error: any) {
    console.error(error);
    res.status(500).json({
      status: "Fail",
      message: error.message || "Internal server error",
    });
  }
};

exports.login = async function (req: Request, res: Response) {
  const { email, password } = req.body;

  try {
    if (!email || !password) {
      return res.status(400).json({
        status: "Fail",
        message: "Please provide email and password",
      });
    }

    const user = await User.findOne({ email }).select("+password +plan");
    if (!user) {
      return res.status(401).json({
        status: "Fail",
        message: "Incorrect email or password",
      });
    }

    const isPasswordMatch = await user.comparePasswordDB(password);

    if (!isPasswordMatch) {
      return res.status(401).json({
        status: "Fail",
        message: "Incorrect email or password",
      });
    }

    const token = jwtToken(user._id.toString());
    res.status(200).json({
      status: "Success",
      message: "Login successful",
      data: {
        user: {
          id: user._id.toString(),
          name: user.name,
          email: user.email,
          plan: user.plan,
          token,
        },
      },
    });
  } catch (error: unknown) {
    console.error(error);

    let message = "An error occurred during login";

    if (error instanceof Error) {
      message = error.message;
    }

    res.status(500).json({
      status: "Fail",
      message,
    });
  }
};

exports.protect = async function (
  req: Request,
  res: Response,
  next: () => void
) {
  try {
    const authHeader = req.headers.authorization || req.headers.Authorization;

    if (!authHeader) {
      return res.status(401).json({
        status: "Fail",
        message: "Authorization header not found",
      });
    }

    const token = Array.isArray(authHeader)
      ? authHeader[0].split(" ")[1]
      : authHeader.split(" ")[1];

    if (!token) {
      return res.status(401).json({
        status: "Fail",
        message: "Token not found",
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as {
      id: string;
    };

    if (typeof decoded.id !== "string" || !Types.ObjectId.isValid(decoded.id)) {
      return res.status(400).json({
        status: "Fail",
        message: "Invalid user ID format",
      });
    }

    const userId = new Types.ObjectId(decoded.id);

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        status: "Fail",
        message: "User not found",
      });
    }

    (req as any).user = user;
    next();
  } catch (error: unknown) {
    console.error("Protect middleware error:", error);

    let message = "Authentication failed";
    let statusCode = 401;

    if (error instanceof jwt.JsonWebTokenError) {
      message = "Invalid token";
    } else if (error instanceof jwt.TokenExpiredError) {
      message = "Token expired";
    } else if (error instanceof mongoose.Error.CastError) {
      message = "Invalid user identifier";
      statusCode = 400;
    } else if (error instanceof Error) {
      message = error.message;
    }

    res.status(statusCode).json({
      status: "Fail",
      message,
    });
  }
};
