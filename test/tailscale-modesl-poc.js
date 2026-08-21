const { SocksClient } = require("socks");
const { EventEmitter2 } = require("eventemitter2");
const modesl = require("modesl");
const Parser = require("modesl/lib/esl/Parser");

const SOCKS_HOST = "127.0.0.1";
const SOCKS_PORT = 1055;

const TARGET_HOST = "100.88.225.6";
const TARGET_PORT = 8021;

const FREESWITCH_PASSWORD =
    process.env.FREESWITCH_PASSWORD;

function createInboundConnection(socket, password) {
    /*
     * Create a modesl Connection object WITHOUT calling
     * the Connection constructor.
     *
     * This prevents modesl from sending the outbound
     * "connect" command.
     */
    const connection = Object.create(
        modesl.Connection.prototype
    );

    EventEmitter2.call(connection, {
        wildcard: true,
        delimiter: "::",
        maxListeners: 25
    });

    connection.execAsync = false;
    connection.execLock = false;
    connection.connecting = false;
    connection.authed = false;
    connection.channelData = null;
    connection.cmdCallbackQueue = [];
    connection.apiCallbackQueue = [];

    connection.reqEvents = [
        "BACKGROUND_JOB",
        "CHANNEL_EXECUTE_COMPLETE"
    ];

    connection.listeningEvents = [];

    connection._inbound = true;
    connection.password = password;
    connection.socket = socket;

    /*
     * Initialize modesl's ESL parser.
     */
    connection.parser = new Parser(socket);

    connection.parser.on(
        "esl::event",
        connection._onEvent.bind(connection)
    );

    connection.parser.on(
        "error",
        connection._onError.bind(connection)
    );

    /*
     * Emit connection event.
     */
    connection.emit("esl::connect");

    /*
     * Listen for FreeSWITCH's auth/request.
     */
    connection.on(
        "esl::event::auth::request",
        connection.auth.bind(connection)
    );

    /*
     * Emit end when socket closes.
     */
    connection.on("esl::event::logdata", function(log) {
        const esl = require("modesl/lib/esl/esl");
        esl._doLog(log);
    });

    connection.on("esl::event::command::reply", function() {
        if (connection.cmdCallbackQueue.length === 0) {
            return;
        }

        const fn = connection.cmdCallbackQueue.shift();

        if (fn && typeof fn === "function") {
            fn.apply(connection, arguments);
        }
    });

    connection.on("esl::event::api::response", function() {
        if (connection.apiCallbackQueue.length === 0) {
            return;
        }

        const fn = connection.apiCallbackQueue.shift();

        if (fn && typeof fn === "function") {
            fn.apply(connection, arguments);
        }
    });

    socket.on("end", function() {
        connection.emit("esl::end");
        connection.socket = null;
    });

    socket.on(
        "error",
        connection._onError.bind(connection)
    );

    return connection;
}

async function main() {
    let socket;

    try {
        console.log("========================================");
        console.log("Tailscale SOCKS5 → modesl INBOUND POC");
        console.log("========================================");

        console.log("");
        console.log("STEP 1: Connecting through SOCKS5...");
        console.log(`Proxy  : ${SOCKS_HOST}:${SOCKS_PORT}`);
        console.log(`Target : ${TARGET_HOST}:${TARGET_PORT}`);
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

            timeout: 15000
        });

        socket = result.socket;

        console.log("SUCCESS: SOCKS5 TCP connection established");
        console.log("");

        console.log(
            "STEP 2: Creating inbound modesl connection..."
        );

        const connection = createInboundConnection(
            socket,
            FREESWITCH_PASSWORD
        );

        console.log("SUCCESS: modesl parser initialized");
        console.log(
            "Waiting for FreeSWITCH auth/request..."
        );

        connection.on(
            "esl::event::auth::success",
            function() {
                console.log("");
                console.log("========================================");
                console.log("SUCCESS: ESL AUTHENTICATED");
                console.log("========================================");

                console.log("");
                console.log(
                    "STEP 3: Running `api status`..."
                );
                console.log("");

                connection.api(
                    "status",
                    function(response) {
                        console.log(
                            "========================================"
                        );
                        console.log(
                            "FREE SWITCH STATUS RESPONSE"
                        );
                        console.log(
                            "========================================"
                        );

                        console.log(response);

                        console.log("");
                        console.log(
                            "========================================"
                        );
                        console.log("POC SUCCESS");
                        console.log(
                            "========================================"
                        );

                        console.log("");
                        console.log("ESL connection is healthy. Keeping service alive...");
                    }
                );
            }
        );

        connection.on(
            "esl::event::auth::fail",
            function(evt) {
                console.error("");
                console.error(
                    "========================================"
                );
                console.error(
                    "ERROR: ESL AUTHENTICATION FAILED"
                );
                console.error(
                    "========================================"
                );

                console.error(
                    "Password configured:",
                    FREESWITCH_PASSWORD ? "YES" : "NO"
                );

                if (evt) {
                    console.error(
                        "Content-Type:",
                        evt.getHeader("Content-Type") || "N/A"
                    );

                    console.error(
                        "Modesl-Reply-OK:",
                        evt.getHeader("Modesl-Reply-OK") || "N/A"
                    );

                    console.error(
                        "Reply-Text:",
                        evt.getHeader("Reply-Text") || "N/A"
                    );
                }

                socket.destroy();
                process.exit(1);
            }
        );

        connection.on(
            "error",
            function(error) {
                console.error(
                    "modesl error:",
                    error.message
                );
            }
        );

        connection.on(
            "esl::connect",
            function() {
                console.log(
                    "EVENT: esl::connect"
                );
            }
        );

        connection.on(
            "esl::end",
            function() {
                console.log(
                    "EVENT: esl::end"
                );
            }
        );

    } catch (error) {
        console.error("");
        console.error(
            "========================================"
        );
        console.error("POC FAILED");
        console.error(
            "========================================"
        );

        console.error("Message:", error.message);
        console.error("Code:", error.code || "N/A");
        console.error("Name:", error.name || "N/A");

        if (socket) {
            socket.destroy();
        }

        process.exit(1);
    }
}

main();
