const { default: makeWASocket, useMultiFileAuthState } = require("@whiskeysockets/baileys");
const qrcode = require("qrcode-terminal");

const emojis = ["😍","🥰","😘","❤️","😎","🔥"];

function getRandomEmoji() {
    return emojis[Math.floor(Math.random() * emojis.length)];
}

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState("auth");

    const sock = makeWASocket({
        auth: state,
        printQRInTerminal: true
    });

    sock.ev.on("creds.update", saveCreds);

    sock.ev.on("connection.update", (update) => {
        if (update.connection === "open") {
            console.log("Bot connected ✅");
        }
    });

    sock.ev.on("messages.upsert", async (m) => {
        const msg = m.messages[0];

        if (!msg.message) return;

        const jid = msg.key.remoteJid;

        // Detect Status
        if (jid === "status@broadcast") {
            try {
                // Mark as viewed
                await sock.readMessages([msg.key]);

                // React with random emoji
                await sock.sendMessage(jid, {
                    react: {
                        text: getRandomEmoji(),
                        key: msg.key
                    }
                });

                console.log("Viewed & reacted to a status ✅");
            } catch (err) {
                console.log("Error handling status:", err);
            }
        }
    });
}

startBot();
