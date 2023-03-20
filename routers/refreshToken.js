import jwt from "jsonwebtoken";
import express from "express";
import { checkStatusUserRefreshToken, nikIsValid } from "../model/Users/userAuthentication.js";
const TokenRouter = express.Router();

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

  const refreshTokenStatus = await checkStatusUserRefreshToken(nik, refreshToken);
  if (!refreshTokenStatus) return res.send({ Status: false, error: "Refresh Token tidak valid!!", accessToken: "", refreshToken: "" });

  jwt.verify(accessToken, "prvK", { algorithm: "HS256" }, (err, decoded) => {
    console.log("decoded", decoded);
    console.log("err", err);
    // console.log("err object", Object.keys(err));
    if (err) {
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

  jwt.sign({ NIK: nik, role: nikStatus.role, iat: Math.floor(Date.now() / 1000) }, "prvK", { algorithm: "HS256", expiresIn: "3h" }, async function (err, token) {
    if (err !== null) {
      console.log("err: ", err);
      return res.send({ Status: false, msg: `Sistem Error: ${err}`, accessToken: "", refreshToken: "" });
    }
    res.send({ Status: true, Msg: "Access token berhasil diperbarui", accessToken: token, refreshToken });
  });
});

export default TokenRouter;
