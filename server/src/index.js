require("dotenv").config();

const express = require("express");
const cors = require("cors");
const prisma = require("./lib/prisma");
const usersRouter = require("./routes/users");
const picksRouter = require("./routes/picks");

const app = express();

const PORT = process.env.PORT || 5001;

app.use(cors());
app.use(express.json());

app.use("/api/users", usersRouter);
app.use("/api/picks", picksRouter);

app.get("/", (req, res) => {
  res.json({
    message: "NFL Survivor API is running!",
  });
});

app.get("/api/health", (req, res) => {
  res.json({
    status: "OK",
  });
});

app.get("/api/db-test", async (req, res) => {
  try {
    const users = await prisma.user.findMany();

    res.json({
      connected: true,
      users,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      connected: false,
      error: "Database connection failed",
    });
  }
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});