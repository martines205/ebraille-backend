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
import { bookCredentialIsSave, getBookName, addBookToDb, getBookPath, setBookmarkToDb, getBookList } from "../model/books/bookModel.js";
import { checkStatusUserRefreshToken } from "../model/Users/userAuthentication.js";

const currentId = Date.now() + "-" + Math.round(Math.random() * 1e9);

bookRouter.post("/uploadBook", [cpUpload, jsonParser, urlencoded], async function (req, res, next) {
  const isbn = req.body.isbn;
  const accessToken = req.body.accessToken;
  const refreshToken = req.body.refreshToken;
  try {
    const result = await validateToken(accessToken, refreshToken);
    if (isbn === "" || isbn === undefined) return res.status(400).send({ Status: false, errorMsg: `ISBN tidak boleh kosong` });
    if (req.files.bookFile[0].originalname.slice(req.files.bookFile[0].originalname.length - 4, req.files.bookFile[0].originalname.length).split(".")[1] !== "brf") {
      unlink(req.files.bookFile[0].path);
      unlink(req.files.bookCoverFile[0].path);
      return res.status(400).send({ Status: false, errorMsg: `Book File is not valid!. book file should be on "brf" format` });
    } else if (req.files.bookCoverFile[0].mimetype !== "image/png" && req.files.bookCoverFile[0].mimetype !== "image/jpeg") {
      unlink(req.files.bookFile[0].path);
      unlink(req.files.bookCoverFile[0].path);
      return res.status(400).send({ Status: false, errorMsg: `Book cover file is not valid!. book Cover file should be on "png or jpeg" format` });
    }
    next();
  } catch (error) {
    console.log(error);
    return res.status(error.Code).send(error.errorData);
  }
});

bookRouter.post("/uploadBook", [jsonParser, urlencoded, validateRequestField], async function (req, res) {
  let bookObject = structuredClone(req.body);
  const Bookcategory = req.body.categories;
  let bookFilePath = "";
  let bookCoverFilePath = "";
  delete bookObject.accessToken;
  delete bookObject.refreshToken;

  const checkResult = await bookCredentialIsSave(req.body);
  await checkDirIsExistIfNotCreate(BookDir, Bookcategory);
  console.log(checkResult);
  if (checkResult.status === true) {
    const name = await getBookName(Bookcategory);
    try {
      if (req.files.bookFile) {
        let bookFileExt = "txt";
        bookFilePath = BookDir + `/${Bookcategory}/BookFile/${name}.${bookFileExt}`;
        await moveFile(`uploads/${currentId}.${bookFileExt}`, bookFilePath);
      }
      if (req.files.bookCoverFile) {
        let bookCoverFileExt = req.files.bookCoverFile[0].mimetype.split("/")[1];
        bookCoverFilePath = BookDir + `/${Bookcategory}/BookCoverFile/${name}.${bookCoverFileExt}`;
        await moveFile(`uploads/${currentId}.${bookCoverFileExt}`, bookCoverFilePath);
      }
      Object.assign(bookObject, { bookFilePath }, { bookCoverFilePath }, { booksCode: name.slice(0, 4) });
      addBookToDb(bookObject);
    } catch (error) {
      console.log(Object.keys(error));
      console.log(error);
    }
    return res.send("berhasil");
  } else {
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
    return res.send("gagal bang");
  }
});

bookRouter.get("/getBook", [cpUpload, jsonParser, urlencoded], async function (req, res, next) {
  jwt.verify(req.query.accessToken, "prvK", { algorithm: "HS256" }, async (err, decoded) => {
    if (err) {
      console.error({ Error: { Route: "/getBook", "Error message": err.message, "Request query: ": req.query } });
      res.send({ Status: false, errorMsg: `${err.message === "jwt malformed" ? "Token invalid" : err.message}`, [`${err.expiredAt ? "expiredAt" : ""}`]: err.expiredAt });
    } else {
      const result = await checkStatusUserRefreshToken(decoded.NIK, req.query.refreshToken);
      console.log("/getBook", result);
      if (result === false) return res.status(403).send({ Status: false, error: "Silahkan login terlebih dahulu!" });
      next();
    }
  });
});

bookRouter.get("/getBook", async function (req, res) {
  const result = await getBookList();
  res.status(200).send({ status: result.result, data: result.data });
});

bookRouter.get("/downloadBook", async function (req, res, next) {
  jwt.verify(req.query.accessToken, "prvK", { algorithm: "HS256" }, (err, decoded) => {
    if (err) {
      console.log("Error:", err.message, "\nRequest query: ", req.query);
      res.send({ Status: false, errorMsg: `${err.message === "jwt malformed" ? "Token invalid" : err.message}`, [`${err.expiredAt ? "expiredAt" : ""}`]: err.expiredAt });
    } else next();
  });
});
bookRouter.get("/downloadBook", async function (req, res) {
  const dBresult = await getBookPath(req.query.isbn);
  if (dBresult.result) {
    res.download(dBresult.path);
  } else res.send({ error: dBresult.errorMsg });
});

bookRouter.post("/setBookmark", [jsonParser, urlencoded], async function (req, res, next) {
  const bookmark = req.body.bookmarkInformation.length;
  jwt.verify(req.query.accessToken, "prvK", { algorithm: "HS256" }, (err, decoded) => {
    if (err) {
      console.log("Error:", err.message, "\nRequest query: ", req.query);
      res.send({ Status: false, errorMsg: `${err.message === "jwt malformed" ? "Token invalid" : err.message}`, [`${err.expiredAt ? "expiredAt" : ""}`]: err.expiredAt });
    }
  });
  console.log(bookmark < 10);
  if (bookmark > 10) {
    res.status(404).send({ error: "bang bookmark nya kebanyakan!" });
  } else next();
});

bookRouter.post("/setBookmark", [jsonParser, urlencoded], async function (req, res) {
  setBookmarkToDb(req.body.userId, req.body.bookmarkInformation);
  res.status(200).send("bang udah bang :(");
});

export default bookRouter;

async function checkDirIsExistIfNotCreate(path, category) {
  try {
    await access(path + `/${category}/BookFile/`, constants.R_OK | constants.W_OK);
    await access(path + `/${category}/BookCoverFile/`, constants.R_OK | constants.W_OK);
  } catch {
    try {
      const createBookFileDir = await mkdir(path + `/${category}/BookFile/`, {
        recursive: true,
      });
      const createBookCoverFileDir = await mkdir(path + `/${category}/BookCoverFile/`, {
        recursive: true,
      });
    } catch (err) {}
  }
}

async function validateRequestField(req, res, next) {
  const uploadFiled = ["titles", "isbn", "authors", "editions", "year", "publishers", "categories", "languages", "uploaders", "availability", "accessToken", "refreshToken"].sort();
  const reqField = Object.keys(req.body).sort();
  const isEqual = uploadFiled.toString() === reqField.toString();
  console.log("uploadFiled === reqField : ", isEqual);
  const emptyField = Object.keys(req.body).filter((v, i) => req.body[`${v}`] === "");
  console.log("emptyField: ", emptyField);
  console.log("isEqual && emptyField.length !== 0: ", isEqual && emptyField.length === 0);
  if (isEqual && emptyField.length === 0) return next();
  return res.status(400).send({ Status: false, errorMsg: `Field ${emptyField.toString()} tidak boleh kosong!` });
}

async function validateToken(accessToken, refreshToken) {
  const result = await new Promise(function (resolve, reject) {
    jwt.verify(accessToken, "prvK", { algorithm: "HS256" }, async (err, decoded) => {
      if (err) {
        return reject({ Code: 400, errorData: { Status: false, error: `${err.message === "jwt malformed" ? "Token invalid" : err.message}`, [`${err.expiredAt ? "expiredAt" : ""}`]: err.expiredAt } });
      } else {
        const result = await checkStatusUserRefreshToken(decoded.NIK, refreshToken);
        if (!result) {
          return reject({ Code: 403, errorData: { Status: false, error: "Silahkan login terlebih dahulu!" } });
        }
        return resolve({ Code: 200, errorData: { Status: true, error: "" } });
      }
    });
  });
}
