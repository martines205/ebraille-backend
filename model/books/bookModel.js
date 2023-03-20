import Prisma from "@prisma/client";
import { json } from "express";
const { PrismaClient, PrismaClientKnownRequestError } = Prisma;
const prisma = new PrismaClient();

async function bookCredentialIsSave(credential) {
  try {
    const bookCredential = [credential.titles, credential.isbn];
    console.log("bookCredential: ", bookCredential);
    const result = await prisma.BookInformation.findFirstOrThrow({
      where: {
        OR: [{ titles: credential.titles }, { isbn: credential.isbn }],
      },
    });
    if (result instanceof PrismaClientKnownRequestError) {
      console.log(result);
      throw new Error(result);
    } else {
      console.log(result);
      const errorInCredential = {};
      errorInCredential.errorType = "Credential already exist!";
      errorInCredential.status = false;
      errorInCredential.message = {
        warn: bookCredential.filter((v) => {
          return v === result.titles || v === result.isbn;
        }),
      };
      return errorInCredential;
    }
  } catch (error) {
    console.log(Object.keys(error));
    console.log(error);
    return { status: true, warn: [""] };
  }
}

async function getBookName(categories) {
  const bookCode = "BO" + categories.slice(0, 2).toUpperCase();
  try {
    const result = await prisma.bookInformation.findMany({
      where: {
        booksCode: bookCode,
      },
      orderBy: { id: "desc" },
      take: 1,
    });
    if (result instanceof PrismaClientKnownRequestError) throw new Error(result);
    else {
      return bookCode + "-" + result.id.toString();
    }
  } catch (error) {
    return bookCode + "-" + "1";
  }
}

async function addBookToDb(bookObject) {
  try {
    await prisma.bookInformation
      .create({
        data: bookObject,
      })
      .then(async () => {
        await prisma.$disconnect();
      })
      .catch(async (e) => {
        console.error(e);
        await prisma.$disconnect();
        process.exit(1);
      });
    return { addBookStatus: true, msg: "Penambahan buku berhasil" };
  } catch (error) {
    return {
      adduserStatus: false,
      msg: "Penambahan buku gagal dengan error",
      err: error,
    };
  }
}

async function getBookPath(isbn) {
  // const bookCode = "BO" + category.slice(0, 2).toUpperCase();
  try {
    const result = await prisma.bookInformation.findMany({
      where: { OR: [{ isbn }] },
    });
    if (result instanceof PrismaClientKnownRequestError) throw new Error(result);
    else {
      // console.log(result);
      return { result: true, path: result[0].bookFilePath, errorMsg: "" };
    }
  } catch (error) {
    return { result: false, path: "NaN", errorMsg: "Buku tidak tersedia, silahkan cek kembali code ISBN yang diberikan!" };
  }
}

async function setBookmarkToDb(userId, bookmarkInformation) {
  console.log(JSON.stringify(bookmarkInformation));
  console.log("userId , BookID: ", userId, bookmarkInformation);
  try {
    await prisma.bookmark
      .upsert({ where: { userId: userId }, update: { bookmarkInformation }, create: { userId: userId, bookmarkInformation: bookmarkInformation } })
      .then(async () => {
        await prisma.$disconnect();
      })
      .catch(async (e) => {
        console.error(e);
        await prisma.$disconnect();
        process.exit(1);
      });
    console.log("berhasil");
    return { addBookStatus: true, msg: "Penambahan bookmark berhasil" };
  } catch (error) {
    console.log("gagal");
    return { addBookStatus: false, msg: "Penambahan bookmark gagal", errMsg: error };
  }
}

async function getBookList() {
  try {
    const result = await prisma.bookInformation.findMany({
      select: {
        isbn: true,
        availability: true,
        titles: true,
        languages: true,
        authors: true,
        year: true,
        categorys: true,
        editons: true,
        titles: true,
        id: false,
      },
    });
    if (result instanceof PrismaClientKnownRequestError) throw new Error(result);
    console.log(result);
    return { result: true, data: result };
  } catch (error) {
    return { result: true, data: {} };
  }
}

async function getUserBookmarkInformation(nik) {
  try {
    const result = await prisma.bookmark.findFirst({ where: { userId: nik } });
    console.log(result.bookmarkInformation);
    return { addBookStatus: true, msg: result.bookmarkInformation };
  } catch (error) {
    return { addBookStatus: false, msg: error };
  }
}

export { bookCredentialIsSave, getBookName, addBookToDb, getBookPath, setBookmarkToDb, getUserBookmarkInformation, getBookList };
