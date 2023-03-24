import Prisma from "@prisma/client";
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

      console.log(dataList);
      const errorInCredential = {};
      errorInCredential.status = false;
      errorInCredential.errorType = dataList;
      errorInCredential.warn = bookCredential.filter((v) => {
        return v === result.titles || v === result.isbn;
      });
      return errorInCredential;
    }
  } catch (error) {
    console.log(Object.keys(error));
    error.errorType = "";
    console.log(error.name);
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
        console.error(e);
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
  console.log(JSON.stringify(bookmarkInformation));
  console.log("userId , BookID: ", userId, bookmarkInformation);
  try {
    await prisma.bookmark.upsert({ where: { userId: userId }, update: { bookmarkInformation }, create: { userId: userId, bookmarkInformation: bookmarkInformation } }).then(async () => {
      await prisma.$disconnect();
    });
    console.log("berhasil");
    return { addBookStatus: true, msg: "Penambahan bookmark berhasil" };
  } catch (error) {
    console.error(error);
    console.log("gagal");
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
    console.log("result get book: ", result);
    return { result: true, data: result };
  } catch (error) {
    console.log("error: ", error);
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

async function getBookCoverPath(isbn) {
  try {
    const result = await prisma.bookInformation.findMany({
      where: { isbn },
    });
    if (result instanceof PrismaClientKnownRequestError) throw new Error(result);
    else {
      return { result: true, path: result[0].bookCoverFilePath, errorMsg: "" };
    }
  } catch (error) {
    console.log(error);
    return { result: false, path: "NaN", errorMsg: "Cover tidak tersedia, silahkan cek kembali code ISBN yang diberikan!" };
  }
}

export { bookCredentialIsSave, getBookName, addBookToDb, getBookPath, setBookmarkToDb, getUserBookmarkInformation, getBookList, getBookCoverPath };
