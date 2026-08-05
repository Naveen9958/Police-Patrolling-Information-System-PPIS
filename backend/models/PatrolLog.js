const mongoose = require("mongoose");

const patrolLogSchema = new mongoose.Schema(
  {
    officer_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Officer",
      required: true,
    },
    checkpoint_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Checkpoint",
      required: true,
    },
    scanned_at: {
      type: Date,
      default: Date.now,
    },
  },
  { toJSON: { virtuals: true } }
);

module.exports = mongoose.model("PatrolLog", patrolLogSchema);