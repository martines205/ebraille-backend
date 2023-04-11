import { isEmpty } from "../../lib/ObjectChecker.js";
import { checkStatusUserRefreshToken, deleteUserRefreshTokenByUsername } from "../../model/Users/website/userModel.js";

export async function validateLoginRequestField(req, res, next) {
  if (isEmpty(req.query)) return res.status(404).send({ status: false, message: "Request invalid" });
  if (!req.query.hasOwnProperty("username") || !req.query.hasOwnProperty("password")) return res.status(400).send({ status: false, code: 4, message: "Request invalid" });
  const { username, password } = req.query;
  if (username === "" && password === "") return res.status(400).send({ status: false, code: 3, message: "Username dan Password tidak boleh kosong!" });
  if (username === "") return res.status(400).send({ status: false, code: 1, message: "Username tidak boleh kosong!" });
  if (password === "") return res.status(400).send({ status: false, code: 2, message: "Password tidak boleh kosong!" });
  next();
}

export async function validateUserNotHaveToken(req, res, next) {
  const { username } = req.query;
  try {
    const { status } = await checkStatusUserRefreshToken(username);
    // console.trace("tokenStatusIsPresent", status);
    if (status) {
      await deleteUserRefreshTokenByUsername(username);
      // return res.status(400).send({ status: false, code: 4, message: "User telah login!" });
    }
    next();
  } catch (error) {
    return res.status(error.code ? error.code : 500).send({ status: false, error: error.message });
  }
}
