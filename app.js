const fs = require("fs");
const path = require("path");

const WORK_MIN = parseInt(process.argv[2]) || 25;
const BREAK_MIN = parseInt(process.argv[3]) || 5;
const STATS_FILE = path.join(__dirname, "stats.json");

const C = {
  blue: "\x1b[38;2;122;162;247m",
  purple: "\x1b[38;2;187;154;247m",
  green: "\x1b[38;2;158;206;106m",
  red: "\x1b[38;2;247;118;142m",
  yellow: "\x1b[38;2;224;175;104m",
  light: "\x1b[38;2;192;202;245m",
  gray: "\x1b[38;2;65;72;104m",
  reset: "\x1b[0m",
};

const paint = (text, color) => `${color}${text}${C.reset}`;

const today = () => new Date().toISOString().split("T")[0];

function loadStats() {
  if (!fs.existsSync(STATS_FILE)) return {};
  return JSON.parse(fs.readFileSync(STATS_FILE, "utf8"));
}

function saveSession() {
  const stats = loadStats();
  const date = today();
  stats[date] = (stats[date] || 0) + 1;
  fs.writeFileSync(STATS_FILE, JSON.stringify(stats, null, 2));
}

let sessionCount = loadStats()[today()] || 0;

function progressBar(progress, length = 30) {
  const filled = Math.round(progress * length);
  return (
    "[" +
    C.blue +
    "█".repeat(filled) +
    C.gray +
    "░".repeat(length - filled) +
    C.reset +
    "]"
  );
}

const clock = () => new Date().toLocaleTimeString();

const bell = (times = 2) => {
  let count = 0;
  const i = setInterval(() => {
    process.stdout.write("\x07");
    if (++count >= times) clearInterval(i);
  }, 300);
};

function startTimer(minutes, label, isWork, next) {
  const total = minutes * 60;
  let remaining = total;
  let paused = false;

  const interval = setInterval(() => {
    if (!paused) remaining--;

    const progress = (total - remaining) / total;
    const mm = String(Math.floor(remaining / 60)).padStart(2, "0");
    const ss = String(remaining % 60).padStart(2, "0");

    console.clear();

    console.log(paint("ASCII POMODORO", C.purple));
    console.log(paint("---------------------------", C.gray));
    console.log(paint("Time: ", C.light) + paint(clock(), C.blue));
    console.log(isWork ? paint(label, C.red) : paint(label, C.green));

    console.log(progressBar(progress));
    console.log(paint(`${Math.floor(progress * 100)}% | ${mm}:${ss}`, C.light));

    console.log(
      "\n" +
        paint("Sessions Today: ", C.light) +
        paint(sessionCount.toString(), C.purple),
    );

    console.log(
      paused
        ? paint("STATUS: PAUSED", C.yellow)
        : paint("STATUS: RUNNING", C.green),
    );

    console.log(
      "\n" +
        paint("SPACE", C.blue) +
        paint(" pause/resume | ", C.gray) +
        paint("Ctrl+C", C.blue) +
        paint(" exit", C.gray),
    );

    if (remaining <= 0) {
      clearInterval(interval);

      if (isWork) {
        sessionCount++;
        saveSession();
      }

      bell(3);
      next();
    }
  }, 1000);

  process.stdin.on("data", (key) => {
    if (key.toString() === " ") paused = !paused;
  });
}

process.stdin.setRawMode(true);
process.stdin.resume();

process.stdin.on("data", (key) => {
  if (key.toString() === "\u0003") {
    console.clear();
    process.exit();
  }
});

function cycle() {
  startTimer(WORK_MIN, "WORK SESSION", true, () =>
    startTimer(BREAK_MIN, "BREAK SESSION", false, cycle),
  );
}

cycle();
