import cron from "node-cron";
import { Seat } from "../models/Seat";
import { Show } from "../models/Show";
import mongoose from "mongoose";

export const releaseExpiredHolds = async () => {
  console.log("Starting releaseExpiredHolds function...");
  
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const now = new Date();
    console.log(`Current time: ${now.toISOString()}`);
    

    // Find expired holds
    const expiredSeats = await Seat.find({
      status: "HELD",
      holdUntil: { $lt: now },
    }).session(session);

    if (expiredSeats.length === 0) {
      await session.commitTransaction();
      console.log("No expired holds to release");
      return { released: 0 };
    }

    console.log(`Releasing ${expiredSeats.length} expired holds`);

    if (expiredSeats.length > 0) {
      console.log("Expired seat details:", expiredSeats.map(s => ({
        seatNumber: s.seatNumber,
        holdUntil: s.holdUntil,
        bookingId: s.bookingId
      })));
    }

    if (expiredSeats.length === 0) {
      await session.commitTransaction();
      console.log("No expired holds to release");
      return { released: 0 };
    }

    console.log(`Releasing ${expiredSeats.length} expired holds`);

    // Group seats by showId
    const seatsByShowId = new Map<string, number>();

    expiredSeats.forEach((seat) => {
      const showIdStr = seat.showId.toString();
      seatsByShowId.set(showIdStr, (seatsByShowId.get(showIdStr) || 0) + 1);
    });

    // Update seats
    const updateResult = await Seat.updateMany(
      { _id: { $in: expiredSeats.map((s) => s._id) } },
      {
        $set: {
          status: "AVAILABLE",
          bookingId: null,
          holdUntil: null,
        },
      },
      { session }
    );

    console.log(`Updated ${updateResult.modifiedCount} seats`);

    // Update each show's counters
    for (const [showIdStr, seatCount] of seatsByShowId.entries()) {
      const showUpdateResult = await Show.updateOne(
        { _id: showIdStr },
        {
          $inc: {
            availableSeats: seatCount,
            heldSeats: -seatCount,
          },
        },
        { session }
      );
      console.log(`Released ${seatCount} seats for show ${showIdStr}`);
    }

    await session.commitTransaction();
    console.log(`Successfully released ${expiredSeats.length} expired holds`);
    return { released: expiredSeats.length };
  } catch (error) {
    await session.abortTransaction();
    console.error("Error releasing expired holds:", error);
    throw error;
  } finally {
    session.endSession();
  }
};

// Schedule the job
cron.schedule("* * * * *", async () => {
  console.log("Running expired holds cleanup...");
  try {
    const result = await releaseExpiredHolds();
    console.log(`Cleanup completed: ${result.released} seats released`);
  } catch (error) {
    console.error("Cleanup job failed:", error);
  }
});

export default releaseExpiredHolds;
