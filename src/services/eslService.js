const modesl = require("modesl");
const config = require("../config/freeswitch");

let connection = null;

const connect = () => {

    console.log("Connecting to FreeSWITCH...");

    connection = new modesl.Connection(
        config.host,
        config.port,
        config.password,
        () => {

            console.log("================================");
            console.log("Connected to FreeSWITCH ESL");
            console.log("================================");

            connection.events("plain", "ALL");

        }
    );

    connection.on("error", err => {

        console.log("ESL Error:", err);

    });

    connection.on("esl::end", () => {

        console.log("Disconnected from FreeSWITCH");

    });

};

const executeApi = (command) => {

    return new Promise((resolve, reject) => {

        if (!connection) {
            return reject(new Error("FreeSWITCH not connected"));
        }

        console.log("\nExecuting:");
        console.log(command);
        console.log("");

        connection.api(command, response => {

            if (!response)
                return reject(new Error("No response from FreeSWITCH"));

            resolve(response.getBody());

        });

    });

};

const bgApi = (command) => {

    return new Promise((resolve, reject) => {

        if (!connection) {
            return reject(new Error("FreeSWITCH not connected"));
        }

        connection.bgapi(command, response => {

            if (!response)
                return reject(new Error("No response"));

            resolve(response.getBody());

        });

    });

};

const getConnection = () => connection;

module.exports = {

    connect,
    executeApi,
    bgApi,
    getConnection

};