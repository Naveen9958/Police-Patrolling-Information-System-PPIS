// One-time setup script: creates the first Admin account so you have a way
// to log in before any accounts exist. Run with: node seed.js
// Change this password immediately after your first login.
const dotenv = require("dotenv");
const connectDB = require("./db");
const Officer = require("./models/Officer");

dotenv.config();

const DEFAULT_ADMIN = {
  full_name: "System Admin",
  email: "admin@ppis.local",
  password: "ChangeMe123!",
  role: "Admin",
};

async function seed() {
  await connectDB();

  const existing = await Officer.findOne({ role: "Admin" });
  if (existing) {
    console.log(`An admin account already exists (${existing.email}). Nothing to do.`);
    process.exit(0);
  }

  const badge_number = "OFF" + Date.now();

  const admin = await Officer.create({
    ...DEFAULT_ADMIN,
    badge_number,
  });

  console.log("✅ Admin account created:");
  console.log(`   Email:    ${admin.email}`);
  console.log(`   Password: ${DEFAULT_ADMIN.password}`);
  console.log("   Log in on the Admin tab, then change this password from the Officers page.");

  process.exit(0);
}

seed().catch((err) => {
  console.error("Seed failed:", err.message);
  process.exit(1);
});
