const net = require("net");

const SOCKS_HOST = "127.0.0.1";
const SOCKS_PORT = 1055;

const TARGET_HOST = "100.88.225.6";
const TARGET_PORT = 8021;

console.log("================================");
console.log("RAW Tailscale SOCKS5 TEST");
console.log("================================");

console.log(`SOCKS5 proxy: ${SOCKS_HOST}:${SOCKS_PORT}`);
console.log(`Target: ${TARGET_HOST}:${TARGET_PORT}`);

let socksStage = "greeting";

const socket = net.createConnection(
    {
        host: SOCKS_HOST,
        port: SOCKS_PORT
    },
    () => {

        console.log("Connected to Tailscale SOCKS5 proxy");

        // SOCKS5 greeting:
        // Version = 5
        // Number of authentication methods = 1
        // Method = 0 (no authentication)

        const greeting = Buffer.from([
            0x05,
            0x01,
            0x00
        ]);

        console.log("Sending SOCKS5 greeting:");
        console.log(greeting.toString("hex"));

        socket.write(greeting);
    }
);

socket.on("data", data => {

    console.log("================================");
    console.log(`SOCKS DATA RECEIVED [stage=${socksStage}]`);
    console.log("Length:", data.length);
    console.log("HEX:", data.toString("hex"));
    console.log("ASCII:", data.toString("ascii"));
    console.log("================================");

    // --------------------------------------------------
    // Stage 1:
    // SOCKS5 authentication-method negotiation
    // --------------------------------------------------

    if (socksStage === "greeting") {

        if (data.length < 2) {

            console.log(
                "Waiting for complete SOCKS5 greeting response..."
            );

            return;
        }

        if (data[0] !== 0x05) {

            console.error(
                "Invalid SOCKS5 version:",
                data[0]
            );

            socket.destroy();
            return;
        }

        console.log(
            "SUCCESS: Tailscale responded with SOCKS5 version 5"
        );

        if (data[1] !== 0x00) {

            console.error(
                `SOCKS5 authentication method rejected: 0x${data[1].toString(16)}`
            );

            socket.destroy();
            return;
        }

        console.log(
            "SUCCESS: No-authentication method accepted"
        );

        // --------------------------------------------------
        // Build SOCKS5 CONNECT request
        // Target:
        // 100.88.225.6:8021
        // --------------------------------------------------

        const target = TARGET_HOST
            .split(".")
            .map(Number);

        const request = Buffer.from([
            0x05, // SOCKS5
            0x01, // CONNECT
            0x00, // reserved
            0x01, // IPv4

            ...target,

            (TARGET_PORT >> 8) & 0xff,
            TARGET_PORT & 0xff
        ]);

        console.log("Sending SOCKS5 CONNECT request:");
        console.log(request.toString("hex"));

        socksStage = "connect";

        socket.write(request);

        return;
    }

    // --------------------------------------------------
    // Stage 2:
    // SOCKS5 CONNECT response
    // --------------------------------------------------

    if (socksStage === "connect") {

        console.log("SOCKS5 CONNECT response received.");

        if (data.length >= 2) {

            console.log(
                "First bytes:",
                data.subarray(0, 2).toString("hex")
            );
        }

        console.log("Remaining connection data:");
        console.log(data.toString());

        socket.destroy();
    }
});

socket.on("error", err => {

    console.error(
        "SOCKET ERROR:",
        err.message
    );
});

socket.on("close", () => {

    console.log("Socket closed");
});

setTimeout(() => {

    console.error(
        "TIMEOUT: SOCKS5 test did not complete."
    );

    socket.destroy();

    process.exit(1);

}, 15000);
