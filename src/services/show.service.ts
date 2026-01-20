import mongoose from "mongoose";
import { Seat } from "../models/Seat";
import { Show } from "../models/Show";

export interface CreateShowInput {
  movieTitle: string;
  showTime: Date;
  totalSeats: number;
  theaterName?: string;
  screenNumber?: string;
  movieDuration?: number;
}

export interface ShowDetails {
    date: {
      data: {
        theaterName: string;
        screenNumber: string;
        movieDuration: number;
        _id: string;
        movieTitle: string;
        showTime: string;
        totalSeats: number;
        availableSeats: number;
        heldSeats: number;
        bookedSeats: number;
        createdAt: string;
        updatedAt: string;
      },
      formattedShowTime: string;
      isActive: boolean
    };
    seatSummary: {
        total: number;
        available: number;
        held: number;
        booked: number;
    }
}

export interface SeatListResponse {
    seats: any[];
    pagination: {
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    };
    filters: {
        status?: string;
    }
}

export const createShowWithSeats = async (
  showData: CreateShowInput
) => {
  const session = await mongoose.startSession();
  session.startTransaction()

  try {
    if (!showData.movieTitle || !showData.showTime || !showData.totalSeats) {
      throw new Error("movieTitle, showTime, and totalSeats are required");
    }

    if (showData.totalSeats <= 0) {
      throw new Error("totalSeats must be greater than 0");
    }

    const show = new Show({
      movieTitle: showData.movieTitle,
      showTime: showData.showTime,
      totalSeats: showData.totalSeats,
      availableSeats: showData.totalSeats,
      heldSeats: 0,
      bookedSeats: 0,
      theaterName: showData.theaterName || "Main Theater",
      screenNumber: showData.screenNumber || "Screen 1",
      movieDuration: showData.movieDuration || 120,
    });

    const savedShow = await show.save({ session });
    console.log(`Created show: ${savedShow.movieTitle} with ID: ${savedShow._id}`);

    const seats = generateSeats(savedShow._id, showData.totalSeats);

    const createdSeats = await Seat.insertMany(seats, { session });

    console.log(`Created ${createdSeats.length} seats for show: ${savedShow.movieTitle}`);

    await session.commitTransaction();

    const formattedShow = {
      id: savedShow._id,
      movieTitle: savedShow.movieTitle,
      showTime: savedShow.showTime,
      formattedShowTime: new Date(savedShow.showTime).toLocaleString("en-US", {
        weekday: "short",
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }),
      totalSeats: savedShow.totalSeats,
      availableSeats: savedShow.availableSeats,
      heldSeats: savedShow.heldSeats,
      bookedSeats: savedShow.bookedSeats,
      theaterName: savedShow.theaterName,
      screenNumber: savedShow.screenNumber,
      movieDuration: savedShow.movieDuration,
      isActive: new Date(savedShow.showTime) > new Date(),
      createdAt: savedShow.createdAt,
    };

    const formattedSeats = createdSeats.map(seat => ({
      id: seat._id,
      seatNumber: seat.seatNumber,
      status: seat.status,
      showId: seat.showId,
    }));

    return {
      show: formattedShow,
      seats: formattedSeats,
      totalSeatsCreated: createdSeats.length,
    };
  } catch (error) {
    await session.abortTransaction();
    console.error("Error creating show with seats:", error);
    throw error;
  } finally {
    session.endSession()
  }
}

export const generateSeats = (showId: mongoose.Types.ObjectId, totalSeats: number) => {
  const seats = []

  for (let i = 1; i <= totalSeats; i++) {
    const seatNumber = generateSeatNumber(i);
    
    seats.push({
      showId: showId,
      seatNumber: seatNumber,
      status: "AVAILABLE" as const,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }
  
  return seats;
}

export const generateSeatNumber = (position: number): string => {
  if (position < 1) {
    throw new Error("Position numst be at least 1")
  }

  const rowIndex = Math.floor((position - 1) / 10);
  const rowLetter = String.fromCharCode(65 + rowIndex);

  const seatNumberInRow = ((position - 1) % 10) + 1;
  
  return `${rowLetter}${seatNumberInRow}`;
}

export const getShowDetails = async (showId: string) => {
    if (!showId) {
        throw new Error("Show ID is required")
    }

    const show = await Show.findById(showId)

    if (!show) {
        throw new Error("Show not Found!!")
    }

    const seatCounts = await Seat.aggregate([
        { $match: { showId: show._id } },
        { $group: { _id: "$status", count: { $sum: 1 } } }
    ])

    const seatSummary = {
        total: show.totalSeats,
        available: 0,
        held: 0,
        booked: 0,
    }

    seatCounts.forEach((item) => {
    if (item._id === "AVAILABLE") seatSummary.available = item.count;
    if (item._id === "HELD") seatSummary.held = item.count;
    if (item._id === "BOOKED") seatSummary.booked = item.count;
  });

  const formattedShow = {
    data: {
      _id: show._id,
      movieTitle: show.movieTitle,
        showTime: show.showTime,
        totalSeats: show.totalSeats,
        availableSeats: show.availableSeats,
        heldSeats: show.heldSeats,
        bookedSeats: show.bookedSeats,
        theaterName: show.theaterName,
        screenNumber: show.screenNumber,
        movieDuration: show.movieDuration,
        createdAt: show.createdAt,
        updatedAt: show.updatedAt,
    },
    formattedShowTime: new Date(show.showTime).toLocaleString("en-US", {
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }),
    isActive: new Date(show.showTime) > new Date(),
  };

  return {
    show: formattedShow,
    seatSummary
  }
}

export const listShows = async (
  page: number = 1,
  limit: number = 10,
) => {
  const skip = (page - 1) * limit;

  const [shows, total] = await Promise.all([
    Show.find({})
      .sort({ showTime: 1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Show.countDocuments({}),
  ]);
  // const allShows = await Show.find({}).lean();

  console.log(`Found ${shows.length} shows, total: ${total}`);

  // Format shows
  const formattedShows = shows.map((show) => ({
    ...show,
    formattedShowTime: new Date(show.showTime).toLocaleString("en-US", {
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }),
    isActive: new Date(show.showTime) > new Date(),
  }));

  return {
    shows: formattedShows,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
};

export const listSeats = async (
  showId: string,
  page: number = 1,
  limit: number = 50,
  status?: string,
  sortBy: string = "seatNumber",
  sortOrder: "asc" | "desc" = "asc"
): Promise<SeatListResponse> => {
  if (!showId) {
    throw new Error("Show ID is required");
  }

  // Verify show exists
  const show = await Show.findById(showId);
  if (!show) {
    throw new Error("Show not found");
  }

  const skip = (page - 1) * limit;

  // Build query
  const query: any = { showId };

  if (status) {
    if (!["AVAILABLE", "HELD", "BOOKED"].includes(status)) {
      throw new Error("Invalid status filter. Use: AVAILABLE, HELD, or BOOKED");
    }
    query.status = status;
  }

  // Build sort
  const sort: any = {};
  sort[sortBy] = sortOrder === "asc" ? 1 : -1;

  const [seats, total] = await Promise.all([
    Seat.find(query)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .select("-__v")
      .lean(),
    Seat.countDocuments(query),
  ]);

  // Add expiry info for held seats
  const now = new Date();
  const enhancedSeats = seats.map((seat) => ({
    ...seat,
    isExpired: seat.status === "HELD" && seat.holdUntil && seat.holdUntil < now,
    expiresIn: seat.status === "HELD" && seat.holdUntil
      ? Math.max(0, Math.round((seat.holdUntil.getTime() - now.getTime()) / 1000 / 60)) + " minutes"
      : null,
  }));

  return {
    seats: enhancedSeats,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
    filters: {
      status,
    },
  };
};