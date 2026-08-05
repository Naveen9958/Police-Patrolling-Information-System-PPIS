const mongoose = require("mongoose");

const officerSchema = new mongoose.Schema(
  {
    full_name: {
      type: String,
      required: true,
    },
    badge_number: {
      type: String,
      required: true,
      unique: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    password: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      default: "officer",
    },
    location: {
      lat: { type: Number, default: null },
      lng: { type: Number, default: null },
    },
    location_updated_at: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true, toJSON: { virtuals: true } }
);

module.exports = mongoose.model("Officer", officerSchema);