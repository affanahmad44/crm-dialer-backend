const net = require("net");
const modesl = require("modesl");
const { SocksClient } = require("socks");

const TARGET_HOST = "100.88.225.6";
const TARGET_PORT = 8021;

const SOCKS_HOST = "127.0.0.1";
const SOCKS_PORT = 1055;

const LOCAL_HOST = "127.0.0.1";
const LOCAL_PORT = 8021;

const PASSWORD = process.env.FS_PASSWORD;

console.log("================================");
console.log("Tailscale + FreeSWITCH ESL test");
console.log("================================");

if (!PASSWORD) {
    console.error("FS_PASSWORD is not configured");
    process.exit(1);
}

console.log(`FreeSWITCH target: ${TARGET_HOST}:${TARGET_PORT}`);
console.log(`Tailscale SOCKS5: ${SOCKS_HOST}:${SOCKS_PORT}`);
console.log(`Local ESL bridge: ${LOCAL_HOST}:${LOCAL_PORT}`);

// --------------------------------------------------
// TCP bridge:
// local TCP -> Tailscale SOCKS5 -> FreeSWITCH
// --------------------------------------------------

const bridge = net.createServer(async clientSocket => {

    console.log("Incoming ESL connection to local bridge");

    try {

        const { socket: remoteSocket } =
            await SocksClient.createConnection({
                proxy: {
                    host: SOCKS_HOST,
                    port: SOCKS_PORT,
                    type: 5
                },
                command: "connect",
                destination: {
                    host: TARGET_HOST,
                    port: TARGET_PORT
                }
            });

        console.log(
            `Bridge connected through Tailscale to ${TARGET_HOST}:${TARGET_PORT}`
        );

        clientSocket.pipe(remoteSocket);
        remoteSocket.pipe(clientSocket);

        remoteSocket.on("error", err => {
            console.error("Remote socket error:", err.message);
            clientSocket.destroy();
        });

        clientSocket.on("error", err => {
            console.error("Local socket error:", err.message);
            remoteSocket.destroy();
        });

        remoteSocket.on("close", () => {
            clientSocket.destroy();
        });

        clientSocket.on("close", () => {
            remoteSocket.destroy();
        });

    } catch (error) {

        console.error(
            "Tailscale bridge error:",
            error.message
        );

        clientSocket.destroy();
    }
});

bridge.listen(LOCAL_PORT, LOCAL_HOST, () => {

    console.log(
        `ESL bridge listening on ${LOCAL_HOST}:${LOCAL_PORT}`
    );

    // --------------------------------------------------
    // Now modesl connects to the LOCAL bridge.
    // The bridge handles Tailscale.
    // --------------------------------------------------

    console.log("Starting modesl ESL client...");

    const connection = new modesl.Connection(
        LOCAL_HOST,
        LOCAL_PORT,
        PASSWORD,
        () => {

            console.log("================================");
            console.log("SUCCESS: Connected to FreeSWITCH ESL");
            console.log("================================");

            connection.api("status", response => {

                console.log("FreeSWITCH response:");
                console.log(response.getBody());

                process.exit(0);
            });
        }
    );

    connection.on("error", err => {
        console.error("ESL ERROR:", err);
    });

    connection.on("esl::end", () => {
        console.log("ESL connection ended");
    });
});
