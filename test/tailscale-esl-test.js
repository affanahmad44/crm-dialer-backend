const { SocksClient } = require("socks");
const http = require("http");

const SOCKS_HOST = "127.0.0.1";
const SOCKS_PORT = 1055;

const TARGET_HOST = "100.88.225.6";
const TARGET_PORT = 8021;

const CONNECTION_TIMEOUT = 15000;
const PORT = process.env.PORT || 10000;

console.log("================================");
console.log("Tailscale SOCKS5 → FreeSWITCH ESL TEST");
console.log("================================");

console.log(`SOCKS5 proxy : ${SOCKS_HOST}:${SOCKS_PORT}`);
console.log(`ESL target   : ${TARGET_HOST}:${TARGET_PORT}`);
console.log("================================");

function startHealthServer() {
    const server = http.createServer((req, res) => {
        res.writeHead(200, {
            "Content-Type": "application/json"
        });

        res.end(JSON.stringify({
            success: true,
            service: "tailscale-esl-test",
            tailscale: true,
            socks5: true,
            freeswitch: true,
            esl: true
        }));
    });

    server.listen(PORT, "0.0.0.0", () => {
        console.log("================================");
        console.log("TEST SERVICE IS RUNNING");
        console.log("================================");
        console.log(`HTTP server listening on port ${PORT}`);
        console.log("Tailscale → SOCKS5 → FreeSWITCH ESL path verified.");
        console.log("Container will remain alive.");
        console.log("================================");
    });
}

async function testConnection() {
    let socket;

    try {
        console.log("");
        console.log("STEP 1: Connecting through Tailscale SOCKS5...");
        console.log("");

        const result = await SocksClient.createConnection({
            proxy: {
                host: SOCKS_HOST,
                port: SOCKS_PORT,
                type: 5
            },

            command: "connect",

            destination: {
                host: TARGET_HOST,
                port: TARGET_PORT
            },

            timeout: CONNECTION_TIMEOUT
        });

        socket = result.socket;

        console.log("================================");
        console.log("SUCCESS: SOCKS5 CONNECT completed");
        console.log("================================");

        console.log(`Proxy: ${SOCKS_HOST}:${SOCKS_PORT}`);
        console.log(`Target: ${TARGET_HOST}:${TARGET_PORT}`);

        console.log("");
        console.log("STEP 2: Waiting for FreeSWITCH ESL greeting...");
        console.log("");

        socket.setTimeout(CONNECTION_TIMEOUT);

        socket.once("data", data => {

            console.log("================================");
            console.log("SUCCESS: DATA RECEIVED FROM FREESWITCH");
            console.log("================================");

            console.log("Bytes:", data.length);

            console.log("");
            console.log("HEX:");
            console.log(data.toString("hex"));

            console.log("");
            console.log("ASCII:");
            console.log(data.toString("utf8"));

            console.log("");
            console.log("================================");
            console.log("SUCCESS: TAILSCALE → ESL PATH WORKS");
            console.log("================================");

            socket.destroy();

            // IMPORTANT:
            // Do NOT process.exit(0).
            // Render services must keep a process alive.
            startHealthServer();
        });

        socket.on("timeout", () => {

            console.error("");
            console.error("================================");
            console.error("ERROR: TIMEOUT WAITING FOR ESL");
            console.error("================================");

            console.error(
                `Connected to ${TARGET_HOST}:${TARGET_PORT}, ` +
                "but FreeSWITCH did not send an ESL response."
            );

            socket.destroy();

            process.exit(1);
        });

        socket.on("error", err => {

            console.error("");
            console.error("================================");
            console.error("SOCKET ERROR AFTER CONNECT");
            console.error("================================");

            console.error("Message:", err.message);
            console.error("Code:", err.code || "N/A");

            process.exit(1);
        });

    } catch (error) {

        console.error("");
        console.error("================================");
        console.error("SOCKS5 CONNECTION FAILED");
        console.error("================================");

        console.error("Message:", error.message);
        console.error("Code:", error.code || "N/A");
        console.error("Name:", error.name || "N/A");

        if (error.options) {
            console.error("Options:", error.options);
        }

        console.error("");
        console.error("This means the failure occurred while");
        console.error("connecting through the Tailscale SOCKS5 proxy.");
        console.error("");

        process.exit(1);
    }
}

testConnection();
