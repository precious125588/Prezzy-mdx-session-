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

    if (qr) {
      qrImage = await QRCode.toDataURL(qr)
      console.log("QR Generated ✅")
    }

    if (connection === "connecting") {
      try {
        const code = await sock.requestPairingCode("2349068551055")
        pairingCode = code
        console.log("Pairing Code:", code)
      } catch (err) {
        console.log("Pairing error:", err)
      }
    }

    if (connection === "open") {
      console.log("Connected ✅")
    }
  })

  sock.ev.on("creds.update", saveCreds)
}
