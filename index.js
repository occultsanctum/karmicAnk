import express from "express";
import bodyParser from "body-parser";

const app = express();
app.use(bodyParser.json());

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
app.listen(PORT, () => {
  console.log(`Numerology webhook running on port ${PORT}`);
});
