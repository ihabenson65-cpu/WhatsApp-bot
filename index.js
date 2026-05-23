const {
    default: makeWASocket,
    useMultiFileAuthState
} = require("@whiskeysockets/baileys");

const express = require("express");

const app = express();

const PORT = process.env.PORT || 3000;

// Emojis
const emojis = ["😍", "🥰", "😘", "❤️", "😎", "🔥"];

function getRandomEmoji() {
    return emojis[Math.floor(Math.random() * emojis.length)];
}

async function startBot() {

    // Authentication
    const { state, saveCreds } = await useMultiFileAuthState("auth");

    // Create socket
    const sock = makeWASocket({
        auth: state,
        printQRInTerminal: false
    });

    // Save credentials
    sock.ev.on("creds.update", saveCreds);

    // Pairing Code Login
    if (!sock.authState.creds.registered) {

        const phoneNumber = "254740672882; // PUT YOUR FULL NUMBER

        const code = await sock.requestPairingCode(phoneNumber);

        console.log(`
==============================
YOUR PAIRING CODE: ${code}
==============================
`);
    }

    // Connection updates
    sock.ev.on("connection.update", ({ connection }) => {

        if (connection === "open") {
            console.log("✅ Bot connected successfully");
        }

        if (connection === "close") {
            console.log("❌ Connection closed");
        }

    });

    // Detect status updates
    sock.ev.on("messages.upsert", async (m) => {

        const msg = m.messages[0];

        if (!msg.message) return;

        const jid = msg.key.remoteJid;

        // Status detection
        if (jid === "status@broadcast") {

            try {

                // Mark status as viewed
                await sock.readMessages([msg.key]);

                // React to status
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
