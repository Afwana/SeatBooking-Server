import express from "express"
import { CreateShowInput, createShowWithSeats, getShowDetails, listSeats, listShows } from "../services/show.service"

const router = express.Router()

router.post("/", async (req, res) => {
  try {
    const {
      movieTitle,
      showTime,
      totalSeats,
      theaterName,
      screenNumber,
      movieDuration,
    } = req.body;

    // Validate required fields
    if (!movieTitle || !showTime || !totalSeats) {
      return res.status(400).json({
        success: false,
        error: "movieTitle, showTime, and totalSeats are required",
      });
    }

    // Parse showTime as Date
    const parsedShowTime = new Date(showTime);
    if (isNaN(parsedShowTime.getTime())) {
      return res.status(400).json({
        success: false,
        error: "Invalid showTime format. Use ISO string (e.g., 2024-01-20T18:30:00Z)",
      });
    }

    if (totalSeats <= 0) {
      return res.status(400).json({
        success: false,
        error: "totalSeats must be greater than 0",
      });
    }

    const showData: CreateShowInput = {
      movieTitle,
      showTime: parsedShowTime,
      totalSeats: parseInt(totalSeats),
      theaterName,
      screenNumber,
      movieDuration: movieDuration ? parseInt(movieDuration) : undefined,
    };

    const result = await createShowWithSeats(showData);

    res.status(201).json({
      success: true,
      message: `Successfully created show '${movieTitle}' with ${totalSeats} seats`,
      data: result,
    });
  } catch (error: any) {
    console.error("Error creating show:", error);
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
});

router.get("/", async (req, res) => {
    try {
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 10;

        const result = await listShows(page, limit)

        res.json({
            success: true,
            data: result
        })
    } catch (error: any) {
        res.status(500).json({
            success: false,
            error: error.message,
        })
    }
})

router.get("/:showId", async (req, res) => {
    try {
        const { showId } = req.params

        const showDetails = await getShowDetails(showId)

        res.json({
            success: true,
            data: showDetails
        })
    } catch (error: any) {
        res.status(error.message === "Show not found" ? 404 : 500).json({
            success: false,
            error: error.message,
        })
    }
})

router.get("/:showId/seats", async (req, res) => {
  try {
    const { showId } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const status = req.query.status as string;
    const sortBy = (req.query.sortBy as string) || "seatNumber";
    const sortOrder = (req.query.sortOrder as string) || "asc";

    if (!["asc", "desc"].includes(sortOrder)) {
      return res.status(400).json({
        success: false,
        error: "sortOrder must be 'asc' or 'desc'",
      });
    }

    const result = await listSeats(
      showId,
      page,
      limit,
      status,
      sortBy,
      sortOrder as "asc" | "desc"
    );

    res.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    res.status(error.message === "Show not found" ? 404 : 400).json({
      success: false,
      error: error.message,
    });
  }
});

export default router