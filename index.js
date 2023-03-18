import express from "express";

import bookRouter from "./routers/book.js";
import loginRouter from "./routers/login.js";
import registerRouter from "./routers/register.js";

const app = express();
const port = 3001;

// require("./routers/login")(app);

// app.get("/", (req, res) => {
//   console.log(req.query.tes);
//   res.send("Hello World!");
// });

app.use("/book", bookRouter);
app.use("/login", loginRouter);
app.use("/register", registerRouter);
app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});

export { app };
