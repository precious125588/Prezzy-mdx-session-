import express from "express"
import makeWASocket, {
  useMultiFileAuthState,
  fetchLatestBaileysVersion
} from "@whiskeysockets/baileys"
import QRCode from "qrcode"

const app = express()
const PORT = process.env.PORT || 3000

app.use(express.static("public"))
app.use(express.urlencoded({ extended: true }))

let qrImage = ""
let pairingCode = ""
let phoneNumber = ""

// HOME PAGE
app.get("/", (req, res) => {
  res.sendFile(process.cwd() + "/public/index.html")
})

// QR PAGE (UI)
app.get("/qr-page", (req, res) => {
  res.sendFile(process.cwd() + "/public/qr.html")
})

// PAIR PAGE (UI)
app.get("/pair", (req, res) => {
  res.sendFile(process.cwd() + "/public/pair.html")
})

// QR IMAGE (IMPORTANT)
app.get("/qr", (req, res) => {
  if (!qrImage) return res.send("QR not ready")
  const img = qrImage.split(",")[1]
  res.writeHead(200, { "Content-Type": "image/png" })
  res.end(Buffer.from(img, "base64"))
})

// HANDLE PAIR FORM
app.post("/pair", (req, res) => {
  phoneNumber = req.body.number

  res.send(`
    <h2>Pairing Code</h2>
    <p>${pairingCode || "Generating... refresh"}</p>
    <br><br>
    <a href="/">Back</a>
  `)
})

// WHATSAPP CONNECTION
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
    const { connection, qr } = update

    // QR GENERATION
    if (qr) {
      qrImage = await QRCode.toDataURL(qr)
      console.log("QR Ready")
    }

    // PAIRING CODE
    if (connection === "connecting" && phoneNumber) {
      try {
        const code = await sock.requestPairingCode(phoneNumber)
        pairingCode = code
        console.log("Pairing Code:", code)
      } catch (err) {
        console.log("Pairing error:", err.message)
      }
    }

    if (connection === "open") {
      console.log("Connected ✅")
    }
  })

  sock.ev.on("creds.update", saveCreds)
}

// DELAY START (VERY IMPORTANT FOR RENDER)
setTimeout(() => {
  startSock()
}, 3000)

app.listen(PORT, () => {
  console.log("Server running on port " + PORT)
})
