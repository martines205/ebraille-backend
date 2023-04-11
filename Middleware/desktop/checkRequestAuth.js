import { checkStatusUserRefreshTokenByNik } from "../../model/Users/desktop/userModel.js";
import jwt from "jsonwebtoken";
import { isEmpty } from "../../lib/ObjectChecker.js";

const SECRET_KEY = process.env.SECRET_KEY;

export async function validateToken(req, res, next) {
  const requestBody = JSON.parse(JSON.stringify(req.body));
  const accessToken = isEmpty(requestBody) ? req.query.accessToken : requestBody.accessToken;
  const refreshToken = isEmpty(requestBody) ? req.query.refreshToken : requestBody.refreshToken;
  if (accessToken === undefined || refreshToken === undefined) return res.status(404).send({ status: false, error: "Request invalid" });

  try {
    await jwtOnPromise(accessToken, refreshToken);
    return next();
  } catch (error) {
    const errorData = JSON.parse(error.message);
    return res.status(errorData.code).send({ status: errorData.status, error: errorData.msg });
  }
}

async function jwtOnPromise(accessToken, refreshToken) {
  return new Promise((resolve, reject) => {
    jwt.verify(accessToken, SECRET_KEY, { algorithm: "HS256" }, async (err, decoded) => {
      if (err) {
        const error = new Error(JSON.stringify({ code: 404, status: false, msg: err.message }));
        reject(error);
      } else {
        const result = await checkStatusUserRefreshTokenByNik(decoded.NIK, refreshToken);
        if (!result) {
          const error = new Error(JSON.stringify({ code: 404, status: false, msg: "Silahkan login terlebih dahulu" }));
          reject(error);
        }
        resolve("Ok");
      }
    });
  });
}
