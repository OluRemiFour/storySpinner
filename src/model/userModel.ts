const mongoose = require("mongoose");
const validator = require("validator");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, "Please provide your name"],
  },
  email: {
    type: String,
    required: [true, "Email is required"],
    lowercase: true,
    trim: true,
    validate: {
      validator: function ({ v }: any) {
        return /^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/.test(v);
      },
      message: "Invalid email format",
    },
    unique: true,
    select: false,
  },
  password: {
    type: String,
    required: [true, "Please provide a password"],
    minlength: 8,
    select: false,
  },
  confirmPassword: {
    type: String,
    required: [true, "Please confirm your password"],
    validate: {
      validator: function (this: any, value: string) {
        return value === this.password;
      },
      message: "Passwords do not match",
    },
    select: false,
  },
  plan: {
    type: String,
    enum: ["Premium", "Free"],
    default: "Free",
    select: true,
  },
});

userSchema.pre("save", function (this: Document & any, next: () => void) {
  this.confirmPassword = undefined;
  next();
});

userSchema.pre("save", async function (this: Document & any, next: () => void) {
  if (!this.isModified("password")) return next(); // ✅

  this.password = await bcrypt.hash(this.password, 12);
  this.confirmPassword = undefined;
  next();
});

userSchema.methods.comparePasswordDB = async function (
  this: Document & any,
  userInputPassword: string
) {
  return await bcrypt.compare(userInputPassword, this.password);
};

module.exports = mongoose.model("User", userSchema);
