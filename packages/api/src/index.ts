import "dotenv/config";
import { APP_NAME } from "@steady/shared";
import app from "./app";

const PORT = process.env.PORT || process.env.API_PORT || 4000;

app.listen(PORT, () => {
  console.log(`${APP_NAME} API running on http://localhost:${PORT}`);
});

export default app;
