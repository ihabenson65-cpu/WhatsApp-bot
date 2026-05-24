const {
    default: makeWASocket,
    useMultiFileAuthState,
    DisconnectReason
} = require("@whiskeysockets/baileys");

const express = require("express");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

// ===========================
// Emojis (UNCHANGED)
// ===========================

const emojis = ["😍", "🥰", "😘", "❤️", "😎", "🔥"];

function getRandomEmoji() {
    return emojis[Math.floor(Math.random() * emojis.length)];
}

// ===========================
// Global Socket
// ===========================

let sock;

// ===========================
// Start Bot
// ===========================

async function startBot() {

    const { state, saveCreds } =
        await useMultiFileAuthState("auth");

    sock = makeWASocket({
        auth: state,
        printQRInTerminal: false
    });

    // Save session
    sock.ev.on("creds.update", saveCreds);

    // ===========================
    // Connection Updates
    // ===========================

    sock.ev.on("connection.update",
        async ({ connection, lastDisconnect }) => {

        if (connection === "open") {
            console.log("✅ WhatsApp connected");
        }

        if (connection === "close") {

            console.log("❌ Connection closed");

            const shouldReconnect =
                lastDisconnect?.error?.output?.statusCode !==
                DisconnectReason.loggedOut;

            if (shouldReconnect) {
                startBot();
            }
        }
    });

    // ===========================
    // Status Viewer + React
    // ===========================

    sock.ev.on("messages.upsert", async (m) => {

        const msg = m.messages[0];

        if (!msg.message) return;

        const jid = msg.key.remoteJid;

        // Status detection
        if (jid === "status@broadcast") {

            try {

                // View status
                await sock.readMessages([msg.key]);

                // React
                await sock.sendMessage(jid, {
                    react: {
                        text: getRandomEmoji(),
                        key: msg.key
                    }
                });

                console.log("✅ Viewed & reacted to status");

            } catch (err) {

                console.log("❌ Status Error:", err.message);

            }
        }
    });
}

// ===========================
// Start WhatsApp
// ===========================

startBot();

// ===========================
// Frontend
// ===========================

app.use(express.static(path.join(__dirname, "public")));

// ===========================
// Home Route
// ===========================

app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "public/index.html"));
});

// ===========================
// Pair Code Route
// ===========================

app.get("/pair", async (req, res) => {

    try {

        const number = req.query.number;

        if (!number) {
            return res.json({
                status: false,
                message: "Number is required"
            });
        }

        if (!sock) {
            return res.json({
                status: false,
                message: "Bot not ready"
            });
        }

        // Generate Pair Code
        const code =
            await sock.requestPairingCode(number);

        console.log(`
========================
PAIR CODE: ${code}
========================
`);

        res.json({
            status: true,
            code
        });

    } catch (err) {

        console.log("❌ Pair Error:", err);

        res.json({
            status: false,
            message: "Failed to generate code"
        });
    }
});

// ===========================
// Server
// ===========================

app.listen(PORT, () => {
    console.log(`🌍 Server running on port ${PORT}`);
});
