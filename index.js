import express from "express";

import bookRouter from "./routers/book.js";
import loginRouter from "./routers/login.js";
import registerRouter from "./routers/register.js";
import logoutRouter from "./routers/logout.js";
import TokenRouter from "./routers/refreshToken.js";
import { createClient } from "redis";
const RedisClient = createClient();

const app = express();
const port = 3001;

app.use("/login", loginRouter);
app.use("/logout", logoutRouter);
app.use("/token", TokenRouter);
app.use("/book", bookRouter);
app.use("/register", registerRouter);
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

// setInterval(() => server.getConnections((err, connections) => console.log(`${connections} connections currently open`)), 1000);

// // app.on("")

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
