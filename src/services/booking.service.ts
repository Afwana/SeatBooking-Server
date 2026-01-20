import mongoose from "mongoose";
import { Seat } from "../models/Seat";
import { Show } from "../models/Show";
import dotenv from "dotenv";

dotenv.config();

const HOLD_DURATION_MS =
  parseInt(process.env.HOLD_DURATION_MINUTES || "5") * 60 * 1000;

export const holdSeats = async (
  showId: string,
  seatNumbers: string[],
  bookingId: string
) => {
  if (!seatNumbers || !Array.isArray(seatNumbers) || seatNumbers.length === 0) {
    throw new Error("Please select at least one seat");
  }

  const uniqueSeats = [...new Set(seatNumbers)];
  if (uniqueSeats.length !== seatNumbers.length) {
    throw new Error("Duplicate seat numbers are not allowed");
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const show = await Show.findById(showId).session(session);
    if (!show) {
      throw new Error("Show not found");
    }

    if (seatNumbers.length > (show.availableSeats as number)) {
      throw new Error(`Only ${show.availableSeats} seats available`);
    }

    const holdUntil = new Date(Date.now() + HOLD_DURATION_MS); // Hold for 5 minutes

    const seats = await Seat.find({
      showId,
      seatNumber: { $in: seatNumbers },
      status: "AVAILABLE",
    }).session(session);

    if (seats.length !== seatNumbers.length) {
      const foundSeatNumbers = seats.map((s) => s.seatNumber);
      const unavailableSeats = seatNumbers.filter(
        (seatNum) => !foundSeatNumbers.includes(seatNum)
      );
      throw new Error(
        `Seats ${unavailableSeats.join(", ")} are not available`
      );
    }

    const result = await Seat.updateMany(
      {
        _id: { $in: seats.map((s) => s._id) },
        status: "AVAILABLE",
      },
      {
        $set: {
          status: "HELD",
          holdUntil,
          bookingId,
        },
      },
      { session }
    );

    if (result.modifiedCount !== seatNumbers.length) {
      throw new Error("Some seats are no longer available");
    }
    await Show.updateOne(
      { _id: showId },
      {
        $inc: {
          heldSeats: seatNumbers.length,
          availableSeats: -seatNumbers.length,
        },
      },
      { session }
    );

    await session.commitTransaction();
    console.log(
      `Successfully held ${seatNumbers.length} seats for booking ${bookingId}`
    );

    return {
      bookingId,
      seatNumbers,
      holdUntil,
      showId,
    };
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};

export const confirmBooking = async (bookingId: string) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const seats = await Seat.find({
      bookingId,
      status: "HELD",
      holdUntil: { $gt: new Date() },
    }).session(session);

    if (!seats.length) {
      throw new Error("Choose atleast one seat!");
    }

    const showId = seats[0].showId;

    await Seat.updateMany(
      { bookingId, status: "HELD" },
      { $set: { status: "BOOKED", holdUntil: null } },
      { session }
    );

    await Show.updateOne(
      { _id: showId },
      {
        $inc: {
          heldSeats: -seats.length,
          bookedSeats: seats.length,
        },
      },
      { session }
    );

    await session.commitTransaction();

    return {
      bookingId,
      confirmedSeats: seats.length,
      showId,
    };
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};