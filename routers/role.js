import jwt from "jsonwebtoken";
import express from "express";
import { validateTokenWebsite } from "../Middleware/website/checkRequestAuth.js";
const RoleRouter = express.Router();
const SECRET_KEY = process.env.SECRET_KEY;

/* website */

RoleRouter.get("/getRole", [validateTokenWebsite], async (req, res, next) => {
  jwt.verify(req.query.accessToken, SECRET_KEY, { algorithm: "HS256" }, async (error, decoded) => {
    console.log("decoded: ", decoded);
    if (decoded !== undefined) return res.status(200).send({ status: true, role: decoded.role });
    if (error instanceof JsonWebTokenError) {
      return res.status(400).send({ status: false, message: error.message });
    } else {
      console.trace("error: ", error);
      return res.status(500).send({ status: false, message: "Server error" });
    }
  });
});

export default RoleRouter;
