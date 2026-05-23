const { 
    default: makeWASocket, 
    useMultiFileAuthState 
} = require("@whiskeysockets/baileys");

const express = require("express");
const qrcode = require("qrcode-terminal");

const app = express();

const PORT = process.env.PORT || 3000;

const emojis = ["😍", "🥰", "😘", "❤️", "😎", "🔥"];

function getRandomEmoji() {
    return emojis[Math.floor(Math.random() * emojis.length)];
}

async function startBot() {

    // Authentication
    const { state, saveCreds } = await useMultiFileAuthState("auth");

    // Create socket
    const sock = makeWASocket({
        auth: state
    });

    // Save credentials
    sock.ev.on("creds.update", saveCreds);

    // Connection updates
    sock.ev.on("connection.update", ({ connection, qr }) => {

        // Show QR in terminal
        if (qr) {
            qrcode.generate(qr, { small: true });
        }

        // Connected successfully
        if (connection === "open") {
            console.log("✅ Bot connected successfully");
        }

        // Disconnected
        if (connection === "close") {
            console.log("❌ Connection closed");
        }

    });

    // Detect new messages/status
    sock.ev.on("messages.upsert", async (m) => {

        const msg = m.messages[0];

        if (!msg.message) return;

        const jid = msg.key.remoteJid;

        // Status detection
        if (jid === "status@broadcast") {

            try {

                // Mark status as viewed
                await sock.readMessages([msg.key]);

                // React with random emoji
                await sock.sendMessage(jid, {
                    react: {
                        text: getRandomEmoji(),
                        key: msg.key
                    }
                });

                console.log("✅ Viewed and reacted to a status");

            } catch (err) {

                console.log("❌ Error handling status:", err);

            }
        }
    });
}

// Start bot
startBot();

// Express server for Render
app.get("/", (req, res) => {
    res.send("WhatsApp Bot is running ✅");
});

app.listen(PORT, () => {
    console.log(`🌍 Server running on port ${PORT}`);
});
