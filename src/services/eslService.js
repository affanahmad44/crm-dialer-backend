const { SocksClient } = require("socks");
const { EventEmitter2 } = require("eventemitter2");
const modesl = require("modesl");
const Parser = require("modesl/lib/esl/Parser");
const config = require("../config/freeswitch");

let connection = null;
let connecting = false;


/**
 * Create a modesl Connection around an already-connected socket.
 *
 * modesl.Connection normally creates its own TCP connection.
 * We cannot use that because FreeSWITCH is reachable through
 * Tailscale's local SOCKS5 proxy.
 */
function createInboundConnection(socket, password) {

    const conn = Object.create(
        modesl.Connection.prototype
    );

    EventEmitter2.call(conn, {
        wildcard: true,
        delimiter: "::",
        maxListeners: 25
    });

    conn.execAsync = false;
    conn.execLock = false;
    conn.connecting = false;
    conn.authed = false;

    conn.channelData = null;
    conn.cmdCallbackQueue = [];
    conn.apiCallbackQueue = [];

    conn.reqEvents = [
        "BACKGROUND_JOB",
        "CHANNEL_EXECUTE_COMPLETE"
    ];

    conn.listeningEvents = [];

    conn._inbound = true;
    conn.password = password;
    conn.socket = socket;

    // Initialize modesl ESL parser
    conn.parser = new Parser(socket);

    conn.parser.on(
        "esl::event",
        conn._onEvent.bind(conn)
    );

    conn.parser.on(
        "error",
        conn._onError.bind(conn)
    );

    // Tell modesl that the socket connection exists
    conn.emit("esl::connect");

    // FreeSWITCH sends auth/request after TCP connection
    conn.on(
        "esl::event::auth::request",
        conn.auth.bind(conn)
    );

    // Logging
    conn.on("esl::event::logdata", function(log) {

        const esl = require("modesl/lib/esl/esl");

        esl._doLog(log);
    });

    // Command callbacks
    conn.on("esl::event::command::reply", function() {

        if (conn.cmdCallbackQueue.length === 0) {
            return;
        }

        const fn = conn.cmdCallbackQueue.shift();

        if (fn && typeof fn === "function") {
            fn.apply(conn, arguments);
        }

    });

    // API callbacks
    conn.on("esl::event::api::response", function() {

        if (conn.apiCallbackQueue.length === 0) {
            return;
        }

        const fn = conn.apiCallbackQueue.shift();

        if (fn && typeof fn === "function") {
            fn.apply(conn, arguments);
        }

    });

    socket.on("end", function() {

        conn.emit("esl::end");

        conn.socket = null;
    });

    socket.on(
        "error",
        conn._onError.bind(conn)
    );

    return conn;
}


/**
 * Connect Node.js → Tailscale SOCKS5 → FreeSWITCH ESL.
 */
const connect = async () => {

    if (connection) {
        console.log("ESL connection already exists.");
        return connection;
    }

    if (connecting) {
        console.log("ESL connection is already being established.");
        return;
    }

    connecting = true;

    console.log("================================");
    console.log("Connecting to FreeSWITCH ESL");
    console.log("================================");

    console.log(
        `SOCKS5 Proxy : ${config.socksHost}:${config.socksPort}`
    );

    console.log(
        `ESL Target   : ${config.host}:${config.port}`
    );

    try {

        /*
         * STEP 1
         *
         * Establish TCP connection through Tailscale SOCKS5.
         */
        const result = await SocksClient.createConnection({

            proxy: {
                host: config.socksHost,
                port: config.socksPort,
                type: 5
            },

            command: "connect",

            destination: {
                host: config.host,
                port: config.port
            },

            timeout: config.timeout

        });

        const socket = result.socket;

        console.log(
            "SUCCESS: SOCKS5 TCP connection established"
        );


        /*
         * STEP 2
         *
         * Give the already-connected socket to modesl.
         */
        connection = createInboundConnection(
            socket,
            config.password
        );

        console.log(
            "SUCCESS: modesl parser initialized"
        );


        /*
         * STEP 3
         *
         * Wait for ESL authentication.
         */
        connection.on(
            "esl::event::auth::success",
            function() {

                console.log("================================");
                console.log("SUCCESS: ESL AUTHENTICATED");
                console.log("================================");

                connecting = false;

                // Subscribe to all FreeSWITCH events
                connection.events("plain", "ALL");

            }
        );


        connection.on(
            "esl::event::auth::fail",
            function(evt) {

                console.error("================================");
                console.error("ERROR: ESL AUTHENTICATION FAILED");
                console.error("================================");

                if (evt) {

                    console.error(
                        "Reply-Text:",
                        evt.getHeader("Reply-Text") || "N/A"
                    );

                }

                connection = null;
                connecting = false;

                socket.destroy();

            }
        );


        connection.on("error", err => {

            console.error(
                "ESL Error:",
                err.message
            );

        });


        connection.on("esl::end", () => {

            console.log(
                "Disconnected from FreeSWITCH ESL"
            );

            connection = null;
            connecting = false;

        });


        return connection;

    } catch (error) {

        connecting = false;
        connection = null;

        console.error(
            "Failed to connect to FreeSWITCH ESL:"
        );

        console.error(
            error.message
        );

        throw error;
    }
};


/**
 * Execute synchronous FreeSWITCH API command.
 */
const executeApi = (command) => {

    return new Promise((resolve, reject) => {

        if (!connection || !connection.authed) {

            return reject(
                new Error("FreeSWITCH ESL not connected")
            );
        }

        console.log("\nExecuting:");
        console.log(command);
        console.log("");

        connection.api(
            command,
            response => {

                if (!response) {

                    return reject(
                        new Error(
                            "No response from FreeSWITCH"
                        )
                    );

                }

                resolve(
                    response.getBody()
                );

            }
        );

    });

};


/**
 * Execute FreeSWITCH background API command.
 */
const bgApi = (command) => {

    return new Promise((resolve, reject) => {

        if (!connection || !connection.authed) {

            return reject(
                new Error("FreeSWITCH ESL not connected")
            );
        }

        connection.bgapi(
            command,
            response => {

                if (!response) {

                    return reject(
                        new Error("No response from FreeSWITCH")
                    );

                }

                resolve(
                    response.getBody()
                );

            }
        );

    });

};


const getConnection = () => connection;


module.exports = {

    connect,
    executeApi,
    bgApi,
    getConnection

};
