import app from "./app";
import { connectDB } from "./config/db";
import dotenv from 'dotenv';
import "./jobs/releaseExpiredHolds"

dotenv.config()

const PORT = process.env.PORT || 3000

connectDB();

const server = app.listen(PORT, () => {
    console.log(`
        Seat Booking System started!
        Port: ${PORT}
        ${new Date().toLocaleString()}
        MongoDB: ${process.env.MONGO_URI || "mongodb://localhost:27017/seat-booking"}
        Hold duration: ${process.env.HOLD_DURATION_MINUTES || 5} minutes
        Max seats per booking: ${process.env.MAX_SEATS_PER_BOOKING || 10}
    `);
})