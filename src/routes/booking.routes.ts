import express from "express";
import { v4 as uuid } from "uuid";
import { confirmBooking, holdSeats } from "../services/booking.service";

const router = express.Router();

// hold booking
router.post("/shows/:showId/hold", async (req, res) => {
  try {
    const { seatNumbers } = req.body;
    const { showId } = req.params;
    
    if (!seatNumbers || !Array.isArray(seatNumbers) || seatNumbers.length === 0) {
      return res.status(400).json({
        success: false,
        error: "Please select your seats"
      });
    }

    // Generate unique booking ID
    const bookingId = uuid();
    
    await holdSeats(showId, seatNumbers, bookingId);
    
    res.json({
      success: true,
      bookingId,
      message: `Successfully select ${seatNumbers.length} seat(s)`,
      expiresIn: `${process.env.HOLD_DURATION_MINUTES || 5} minutes`
    });
    
  } catch (error: any) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// confirm booking
router.post("/bookings/:bookingId/confirm", async (req, res) => {
  try {
    const { bookingId } = req.params;
    
    await confirmBooking(bookingId);
    
    res.json({
      success: true,
      message: "Booking confirmed successfully"
    });
    
  } catch (error: any) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

export default router;
