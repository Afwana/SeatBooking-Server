import { model, Schema } from "mongoose";

const showSchema = new Schema(
  {
    movieTitle: {type: String, required: true},
    showTime: {type: Date, required: true},
    totalSeats: {type: Number, required: true, default: 0},
    availableSeats: {type: Number, required: true, default: 0},
    heldSeats: {type: Number, required: true, default: 0},
    bookedSeats: {type: Number, required: true, default: 0},
    theaterName: { type: String, default: "Main Theater" },
    screenNumber: { type: String, default: "Screen 1" },
    movieDuration: { type: Number, default: 120 },
  },
  {
    timestamps: true,
    toJSON: {virtuals: true},
    toObject: {virtuals: true}
  }
);

showSchema.virtual("formattedShowTime").get(function() {
  return this.showTime.toLocaleString("en-US", {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
})

showSchema.virtual("isActive").get(function () {
  return this.showTime > new Date();
});

showSchema.index({ showTime: 1 });
showSchema.index({ movieTitle: 1, showTime: 1 });

export const Show = model("Show", showSchema);
