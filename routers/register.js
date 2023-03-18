import { addNewUser } from "../model/Users/userAuthentication.js";
import bodyParser from "body-parser";
import express from "express";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const registerRouter = express.Router();
const jsonParser = bodyParser.json();
const urlencoded = bodyParser.urlencoded({ extended: false });

registerRouter.post("/", [urlencoded, jsonParser], async (req, res) => {
  const firstName = req.body.firstName;
  const lastName = req.body.lastName;
  const gender = parseInt(req.body.gender);
  const nik = req.body.nik;
  const username = req.body.username;
  const email = req.body.email;
  const password = req.body.password;
  const result = await addNewUser(
    firstName,
    lastName,
    gender,
    nik,
    username,
    email,
    password
  );

  console.log("result.adduserStatus: ", result.adduserStatus);
  result.adduserStatus
    ? res.send({ msg: result.msg })
    : res.send({
        msg: `Resistrasi gagal, data ${result.msg.toString()} sudah terdaftar`,
        error: result.err ? result.err : "",
      });
});

export default registerRouter;
