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
  console.trace(result);
  result.result ? res.send({ loginStatus: result.result, msg: result.msg }) : res.send({ loginStatus: result.result, msg: result.msg });
});

loginRouter.get("/byNIK", async (req, res, next) => {
  try {
    const nik = req.query.nik;
    const result = await checkStatusUserRefreshToken(nik);
    if (result === false) return next();
    else return res.status(400).send({ loginStatus: false, msg: "akun sudah login!", accessToken: "*****", refreshToken: "*****", bookmarkList: ["*"] });
  } catch (error) {
    console.trace({ Route: "/byNIK", error });
    return res.status(400).send({ loginStatus: false, error: error });
  }
});

loginRouter.get("/byNIK", async (req, res) => {
  const nik = req.query.nik;
  const loginStatus = await nikIsValid(nik);
  if (loginStatus.result) {
    const bookmark = await getUserBookmarkInformation(nik);
    const iat = Math.floor(Date.now() / 1000);
    jwt.sign({ NIK: nik, role: loginStatus.role, iat }, "prvK", { algorithm: "HS256", expiresIn: "3h" }, async function (err, token) {
      if (err !== null) {
        console.trace({ Route: "/byNIK", error: err });
        return res.send({ loginStatus: false, msg: `Sistem Error: ${err}`, accessToken: "", refreshToken: "" });
      }
      const refreshToken = await getUserRefreshToken(nik);
      if (refreshToken === "") {
        return res.status(404).send({ loginStatus: false, msg: "server Error" });
      }
      return res.send({ loginStatus: loginStatus.result, msg: loginStatus.msg, accessToken: token, refreshToken, bookmarkList: bookmark });
    });
  } else return res.send({ loginStatus: loginStatus.result, msg: loginStatus.msg, accessToken: "" });
});

export default loginRouter;
