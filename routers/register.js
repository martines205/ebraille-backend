import { addNewUser } from "../model/Users/website/userModel.js";
import bodyParser from "body-parser";
import express from "express";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const registerRouter = express.Router();
const jsonParser = bodyParser.json();
const urlencoded = bodyParser.urlencoded({ extended: false });

registerRouter.post("/", [urlencoded, jsonParser], async (req, res) => {
  console.log("req.body: ", req.body);
  const { FirstName, LastName, NIK, Gender, Username, Email, Password } = req.body;
  const result = await addNewUser(FirstName, LastName, Gender, NIK, Username, Email, Password);
  console.log("result: ", result);
  // return res.status(200).send({ msg: "testing" });

  // console.trace("result.Status: ", result.Status);
  return result.Status === 200
    ? res.status(result.Status).send({ msg: result.msg })
    : res.status(result.Status).send({
        msg: `Resistrasi gagal, data ${result.msg.toString()} sudah terdaftar`,
        error: { NIK: result.msg[0], Username: result.msg[1], Email: result.msg[2] },
      });
});

export default registerRouter;
