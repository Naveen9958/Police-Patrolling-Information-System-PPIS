const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const connectDB = require("./db");

const Officer = require("./models/Officer");
const Checkpoint = require("./models/Checkpoint");
const PatrolLog = require("./models/PatrolLog");

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

connectDB();

const DAY_MS = 24 * 60 * 60 * 1000;

// A checkpoint counts as "completed" for 24 hours after it's marked done,
// then automatically flips back to "pending" — no cron job needed, this
// is just computed at read time from last_completed_at.
function getCheckpointStatus(checkpoint) {
  const completed =
    checkpoint.last_completed_at &&
    Date.now() - new Date(checkpoint.last_completed_at).getTime() < DAY_MS;

  return {
    status: completed ? "completed" : "pending",
    resets_at: completed
      ? new Date(new Date(checkpoint.last_completed_at).getTime() + DAY_MS)
      : null,
  };
}

// ADMIN LOGIN
app.post("/auth/admin/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await Officer.findOne({ email, password, role: "Admin" });

    if (!user) {
      return res.json({
        success: false,
        error: "Invalid admin email or password",
      });
    }

    res.json({
      success: true,
      user: {
        id: user.id,
        full_name: user.full_name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    console.error(err);

    res.status(500).json({
      success: false,
      error: err.message,
    });
  }
});

// OFFICER LOGIN
app.post("/auth/officer/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await Officer.findOne({ email, password, role: "Officer" });

    if (!user) {
      return res.json({
        success: false,
        error: "Invalid officer email or password",
      });
    }

    res.json({
      success: true,
      user: {
        id: user.id,
        full_name: user.full_name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    console.error(err);

    res.status(500).json({
      success: false,
      error: err.message,
    });
  }
});

// GET ALL OFFICERS
app.get("/officers", async (req, res) => {
  try {
    const officers = await Officer.find(
      {},
      "full_name email role location location_updated_at"
    ).sort({ _id: 1 });

    res.json(officers);
  } catch (err) {
    console.error(err);

    res.status(500).json({
      success: false,
      error: err.message,
    });
  }
});

// ADD OFFICER
app.post("/officers", async (req, res) => {
  const { full_name, email, password, role } = req.body;

  try {
    const badge_number = "OFF" + Date.now();

    const officer = await Officer.create({
      full_name,
      badge_number,
      email,
      password,
      role,
    });

    res.json({
      success: true,
      officer,
    });
  } catch (err) {
    console.error(err);

    res.status(500).json({
      success: false,
      error: err.message,
    });
  }
});

// DELETE OFFICER
app.delete("/officers/:id", async (req, res) => {
  try {
    await Officer.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
    });
  } catch (err) {
    console.error(err);

    res.status(500).json({
      success: false,
      error: err.message,
    });
  }
});

// GET CHECKPOINTS ASSIGNED TO A SPECIFIC OFFICER (officer portal)
app.get("/officers/:id/checkpoints", async (req, res) => {
  try {
    const checkpoints = await Checkpoint.find({
      assigned_officer: req.params.id,
    }).sort({ _id: 1 });

    const formatted = checkpoints.map((cp) => ({
      id: cp.id,
      checkpoint_name: cp.checkpoint_name,
      location: cp.location,
      last_completed_at: cp.last_completed_at,
      ...getCheckpointStatus(cp),
    }));

    res.json(formatted);
  } catch (err) {
    console.error(err);

    res.status(500).json({
      success: false,
      error: err.message,
    });
  }
});

// UPDATE OFFICER LIVE LOCATION
app.patch("/officers/:id/location", async (req, res) => {
  const { lat, lng } = req.body;

  try {
    const officer = await Officer.findByIdAndUpdate(
      req.params.id,
      {
        location: { lat, lng },
        location_updated_at: new Date(),
      },
      { new: true, fields: "full_name email role location location_updated_at" }
    );

    if (!officer) {
      return res.status(404).json({
        success: false,
        error: "Officer not found",
      });
    }

    res.json({
      success: true,
      officer,
    });
  } catch (err) {
    console.error(err);

    res.status(500).json({
      success: false,
      error: err.message,
    });
  }
});

// SIMULATE LIVE LOCATION MOVEMENT (demo data source until real GPS devices are wired up)
app.post("/officers/simulate-locations", async (req, res) => {
  // Base point: Ghaziabad, UP — officers without a location yet start scattered nearby.
  const BASE = { lat: 28.6692, lng: 77.4538 };

  try {
    const officers = await Officer.find({}, "location");

    await Promise.all(
      officers.map((officer) => {
        const hasLocation =
          officer.location?.lat != null && officer.location?.lng != null;

        const origin = hasLocation ? officer.location : BASE;

        const jitter = () => (Math.random() - 0.5) * 0.01;

        return Officer.findByIdAndUpdate(officer._id, {
          location: {
            lat: origin.lat + jitter(),
            lng: origin.lng + jitter(),
          },
          location_updated_at: new Date(),
        });
      })
    );

    const officersUpdated = await Officer.find(
      {},
      "full_name email role location location_updated_at"
    ).sort({ _id: 1 });

    res.json({
      success: true,
      officers: officersUpdated,
    });
  } catch (err) {
    console.error(err);

    res.status(500).json({
      success: false,
      error: err.message,
    });
  }
});

// GET CHECKPOINTS
app.get("/checkpoints", async (req, res) => {
  try {
    const checkpoints = await Checkpoint.find()
      .populate("assigned_officer", "full_name")
      .sort({ _id: 1 });

    const formatted = checkpoints.map((cp) => ({
      id: cp.id,
      checkpoint_name: cp.checkpoint_name,
      location: cp.location,
      assigned_officer: cp.assigned_officer
        ? { id: cp.assigned_officer.id, full_name: cp.assigned_officer.full_name }
        : null,
      last_completed_at: cp.last_completed_at,
      ...getCheckpointStatus(cp),
    }));

    res.json(formatted);
  } catch (err) {
    console.error(err);

    res.status(500).json({
      success: false,
      error: err.message,
    });
  }
});

// ASSIGN CHECKPOINT TO AN OFFICER (admin action)
app.patch("/checkpoints/:id/assign", async (req, res) => {
  const { officer_id } = req.body;

  try {
    const checkpoint = await Checkpoint.findByIdAndUpdate(
      req.params.id,
      {
        assigned_officer: officer_id || null,
        // Reassigning starts a fresh 24h cycle for whoever holds it now.
        last_completed_at: null,
      },
      { new: true }
    ).populate("assigned_officer", "full_name");

    if (!checkpoint) {
      return res.status(404).json({
        success: false,
        error: "Checkpoint not found",
      });
    }

    res.json({
      success: true,
      checkpoint: {
        id: checkpoint.id,
        checkpoint_name: checkpoint.checkpoint_name,
        location: checkpoint.location,
        assigned_officer: checkpoint.assigned_officer
          ? { id: checkpoint.assigned_officer.id, full_name: checkpoint.assigned_officer.full_name }
          : null,
        last_completed_at: checkpoint.last_completed_at,
        ...getCheckpointStatus(checkpoint),
      },
    });
  } catch (err) {
    console.error(err);

    res.status(500).json({
      success: false,
      error: err.message,
    });
  }
});

// ADD CHECKPOINT
app.post("/checkpoints", async (req, res) => {
  const { checkpoint_name, location } = req.body;

  try {
    const checkpoint = await Checkpoint.create({
      checkpoint_name,
      location,
    });

    res.json({
      success: true,
      checkpoint,
    });
  } catch (err) {
    console.error(err);

    res.status(500).json({
      success: false,
      error: err.message,
    });
  }
});

// DELETE CHECKPOINT
app.delete("/checkpoints/:id", async (req, res) => {
  try {
    await Checkpoint.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
    });
  } catch (err) {
    console.error(err);

    res.status(500).json({
      success: false,
      error: err.message,
    });
  }
});

// PATROL LOGS
app.get("/patrol-logs", async (req, res) => {
  try {
    const logs = await PatrolLog.find()
      .populate("officer_id", "full_name")
      .populate("checkpoint_id", "checkpoint_name")
      .sort({ scanned_at: -1 });

    const formatted = logs.map((log) => ({
      id: log._id,
      full_name: log.officer_id?.full_name,
      checkpoint_name: log.checkpoint_id?.checkpoint_name,
      scanned_at: log.scanned_at,
    }));

    res.json(formatted);
  } catch (err) {
    console.error(err);

    res.status(500).json({
      success: false,
      error: err.message,
    });
  }
});

// COMPLETE A CHECKPOINT (officer portal — only the assigned officer can complete it)
app.post("/checkpoints/:id/complete", async (req, res) => {
  const { officer_id } = req.body;

  try {
    const checkpoint = await Checkpoint.findById(req.params.id);

    if (!checkpoint) {
      return res.status(404).json({
        success: false,
        error: "Checkpoint not found",
      });
    }

    if (
      !checkpoint.assigned_officer ||
      checkpoint.assigned_officer.toString() !== officer_id
    ) {
      return res.status(403).json({
        success: false,
        error: "This checkpoint is not assigned to you",
      });
    }

    const { status } = getCheckpointStatus(checkpoint);
    if (status === "completed") {
      return res.status(400).json({
        success: false,
        error: "Already completed — this checkpoint resets after 24 hours",
      });
    }

    checkpoint.last_completed_at = new Date();
    await checkpoint.save();

    await PatrolLog.create({
      officer_id,
      checkpoint_id: checkpoint._id,
    });

    res.json({
      success: true,
      checkpoint: {
        id: checkpoint.id,
        checkpoint_name: checkpoint.checkpoint_name,
        location: checkpoint.location,
        last_completed_at: checkpoint.last_completed_at,
        ...getCheckpointStatus(checkpoint),
      },
    });
  } catch (err) {
    console.error(err);

    res.status(500).json({
      success: false,
      error: err.message,
    });
  }
});

// DASHBOARD STATS
app.get("/dashboard-stats", async (req, res) => {
  try {
    const officers = await Officer.countDocuments();
    const checkpoints = await Checkpoint.countDocuments();
    const patrolLogs = await PatrolLog.countDocuments();

    res.json({
      officers,
      checkpoints,
      patrolLogs,
    });
  } catch (err) {
    console.error(err);

    res.status(500).json({
      success: false,
      error: err.message,
    });
  }
});

app.listen(5000, () => {
  console.log("🚔 RPIS Server Running On Port 5000");
});