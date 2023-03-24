/*
...

/book/uploadBook POST ok
/book/getBook GET ok
/book/addBookmark POST ok
/book/addBook POST ok

/book/deletBook DELETE
/book/editBook ~
...
*/

import statPath from "path";

import express, { response } from "express";
const bookRouter = express.Router();

const BookDir = "./bookDir";
const tempUpload = "./uploads";
import multer from "multer";
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = currentId;
    if (file.fieldname === "bookFile") {
      cb(null, uniqueSuffix + ".txt");
    } else {
      const ext = file.mimetype.split("/");
      cb(null, uniqueSuffix + "." + ext[1]);
    }
  },
});
const upload = multer({
  storage: storage,
  fileFilter: async (req, file, cb) => {
    try {
      await access(tempUpload, constants.R_OK | constants.W_OK);
    } catch {
      try {
        await mkdir(tempUpload, {
          recursive: true,
        });
      } catch (err) {}
    }
    const isbn = req.body.isbn;
    if (isbn === "" || isbn === undefined) return cb(null, false);
    return cb(null, true);
  },
});

import bodyParser from "body-parser";
const jsonParser = bodyParser.json();
const urlencoded = bodyParser.urlencoded({ extended: false });
const cpUpload = upload.fields([{ name: "bookFile" }, { name: "bookCoverFile" }]);
import { mkdir, access, constants, unlink } from "node:fs/promises";
import { moveFile } from "move-file";
import jwt from "jsonwebtoken";
import { bookCredentialIsSave, getBookName, addBookToDb, getBookPath, setBookmarkToDb, getBookList, getBookCoverPath } from "../model/books/bookModel.js";
import { checkStatusUserRefreshToken } from "../model/Users/userAuthentication.js";

const currentId = Date.now() + "-" + Math.round(Math.random() * 1e9);

bookRouter.post("/uploadBook", [cpUpload, jsonParser, urlencoded, validateRequestField], async function (req, res, next) {
  const isbn = req.body.isbn;
  const accessToken = req.body.accessToken;
  const refreshToken = req.body.refreshToken;
  try {
    const result = await validateToken(accessToken, refreshToken);
    // console.log("req.files", req.files);
    // console.log("result: ", result);
    if (isbn === "" || isbn === undefined) return res.status(400).send({ Status: false, errorMsg: `ISBN tidak boleh kosong` });
    if (req.files.bookFile[0].originalname.slice(req.files.bookFile[0].originalname.length - 4, req.files.bookFile[0].originalname.length).split(".")[1] !== "brf") {
      unlink(req.files.bookFile[0].path);
      unlink(req.files.bookCoverFile[0].path);
      return res.status(400).send({ Status: false, errorMsg: `Book File is not valid!. book file should be on "brf" format` });
    } else if (req.files.bookCoverFile[0].mimetype !== "image/png" && req.files.bookCoverFile[0].mimetype !== "image/jpeg") {
      unlink(req.files.bookFile[0].path);
      unlink(req.files.bookCoverFile[0].path);
      return res.status(400).send({ Status: false, errorMsg: `Book cover file is not valid!. book Cover file should be on "png or jpeg" format` });
    } else return next();
  } catch (error) {
    // error.Route = "/uploadBook";
    // error.method = "POST";
    // return res.status(error.Code).send(error.errorData);
    // console.trace("error: ", error);
    return res.status(400).send({ error });
  }
});

bookRouter.post("/uploadBook", [jsonParser, urlencoded], async function (req, res) {
  let bookObject = structuredClone(req.body);
  const bookCategory = req.body.categories.toUpperCase();
  let bookFilePath = "";
  let bookCoverFilePath = "";
  delete bookObject.accessToken;
  delete bookObject.refreshToken;

  const CredentialIsSave = await bookCredentialIsSave(req.body);
  const folderIsReady = await checkDirIsExistIfNotCreate(BookDir, bookCategory);

  if (folderIsReady === false) {
    try {
      if (req.files.bookFile) {
        let bookFileExt = "txt";
        await access(`uploads/${currentId}.${bookFileExt}`, constants.R_OK | constants.W_OK);
        await unlink(`uploads/${currentId}.${bookFileExt}`);
      }
      if (req.files.bookCoverFile) {
        let bookCoverFileExt = req.files.bookCoverFile[0].mimetype.split("/")[1];
        await access(`uploads/${currentId}.${bookCoverFileExt}`, constants.R_OK | constants.W_OK);
        await unlink(`uploads/${currentId}.${bookCoverFileExt}`);
      }
    } catch (error) {
      console.log(Object.keys(error));
      console.log(error);
    }
    return res.status(500).send({ status: false, error: "Server Error, cant create folder index!" });
  }

  if (CredentialIsSave.status === false) {
    try {
      if (req.files.bookFile) {
        let bookFileExt = "txt";
        await access(`uploads/${currentId}.${bookFileExt}`, constants.R_OK | constants.W_OK);
        await unlink(`uploads/${currentId}.${bookFileExt}`);
      }
      if (req.files.bookCoverFile) {
        let bookCoverFileExt = req.files.bookCoverFile[0].mimetype.split("/")[1];
        await access(`uploads/${currentId}.${bookCoverFileExt}`, constants.R_OK | constants.W_OK);
        await unlink(`uploads/${currentId}.${bookCoverFileExt}`);
      }
    } catch (error) {
      console.log(Object.keys(error));
      console.log(error);
    }
    const credentialError = CredentialIsSave;
    return res.status(404).send(credentialError);
  } else {
    try {
      const name = await getBookName(bookCategory);
      console.log("name: ", name);

      if (req.files.bookFile) {
        let bookFileExt = "txt";
        bookFilePath = BookDir + `/${bookCategory}/BookFile/${name}.${bookFileExt}`;
        await moveFile(`uploads/${currentId}.${bookFileExt}`, bookFilePath);
      }
      if (req.files.bookCoverFile) {
        let bookCoverFileExt = req.files.bookCoverFile[0].mimetype.split("/")[1];
        bookCoverFilePath = BookDir + `/${bookCategory}/BookCoverFile/${name}.${bookCoverFileExt}`;
        await moveFile(`uploads/${currentId}.${bookCoverFileExt}`, bookCoverFilePath);
      }
      Object.assign(bookObject, { bookFilePath }, { bookCoverFilePath }, { booksCode: name.slice(0, 4) });
      const addBookResult = await addBookToDb(bookObject);
      console.log(addBookResult);
      return res.status(200).send({ status: addBookResult.Status, message: addBookResult.msg, warn: addBookResult.err });
    } catch (error) {
      console.log(Object.keys(error));
      console.log(error);
      return res.status(500).send({ status: false, errorType: "server error", warn: " Error status => DANGER!" });
    }
  }
});

bookRouter.get("/getBook", [cpUpload, jsonParser, urlencoded], async function (req, res, next) {
  const accessToken = req.query.accessToken;
  const refreshToken = req.query.refreshToken;
  try {
    await validateToken(accessToken, refreshToken);
    next();
  } catch (error) {
    error.Route = "/getBook";
    error.method = "GET";
    console.log("error: ", error);
    return res.status(error.Code).send(error.errorData);
  }
});

bookRouter.get("/getBook", async function (req, res) {
  const result = await getBookList();
  // console.trace("result: ", result);
  res.status(200).send({ status: result.result, data: result.data });
});

bookRouter.get("/downloadBook", async function (req, res, next) {
  const accessToken = req.query.accessToken;
  const refreshToken = req.query.refreshToken;
  const isbn = req.query.isbn;
  // const responseTemplate = { Status: undefined };
  try {
    await validateToken(accessToken, refreshToken);
  } catch (error) {
    console.log(Object.keys(error));
    console.log(error.errorData);
    return res.status(error.Code).send(error.errorData);
  }
  if (isbn === undefined || isbn === "") {
    return res.status(400).send({ status: false, error: "isbn gak ada" });
  }
  return next();
});

bookRouter.get("/downloadBook", async function (req, res, next) {
  const accessToken = req.query.accessToken;
  const refreshToken = req.query.refreshToken;
  const isbn = req.query.isbn;
  // const responseTemplate = { Status: undefined };
  try {
    await validateToken(accessToken, refreshToken);
  } catch (error) {
    console.log(Object.keys(error));
    console.log(error.errorData);
    return res.status(error.Code).send(error.errorData);
  }
  if (isbn === undefined || isbn === "") {
    return res.status(400).send({ status: false, error: "Buku tidak tersedia!" });
  }
  return next();
});

bookRouter.get("/downloadBook", async function (req, res) {
  const dbResult = await getBookPath(req.query.isbn);
  if (dbResult.result) {
    res.download(dbResult.path);
  } else res.send({ error: dbResult.errorMsg });
});

bookRouter.get("/getCover", async function (req, res, next) {
  const accessToken = req.query.accessToken;
  const refreshToken = req.query.refreshToken;
  const isbn = req.query.isbn;
  // console.trace("isbn: ", isbn);
  try {
    await validateToken(accessToken, refreshToken);
  } catch (error) {
    console.log(Object.keys(error));
    console.log(error.errorData);
    return res.status(error.Code).send(error.errorData);
  }
  if (isbn === undefined || isbn === "") {
    return res.status(400).send({ status: false, error: "buku tidak tersedia" });
  }
  return next();
});

bookRouter.get("/getCover", async function (req, res) {
  const isbn = req.query.isbn;
  const dbResult = await getBookCoverPath(isbn);
  // console.trace("path: ", statPath.join(statPath.resolve(), dbResult.path));
  const finalPath = statPath.join(statPath.resolve(), dbResult.path);
  return res.status(200).sendFile(finalPath, { allow: true }, (err) => {
    if (err) {
      console.trace("error: ", err);
      return res.status(400).send({ status: false, error: "Cover buku tidak tersedia" });
    }
  });
});

bookRouter.post("/setBookmark", [jsonParser, urlencoded], async function (req, res, next) {
  // console.trace(req.body);
  try {
    const bookmark = Object.keys(req.body.bookmarkInformation).length;
    const accessToken = req.body.accessToken;
    const refreshToken = req.body.refreshToken;
    await validateToken(accessToken, refreshToken);
    // console.log(bookmark < 10);
    if (bookmark > 10) {
      res.status(404).send({ Status: false, error: "bang bookmark nya kebanyakan!" });
    } else next();
  } catch (error) {
    console.trace("error: ", error);
    res.status(404).send({ Status: false, error: error });
  }
});

bookRouter.post("/setBookmark", [jsonParser, urlencoded], async function (req, res) {
  setBookmarkToDb(req.body.userId, req.body.bookmarkInformation);
  res.status(200).send({ status: true, msg: "Berhasil update bookmark!" });
});

export default bookRouter;

async function checkDirIsExistIfNotCreate(path, category) {
  category = category.toUpperCase();
  try {
    await access(path + `/${category.toUpperCase()}/BookFile/`, constants.R_OK | constants.W_OK);
    await access(path + `/${category.toUpperCase()}/BookCoverFile/`, constants.R_OK | constants.W_OK);
    console.log("\nFolder exist!");
    return true;
  } catch {
    console.log("\nFolder do not exist! , try to create folder!");
    try {
      const createBookFileDir = await mkdir(path + `/${category.toUpperCase()}/BookFile/`, {
        recursive: true,
      });
      const createBookCoverFileDir = await mkdir(path + `/${category.toUpperCase()}/BookCoverFile/`, {
        recursive: true,
      });
      console.log("success to to create folder!");
      return true;
    } catch (err) {
      console.log("Failed to to create folder!");
      return false;
    }
  }
}

async function validateRequestField(req, res, next) {
  let bookObject = structuredClone(req.body);
  delete bookObject.accessToken;
  delete bookObject.refreshToken;
  const uploadFiled = ["titles", "isbn", "authors", "editions", "year", "publishers", "categories", "languages", "uploader", "availability"].sort();
  const reqField = Object.keys(bookObject).sort();
  // console.log("uploadFiled, reqField: ", uploadFiled, reqField);
  const isEqual = uploadFiled.toString() === reqField.toString();

  if (isEqual === false) return res.status(400).send({ Status: false, error: `Request tidak valid` });

  const emptyField = Object.keys(bookObject).filter((v, i) => bookObject[`${v}`] === "");
  // console.log("emptyField: ", emptyField);
  if (emptyField.length === 0) return next();
  return res.status(400).send({ Status: false, errorMsg: `Field ${emptyField.toString()} tidak boleh kosong!` });
}

async function validateToken(accessToken, refreshToken) {
  return await new Promise(function (resolve, reject) {
    jwt.verify(accessToken, "prvK", { algorithm: "HS256" }, async (err, decoded) => {
      if (err) {
        reject({ Code: 400, errorData: { Status: false, error: `${err.message === "jwt malformed" ? "Token invalid" : err.message}`, [`${err.expiredAt ? "expiredAt" : ""}`]: err.expiredAt } });
      } else {
        const result = await checkStatusUserRefreshToken(decoded.NIK, refreshToken);
        if (!result) {
          reject({ Code: 403, errorData: { Status: false, error: "Silahkan login terlebih dahulu!" } });
        }
        resolve({ Code: 200, errorData: { Status: true, error: "" } });
      }
    });
  });
}

async function removeFileIfError(Cover, File) {}
