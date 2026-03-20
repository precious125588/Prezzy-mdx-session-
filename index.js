import express from "express"
import makeWASocket, { 
  useMultiFileAuthState,
  fetchLatestBaileysVersion
} from "@whiskeysockets/baileys"
import QRCode from "qrcode"

const app = express()
const PORT = process.env.PORT || 3000

let qrImage = ""
let pairingCode = ""

app.get("/", async (req, res) => {
  res.send(`
    <h2>🔥 PREZZY MDX SESSION GENERATOR 🔥</h2>

    <h3>📱 Pairing Code:</h3>
    <p>${pairingCode || "Generating..."}</p>

    <h3>📷 QR Code:</h3>
    ${qrImage ? `<img src="${qrImage}" width="300"/>` : "Generating QR... refresh"}
  `)
})

async function startSock() {
  const { state, saveCreds } = await useMultiFileAuthState("auth")

  const { version } = await fetchLatestBaileysVersion()

  const sock = makeWASocket({
    version,
    auth: state
  })

  sock.ev.on("connection.update", async (update) => {
    const { qr, connection } = update

    // QR CODE
    if (qr) {
      qrImage = await QRCode.toDataURL(qr)
      console.log("QR Generated ✅")
    }

    // CONNECTED
    if (connection === "open") {
      console.log("Connected ✅")
    }
  })

  // 🔥 PAIRING CODE
  if (!sock.authState.creds.registered) {
    setTimeout(async () => {
      const code = await sock.requestPairingCode("2349068551055") // your number
      pairingCode = code
      console.log("Pairing Code:", code)
    }, 3000)
  }

  sock.ev.on("creds.update", saveCreds)
}

startSock()

app.listen(PORT, () => {
  console.log("Server running on port " + PORT)
})
