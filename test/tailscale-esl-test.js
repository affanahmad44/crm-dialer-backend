const modesl = require("modesl");

const HOST = "100.88.225.6";
const PORT = 8021;
const PASSWORD = process.env.FS_PASSWORD;

console.log("================================");
console.log("Tailscale ESL connectivity test");
console.log("================================");
console.log(`Target: ${HOST}:${PORT}`);

if (!PASSWORD) {
    console.error("FS_PASSWORD is not configured");
    process.exit(1);
}

const connection = new modesl.Connection(
    HOST,
    PORT,
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
