const crypto = require("crypto");
const mongoose = require("mongoose");
const validator = require("validator");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema({
  Name: {
    type: String,
    required: [true, "Please tell us your name!"],
  },
  Email: {
    type: String,
    required: [true, "Please provide your email"],
    unique: true,
    lowercase: true,
    validate: [validator.isEmail, "Please provide a valid email"],
  },
  Photo: {
    type: String,
  },
  UserRole: {
    type: String,
    enum: ["user", "foreman", "manager", "admin"],
    default: "user",
  },
  Password: {
    type: String,
    required: [true, "Please provide a Password"],
    minlength: 8,
    select: false,
  },
  PasswordConfirm: {
    type: String,
    required: [true, "Please confirm your Password"],
    validate: {
      // This only works on CREATE and SAVE!!!
      validator: function (el) {
        return el === this.Password;
      },
      message: "Passwords are not the same!",
    },
  },
  PasswordChangedAt: Date,
  PasswordResetToken: String,
  PasswordResetExpires: Date,
  Active: {
    type: Boolean,
    default: true,
    select: false,
  },
  EmployeeReference: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Employees",
  },
});

userSchema.pre("save", async function (next) {
  // Only run this function if Password was actually modified
  if (!this.isModified("Password")) return next();

  // Hash the Password with cost of 12
  this.Password = await bcrypt.hash(this.Password, 12);

  // Delete PasswordConfirm field
  this.PasswordConfirm = undefined;
  next();
});

userSchema.pre("save", function (next) {
  if (!this.isModified("Password") || this.isNew) return next();

  this.PasswordChangedAt = Date.now() - 1000;
  next();
});

userSchema.pre(/^find/, function (next) {
  // this points to the current query
  this.find({ Active: { $ne: false } });
  next();
});

userSchema.methods.correctPassword = async function (
  candidatePassword,
  userPassword
) {
  return await bcrypt.compare(candidatePassword, userPassword);
};

userSchema.methods.changedPasswordAfter = function (JWTTimestamp) {
  if (this.PasswordChangedAt) {
    const changedTimestamp = parseInt(
      this.PasswordChangedAt.getTime() / 1000,
      10
    );

    return JWTTimestamp < changedTimestamp;
  }

  // False means NOT changed
  return false;
};

userSchema.methods.createPasswordResetToken = function () {
  const resetToken = crypto.randomBytes(32).toString("hex");

  this.PasswordResetToken = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");

  console.log({ resetToken }, this.PasswordResetToken);

  this.PasswordResetExpires = Date.now() + 10 * 60 * 1000;

  return resetToken;
};

const User = mongoose.model("User", userSchema);

module.exports = User;
