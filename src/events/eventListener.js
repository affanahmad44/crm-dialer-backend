const eslService = require("../services/eslService");

const startListener = (io) => {

    const connection = eslService.getConnection();

    if (!connection) {

        console.log("FreeSWITCH not connected.");

        return;
    }

    console.log("Listening for FreeSWITCH events...");

    connection.events("plain", "ALL");

    const events = [

        "CHANNEL_CREATE",
        "CHANNEL_ANSWER",
        "CHANNEL_BRIDGE",
        "CHANNEL_HANGUP",
        "CHANNEL_DESTROY",
        "CHANNEL_HOLD",
        "CHANNEL_UNHOLD"

    ];

    events.forEach(eventName => {

        connection.on(
            `esl::event::${eventName}::*`,
            event => {

                const uuid =
                    event.getHeader("Unique-ID");

                const caller =
                    event.getHeader(
                        "Caller-Caller-ID-Number"
                    );

                const destination =
                    event.getHeader(
                        "Caller-Destination-Number"
                    );

                const state =
                    event.getHeader(
                        "Channel-State"
                    );

                const hangupCause =
                    event.getHeader(
                        "Hangup-Cause"
                    );

                console.log(
                    "\n================================"
                );

                console.log(
                    `EVENT : ${eventName}`
                );

                console.log(
                    "UUID :",
                    uuid
                );

                console.log(
                    "Caller :",
                    caller
                );

                console.log(
                    "Destination :",
                    destination
                );

                console.log(
                    "State :",
                    state
                );

                console.log(
                    "================================\n"
                );

                // Send event to connected frontend clients
                io.emit("call:event", {

                    event: eventName,

                    uuid,

                    caller,

                    destination,

                    state,

                    hangupCause,

                    timestamp: new Date().toISOString()

                });

            }
        );

    });

};

module.exports = {
    startListener
};