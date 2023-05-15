import jwt from "jsonwebtoken";
const { JsonWebTokenError, TokenExpiredError } = jwt;
import { isEmpty } from "../../lib/ObjectChecker.js";
import { RefreshTokenIsValid } from "../../model/Users/website/userModel.js";

const SECRET_KEY = process.env.SECRET_KEY;

export async function validateTokenWebsite(req, res, next) {
  // console.log("JSON.stringify(req.body): ", JSON.stringify(req.body));
  const requestBody = JSON.stringify(req.body) === undefined ? {} : JSON.parse(JSON.stringify(req.body));
  const accessToken = isEmpty(requestBody) ? req.query.accessToken : requestBody.accessToken;
  const refreshToken = isEmpty(requestBody) ? req.query.refreshToken : requestBody.refreshToken;
  if (accessToken === undefined || refreshToken === undefined) return res.status(404).send({ status: false, error: "Request invalid" });
  try {
    const { username } = await jwtOnPromise(accessToken, refreshToken);
    await RefreshTokenIsValid(username, refreshToken);
    return next();
  } catch (error) {
    return res.status(error.responseCode).send({ status: false, message: error.message });
  }
}

async function jwtOnPromise(accessToken) {
  return new Promise((resolve, reject) => {
    jwt.verify(accessToken, SECRET_KEY, { algorithm: "HS256" }, async (error, decoded) => {
      if (decoded !== undefined) return resolve({ username: decoded.username });
      if (error instanceof TokenExpiredError) {
        return reject({ responseCode: 400, message: error.message });
      } else if (error instanceof JsonWebTokenError) {
        return reject({ responseCode: 400, message: error.message });
      } else {
        console.trace("error: ", error);
        return reject({ responseCode: 500, message: "Server error" });
      }
    });
  });
}
