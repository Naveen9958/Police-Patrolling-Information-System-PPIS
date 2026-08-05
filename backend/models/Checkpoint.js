const mongoose = require("mongoose");

const checkpointSchema = new mongoose.Schema(
  {
    checkpoint_name: {
      type: String,
      required: true,
    },
    location: {
      type: String,
      required: true,
    },
    assigned_officer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Officer",
      default: null,
    },
    last_completed_at: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true, toJSON: { virtuals: true } }
);

module.exports = mongoose.model("Checkpoint", checkpointSchema);