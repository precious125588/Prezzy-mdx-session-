import express from "express"
import makeWASocket, {
  useMultiFileAuthState,
  fetchLatestBaileysVersion
} from "@whiskeysockets/baileys"
import QRCode from "qrcode"

const app = express()
const PORT = process.env.PORT || 3000

app.use(express.urlencoded({ extended: true }))

let qrImage = ""
let pairingCode = ""
let phoneNumber = ""

// 🔥 HOME PAGE
app.get("/", (req, res) => {
  res.send(`
    <h1>🔥 PREZZY MDX SESSION 🔥</h1>
    <a href="/qr">Generate QR Code</a><br><br>
    <a href="/pair">Generate Pairing Code</a>
  `)
})

// 📷 QR PAGE
app.get("/qr", (req, res) => {
  res.send(`
    <h2>Scan QR Code</h2>
    ${qrImage ? `<img src="${qrImage}" width="300"/>` : "Loading QR... refresh"}
    <br><br>
    <a href="/">Back</a>
  `)
})

// 🔢 PAIR PAGE (FORM)
app.get("/pair", (req, res) => {
  res.send(`
    <h2>Enter Number</h2>
    <form action="/pair" method="POST">
      <input name="number" placeholder="234XXXXXXXXXX" required />
      <button type="submit">Get Code</button>
    </form>
    <br>
    <a href="/">Back</a>
  `)
})

// 🔥 HANDLE PAIR REQUEST
app.post("/pair", async (req, res) => {
  phoneNumber = req.body.number

  res.send(`
    <h2>Your Pairing Code</h2>
    <p>${pairingCode || "Generating... refresh"}</p>
    <br><br>
    <a href="/">Back</a>
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
    const { connection, qr } = update

    // QR
    if (qr) {
      qrImage = await QRCode.toDataURL(qr)
      console.log("QR Ready")
    }

    // Pairing
    if (connection === "connecting" && phoneNumber) {
      try {
        const code = await sock.requestPairingCode(phoneNumber)
        pairingCode = code
        console.log("Pairing Code:", code)
      } catch (e) {
        console.log("Pairing error:", e.message)
      }
    }

    if (connection === "open") {
      console.log("Connected ✅")
    }
  })

  sock.ev.on("creds.update", saveCreds)
}

// delay start (important for Render)
setTimeout(() => {
  startSock()
}, 3000)

app.listen(PORT, () => {
  console.log("Server running on port " + PORT)
})
