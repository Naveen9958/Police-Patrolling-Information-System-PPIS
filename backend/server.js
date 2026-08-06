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
const SIMULATION_STEP = 0.004;
const DEFAULT_BASE_POINT = { lat: 28.6692, lng: 77.4538 };
const checkpointCoordinateCache = new Map();

function hashString(value = "") {
  let hash = 0;

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) | 0;
  }

  return Math.abs(hash);
}

function pointFromSeed(seed, base = DEFAULT_BASE_POINT, spread = 0.02) {
  const hash = hashString(seed);
  const latOffset = ((hash % 1000) / 999 - 0.5) * spread;
  const lngOffset = (((Math.floor(hash / 1000) % 1000) / 999) - 0.5) * spread;

  return {
    lat: Number((base.lat + latOffset).toFixed(6)),
    lng: Number((base.lng + lngOffset).toFixed(6)),
  };
}

function buildOfficerStartingLocation(officerSeed) {
  return pointFromSeed(`officer:${officerSeed}`, DEFAULT_BASE_POINT, 0.018);
}

function buildCheckpointTarget(locationText) {
  return pointFromSeed(`checkpoint:${locationText}`, DEFAULT_BASE_POINT, 0.035);
}

async function geocodeCheckpointLocation(locationText) {
  const cacheKey = (locationText || "").trim().toLowerCase();

  if (!cacheKey) {
    return null;
  }

  if (checkpointCoordinateCache.has(cacheKey)) {
    return checkpointCoordinateCache.get(cacheKey);
  }

  const fallback = buildCheckpointTarget(locationText);

  try {
    const url = new URL("https://nominatim.openstreetmap.org/search");
    url.searchParams.set("format", "jsonv2");
    url.searchParams.set("limit", "1");
    url.searchParams.set("q", locationText);

    const response = await fetch(url, {
      headers: {
        "User-Agent": "PPIS/1.0",
        "Accept-Language": "en",
      },
    });

    if (!response.ok) {
      throw new Error(`Geocoding request failed with status ${response.status}`);
    }

    const results = await response.json();
    const topResult = Array.isArray(results) && results.length > 0 ? results[0] : null;

    if (!topResult) {
      checkpointCoordinateCache.set(cacheKey, fallback);
      return fallback;
    }

    const coordinates = {
      lat: Number.parseFloat(topResult.lat),
      lng: Number.parseFloat(topResult.lon),
    };

    if (Number.isNaN(coordinates.lat) || Number.isNaN(coordinates.lng)) {
      checkpointCoordinateCache.set(cacheKey, fallback);
      return fallback;
    }

    checkpointCoordinateCache.set(cacheKey, coordinates);
    return coordinates;
  } catch (err) {
    console.error("Checkpoint geocoding failed:", err.message);
    checkpointCoordinateCache.set(cacheKey, fallback);
    return fallback;
  }
}

async function searchCheckpointLocations(query) {
  const normalizedQuery = (query || "").trim();

  if (!normalizedQuery) {
    return [];
  }

  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("limit", "5");
  url.searchParams.set("q", normalizedQuery);

  const response = await fetch(url, {
    headers: {
      "User-Agent": "PPIS/1.0",
      "Accept-Language": "en",
    },
  });

  if (!response.ok) {
    throw new Error(`Location search failed with status ${response.status}`);
  }

  const results = await response.json();

  if (!Array.isArray(results)) {
    return [];
  }

  return results
    .map((item) => ({
      label: item.display_name,
      lat: Number.parseFloat(item.lat),
      lng: Number.parseFloat(item.lon),
    }))
    .filter((item) => item.label && !Number.isNaN(item.lat) && !Number.isNaN(item.lng));
}

async function reverseGeocodeCheckpointLocation(lat, lng) {
  const parsedLat = Number.parseFloat(lat);
  const parsedLng = Number.parseFloat(lng);

  if (Number.isNaN(parsedLat) || Number.isNaN(parsedLng)) {
    return null;
  }

  try {
    const url = new URL("https://nominatim.openstreetmap.org/reverse");
    url.searchParams.set("format", "jsonv2");
    url.searchParams.set("lat", String(parsedLat));
    url.searchParams.set("lon", String(parsedLng));

    const response = await fetch(url, {
      headers: {
        "User-Agent": "PPIS/1.0",
        "Accept-Language": "en",
      },
    });

    if (!response.ok) {
      throw new Error(`Reverse geocoding failed with status ${response.status}`);
    }

    const result = await response.json();

    if (!result?.display_name) {
      return null;
    }

    return {
      label: result.display_name,
      lat: parsedLat,
      lng: parsedLng,
    };
  } catch (err) {
    console.error("Reverse geocoding failed:", err.message);
    return null;
  }
}

function moveTowards(currentPoint, targetPoint, step = SIMULATION_STEP) {
  const deltaLat = targetPoint.lat - currentPoint.lat;
  const deltaLng = targetPoint.lng - currentPoint.lng;
  const distance = Math.sqrt(deltaLat * deltaLat + deltaLng * deltaLng);

  if (distance <= step) {
    return {
      lat: targetPoint.lat,
      lng: targetPoint.lng,
      reached: true,
    };
  }

  const ratio = step / distance;

  return {
    lat: Number((currentPoint.lat + deltaLat * ratio).toFixed(6)),
    lng: Number((currentPoint.lng + deltaLng * ratio).toFixed(6)),
    reached: false,
  };
}

function getCurrentLocation(officer) {
  if (officer.location?.lat != null && officer.location?.lng != null) {
    return officer.location;
  }

  if (officer.starting_location?.lat != null && officer.starting_location?.lng != null) {
    return officer.starting_location;
  }

  return buildOfficerStartingLocation(officer._id.toString());
}

function getCheckpointLocation(checkpoint) {
  if (checkpoint.coordinates?.lat != null && checkpoint.coordinates?.lng != null) {
    return checkpoint.coordinates;
  }

  return buildCheckpointTarget(checkpoint.location);
}

function getDistance(pointA, pointB) {
  const deltaLat = pointA.lat - pointB.lat;
  const deltaLng = pointA.lng - pointB.lng;
  return Math.sqrt(deltaLat * deltaLat + deltaLng * deltaLng);
}

async function assignCheckpointToOfficer(checkpointId, officerId) {
  if (officerId) {
    await Checkpoint.updateMany(
      {
        assigned_officer: officerId,
        _id: { $ne: checkpointId },
      },
      {
        assigned_officer: null,
      }
    );
  }

  return Checkpoint.findByIdAndUpdate(
    checkpointId,
    {
      assigned_officer: officerId || null,
      // Reassigning starts a fresh 24h cycle for whoever holds it now.
      last_completed_at: null,
    },
    { new: true }
  ).populate("assigned_officer", "full_name");
}

async function formatCheckpoint(checkpoint) {
  const coordinates =
    checkpoint.coordinates?.lat != null && checkpoint.coordinates?.lng != null
      ? checkpoint.coordinates
      : await geocodeCheckpointLocation(checkpoint.location);

  if (
    coordinates &&
    (checkpoint.coordinates?.lat == null || checkpoint.coordinates?.lng == null)
  ) {
    await Checkpoint.findByIdAndUpdate(checkpoint._id, { coordinates });
  }

  return {
    id: checkpoint.id,
    checkpoint_name: checkpoint.checkpoint_name,
    location: checkpoint.location,
    coordinates,
    assigned_officer: checkpoint.assigned_officer
      ? { id: checkpoint.assigned_officer.id, full_name: checkpoint.assigned_officer.full_name }
      : null,
    last_completed_at: checkpoint.last_completed_at,
    ...getCheckpointStatus(checkpoint),
  };
}

async function findNearestOfficerForCheckpoint(checkpoint) {
  const officers = await Officer.find(
    { role: "Officer" },
    "full_name location starting_location location_updated_at"
  );

  if (officers.length === 0) {
    return null;
  }

  const checkpointLocation = getCheckpointLocation(checkpoint);

  return officers
    .map((officer) => ({
      officer,
      distance: getDistance(getCurrentLocation(officer), checkpointLocation),
    }))
    .sort((left, right) => left.distance - right.distance)[0]?.officer || null;
}

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
      "full_name email role location starting_location location_updated_at"
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
    const starting_location = buildOfficerStartingLocation(email || badge_number || full_name);

    const officer = await Officer.create({
      full_name,
      badge_number,
      email,
      password,
      role,
      starting_location,
      location: starting_location,
      location_updated_at: new Date(),
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

    const formatted = await Promise.all(checkpoints.map((cp) => formatCheckpoint(cp)));

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
      {
        new: true,
        fields: "full_name email role location starting_location location_updated_at",
      }
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
  try {
    const officers = await Officer.find(
      {},
      "location starting_location role full_name badge_number email"
    );
    const officerIds = officers.map((officer) => officer._id);
    const checkpoints = await Checkpoint.find({
      assigned_officer: { $in: officerIds },
    }).sort({ _id: 1 });

    const checkpointsByOfficer = checkpoints.reduce((map, checkpoint) => {
      const key = checkpoint.assigned_officer.toString();

      if (!map.has(key)) {
        map.set(key, []);
      }

      map.get(key).push(checkpoint);
      return map;
    }, new Map());

    await Promise.all(
      officers.map((officer) => {
        const origin = getCurrentLocation(officer);
        const assignedCheckpoint = (checkpointsByOfficer.get(officer._id.toString()) || [])[0];

        let nextLocation = origin;

        if (assignedCheckpoint) {
          const target = buildCheckpointTarget(assignedCheckpoint.location);
          nextLocation = moveTowards(origin, target);
        } else {
          const jitter = () => (Math.random() - 0.5) * 0.003;
          nextLocation = {
            lat: Number((origin.lat + jitter()).toFixed(6)),
            lng: Number((origin.lng + jitter()).toFixed(6)),
          };
        }

        return Officer.findByIdAndUpdate(officer._id, {
          location: {
            lat: nextLocation.lat,
            lng: nextLocation.lng,
          },
          location_updated_at: new Date(),
        });
      })
    );

    const officersUpdated = await Officer.find(
      {},
      "full_name email role location starting_location location_updated_at"
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

    const formatted = await Promise.all(checkpoints.map((cp) => formatCheckpoint(cp)));

    res.json(formatted);
  } catch (err) {
    console.error(err);

    res.status(500).json({
      success: false,
      error: err.message,
    });
  }
});

// SEARCH LOCATIONS FOR CHECKPOINT ENTRY
app.get("/locations/search", async (req, res) => {
  try {
    const suggestions = await searchCheckpointLocations(req.query.q);

    res.json({
      success: true,
      suggestions,
    });
  } catch (err) {
    console.error(err);

    res.status(500).json({
      success: false,
      error: err.message,
    });
  }
});

// REVERSE GEOCODE A CLICKED MAP LOCATION
app.get("/locations/reverse", async (req, res) => {
  try {
    const location = await reverseGeocodeCheckpointLocation(req.query.lat, req.query.lng);

    if (!location) {
      return res.status(404).json({
        success: false,
        error: "Could not resolve that map location",
      });
    }

    res.json({
      success: true,
      location,
    });
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
    const checkpoint = await assignCheckpointToOfficer(req.params.id, officer_id);

    if (!checkpoint) {
      return res.status(404).json({
        success: false,
        error: "Checkpoint not found",
      });
    }

    if (checkpoint.assigned_officer) {
      const assignedOfficer = await Officer.findById(checkpoint.assigned_officer);

      if (assignedOfficer) {
        const currentLocation = getCurrentLocation(assignedOfficer);
        const targetLocation = buildCheckpointTarget(checkpoint.location);
        const nextLocation = moveTowards(currentLocation, targetLocation);

        await Officer.findByIdAndUpdate(assignedOfficer._id, {
          location: {
            lat: nextLocation.lat,
            lng: nextLocation.lng,
          },
          location_updated_at: new Date(),
        });
      }
    }

    let notification = null;

    if (checkpoint.assigned_officer) {
      const assignedOfficer = await Officer.findById(
        checkpoint.assigned_officer,
        "full_name email"
      );

      if (assignedOfficer) {
        notification = `${assignedOfficer.full_name} is moving toward ${checkpoint.checkpoint_name}`;
      }
    }

    res.json({
      success: true,
      notification,
      checkpoint: await formatCheckpoint(checkpoint),
    });
  } catch (err) {
    console.error(err);

    res.status(500).json({
      success: false,
      error: err.message,
    });
  }
});

// AUTO-ASSIGN THE NEAREST OFFICER TO A CHECKPOINT
app.post("/checkpoints/:id/auto-assign", async (req, res) => {
  try {
    const checkpoint = await Checkpoint.findById(req.params.id);

    if (!checkpoint) {
      return res.status(404).json({
        success: false,
        error: "Checkpoint not found",
      });
    }

    const officers = await Officer.find({ role: "Officer" }, "full_name location starting_location location_updated_at");

    if (officers.length === 0) {
      return res.status(404).json({
        success: false,
        error: "No officers available to assign",
      });
    }

    const checkpointLocation = getCheckpointLocation(checkpoint);

    const nearestOfficer = officers
      .map((officer) => ({
        officer,
        distance: getDistance(getCurrentLocation(officer), checkpointLocation),
      }))
      .sort((left, right) => left.distance - right.distance)[0]?.officer;

    if (!nearestOfficer) {
      return res.status(404).json({
        success: false,
        error: "No officer locations available for auto assignment",
      });
    }

    const assignedCheckpoint = await assignCheckpointToOfficer(checkpoint._id, nearestOfficer._id);

    const currentLocation = getCurrentLocation(nearestOfficer);
    const targetLocation = getCheckpointLocation(assignedCheckpoint);
    const nextLocation = moveTowards(currentLocation, targetLocation);

    await Officer.findByIdAndUpdate(nearestOfficer._id, {
      location: {
        lat: nextLocation.lat,
        lng: nextLocation.lng,
      },
      location_updated_at: new Date(),
    });

    res.json({
      success: true,
      notification: `${nearestOfficer.full_name} automatically assigned to ${assignedCheckpoint.checkpoint_name}`,
      checkpoint: await formatCheckpoint(assignedCheckpoint),
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

    const coordinates = await geocodeCheckpointLocation(location);
    if (coordinates) {
      await Checkpoint.findByIdAndUpdate(checkpoint._id, { coordinates });
      checkpoint.coordinates = coordinates;
    }

    const nearestOfficer = await findNearestOfficerForCheckpoint(checkpoint);
    const assignedCheckpoint = nearestOfficer
      ? await assignCheckpointToOfficer(checkpoint._id, nearestOfficer._id)
      : await Checkpoint.findById(checkpoint._id).populate("assigned_officer", "full_name");

    if (nearestOfficer) {
      const currentLocation = getCurrentLocation(nearestOfficer);
      const targetLocation = getCheckpointLocation(assignedCheckpoint);
      const nextLocation = moveTowards(currentLocation, targetLocation);

      await Officer.findByIdAndUpdate(nearestOfficer._id, {
        location: {
          lat: nextLocation.lat,
          lng: nextLocation.lng,
        },
        location_updated_at: new Date(),
      });
    }

    res.json({
      success: true,
      notification: nearestOfficer
        ? `${nearestOfficer.full_name} automatically assigned to ${assignedCheckpoint.checkpoint_name}`
        : null,
      checkpoint: await formatCheckpoint(assignedCheckpoint),
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