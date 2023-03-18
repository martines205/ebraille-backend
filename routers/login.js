import { userIsValid, nikIsValid } from "../model/Users/userAuthentication.js";
import { getUserBookmarkInformation } from "../model/books/bookModel.js";
import express from "express";
const loginRouter = express.Router();

loginRouter.get("/", async (req, res) => {
  const username = req.query.username;
  const password = req.query.password;
  const result = await userIsValid(username, password);
  console.log(result);
  result.result ? res.send({ loginStatus: result.result, msg: result.msg }) : res.send({ loginStatus: result.result, msg: result.msg });
});
loginRouter.get("/byNIK", async (req, res) => {
  const nik = req.query.nik;
  console.log(req.query);
  const loginStatus = await nikIsValid(nik);
  console.log("loginStatus", loginStatus);
  const bookmark = await getUserBookmarkInformation(nik);
  loginStatus.result
    ? res.send({ loginStatus: loginStatus.result, msg: loginStatus.msg, accessToken: "po**hub.com", bookmarkList: bookmark })
    : res.send({ loginStatus: loginStatus.result, msg: loginStatus.msg, accessToken: "" });
});

export default loginRouter;
