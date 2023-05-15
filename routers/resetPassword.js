import express from "express";
import bodyParser from "body-parser";
import { ValidateUserInformation, setNewPassword } from "../model/Users/website/userModel.js";
import { RedisClient } from "../index.js";
const forgetPassword = express.Router();
const jsonParser = bodyParser.json();
const urlencoded = bodyParser.urlencoded({ extended: true });

/* website */

forgetPassword.get("/checkDataInformation", async (req, res) => {
  console.log("req.query: ", req.query);
  const reqData = { ...req.query };
  if (!(Object.keys(reqData).includes("Username") && Object.keys(reqData).includes("Email") && Object.keys(reqData).includes("NIK")))
    return res.status(200).send({ status: false, message: "Request Invalid" });
  const { Username, Email, NIK } = reqData;
  try {
    const result = await ValidateUserInformation(Username, Email, NIK);
    console.log("result: ", result);
    return res.status(200).send(result);
  } catch (error) {
    console.log("error: ", error);
    return res.status(400).send({ status: false, message: error.message });
    // return res.status(400).send({status:false,message:error});
  }
});

forgetPassword.put("/resetPassword", [urlencoded, jsonParser], async (req, res) => {
  console.log("req.query: ", req.body);
  const reqData = { ...req.body };
  if (Object.values(reqData).includes("")) return res.status(400).send({ status: false, message: "Request Invalid" });
  if (!(Object.keys(reqData).includes("newPassword") && Object.keys(reqData).includes("resetPasswordRequestID") && Object.keys(reqData).includes("Username")))
    return res.status(400).send({ status: false, message: "Request Invalid" });
  const { Username, resetPasswordRequestID, newPassword } = reqData;
  const result = await RedisClient.getDel(`resetPasswordRequestID_${Username}`);
  if (!result) return res.status(400).send({ status: false, message: "Request id not valid" });
  if (result !== resetPasswordRequestID.toString()) return res.status(400).send({ status: false, message: "Request id already expired!" });
  try {
    const response = await setNewPassword(Username, newPassword);
    console.log("response: ", response.message);
    return res.status(200).send({ status: true, message: response.message });
  } catch (error) {
    return res.status(error.responseCode).send({ status: true, message: error.message });
  }
});

export default forgetPassword;
