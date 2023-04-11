import Prisma from "@prisma/client";
import Bcrypt from "bcrypt";
import crypto from "crypto";
import jwt from "jsonwebtoken";
const { JsonWebTokenError, TokenExpiredError } = jwt;
import { RedisClient } from "../../../index.js";

const { PrismaClient, PrismaClientKnownRequestError } = Prisma;
const prisma = new PrismaClient();

const SECRET_KEY = process.env.SECRET_KEY;
const EXPIRED_DATE = process.env.EXPIRED_DATE;

async function userIsValid(username, password) {
  return new Promise(async (resolve, reject) => {
    try {
      const result = await prisma.userInformation.findFirst({
        where: { username: username },
        select: { password: true, role: true },
      });
      if (result === null) return reject({ responseCode: 400, code: 1, message: "Username Salah!" });
      await validatePassword(password, result.password);
      const accessToken = await getUserAccessTokenByUsername(username, result.role);
      return resolve({ message: "Login berhasil!", accessToken });
    } catch (error) {
      if (error.responseCode === 400) return reject(error);
      console.trace("error: ", error);
      return reject({ responseCode: 500, code: 4, message: "Server error!" });
    }
  });
}

async function addNewUser(firstName, lastName, gender, nik, username, email, password) {
  const checkResult = await UniqueCredentialCheck(nik, username, email);
  if (checkResult.isCredentialSafeToAdd === false) return { adduserStatus: false, msg: checkResult.warn };
  else {
    try {
      const hashedPassword = await Bcrypt.hash(password, getRandomArbitrary(9, 15)).then((res) => res);
      await prisma.userInformation
        .create({ data: { firstName, lastName, gender, nik, username, email, password: hashedPassword } })
        .then(async () => {
          await prisma.$disconnect();
        })
        .catch(async (e) => {
          console.error(e);
          await prisma.$disconnect();
          process.exit(1);
        });
      return { Status: true, msg: "Registarasi berhasil" };
    } catch (error) {
      console.trace("error: ", error.message);
      return {
        Status: false,
        msg: "Registarasi gagal dengan error",
        err: error,
      };
    }
  }
}

async function getRoleWithUsername(username) {
  return await new Promise(async (resolve, reject) => {
    try {
      const result = await prisma.userInformation.findFirst({
        // check username on DB
        where: { username: username },
        select: { username: true, role: true },
      });
      if (result === null) return reject({ responseCode: 400, message: "username invalid" });
      return resolve({ role: result.role });
    } catch (error) {
      console.trace("error: ", error);
      return reject({ responseCode: 500, msg: "Server error" });
    }
  });
}

async function deleteUserRefreshTokenByUsername(username) {
  try {
    await prisma.tokenInformationWebsite.delete({
      where: { username },
    });
    RedisClient.getDel(username);
    return true;
  } catch (error) {
    // console.trace("error: ", error);
    // console.trace({ message: `RefreshToken with username "${username}" unavailable!` });
    return false;
  }
}

async function RefreshTokenIsValid(username, token) {
  // console.log("username, token: ", username, token);
  return await new Promise(async (resolve, reject) => {
    try {
      const cacheResult = await checkInCache(username);
      if (cacheResult instanceof Error) throw cacheResult;
      if (token === cacheResult) return resolve(true); // checking the Token is valid with the cache
      else return reject({ responseCode: 400, message: "Token invalid" });
    } catch (error) {
      console.trace(error);
      try {
        const tokenStatusOnDBb = await prisma.tokenInformationWebsite.findFirst({
          where: { username },
          select: { refreshToken: true },
        });
        if (tokenStatusOnDBb === null) return reject({ responseCode: 400, message: "Silahkan login terlebih dahulu" });
        await RedisClient.set(username, tokenStatusOnDBb.refreshToken).catch((error) => reject({ responseCode: 500, message: "Server error!" }));
        return resolve(true);
      } catch (error) {
        console.trace({ error });
        return reject({ responseCode: 500, message: "Server Error!" });
      }
    }
  });
}

async function accessTokenIsExpired(accessToken) {
  return await new Promise(async (resolve, reject) => {
    try {
      await checkJwt(accessToken);
    } catch (error) {
      // console.trace(error);
      return reject(error);
    }
  });
}

async function checkStatusUserRefreshToken(username) {
  return await new Promise(async (resolve, reject) => {
    try {
      const cacheResult = await checkInCache(username);
      if (cacheResult instanceof Error) throw cacheResult;
      // console.trace(`Found in cache: ${username} => `, cacheResult);
      return resolve({ status: true, message: "Token is available in cache" });
    } catch (error) {
      console.trace({ error: error.message });
      try {
        const result = await prisma.tokenInformationWebsite.findFirst({
          where: { username },
          select: { refreshToken: true },
        });
        if (result === null) return resolve({ status: false, message: "Token is unavailable in system" });
        await RedisClient.set(username, result.refreshToken).catch((error) => {
          console.trace({ error });
          throw { responseCode: 500 };
        });
        // console.log("Caching");
        // console.log("username, token: ", username, result.refreshToken);
        return resolve({ status: true, message: "Token is available in db" });
      } catch (error) {
        console.trace({ error });
        return reject({ responseCode: 500, message: "Server error!" });
      }
    }
  });
}

async function getUserRefreshTokenByUsername(username) {
  const refToken = crypto.randomBytes(25).toString("hex");
  return await new Promise(async (resolve, reject) => {
    try {
      await prisma.tokenInformationWebsite.upsert({
        where: { username: username },
        update: { refreshToken: refToken },
        create: {
          username: username,
          refreshToken: refToken,
        },
      });
      await RedisClient.set(`${username}`, refToken);
      // console.trace({
      //   message: `set to RedisClient => ${username} => ${await RedisClient.get(username)}`,
      // });
      return resolve(refToken);
    } catch (error) {
      console.trace({ error });
      return reject({ responseCode: 500, code: 4, message: "Server error!" });
    }
  });
}

async function getUserAccessTokenByUsername(username, role) {
  const iat = Math.floor(Date.now() / 1000);
  return new Promise((resolve, reject) => {
    try {
      jwt.sign({ username: username, role: role, iat }, SECRET_KEY, { algorithm: "HS256", expiresIn: EXPIRED_DATE }, async function (err, token) {
        if (err !== null) throw err;
        return resolve(token);
      });
    } catch (error) {
      console.trace(error);
      return reject({ responseCode: 500 });
    }
  });
}

export {
  accessTokenIsExpired,
  userIsValid,
  addNewUser,
  RefreshTokenIsValid,
  getRoleWithUsername,
  checkStatusUserRefreshToken,
  getRandomArbitrary,
  deleteUserRefreshTokenByUsername,
  getUserRefreshTokenByUsername,
  getUserAccessTokenByUsername,
};

/////////////

async function validatePassword(password, dbPassword) {
  return await new Promise(async (resolve, reject) => {
    const result = await Bcrypt.compare(password, dbPassword);
    if (result) {
      return resolve(true);
    } else return reject({ responseCode: 400, code: 2, message: "Password salah!" });
  });
}

function getRandomArbitrary(min, max) {
  return Math.random() * (max - min) + min;
}

async function UniqueCredentialCheck(nik, username, email) {
  try {
    const userCredential = [nik, username, email];
    const result = await prisma.userInformation.findFirstOrThrow({
      where: { OR: [{ nik }, { username }, { email }] },
    });
    if (result instanceof PrismaClientKnownRequestError) {
      throw new Error(result);
    } else {
      // console.log(userCredential, result);
      return {
        isCredentialSafeToAdd: false,
        warn: userCredential.map((v) => {
          if (v === result.nik || v === result.username || v === result.email) return v;
        }),
      };
    }
  } catch (error) {
    return { isCredentialSafeToAdd: true, warn: [""] };
  }
}

async function checkInCache(key) {
  const result = await RedisClient.get(key);
  if (result !== null) return result;
  return new Error(`key ${key} not found in Redis cache. Miss cache may happen!, try to validate key '${key}' with data on DB`);
}

async function checkJwt(accessToken) {
  return await new Promise((resolve, reject) => {
    jwt.verify(accessToken, SECRET_KEY, { algorithm: "HS256" }, async (error, decoded) => {
      if (decoded !== undefined) return reject({ responseCode: 400, message: "Token Masih Valid" });
      if (error instanceof TokenExpiredError) {
        return resolve(true);
      } else if (error instanceof JsonWebTokenError) {
        return reject({ responseCode: 400, message: error.message });
      } else {
        console.trace("error: ", error);
        return reject({ responseCode: 500, message: "Server error" });
      }
    });
  });
}
