import Prisma from "@prisma/client";
const { PrismaClient, PrismaClientKnownRequestError } = Prisma;
const prisma = new PrismaClient();

async function bookCredentialIsSave(credential) {
  try {
    const bookCredential = [credential.titles, credential.isbn];
    // console.trace("bookCredential: ", bookCredential);
    const result = await prisma.BookInformation.findFirstOrThrow({
      where: {
        OR: [{ titles: credential.titles }, { isbn: credential.isbn }],
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
        data: bookObject,
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
  try {
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
        titles: true,
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
        titles: true,
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
