import { model, Schema, Types } from "mongoose";

export type SeatStatus = "AVAILABLE" | "HELD" | "BOOKED";

const seatSchema = new Schema(
  {
    showId: { type: Types.ObjectId, required: true, index: true },
    seatNumber: { type: String, required: true },
    status: {
      type: String,
      enum: ["AVAILABLE", "HELD", "BOOKED"],
      default: "AVAILABLE",
      index: true,
    },
    holdUntil: { type: Date, default: null },
    bookingId: { type: String, default: null, index: true },
  },
  {
    timestamps: true,
  }
);

seatSchema.index({ showId: 1, seatNumber: 1 }, { unique: true });
seatSchema.index({ status: 1, holdUntil: 1 }); // for finding expired holds

export const Seat = model("Seat", seatSchema);
