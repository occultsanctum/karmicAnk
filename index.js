import express from "express";
import bodyParser from "body-parser";

const app = express();

// CORS middleware to allow external access
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, Authorization, key, value"
  );
  if (req.method === "OPTIONS") {
    console.log(`${new Date().toISOString()} - OPTIONS request handled`);
    return res.status(200).end();
  }
  next();
});

// Logging middleware to see all incoming requests
app.use((req, res, next) => {
  console.log(`\n======== NEW REQUEST ========`);
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  console.log("Headers:", JSON.stringify(req.headers, null, 2));
  console.log("Raw body length:", req.headers["content-length"] || "unknown");
  next();
});

// JSON parsing + capture raw
app.use(
  bodyParser.json({
    type: "application/json",
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  })
);

// Response logger
app.use((req, res, next) => {
  if (req.body && Object.keys(req.body).length > 0) {
    console.log("📥 PARSED REQUEST BODY:", JSON.stringify(req.body, null, 2));
  }
  const originalJson = res.json;
  res.json = function (body) {
    console.log("📤 RESPONSE BODY:", JSON.stringify(body, null, 2));
    console.log("======== END REQUEST ========\n");
    return originalJson.call(this, body);
  };
  next();
});

// Error handler for JSON parsing errors
app.use((error, req, res, next) => {
  if (error instanceof SyntaxError && error.status === 400 && "body" in error) {
    console.log("JSON Parse Error:", error.message);
    console.log("Raw body received:", req.rawBody ? req.rawBody.toString() : "No body");
    return res.status(400).json({ ok: false, reply: "Invalid JSON format" });
  }
  next(error);
});

// ---- Numerology helpers ----
const planetMap = { 1: "Sun", 2: "Moon", 3: "Jupiter", 4: "Rahu", 5: "Mercury", 6: "Venus", 7: "Ketu", 8: "Saturn", 9: "Mars" };

function reduceToSingleDigit(num) {
  let sum = num.toString().split("").reduce((a, d) => a + (d === "0" ? 0 : parseInt(d)), 0);
  return sum > 9 ? reduceToSingleDigit(sum) : sum;
}

function calcFromDOB(dob /* "DD-MM-YYYY" */) {
  const [dd, mm, yyyy] = dob.split("-").map(Number);

  // 1) Basic
  const basic_number = reduceToSingleDigit(dd);
  const basic_planet = planetMap[basic_number];

  // 2) Destiny
  const digits = `${dd}${mm}${yyyy}`.split("").filter((d) => d !== "0").map(Number);
  const destiny_number = reduceToSingleDigit(digits.reduce((a, b) => a + b, 0));
  const destiny_planet = planetMap[destiny_number];

  // 3) Grid
  let gridDigits = [...dd.toString(), ...mm.toString(), ...yyyy.toString().slice(-2)]
    .filter((d) => d !== "0")
    .map(Number);
  gridDigits.push(destiny_number);

  const grid = {};
  for (let i = 1; i <= 9; i++) grid[i] = gridDigits.filter((n) => n === i).length;

  return { basic_number, basic_planet, destiny_number, destiny_planet, grid };
}

function normalizeDOBFromText(txt = "") {
  // Accept DD-MM-YYYY, DD/MM/YYYY, DD.MM.YYYY, DD MM YYYY
  const m = txt.match(/\b(\d{1,2})[-/. ](\d{1,2})[-/. ](\d{4})\b/);
  if (!m) return null;
  const dd = m[1].padStart(2, "0");
  const mm = m[2].padStart(2, "0");
  const yyyy = m[3];
  return `${dd}-${mm}-${yyyy}`;
}

// ---- Health check ----
app.get("/health", (_req, res) => res.json({ ok: true, service: "karmicAnk", ts: Date.now() }));

// ---- Function Calling endpoint (accepts multiple shapes) ----
app.post("/functions/calc_numerology", (req, res) => {
  const body = req.body || {};
  const dob =
    body.dob ||
    (body.arguments && (body.arguments.dob || body.arguments.DOB)) ||
    (body.input && (body.input.dob || body.input.DOB));

  if (!dob || typeof dob !== "string") {
    return res.status(400).json({
      ok: false,
      reply: "Missing 'dob'. Please send DOB as DD-MM-YYYY.",
      receivedShape: Object.keys(body),
    });
  }

  const parts = dob.split("-");
  if (parts.length !== 3) return res.status(400).json({ ok: false, reply: "DOB must be DD-MM-YYYY" });

  const [dd, mm, yyyy] = parts.map(Number);
  if (!dd || !mm || !yyyy || String(yyyy).length !== 4) {
    return res.status(400).json({ ok: false, reply: "Invalid DOB numbers. Use DD-MM-YYYY (e.g., 15-08-1985)." });
  }

  const data = calcFromDOB(dob);
  const reply =
    `DOB: ${dob}\n` +
    `Basic Number: ${data.basic_number} (${data.basic_planet})\n` +
    `Destiny Number: ${data.destiny_number} (${data.destiny_planet})\n` +
    `Grid: ${JSON.stringify(data.grid)}`;

  return res.json({ ok: true, reply, data, ...data });
});

// ---- Webhook Action endpoint (for Actions → Webhooks) ----
app.post("/hooks/numerology", (req, res) => {
  const body = req.body || {};
  // We accept explicit dob or try to extract from message/text
  const rawMessage = body.message || body.text || "";
  let dob = body.dob && typeof body.dob === "string" ? body.dob : normalizeDOBFromText(rawMessage);

  if (!dob) {
    return res.status(200).json({
      ok: false,
      reply: "Please send your DOB in DD-MM-YYYY format (e.g., 15-08-1985).",
    });
  }

  // Validate numeric parts
  const [dd, mm, yyyy] = dob.split("-").map(Number);
  if (!dd || !mm || !yyyy || String(yyyy).length !== 4) {
    return res.status(200).json({
      ok: false,
      reply: "Invalid DOB. Use DD-MM-YYYY (e.g., 15-08-1985).",
    });
  }

  const data = calcFromDOB(dob);
  const reply =
    `DOB: ${dob}\n` +
    `Basic Number: ${data.basic_number} (${data.basic_planet})\n` +
    `Destiny Number: ${data.destiny_number} (${data.destiny_planet})\n` +
    `Grid: ${JSON.stringify(data.grid)}`;

  return res.status(200).json({ ok: true, reply, data, ...data });
});

// ---- Start server on Replit-assigned port ----
const PORT = process.env.PORT || 3000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Numerology webhook running on 0.0.0.0:${PORT}`);
});
