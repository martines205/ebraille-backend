import { deleteUserRefreshToken } from "../model/Users/userAuthentication.js";
import express from "express";
const logoutRouter = express.Router();
import { RedisClient } from "../index.js";

logoutRouter.get("/", async (req, res) => {
  const nik = req.query.nik;
  const result = await deleteUserRefreshToken(nik);
  if (result) RedisClient.getDel(nik);
  result ? res.status(200).send({ logoutStatus: true, msg: "Logout berhasil!" }) : res.status(400).send({ logoutStatus: false, error: "Akun telah terlogout!" });
});
export default logoutRouter;
