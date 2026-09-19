import "dotenv/config";
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import connectDB from "./config/db.js";
import healthRoutes from "./routes/healthRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import requestRoutes from "./routes/requestRoutes.js";
import volunteerRoutes from "./routes/volunteerRoutes.js";
import notificationRoutes from "./routes/notificationRoutes.js";
import { notFound, errorHandler } from "./middleware/errorHandler.js";

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Middleware: CORS
const allowedOrigins = [
  process.env.CLIENT_URL || "http://localhost:5173",
  "http://localhost:5173",
  "http://127.0.0.1:5173",
];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (such as mobile apps or curl/Postman)
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(null, true); // Permissive in development
    },
    credentials: true,
  })
);

// Middleware: Body Parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static uploaded media files
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use("/api/uploads", express.static(path.join(__dirname, "uploads")));

// Root Route
app.get("/", (req, res) => {
  res.json({
    name: "ResQHub API",
    description: "Emergency Assistance Platform API",
    version: "1.0.0",
    status: "active",
    endpoints: {
      health: "/api/health",
    },
  });
});

// API Routes
app.use("/api", healthRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/requests", requestRoutes);
app.use("/api/volunteers", volunteerRoutes);
app.use("/api/notifications", notificationRoutes);

// Error Handling Middleware
app.use(notFound);
app.use(errorHandler);

// Connect to MongoDB
connectDB();

// Start Server
const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () => {
  console.log(
    `[Server] ResQHub backend running in ${process.env.NODE_ENV || "development"} mode on http://localhost:${PORT}`
  );
});

// Graceful Shutdown
process.on("SIGTERM", () => {
  console.log("[Server] SIGTERM received. Closing HTTP server gracefully...");
  server.close(() => {
    console.log("[Server] HTTP server closed.");
  });
});

export default app;
