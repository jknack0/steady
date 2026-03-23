import "dotenv/config";
import { APP_NAME } from "@steady/shared";
import app from "./app";
import { registerNotificationWorkers } from "./services/notifications";
import { registerRtmWorkers } from "./services/rtm-notifications";
import { logger } from "./lib/logger";

const PORT = process.env.PORT || process.env.API_PORT || 4000;

app.listen(PORT, async () => {
  logger.info(`${APP_NAME} API running on http://localhost:${PORT}`);

  // Start notification job queue (non-blocking)
  try {
    await registerNotificationWorkers();
  } catch (err) {
    logger.error("Failed to start notification workers", err);
  }

  // Start RTM notification job queue (non-blocking)
  try {
    await registerRtmWorkers();
  } catch (err) {
    logger.error("Failed to start RTM notification workers", err);
  }
});

export default app;
