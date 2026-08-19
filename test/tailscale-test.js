const net = require("net");
const http = require("http");
const { SocksClient } = require("socks");

const PORT = Number(process.env.PORT || 10000);
const LOCAL_PROXY_PORT = 8021;

const TARGET_HOST = "100.88.225.6";
const TARGET_PORT = 8021;

const SOCKS_HOST = "127.0.0.1";
const SOCKS_PORT = 1055;

// --------------------------------------------------
// HTTP health server for Render
// --------------------------------------------------

const server = http.createServer((req, res) => {
    res.writeHead(200, {
        "Content-Type": "application/json"
    });

    res.end(JSON.stringify({
        success: true,
        service: "tailscale-esl-test",
        tailscaleTarget: `${TARGET_HOST}:${TARGET_PORT}`
    }));
});

server.listen(PORT, "0.0.0.0", () => {
    console.log(`HTTP health server listening on ${PORT}`);
});

// --------------------------------------------------
// TCP -> SOCKS5 -> FreeSWITCH bridge
// --------------------------------------------------

const proxy = net.createServer(async clientSocket => {

    console.log("Incoming local TCP connection");

    try {

        const { socket } = await SocksClient.createConnection({
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
            `Connected through Tailscale to ${TARGET_HOST}:${TARGET_PORT}`
        );

        clientSocket.pipe(socket);
        socket.pipe(clientSocket);

        socket.on("error", err => {
            console.error("Remote socket error:", err.message);
            clientSocket.destroy();
        });

        clientSocket.on("error", err => {
            console.error("Local socket error:", err.message);
            socket.destroy();
        });

        socket.on("close", () => {
            clientSocket.destroy();
        });

        clientSocket.on("close", () => {
            socket.destroy();
        });

    } catch (error) {

        console.error(
            "Tailscale TCP bridge error:",
            error.message
        );

        clientSocket.destroy();
    }
});

proxy.listen(LOCAL_PROXY_PORT, "127.0.0.1", () => {

    console.log(
        `TCP bridge listening on 127.0.0.1:${LOCAL_PROXY_PORT}`
    );

    console.log(
        `Forwarding to ${TARGET_HOST}:${TARGET_PORT} through SOCKS5 ${SOCKS_HOST}:${SOCKS_PORT}`
    );
});
