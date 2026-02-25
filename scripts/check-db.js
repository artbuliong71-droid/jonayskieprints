const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");

function loadEnvLocal() {
  const p = path.resolve(process.cwd(), ".env.local");
  if (!fs.existsSync(p)) return;
  const lines = fs.readFileSync(p, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const m = line.match(/^\s*([^#=\s]+)\s*=\s*(.*)\s*$/);
    if (!m) continue;
    const k = m[1];
    let v = m[2];
    if (v.startsWith('"') && v.endsWith('"')) v = v.slice(1, -1);
    if (v.startsWith("'") && v.endsWith("'")) v = v.slice(1, -1);
    if (process.env[k] === undefined) process.env[k] = v;
  }
}

loadEnvLocal();

const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error(
    "MONGODB_URI not set. Please add it to .env.local or set env var.",
  );
  process.exit(1);
}

console.log("Connecting to MongoDB at", uri);

mongoose
  .connect(uri)
  .then(() => {
    console.log("MongoDB connection successful — OK");
    return mongoose.disconnect();
  })
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("MongoDB connection failed:", err.message || err);
    process.exit(2);
  });
