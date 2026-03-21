import express from "express"
import makeWASocket, {
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  DisconnectReason
} from "@whiskeysockets/baileys"
import QRCode from "qrcode"

const app = express()
const PORT = process.env.PORT || 3000

let qrImage = ""
let pairingCode = ""

// Web page
app.get("/", (req, res) => {
  res.send(`
    <h2>🔥 PREZZY MDX SESSION 🔥</h2>

    <h3>Pairing Code:</h3>
    <p>${pairingCode || "Waiting..."}</p>

    <h3>QR Code:</h3>
    ${qrImage ? `<img src="${qrImage}" width="300"/>` : "Waiting for QR..."}
  `)
})

async function startSock() {
  const { state, saveCreds } = await useMultiFileAuthState("auth")
  const { version } = await fetchLatestBaileysVersion()

  const sock = makeWASocket({
    version,
    auth: state,
    printQRInTerminal: false,
    browser: ["PREZZY MDX", "Chrome", "1.0.0"]
  })

  sock.ev.on("connection.update", async (update) => {
    const { connection, lastDisconnect, qr } = update

    // QR
    if (qr) {
      qrImage = await QRCode.toDataURL(qr)
      console.log("QR Generated")
    }

    // Pairing Code (SAFE)
    if (!sock.authState.creds.registered) {
      try {
        const code = await sock.requestPairingCode("2349068551055")
        pairingCode = code
        console.log("Pairing Code:", code)
      } catch (err) {
        console.log("Pairing error:", err.message)
      }
    }

    // Reconnect if closed
    if (connection === "close") {
      const shouldReconnect =
        lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut

      console.log("Connection closed. Reconnecting:", shouldReconnect)

      if (shouldReconnect) {
        startSock()
      }
    }

    if (connection === "open") {
      console.log("Connected successfully ✅")
    }
  })

  sock.ev.on("creds.update", saveCreds)
}

startSock()

app.listen(PORT, () => {
  console.log("Server running on port " + PORT)
})
