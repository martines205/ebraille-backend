import { PrismaClient } from "@prisma/client";
import Bcrypt from "bcrypt";
import { getRandomArbitrary } from "../model/Users/userAuthentication.js";
const prisma = new PrismaClient();
async function main() {
  const Martin = await prisma.userInformation.upsert({
    where: { id: 1 },
    update: {},
    create: {
      firstName: "Martin",
      lastName: "Butar Butar",
      role: "ADMIN",
      gender: 0,
      nik: "2301897592",
      username: "martines205",
      email: "martinesbutar205@gmail.com",
      password: await Bcrypt.hash("ebraille123", getRandomArbitrary(9, 15)).then((res) => res),
    },
  });
  console.log({ Martin });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
