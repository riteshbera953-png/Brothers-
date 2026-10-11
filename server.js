const express = require("express");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.text({ type: "text/plain" }));

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

// Health check
app.get("/", (req, res) => {
  res.send("Brothers Panel Backend is online.");
});

app.get("/health", (req, res) => {
  res.status(200).json({
    status: "healthy",
    time: new Date().toISOString()
  });
});

// Firebase connection notification
app.post("/api/firebase-connected", async (req, res) => {
  try {
    let data = req.body;

    // Support JSON sent with text/plain content type
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

    if (
      typeof firebaseUrl !== "string" ||
      !/^https:\/\/[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*\.firebaseio\.com\/?$/.test(firebaseUrl)
    ) {
      return res.status(400).json({
        success: false,
        error: "Invalid Firebase URL"
      });
    }

    if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
      return res.status(500).json({
        success: false,
        error: "Telegram configuration is missing"
      });
    }

    const timestamp = new Date().toLocaleString("en-IN", {
      timeZone: "Asia/Kolkata",
      dateStyle: "medium",
      timeStyle: "medium"
    });

    const message = [
      "🔥 <b>Firebase Connected</b>",
      "",
      `🔗 <b>Firebase URL:</b> <code>${firebaseUrl}</code>`,
      `🕒 <b>Date &amp; Time (IST):</b> ${timestamp}`,
      "",
      "✅ User consent received."
    ].join("\n");

    const telegramResponse = await fetch(
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

    const result = await telegramResponse.json();

    if (!telegramResponse.ok || !result.ok) {
      console.error("Telegram delivery failed:", result.description);

      return res.status(502).json({
        success: false,
        error: "Telegram message delivery failed"
      });
    }

    return res.status(200).json({
      success: true,
      message: "Firebase notification sent"
    });
  } catch (error) {
    console.error("Backend error:", error.message);

    return res.status(500).json({
      success: false,
      error: "Internal server error"
    });
  }
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});
