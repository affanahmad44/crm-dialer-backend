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

eslService.connect();

setTimeout(() => {

    eventListener.startListener(io);

}, 2000);

server.listen(PORT, () => {

    console.log(`Node Dialer running on port ${PORT}`);

});