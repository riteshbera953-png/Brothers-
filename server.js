// server.js
const express = require("express");
const cors = require("cors");

const app = express();

// Use dynamic port for Render
const PORT = process.env.PORT || 3000;

// Enable CORS
app.use(cors());
app.use(express.json());
app.use(express.text({ type: "text/plain" }));

// === ENV CONFIG (Set in Render Dashboard) ===
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN; // 8681990378:AAFbGpzsTXc7dBsl02aQQxk7iqsR64kCRz8
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID || "-1004480783091";

// === TELEGRAM ALERT ===
async function sendTelegramMessage(message) {
  if (!TELEGRAM_BOT_TOKEN) {
    throw new Error("TELEGRAM_BOT_TOKEN is missing");
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
          parse_mode: "HTML"
        })
      }
    );

    const result = await response.json();

    if (!response.ok || !result.ok) {
      throw new Error(result.description || "Telegram delivery failed");
    }

    return result;
  } catch (error) {
    console.error("TG Send Error:", error.message);
    throw error;
  }
}

// === HOME ===
app.get("/", (req, res) => {
  res.send("🔥 Brothers Panel Backend is online. All Firebase links are being forwarded.");
});

// === HEALTH CHECK ===
app.get("/health", (req, res) => {
  res.status(200).json({ status: "healthy", uptime: process.uptime() });
});

// === FIREBASE NOTIFICATION ENDPOINT ===
async function firebaseNotification(req, res) {
  try {
    let data = req.body;

    // Parse raw text if needed
    if (typeof data === "string") {
      try {
        data = JSON.parse(data);
      } catch (e) {
        return res.status(400).json({
          success: false,
          error: "Invalid JSON"
        });
      }
    }

    // Validate event
    if (!data || data.event !== "firebase_connected") {
      return res.status(400).json({
        success: false,
        error: "Invalid event"
      });
    }

    // Consent check
    if (data.consent !== true) {
      return res.status(403).json({
        success: false,
        error: "User consent required"
      });
    }

    const firebaseUrl = data.firebaseUrl?.trim();

    if (typeof firebaseUrl !== "string") {
      return res.status(400).json({
        success: false,
        error: "Firebase URL is required"
      });
    }

    // Validate Firebase domain
    let parsedUrl;
    try {
      parsedUrl = new URL(firebaseUrl);
    } catch {
      return res.status(400).json({
        success: false,
        error: "Invalid URL format"
      });
    }

    const isValidHost =
      parsedUrl.protocol === "https:" &&
      (parsedUrl.hostname.endsWith(".firebaseio.com") ||
       parsedUrl.hostname.endsWith(".firebasedatabase.app"));

    if (!isValidHost) {
      return res.status(400).json({
        success: false,
        error: "Unsupported Firebase domain"
      });
    }

    // Format IST time
    const dateTime = new Date().toLocaleString("en-IN", {
      timeZone: "Asia/Kolkata",
      dateStyle: "medium",
      timeStyle: "medium"
    });

    // Sanitize for HTML
    const escapeHTML = (str) =>
      str.replace(/&/g, "&amp;")
         .replace(/</g, "&lt;")
         .replace(/>/g, "&gt;");

    // Build Telegram message
    const message = [
      "🔥 <b>Firebase Connected</b>",
      "",
      `🔗 <b>Firebase URL:</b> <code>${escapeHTML(firebaseUrl)}</code>`,
      `🕒 <b>Date &amp; Time (IST):</b> ${dateTime}`,
      "",
      "📡 <i>Forwarded via Brothers Panel</i>"
    ].join("\n");

    // Send to Telegram
    await sendTelegramMessage(message);

    return res.status(200).json({
      success: true,
      message: "Notification sent"
    });

  } catch (error) {
    console.error("Notification error:", error.message);
    return res.status(502).json({
      success: false,
      error: "Telegram delivery failed"
    });
  }
}

// === ENDPOINTS ===
app.post("/api/firebase-connected", firebaseNotification);
app.post("/api/telegram/firebase-connected", firebaseNotification);

// === START SERVER ===
app.listen(PORT, "0.0.0.0", () => {
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`🔗 Public URL: https://brothers-cruq.onrender.com`);
});
