import Prisma from "@prisma/client";
import Bcrypt from "bcrypt";
import crypto from "crypto";
import { RedisClient } from "../../index.js";

const { PrismaClient, PrismaClientKnownRequestError } = Prisma;
const prisma = new PrismaClient();

async function userIsValid(username, password) {
  try {
    const result = await prisma.userInformation.findFirstOrThrow({
      where: { username: username },
    });
    if (result instanceof PrismaClientKnownRequestError) throw new Error(result);
    if (validatePassword(password, result.password)) {
      return { result: true, msg: "Login berhasil" };
    } else return { result: false, msg: "Password salah" };
  } catch (error) {
    console.log(error.code);
    return { result: false, msg: "Username salah" };
  }
}
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
    } else return { result: false, msg: `NIK tidak terdaftar` };
  } catch (error) {
    console.log(error.code);
    return { result: false, msg: `NIK tidak terdaftar` };
  }
}

async function addNewUser(firstName, lastName, gender, nik, username, email, password) {
  const checkResult = await UniqeCredentialCheck(nik, username, email);
  if (checkResult.isCredentialSafeToAdd === false) return { adduserStatus: false, msg: checkResult.warn };
  else {
    try {
      const hashedPassword = await Bcrypt.hash(password, getRandomArbitrary(9, 15)).then((res) => res);
      await prismaMain(firstName, lastName, gender, nik, username, email, hashedPassword)
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
      return {
        Status: false,
        msg: "Registarasi gagal dengan error",
        err: error,
      };
    }
  }
}

async function checkStatusUserRefreshToken(nik, token) {
  try {
    const result = await RedisClient.get(nik);
    if (result !== null && token === result) {
      // console.log(`Found: ${nik} => `, result);
      // console.trace(`Found: ${nik} => `, result);
      return true;
    }
    const err = new Error();
    throw err;
  } catch (error) {
    try {
      const tokenInformation = await prisma.tokenInformation.findFirst({
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
      console.log("error", error);
      return false;
    }
  }
}

async function getUserRefreshToken(nik) {
  const refToken = crypto.randomBytes(25).toString("hex");
  try {
    const result = await prisma.tokenInformation.upsert({
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
    console.log(error);
    return "";
  }
}

async function deleteUserRefreshToken(nik) {
  try {
    const statusRefreshToken = await prisma.tokenInformation.delete({
      where: { nik: nik },
    });
    // console.log(`NIK: ${nik} =>`, { statusRefreshToken }, "=> deleted~!");
    return true;
  } catch (error) {
    console.log(`RefreshToken with NIK "${nik}" unavailable!`);
    return false;
  }
}

export { userIsValid, nikIsValid, addNewUser, getRandomArbitrary, getUserRefreshToken, deleteUserRefreshToken, checkStatusUserRefreshToken };

function validatePassword(password, dbPassword) {
  return Bcrypt.compareSync(password, dbPassword);
}
async function prismaMain(firstName, lastName, gender, nik, username, email, password) {
  await prisma.userInformation.create({
    data: { firstName, lastName, gender, nik, username, email, password },
  });
}

function getRandomArbitrary(min, max) {
  return Math.random() * (max - min) + min;
}

async function UniqeCredentialCheck(nik, username, email) {
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
