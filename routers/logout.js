import { deleteUserRefreshTokenByNik } from "../model/Users/desktop/userModel.js";
import { deleteUserRefreshTokenByUsername } from "../model/Users/website/userModel.js";
import express from "express";
const logoutRouter = express.Router();
import { RedisClient } from "../index.js";

/* Desktop */

logoutRouter.get("/", async (req, res) => {
  const nik = req.query.nik;
  if (nik !== undefined) {
    const result = await deleteUserRefreshTokenByNik(nik);
    if (result) RedisClient.getDel(nik);
    if (result) return res.status(200).send({ logoutStatus: true, msg: "Logout berhasil!" });
    else return res.status(400).send({ logoutStatus: false, error: "Request invalid!" });
  }
  const username = req.query.username;
  if (username !== undefined) {
    const result = await deleteUserRefreshTokenByUsername(username);
    if (result) return res.status(200).send({ logoutStatus: true, msg: "Logout berhasil!" });
    else return res.status(400).send({ logoutStatus: false, error: "Request invalid!" });
  }
});

/* website */
export default logoutRouter;
