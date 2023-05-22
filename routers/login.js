import { nikIsValid, getUserRefreshTokenByNik, checkStatusUserRefreshTokenByNik } from "../model/Users/desktop/userModel.js";
import { getUserRefreshTokenByUsername, userIsValid } from "../model/Users/website/userModel.js";
import { getUserBookmarkInformation } from "../model/books/bookModel.js";
import jwt from "jsonwebtoken";
import express from "express";
import { validateLoginRequestField, validateUserNotHaveToken } from "../Middleware/website/loginMiddleware.js";
const loginRouter = express.Router();

const SECRET_KEY = process.env.SECRET_KEY;
const EXPIRED_DATE = process.env.EXPIRED_DATE;

// API for Website

loginRouter.get("/", [validateLoginRequestField, validateUserNotHaveToken], async (req, res, next) => {
  const username = req.query.username;
  const password = req.query.password;
  try {
    const result = await userIsValid(username, password);
    const refreshToken = await getUserRefreshTokenByUsername(username);
    return res.status(200).send({ loginStatus: true, msg: result.message, role: result.role, accessToken: result.accessToken, refreshToken });
  } catch (error) {
    return res.status(error.responseCode).send({ loginStatus: false, code: error.code, message: error.message });
  }
});

// API for Desktop

loginRouter.get("/byNIK", async (req, res, next) => {
  try {
    const nik = req.query.nik;
    const result = await checkStatusUserRefreshTokenByNik(nik);
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
    jwt.sign({ NIK: nik, role: loginStatus.role, iat }, SECRET_KEY, { algorithm: "HS256", expiresIn: EXPIRED_DATE }, async function (err, token) {
      if (err !== null) {
        console.trace({ Route: "/byNIK", error: err });
        return res.send({ loginStatus: false, msg: `Sistem Error: ${err}`, accessToken: "", refreshToken: "" });
      }
      const refreshToken = await getUserRefreshTokenByNik(nik);
      if (refreshToken === "") {
        return res.status(404).send({ loginStatus: false, msg: "server Error" });
      }
      return res.send({ loginStatus: loginStatus.result, msg: loginStatus.msg, accessToken: token, refreshToken, bookmarkList: bookmark });
    });
  } else return res.send({ loginStatus: loginStatus.result, msg: loginStatus.msg, accessToken: "" });
});

export default loginRouter;
