import jwt from "jsonwebtoken";
import express from "express";
import { validateTokenWebsite } from "../Middleware/website/checkRequestAuth.js";
import { getAllUserRole, setNewRole } from "../model/Users/website/userModel.js";
import bodyParser from "body-parser";
const SECRET_KEY = process.env.SECRET_KEY;
const jsonParser = bodyParser.json();
const urlencoded = bodyParser.urlencoded({ extended: true });
const RoleRouter = express.Router();

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

RoleRouter.patch("/editRole", [urlencoded, jsonParser], async (req, res, next) => {
  console.log(req.body);
  const result = await setNewRole(req.body);
  console.log("result: ", result);
  return res.status(200).send({ status: true, message: result });

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

RoleRouter.get("/getAllUserRole", [validateTokenWebsite], async (req, res, next) => {
  jwt.verify(req.query.accessToken, SECRET_KEY, { algorithm: "HS256" }, async (error, decoded) => {
    if (decoded !== undefined) {
      // console.log("decoded: ", decoded);
      const { role } = decoded;
      if (role !== "ADMIN") return res.status(400).send({ status: false, message: "Request not Allowed" });
      const { result } = await getAllUserRole();
      // console.log("result: ", result);
      return res.status(200).send({ status: true, message: result });
    }
    if (error instanceof JsonWebTokenError) {
      return res.status(400).send({ status: false, message: error.message });
    } else {
      console.trace("error: ", error);
      return res.status(500).send({ status: false, message: "Server error" });
    }
  });
});

export default RoleRouter;
