const express = require("express");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.text({ type: "text/plain" }));

// Telegram configuration
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = "-1004480783091";

// Send Telegram message
async function sendTelegramMessage(message) {
  if (!TELEGRAM_BOT_TOKEN) {
    throw new Error("TELEGRAM_BOT_TOKEN is missing");
  }

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
        parse_mode: "HTML"
      })
    }
  );

  const result = await response.json();

  if (!response.ok || !result.ok) {
    throw new Error(result.description || "Telegram delivery failed");
  }

  return result;
}

// Home
app.get("/", (req, res) => {
  res.send("Brothers Panel Backend is online.");
});

// Health check
app.get("/health", (req, res) => {
  res.status(200).json({ status: "healthy" });
});

// Firebase notification
async function firebaseNotification(req, res) {
  try {
    let data = req.body;

    if (typeof data === "string") {
      try {
        data = JSON.parse(data);
      } catch {
        return res.status(400).json({
          success: false,
          error: "Invalid JSON"
        });
      }
    }

    if (!data || data.event !== "firebase_connected") {
      return res.status(400).json({
        success: false,
        error: "Invalid event"
      });
    }

    if (data.consent !== true) {
      return res.status(403).json({
        success: false,
        error: "User consent is required"
      });
    }

    const firebaseUrl = data.firebaseUrl;

    if (typeof firebaseUrl !== "string") {
      return res.status(400).json({
        success: false,
        error: "Firebase URL is required"
      });
    }

    let parsedUrl;

    try {
      parsedUrl = new URL(firebaseUrl);
    } catch {
      return res.status(400).json({
        success: false,
        error: "Invalid Firebase URL"
      });
    }

    const validHost =
      parsedUrl.protocol === "https:" &&
      (
        parsedUrl.hostname.endsWith(".firebaseio.com") ||
        parsedUrl.hostname.endsWith(".firebasedatabase.app")
      );

    if (!validHost) {
      return res.status(400).json({
        success: false,
        error: "Unsupported Firebase URL"
      });
    }

    const dateTime = new Date().toLocaleString("en-IN", {
      timeZone: "Asia/Kolkata",
      dateStyle: "medium",
      timeStyle: "medium"
    });

    const escapeHTML = (value) =>
      value.replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");

    const message = [
      "🔥 <b>Firebase Connected</b>",
      "",
      `🔗 <b>Firebase URL:</b> <code>${escapeHTML(firebaseUrl)}</code>`,
      `🕒 <b>Date &amp; Time (IST):</b> ${dateTime}`
    ].join("\n");

    await sendTelegramMessage(message);

    return res.status(200).json({
      success: true,
      message: "Telegram notification sent"
    });
  } catch (error) {
    console.error("Notification error:", error.message);

    return res.status(502).json({
      success: false,
      error: "Telegram delivery failed"
    });
  }
}

// Support both endpoint paths
app.post("/api/firebase-connected", firebaseNotification);
app.post("/api/telegram/firebase-connected", firebaseNotification);

// Start server
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});
