import express from "express";
import bodyParser from "body-parser";

const app = express();
// CORS middleware to allow external access
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, key, value');
  
  // Handle preflight OPTIONS requests
  if (req.method === 'OPTIONS') {
    console.log(`${new Date().toISOString()} - OPTIONS request handled`);
    return res.status(200).end();
  }
  
  next();
});

// Logging middleware to see all incoming requests
app.use((req, res, next) => {
  console.log(`\n======== NEW REQUEST ========`);
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  console.log('Headers:', JSON.stringify(req.headers, null, 2));
  console.log('Raw body length:', req.headers['content-length'] || 'unknown');
  next();
});

// Add error handling for JSON parsing
app.use(bodyParser.json({
  type: 'application/json',
  verify: (req, res, buf, encoding) => {
    req.rawBody = buf;
  }
}));

// Middleware to log request bodies after parsing
app.use((req, res, next) => {
  if (req.body && Object.keys(req.body).length > 0) {
    console.log('📥 PARSED REQUEST BODY:', JSON.stringify(req.body, null, 2));
  }
  
  // Capture original json method to log responses
  const originalJson = res.json;
  res.json = function(body) {
    console.log('📤 RESPONSE BODY:', JSON.stringify(body, null, 2));
    console.log('======== END REQUEST ========\n');
    return originalJson.call(this, body);
  };
  
  next();
});

// Error handler for JSON parsing errors
app.use((error, req, res, next) => {
  if (error instanceof SyntaxError && error.status === 400 && 'body' in error) {
    console.log('JSON Parse Error:', error.message);
    console.log('Raw body received:', req.rawBody ? req.rawBody.toString() : 'No body');
    return res.status(400).json({ error: 'Invalid JSON format' });
  }
  next(error);
});

// Planetary mapping
const planetMap = {
  1: "Sun",
  2: "Moon",
  3: "Jupiter",
  4: "Rahu",
  5: "Mercury",
  6: "Venus",
  7: "Ketu",
  8: "Saturn",
  9: "Mars"
};

// Helper function: reduce number to single digit (ignoring zeros)
function reduceToSingleDigit(num) {
  let sum = num
    .toString()
    .split("")
    .reduce((a, d) => a + (d === "0" ? 0 : parseInt(d)), 0);
  return sum > 9 ? reduceToSingleDigit(sum) : sum;
}

app.post("/functions/calc_numerology", (req, res) => {
  const { dob } = req.body; // expected format: "DD-MM-YYYY"

  if (!dob) {
    return res.status(400).json({ error: "DOB required in DD-MM-YYYY format" });
  }

  const [dd, mm, yyyy] = dob.split("-").map(Number);

  if (!dd || !mm || !yyyy) {
    return res.status(400).json({ error: "Invalid DOB format" });
  }

  // 1. Basic Number
  const basic_number = reduceToSingleDigit(dd);
  const basic_planet = planetMap[basic_number];

  // 2. Destiny Number (all digits of DOB)
  const digits = `${dd}${mm}${yyyy}`
    .split("")
    .filter((d) => d !== "0")
    .map(Number);

  const destiny_number = reduceToSingleDigit(digits.reduce((a, b) => a + b, 0));
  const destiny_planet = planetMap[destiny_number];

  // 3. Numerology Grid
  let gridDigits = [
    ...dd.toString(),
    ...mm.toString(),
    ...yyyy.toString().slice(-2)
  ]
    .filter((d) => d !== "0")
    .map(Number);

  // Always add Destiny Number
  gridDigits.push(destiny_number);

  let grid = {};
  for (let i = 1; i <= 9; i++) {
    grid[i] = gridDigits.filter((n) => n === i).length;
  }

  return res.json({
    basic_number,
    basic_planet,
    destiny_number,
    destiny_planet,
    grid
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Numerology webhook running on 0.0.0.0: ${PORT}`);
});
