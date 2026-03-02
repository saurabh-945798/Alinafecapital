import { ApiResponse } from "../utils/ApiResponse.js";

export const notFound = (req, res) => {
  res.status(404).json(
    new ApiResponse({
      success: false,
      message: `Route not found: ${req.method} ${req.originalUrl}`,
      data: null,
    })
  );
};