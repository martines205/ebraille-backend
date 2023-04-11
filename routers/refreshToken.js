import jwt from "jsonwebtoken";
import express from "express";
import { checkStatusUserRefreshTokenByNik, nikIsValid } from "../model/Users/desktop/userModel.js";
import { accessTokenIsExpired, getUserAccessTokenByUsername, RefreshTokenIsValid, getRoleWithUsername } from "../model/Users/website/userModel.js";
const TokenRouter = express.Router();
const SECRET_KEY = process.env.SECRET_KEY;
const EXPIRED_DATE = process.env.EXPIRED_DATE;
/* Desktop */

TokenRouter.get("/byNik", async (req, res, next) => {
  //   console.log("req.query: ", req.query);
  const nik = req.query.nik;
  const accessToken = req.query.accessToken;
  const refreshToken = req.query.refreshToken;

  if (nik === undefined || accessToken === undefined || refreshToken === undefined) {
    return res.status(400).send({ Status: false, error: "Request tidak valid!!" });
  }
  if (nik === "" || accessToken === "" || refreshToken === "") {
    return res.status(400).send({ Status: false, error: "Request tidak valid!!" });
  }
  const nikStatus = await nikIsValid(nik);
  if (!nikStatus.result) return res.send({ Status: false, error: "NIK tidak valid!!", accessToken: "", refreshToken: "" });

  const refreshTokenStatus = await checkStatusUserRefreshTokenByNik(nik, refreshToken);
  if (!refreshTokenStatus) return res.send({ Status: false, error: "Refresh Token tidak valid!!", accessToken: "", refreshToken: "" });

  jwt.verify(accessToken, SECRET_KEY, { algorithm: "HS256" }, (err, decoded) => {
    if (err) {
      console.trace({ Route: "/byNik", Error: err.message });
      if (err.expiredAt) {
        next();
      } else if (err.name === "JsonWebTokenError") {
        return res.send({ Status: false, error: "Access token tidak valid!", accessToken: "***", refreshToken: "***" });
      }
    } else return res.send({ Status: false, error: "Access token Masih valid!", accessToken: "***", refreshToken: "***" });
  });
});

TokenRouter.get("/byNik", async (req, res) => {
  const nik = req.query.nik;
  const refreshToken = req.query.refreshToken;
  const nikStatus = await nikIsValid(nik);

  jwt.sign({ NIK: nik, role: nikStatus.role, iat: Math.floor(Date.now() / 1000) }, SECRET_KEY, { algorithm: "HS256", expiresIn: EXPIRED_DATE }, async function (err, token) {
    if (err !== null) {
      console.log("err: ", err);
      return res.send({ Status: false, msg: `Sistem Error: ${err}`, accessToken: "", refreshToken: "" });
    }
    res.send({ Status: true, Msg: "Access token berhasil diperbarui", accessToken: token, refreshToken });
  });
});

/* website */

TokenRouter.get("/", [], async (req, res, next) => {
  try {
    const username = req.query.username;
    const accessToken = req.query.accessToken;
    const refreshToken = req.query.refreshToken;
    const { role } = await getRoleWithUsername(username);
    await RefreshTokenIsValid(username, refreshToken);
    await accessTokenIsExpired(accessToken);
    const newAccessToken = await getUserAccessTokenByUsername(username, role);
    res.send({ Status: true, message: "Access token berhasil diperbarui", accessToken: newAccessToken, refreshToken });
  } catch (error) {
    return res.status(error.responseCode ? error.responseCode : 500).send({ Status: false, message: error.responseCode ? error.message : "Server error!" });
  }
});

export default TokenRouter;
