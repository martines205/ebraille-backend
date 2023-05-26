import Prisma from "@prisma/client";
import { unlink } from "fs/promises";

const { PrismaClient, PrismaClientKnownRequestError } = Prisma;
const prisma = new PrismaClient();

async function bookCredentialIsSave(credential) {
  try {
    const bookCredential = [credential.TITLE, credential.ISBN];
    // console.trace("bookCredential: ", bookCredential);
    const result = await prisma.BookInformation.findFirstOrThrow({
      where: {
        OR: [{ titles: credential.TITLE }, { isbn: credential.ISBN }],
      },
    });
    if (result instanceof PrismaClientKnownRequestError) {
      throw new Error(result);
    } else {
      let dataIsExistRaw = bookCredential
        .map((v) => {
          if (v === result.titles) {
            return "titles";
          } else if (v === result.isbn) {
            return "isbn";
          }
        })
        .toString()
        .split(",")
        .filter((v) => v !== "");
      const dataList = `data ${
        dataIsExistRaw.length === 1
          ? dataIsExistRaw.at(0) + " telah terdaftar pada sistem !"
          : dataIsExistRaw.slice(0, dataIsExistRaw.length - 1) + " dan " + dataIsExistRaw.at(-1) + " telah terdaftar pada sistem !"
      }`;
      const errorInCredential = {};
      errorInCredential.status = false;
      errorInCredential.errorType = dataList;
      errorInCredential.warn = bookCredential.filter((v) => {
        return v === result.titles || v === result.isbn;
      });
      return errorInCredential;
    }
  } catch (error) {
    // console.log(Object.keys(error));
    // console.log(error.name);
    error.errorType = "";
    return { status: true, errorType: "", warn: [""] };
  }
}

async function getBookName(categories) {
  const bookCode = "BO" + categories.slice(0, 2).toUpperCase();
  // console.log("bookCode: ", bookCode);
  try {
    const result = await prisma.bookInformation.findMany({
      where: {
        booksCode: bookCode,
      },
      orderBy: { id: "desc" },
      take: 1,
    });
    // console.log(result);
    console.log("result.lengthresult.length: ", result.length);
    if (result instanceof PrismaClientKnownRequestError) throw new Error(result);
    else {
      return bookCode + "-" + (result[0].id + BigInt(1)).toString();
    }
  } catch (error) {
    console.log(error);
    return bookCode + "-" + "1";
  }
}

async function addBookToDb(bookObject) {
  try {
    await prisma.bookInformation
      .create({
        data: {
          authors: bookObject.AUTHOR,
          editions: bookObject.EDITION,
          titles: bookObject.TITLE,
          publishers: bookObject.PUBLISHER,
          isbn: bookObject.ISBN,
          year: bookObject.YEAR,
          booksCode: bookObject.booksCode,
          bookCoverFilePath: bookObject.bookCoverFilePath,
          bookFilePath: bookObject.bookFilePath,
          availability: bookObject.AVAILABILITY,
          maxBook: parseInt(bookObject.AVAILABILITY),
          uploader: bookObject.UPLOADER,
          categories: bookObject.CATEGORY.toUpperCase(),
          languages: bookObject.LANGUAGE.toUpperCase().slice(0, 3),
        },
      })
      .then(async () => {
        await prisma.$disconnect();
      })
      .catch(async (e) => {
        console.trace(e);
        await prisma.$disconnect();
        process.exit(1);
      });
    return { Status: true, msg: "Penambahan buku berhasil", err: "" };
  } catch (error) {
    return {
      Status: false,
      msg: "Penambahan buku gagal dengan error",
      err: error,
    };
  }
}

export async function editBookInformationOnDB(bookObject) {
  const { ISBN } = bookObject;
  console.log("isbn: ", ISBN);
  console.log("bookObject: ", bookObject);
  try {
    const { bookFilePath, bookCoverFilePath, id } = await prisma.bookInformation.findFirstOrThrow({ where: { isbn: ISBN } });
    await prisma.bookInformation.update({
      where: { id },
      data: {
        titles: bookObject.TITLE,
        authors: bookObject.AUTHOR,
        editions: bookObject.EDITION,
        isbn: bookObject.ISBN,
        year: bookObject.YEAR,
        availability: bookObject.AVAILABILITY,
        maxBook: parseInt(bookObject.AVAILABILITY),
        publishers: bookObject.PUBLISHER,
        categories: bookObject.CATEGORY.toUpperCase(),
        languages: bookObject.LANGUAGE.toUpperCase().slice(0, 3),
      },
    });
    await prisma.$disconnect();
    console.log("bookFilePath, bookCoverFilePath: ", bookFilePath, bookCoverFilePath);
    return { bookFilePath, bookCoverFilePath };
  } catch (error) {
    console.trace("error: ", error);
    return new Error({
      Status: false,
      msg: "Server error",
      err: error.message,
    });
  }
  // const queryResult = await prisma.bookInformation.findFirst({ where: { isbn: ISBN } });
}

export async function removeBookFromDB(ISBN) {
  try {
    const queryResult = await prisma.bookInformation.findFirst({ where: { isbn: { equals: ISBN } } });
    console.log("ISBN: ", ISBN);
    if (queryResult === null) throw new Error("Book not found!");
    const { id, titles, bookCoverFilePath, bookFilePath } = queryResult;
    console.log("id: ", id);
    const result = await prisma.bookInformation.delete({ where: { id } });
    console.log("result: ", result);
    await prisma.$disconnect();
    await unlink(bookCoverFilePath);
    await unlink(bookFilePath);
    return { Status: true, msg: `Buku dengan judul "${titles}" berhasil di hapus!` };
  } catch (error) {
    console.trace("error:", error.message);
    await prisma.$disconnect();
    return {
      Status: false,
      msg: "Penghapusan buku gagal!",
      err: error.message,
    };
  }
}

async function getBookPath(isbn) {
  try {
    const result = await prisma.bookInformation.findMany({
      where: { isbn: { equals: isbn } },
    });
    // console.log("result: ", result);
    if (result instanceof PrismaClientKnownRequestError) throw new Error(result);
    if (parseInt(result[0].availability) === 0) throw new Error("0");
    else {
      const newAvailability = (parseInt(result[0].availability) - 1).toString();
      // console.log("newAvailability: ", newAvailability);
      await prisma.bookInformation.update({ where: { isbn }, data: { availability: newAvailability } });
      return { result: true, path: result[0].bookFilePath, errorMsg: "" };
    }
  } catch (error) {
    console.trace("error: ", error);
    if (error.message === "0") return { result: false, path: "NaN", errorMsg: "Maaf, Ketersediaan Buku sudah Habis, mohon coba lagi setelah beberapa saat!" };
    return { result: false, path: "NaN", errorMsg: "Buku tidak tersedia, silahkan cek kembali code ISBN yang diberikan!" };
  }
}

export async function updateAvailability(isbn) {
  try {
    const result = await prisma.bookInformation.findMany({
      where: { isbn: { equals: isbn } },
    });
    if (result instanceof PrismaClientKnownRequestError || result.length === 0) throw new Error(result);
    else {
      console.log("result: ", result);
      if (parseInt(result[0].availability) >= parseInt(result[0].maxBook)) return { result: false, path: "NaN", errorMsg: "Ketersedian buku sudah Maksimal" };
      const newAvailability = (parseInt(result[0].availability) + 1).toString();
      console.log("newAvailability: ", newAvailability);
      await prisma.bookInformation.update({ where: { isbn }, data: { availability: newAvailability } });
      return { result: true, message: "Update ketersediaan buku berhasil!" };
    }
  } catch (error) {
    console.log("error: ", error);
    return { result: false, path: "NaN", errorMsg: "Buku tidak tersedia, silahkan cek kembali code ISBN yang diberikan!" };
  }
}

async function setBookmarkToDb(userId, bookmarkInformation) {
  try {
    console.log("userId, bookmarkInformation: ", userId, bookmarkInformation);
    await prisma.bookmark.upsert({ where: { userId: userId }, update: { bookmarkInformation }, create: { userId: userId, bookmarkInformation: bookmarkInformation } }).then(async () => {
      await prisma.$disconnect();
    });
    return { addBookStatus: true, msg: "Penambahan bookmark berhasil" };
  } catch (error) {
    console.trace("status: ", "Gagal");
    console.trace("error: ", error);
    await prisma.$disconnect();
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
        categories: true,
        editions: true,
        publishers: true,
        id: false,
      },
    });
    if (result instanceof PrismaClientKnownRequestError) throw new Error(result);
    return { result: true, data: result };
  } catch (error) {
    console.trace("error:", error.message);
    return { result: true, data: {} };
  }
}

export async function getBookListByTitle(title) {
  try {
    let preProcessTitle;
    if (title.split(" ").length === 2) {
      preProcessTitle = title.split(" ").at(0);
    } else preProcessTitle = title.split(" ").join(" & ");
    const result = await prisma.bookInformation.findMany({
      select: {
        isbn: true,
        availability: true,
        titles: true,
        languages: true,
        authors: true,
        year: true,
        categories: true,
        editions: true,
        publishers: true,
        id: false,
      },
      where: { titles: { search: preProcessTitle } },
    });
    if (result instanceof PrismaClientKnownRequestError) throw new Error(result);
    return { result: true, data: result };
  } catch (error) {
    console.trace("error: ", error.message);
    return { result: true, data: {} };
  }
}

async function getUserBookmarkInformation(nik) {
  try {
    const result = await prisma.bookmark.findFirst({ where: { userId: nik } });
    if (result === null) return { msg: [] };
    return { msg: result.bookmarkInformation };
  } catch (error) {
    console.trace("error: ", error);
    return { addBookStatus: false, msg: error };
  }
}

async function getBookCoverPath(isbn) {
  try {
    const isbnTarget = isbn.toString();
    const result = await prisma.bookInformation.findMany({
      where: { isbn: isbnTarget },
    });
    if (result instanceof PrismaClientKnownRequestError) throw new Error(result);
    else if (result.length === 0) return new Error("Cover tidak tersedia, silahkan cek kembali code ISBN yang diberikan!");
    else {
      return { result: true, path: result[0].bookCoverFilePath, errorMsg: "" };
    }
  } catch (error) {
    console.trace("error: ", error);
    error.code = 500;
    error.message = "server Error";
    return error;
  }
}

async function getBookIsbnList() {
  try {
    const listFieldIsbn = await prisma.bookInformation.findMany({
      select: {
        isbn: true,
        titles: true,
      },
    });
    if (listFieldIsbn instanceof PrismaClientKnownRequestError) throw new Error(result);
    const IsbnList = {};
    listFieldIsbn.map((object) => {
      IsbnList[`${object.isbn}`] = object.titles;
    });
    return IsbnList;
  } catch (error) {
    console.trace("error: ", error);
    return new Error("Server Error!");
  }
}

export { bookCredentialIsSave, getBookName, addBookToDb, getBookPath, setBookmarkToDb, getUserBookmarkInformation, getBookList, getBookCoverPath, getBookIsbnList };
