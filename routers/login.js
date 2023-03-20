import { userIsValid, nikIsValid, getUserRefreshToken, checkStatusUserRefreshToken } from "../model/Users/userAuthentication.js";
import { getUserBookmarkInformation } from "../model/books/bookModel.js";
import jwt from "jsonwebtoken";
import express from "express";
const loginRouter = express.Router();

// loginRouter.use((req, res, next) => {
//   console.log("loginRouter");
//   next();
// });

loginRouter.get("/", async (req, res) => {
  const username = req.query.username;
  const password = req.query.password;
  const result = await userIsValid(username, password);
  console.log(result);
  result.result ? res.send({ loginStatus: result.result, msg: result.msg }) : res.send({ loginStatus: result.result, msg: result.msg });
});

loginRouter.get("/byNIK", async (req, res, next) => {
  const nik = req.query.nik;
  const result = await checkStatusUserRefreshToken(nik);
  console.log("result: ", result);
  if (result === false) next();
  else res.status(400).send({ loginStatus: true, msg: "akun sudah login!", accessToken: "*****", refreshToken: "*****", bookmarkList: ["*"] });
});

loginRouter.get("/byNIK", async (req, res) => {
  const nik = req.query.nik;
  const loginStatus = await nikIsValid(nik);
  if (loginStatus.result) {
    const bookmark = await getUserBookmarkInformation(nik);
    const iat = Math.floor(Date.now() / 1000);
    jwt.sign({ NIK: nik, role: loginStatus.role, iat }, "prvK", { algorithm: "HS256", expiresIn: "3h" }, async function (err, token) {
      if (err !== null) {
        console.log("err: ", err);
        res.send({ loginStatus: false, msg: `Sistem Error: ${err}`, accessToken: "", refreshToken: "" });
      }
      const refreshToken = await getUserRefreshToken(nik);
      res.send({ loginStatus: loginStatus.result, msg: loginStatus.msg, accessToken: token, refreshToken, bookmarkList: bookmark });
    });
  } else res.send({ loginStatus: loginStatus.result, msg: loginStatus.msg, accessToken: "" });
});

export default loginRouter;
