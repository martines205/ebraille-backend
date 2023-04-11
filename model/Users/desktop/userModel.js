import Prisma from "@prisma/client";
import crypto from "crypto";
import { RedisClient } from "../../../index.js";

const { PrismaClient, PrismaClientKnownRequestError } = Prisma;
const prisma = new PrismaClient();

async function nikIsValid(nik) {
  try {
    const result = await prisma.userInformation.findFirstOrThrow({
      where: { nik },
    });
    if (result instanceof PrismaClientKnownRequestError) {
      throw new Error(result);
    }
    if (nik === result.nik) {
      return { result: true, msg: `Login dengan NIK sukses`, role: result.role };
    } else throw new Error("NIK tidak terdaftar");
  } catch (error) {
    console.trace(error);
    return { result: false, msg: `NIK tidak terdaftar` };
  }
}

async function checkStatusUserRefreshTokenByNik(nik, token) {
  try {
    const result = await RedisClient.get(nik);
    if (result !== null && token === result) {
      return true;
    }
    const err = new Error();
    throw err;
  } catch (error) {
    try {
      const tokenInformation = await prisma.tokenInformationDesktop.findFirst({
        where: { nik },
      });

      if (tokenInformation !== null) {
        if (token !== undefined && token === tokenInformation.refreshToken) {
          await RedisClient.set(nik, token).catch((error) => {
            console.log("Start caching");
            console.log("nik, token: ", nik, token);
            console.log(Object.keys(error));
            console.log(error);
          });
          return true;
        }
      } else return false;
    } catch (error) {
      console.trace("error", error);
      return false;
    }
  }
}

async function getUserRefreshTokenByNik(nik) {
  const refToken = crypto.randomBytes(25).toString("hex");
  try {
    const result = await prisma.tokenInformationDesktop.upsert({
      where: { nik: nik },
      update: { refreshToken: refToken },
      create: {
        nik: nik.toString(),
        refreshToken: refToken,
      },
    });
    // console.trace(`NIK: ${nik} =>`, { result });
    await RedisClient.set(`${nik}`, refToken);
    // console.log(`RedisClient => ${nik} =>`, await RedisClient.get(nik));
    // console.trace(`RedisClient => ${nik} =>`, await RedisClient.get(nik));
    return refToken;
  } catch (error) {
    console.log("error", error);
    return "";
  }
}

async function deleteUserRefreshTokenByNik(nik) {
  try {
    const statusRefreshToken = await prisma.tokenInformationDesktop.delete({
      where: { nik: nik },
    });
    return true;
  } catch (error) {
    console.trace(`RefreshToken with NIK "${nik}" unavailable!`);
    return false;
  }
}

export { nikIsValid, getRandomArbitrary, getUserRefreshTokenByNik, deleteUserRefreshTokenByNik, checkStatusUserRefreshTokenByNik };

function getRandomArbitrary(min, max) {
  return Math.random() * (max - min) + min;
}
