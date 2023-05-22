import express from "express";
import cors from "cors";
import { createClient } from "redis";
import bookRouter from "./routers/book.js";
import loginRouter from "./routers/login.js";
import logoutRouter from "./routers/logout.js";
import TokenRouter from "./routers/refreshToken.js";
import registerRouter from "./routers/register.js";
import RoleRouter from "./routers/role.js";
import forgetPassword from "./routers/resetPassword.js";
import WebSocket, { WebSocketServer } from "ws";
const RedisClient = createClient();
const app = express();
app.use(cors());

const port = 3001;
app.use("/login", loginRouter);
app.use("/logout", logoutRouter);
app.use("/token", TokenRouter);
app.use("/book", bookRouter);
app.use("/register", registerRouter);
app.use("/role", RoleRouter);
app.use("/forgetPassword", forgetPassword);

const server = app.listen(port, async () => {
  console.log(`Example app listening on port ${port}`);
  RedisClient.on("error", (err) => console.log("Redis Client Error", err));
  RedisClient.on("ready", () => console.log("Redis Client conected and ready to use!"));
  RedisClient.on("end", async () => {
    console.log("Redis Client disconected!");
  });
  await RedisClient.connect();
  await RedisClient.flushAll("ASYNC");
  await RedisClient.set("key", "value redis");
  const value = await RedisClient.get("key");
  console.log(value);
});

export { app, RedisClient };

process.on("SIGTERM", shutDown);
process.on("SIGINT", shutDown);

let connections = [];

server.on("connection", (connection) => {
  connections.push(connection);
  connection.on("close", () => (connections = connections.filter((curr) => curr !== connection)));
});

async function shutDown() {
  console.log("\nReceived kill signal, shutting down gracefully");
  await RedisClient.flushAll("ASYNC");
  await RedisClient.disconnect();
  server.close(() => {
    console.log("Closed out remaining connections");
    process.exit(0);
  });

  setTimeout(() => {
    console.error("Could not close connections in time, forcefully shutting down");
    process.exit(1);
  }, 10000);

  connections.forEach((curr) => curr.end());
  setTimeout(() => connections.forEach((curr) => curr.destroy()), 5000);
}

const webSockets = {};

const wss = new WebSocketServer({ server });
wss.on("connection", (ws, req) => {
  // ws.send("Welcome new Client!");
  // console.log("params: ", params);
  const params = new URLSearchParams(req.url);
  const UID = params.get("UID");
  if (UID === null) ws.terminate();
  webSockets[UID] = ws;
  console.log("connected: " + UID + " in " + Object.getOwnPropertyNames(webSockets));
  ws.on("message", (raw) => {
    // console.log("received from " + UID + ": " + raw);
    try {
      const { UID_TARGET, Message } = JSON.parse(raw);
      if (UID_TARGET === undefined || Message === undefined) throw new Error("Request invalid");
      console.log("UID_TARGET:", UID_TARGET);
      console.log("Message: ", Message);
      var toUserWebSocket = webSockets[`${UID_TARGET}`];
      // console.log("toUserWebSocket: ", toUserWebSocket);
      if (UID !== "ADMIN" && toUserWebSocket) {
        toUserWebSocket.send(JSON.stringify({ deviceID: UID, Message }));
      } else if (UID === "ADMIN")
        if (UID_TARGET.toUpperCase() === "ALL") {
          wss.clients.forEach(function each(client) {
            if (client !== ws && client.readyState === WebSocket.OPEN) {
              console.log(`FROM ADMIN-> send: ${Message}`);
              client.send(`FROM ADMIN-> send: ${Message}`);
            }
          });
        } else {
          toUserWebSocket.send(Message);
        }
    } catch (error) {
      if (error instanceof Error) console.log("error: ", error.message);
      ws.send(error.message);
    }
  });
  ws.on("close", (raw) => {
    if (UID !== "ADMIN") {
      console.log("received close signal from " + UID);
      delete webSockets[`${UID}`];
      console.log("remaining connected client list: ", Object.getOwnPropertyNames(webSockets));
    }
  });
});
