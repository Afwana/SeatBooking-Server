import express from "express";
import cors from 'cors'
import seatRoutes from "./routes/booking.routes";
import showRoutes from "./routes/show.routes"

const app = express();

// CORS configuration
app.use(cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Test
app.get("/health", (req, res) => {
    res.json({
        status: "healthy",
        timestamp: new Date().toISOString(),
        message: "Seat Booking System",
    })
})

// Routes
app.use("/shows", showRoutes)
app.use("/seats", seatRoutes);

// 404 Handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        error: "Route not found"
    })
})

// Error Handler
app.use((error: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error("Unhandled error:", error);
    res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: process.env.NODE_ENV === "development" ? error.message : undefined
    })
})

export default app;