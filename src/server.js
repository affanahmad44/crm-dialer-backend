require("dotenv").config();

const http = require("http");
const { Server } = require("socket.io");

const app = require("./app");

const eslService = require("./services/eslService");
const eventListener = require("./events/eventListener");

const PORT = process.env.PORT || 3001;

const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

io.on("connection", (socket) => {

    console.log("Frontend connected:", socket.id);

    socket.on("disconnect", () => {
        console.log("Frontend disconnected:", socket.id);
    });

});


const startServer = async () => {

    try {

        await eslService.connect();

        console.log("ESL connection ready.");

        eventListener.startListener(io);

        server.listen(PORT, () => {

            console.log(
                `Node Dialer running on port ${PORT}`
            );

        });

    } catch (error) {

        console.error(
            "Failed to start Node Dialer:",
            error.message
        );

        process.exit(1);

    }

};

startServer();
