const {
    default: makeWASocket,
    useMultiFileAuthState,
    DisconnectReason
} = require("@whiskeysockets/baileys");

const express = require("express");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

// ========================================
// Emojis (UNCHANGED)
// ========================================

const emojis = ["😍", "🥰", "😘", "❤️", "😎", "🔥"];

function getRandomEmoji() {
    return emojis[Math.floor(Math.random() * emojis.length)];
}

// ========================================
// Global Socket
// ========================================

let sock;
let reconnecting = false;

// ========================================
// Start WhatsApp Bot
// ========================================

async function startBot() {

    const authPath = path.join(__dirname, "auth");

    const { state, saveCreds } =
        await useMultiFileAuthState(authPath);

    sock = makeWASocket({
        auth: state,
        browser: ["IHA-BOT", "Chrome", "1.0.0"],
        printQRInTerminal: false,
        markOnlineOnConnect: true,
        syncFullHistory: false
    });

    // Save Session
    sock.ev.on("creds.update", saveCreds);

    // ========================================
    // Connection Updates
    // ========================================

    sock.ev.on(
        "connection.update",
        async ({ connection, lastDisconnect }) => {

            if (connection === "connecting") {
                console.log("🟡 Connecting to WhatsApp...");
            }

            if (connection === "open") {
                console.log("✅ Connected to WhatsApp");
            }

            if (connection === "close") {

                console.log("❌ Connection Closed");

                const shouldReconnect =
                    lastDisconnect?.error?.output?.statusCode !==
                    DisconnectReason.loggedOut;

                if (shouldReconnect && !reconnecting) {

                    reconnecting = true;

                    console.log("🔄 Reconnecting...");

                    setTimeout(() => {
                        reconnecting = false;
                        startBot();
                    }, 3000);
                }
            }
        }
    );

    // ========================================
    // Auto View & React To Status
    // ========================================

    sock.ev.on("messages.upsert", async (m) => {

        try {

            const msg = m.messages[0];

            if (!msg.message) return;

            const jid = msg.key.remoteJid;

            // Detect Status
            if (jid === "status@broadcast") {

                // Mark status as viewed
                await sock.readMessages([msg.key]);

                // React with random emoji
                await sock.sendMessage(jid, {
                    react: {
                        text: getRandomEmoji(),
                        key: msg.key
                    }
                });

                console.log("✅ Viewed & reacted to status");
            }

        } catch (err) {

            console.log("❌ Status Error:", err.message);

        }
    });
}

// ========================================
// Start Bot
// ========================================

startBot();

// ========================================
// Serve Frontend Files
// ========================================

app.use(express.static(path.join(__dirname, "public")));

// ========================================
// Home Route
// ========================================

app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "index.html"));
});

// ========================================
// Generate Pair Code Route
// ========================================

app.get("/pair", async (req, res) => {

    try {

        let number = req.query.number;

        if (!number) {
            return res.json({
                status: false,
                message: "Enter phone number"
            });
        }

        // Remove spaces, + and symbols
        number = number.replace(/[^0-9]/g, "");

        // Wait for socket
        await new Promise(resolve => setTimeout(resolve, 3000));

        // Generate Pair Code
        const code =
            await sock.requestPairingCode(number);

        console.log(`
=================================
PAIR CODE FOR ${number}

${code}

=================================
`);

        res.json({
            status: true,
            code
        });

    } catch (err) {

        console.log("❌ Pair Code Error:", err.message);

        res.json({
            status: false,
            message: err.message
        });
    }
});

// ========================================
// Start Express Server
// ========================================

app.listen(PORT, () => {
    console.log(`🌍 Server running on port ${PORT}`);
});
