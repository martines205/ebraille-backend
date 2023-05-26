/*
...

/book/uploadBook POST ok
/book/getBook GET ok
/book/addBookmark POST ok
/book/addBook POST ok
/book/deleteBook DELETE

/book/editBook ~
...
*/

import express from "express";
import { moveFile } from "move-file";
import multer from "multer";
import statPath from "path";
const bookRouter = express.Router();

const BookDir = "./bookDir";
const tempUpload = "./uploads";
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
      } catch (err) {
        cb(null, false);
      }
    }
    const ISBN = req.body.ISBN;
    if (ISBN === "" || ISBN === `""` || ISBN === undefined) return cb(null, false);
    return cb(null, true);
  },
});

import bodyParser from "body-parser";
import { unlink } from "fs/promises";
import { access, constants, mkdir } from "node:fs/promises";
import { validateBookmarkIsbn, validateBookmarkSchema } from "../Middleware/desktop/booksMiddleWare.js";
import { validateToken } from "../Middleware/desktop/checkRequestAuth.js";
import {
  addBookToDb,
  bookCredentialIsSave,
  editBookInformationOnDB,
  getBookCoverPath,
  getBookList,
  getBookListByTitle,
  getBookName,
  getBookPath,
  removeBookFromDB,
  updateAvailability,
  setBookmarkToDb,
} from "../model/books/bookModel.js";
import { validateTokenWebsite } from "../Middleware/website/checkRequestAuth.js";
const jsonParser = bodyParser.json();
const urlencoded = bodyParser.urlencoded({ extended: false });
const cpUpload = upload.fields([{ name: "bookFile" }, { name: "bookCoverFile" }]);

const currentId = Date.now() + "-" + Math.round(Math.random() * 1e9);

// Desktop

bookRouter.get("/downloadBook", [cpUpload, jsonParser, urlencoded, validateToken], async function (req, res, next) {
  const isbn = req.query.isbn;
  if (isbn === undefined || isbn === "") {
    return res.status(400).send({ status: false, error: "ISBN tidak boleh kosong!" });
  } else next();
});

bookRouter.get("/downloadBook", async function (req, res) {
  const dbResult = await getBookPath(req.query.isbn);
  if (dbResult.result) {
    res.download(dbResult.path);
  } else res.send({ error: dbResult.errorMsg });
});

// bookRouter.patch("/returnBook", [jsonParser, urlencoded, validateToken], async function (req, res, next) {
bookRouter.patch("/returnBook", [jsonParser, urlencoded], async function (req, res, next) {
  const { isbn } = req.query;
  const { result, message, errorMsg } = await updateAvailability(isbn);
  if (result) return res.status(200).send({ status: result, message });
  else return res.status(400).send({ status: result, errorMsg });
});

bookRouter.post("/setBookmark", [cpUpload, jsonParser, urlencoded, validateToken, validateBookmarkSchema, validateBookmarkIsbn], async function (req, res, next) {
  const bookmark = req.body.bookmarkInformation?.length;
  console.log("bookmark: ", bookmark);
  if (bookmark === undefined) return res.status(404).send({ Status: false, error: "Request invalid" });
  if (bookmark > 10) return res.status(404).send({ Status: false, error: "bang bookmark nya kebanyakan!" });
  return next();
});

bookRouter.post("/setBookmark", [jsonParser, urlencoded], async function (req, res) {
  setBookmarkToDb(req.body.userId, req.body.bookmarkInformation);
  res.status(200).send({ status: true, msg: "Berhasil update bookmark!" });
});

bookRouter.get("/getBook", [cpUpload, jsonParser, urlencoded, validateToken], async function (error, req, res, next) {
  if (error) {
    error.Route = "/getBook";
    error.method = "GET";
    console.log("error: ", error);
    return res.status(error.Code).send(error.errorData);
  } else return next();
});

bookRouter.get("/getBook", async function (req, res) {
  const title = req.query.title;
  if (title === undefined || title === "") {
    try {
      const result = await getBookList();
      res.status(200).send({ status: result.result, data: result.data });
    } catch (error) {
      console.trace("error: ", error);
      res.status(505).send({ status: false, msg: "Server Error" });
    }
  } else {
    console.log(title);
    try {
      const result = await getBookListByTitle(title);
      res.status(200).send({ status: result.result, data: result.data });
    } catch (error) {
      res.status(505).send({ status: false, msg: "Server Error" });
    }
  }
});

// bookRouter.get("/getCover", [cpUpload, jsonParser, urlencoded, validateToken], async function (req, res, next) {
bookRouter.get("/getCover", [cpUpload, jsonParser, urlencoded], async function (req, res, next) {
  const isbn = req.query.isbn;
  if (isbn === undefined || isbn === "") {
    return res.status(400).send({ status: false, error: "Cover tidak tersedia" });
  } else return next();
});

bookRouter.get("/getCover", async function (req, res) {
  const isbn = req.query.isbn;
  try {
    const dbResult = await getBookCoverPath(isbn);
    if (dbResult instanceof Error) throw dbResult;
    const finalPath = statPath.join(statPath.resolve(), dbResult.path);
    return res.status(200).sendFile(finalPath, { allow: true });
  } catch (error) {
    return res.status(error.code ? error.code : 404).send({ status: false, error: error.message });
  }
  // console.trace("path: ", statPath.join(statPath.resolve(), dbResult.path));
});

/* Website */

// bookRouter.post("/uploadBook", [cpUpload, jsonParser, urlencoded, validateRequestField, validateTokenWebsite], async function (req, res, next) {
bookRouter.post("/uploadBook", [cpUpload, jsonParser, urlencoded], async function (req, res, next) {
  const isbn = req.body.ISBN;
  console.log("isbn: ", req.body);
  if (isbn === "" || isbn === undefined) return res.status(400).send({ Status: false, errorMsg: `ISBN tidak boleh kosong` });
  try {
    if (
      req.files.bookFile !== undefined &&
      req.files.bookFile[0].originalname.slice(req.files.bookFile[0].originalname.length - 4, req.files.bookFile[0].originalname.length).split(".")[1] !== "brf"
    ) {
      unlink(req.files.bookFile[0].path);
      unlink(req.files.bookCoverFile[0].path);
      return res.status(400).send({ Status: false, errorMsg: `Book File is not valid!. book file should be on "brf" format` });
    } else if (req.files.bookCoverFile !== undefined && req.files.bookCoverFile[0].mimetype !== "image/png" && req.files.bookCoverFile[0].mimetype !== "image/jpeg") {
      unlink(req.files.bookFile[0].path);
      unlink(req.files.bookCoverFile[0].path);
      return res.status(400).send({ Status: false, errorMsg: `Book cover file is not valid!. book Cover file should be on "png or jpeg" format` });
    } else return next();
  } catch (error) {
    // error.Route = "/uploadBook";
    // error.method = "POST";
    // return res.status(error.Code).send(error.errorData);
    console.trace("error: ", error);
    return res.status(500).send({ Status: false, errorMsg: `Server Error!` });
  }
});

bookRouter.post("/uploadBook", [jsonParser, urlencoded], async function (req, res) {
  let bookObject = structuredClone(req.body);
  const bookCategory = req.body.CATEGORY.toUpperCase();
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
      // console.log(Object.keys(error));
      console.trace("error :", error);
    }
    const credentialError = CredentialIsSave;
    return res.status(404).send(credentialError);
  } else {
    try {
      const name = await getBookName(bookCategory);
      console.trace("name: ", name);

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
      // console.trace(addBookResult);
      return res.status(200).send({ status: addBookResult.Status, message: addBookResult.msg, warn: addBookResult.err });
    } catch (error) {
      console.trace(Object.keys(error));
      console.trace(error);
      return res.status(500).send({ status: false, errorType: "server error", warn: " Error status => DANGER!" });
    }
  }
});

bookRouter.patch("/updateBook", [cpUpload, jsonParser, urlencoded], async function (req, res) {
  // console.log("req.body: ", req.body);
  // return res.send("testing");

  const isbn = req.body.ISBN;
  if (isbn === "" || isbn === `""` || isbn === undefined) return res.status(400).send({ Status: false, errorMsg: `ISBN tidak boleh kosong` });
  delete req.body.accessToken;
  delete req.body.refreshToken;
  try {
    var { bookCoverFilePath, bookFilePath } = await editBookInformationOnDB(req.body);
  } catch (error) {
    return res.status(500).send({ Status: false, errorMsg: `Server Error` });
  }

  const bookFilesIsAvailable = Object.keys(req.files).length !== 0;
  console.log("req.files: ", req.files);
  console.log("bookFilesIsAvailable: ", bookFilesIsAvailable);
  if (bookFilesIsAvailable) {
    try {
      if (
        req.files.bookFile !== undefined &&
        req.files.bookFile[0].originalname.slice(req.files.bookFile[0].originalname.length - 4, req.files.bookFile[0].originalname.length).split(".")[1] !== "brf"
      ) {
        unlink(req.files.bookFile[0].path);
        return res.status(400).send({ Status: false, errorMsg: `Book File is not valid!. book file should be on "brf" format` });
      }
      if (req.files.bookCoverFile !== undefined && req.files.bookCoverFile[0].mimetype !== "image/png" && req.files.bookCoverFile[0].mimetype !== "image/jpeg") {
        unlink(req.files.bookCoverFile[0].path);
        return res.status(400).send({ Status: false, errorMsg: `Book cover file is not valid!. book Cover file should be on "png or jpeg" format` });
      }
    } catch (error) {
      console.trace("error: ", error);
      return res.status(500).send({ Status: false, errorMsg: `Server Error` });
    }
    try {
      if (req.files.bookFile) {
        let bookFileExt = "txt";
        await moveFile(`uploads/${currentId}.${bookFileExt}`, bookFilePath);
      }
      if (req.files.bookCoverFile) {
        let bookCoverFileExt = req.files.bookCoverFile[0].mimetype.split("/")[1];
        await moveFile(`uploads/${currentId}.${bookCoverFileExt}`, bookCoverFilePath);
      }
      return res.status(200).send({ status: 200, message: "Edit buku berhasil", warn: null });
    } catch (error) {
      console.trace(Object.keys(error));
      console.trace(error);
      return res.status(500).send({ status: false, errorType: "server error", warn: " Error status => DANGER!" });
    }
  }
  return res.status(200).send({ status: 200, message: "Edit buku berhasil", warn: null });
});

bookRouter.get("/website/getBook", [cpUpload, jsonParser, urlencoded, validateTokenWebsite], async function (req, res, next) {
  try {
    const result = await getBookList();
    res.status(200).send({ status: result.result, data: result.data });
  } catch (error) {
    console.trace("error: ", error);
    res.status(505).send({ status: false, msg: "Server Error" });
  }
});

bookRouter.get("/website/getCover", [cpUpload, jsonParser, urlencoded, validateTokenWebsite], async function (req, res, next) {
  const isbn = req.query.isbn;
  if (isbn === undefined || isbn === "") {
    return res.status(400).send({ status: false, error: "Cover tidak tersedia" });
  } else return next();
});

bookRouter.get("/website/getCover", async function (req, res) {
  const isbn = req.query.isbn;
  try {
    const dbResult = await getBookCoverPath(isbn);
    if (dbResult instanceof Error) throw dbResult;
    const finalPath = statPath.join(statPath.resolve(), dbResult.path);
    return res.status(200).sendFile(finalPath, { allow: true });
  } catch (error) {
    return res.status(error.code ? error.code : 404).send({ status: false, error: error.message });
  }
  // console.trace("path: ", statPath.join(statPath.resolve(), dbResult.path));
});

bookRouter.delete("/website/deleteBook", [jsonParser, urlencoded, validateTokenWebsite], async function (req, res, next) {
  const { ISBN } = req.query;
  try {
    const result = await removeBookFromDB(ISBN);
    if (!result.Status) throw result;
    console.log("result: ", result.Status);
    return res.status(200).send({ status: true, message: result.msg });
  } catch (error) {
    // console.trace("error: ", error);
    return res.status(400).send({ status: error.Status, message: error.msg, error: error.err });
  }
});

////////////////////////////////////////
export default bookRouter;

async function checkDirIsExistIfNotCreate(path, category) {
  category = category.toUpperCase();
  try {
    await access(path + `/${category.toUpperCase()}/BookFile/`, constants.R_OK | constants.W_OK);
    await access(path + `/${category.toUpperCase()}/BookCoverFile/`, constants.R_OK | constants.W_OK);
    // console.trace("\nFolder exist!");
    return true;
  } catch {
    console.trace("\nFolder do not exist! , try to create folder!");
    try {
      const createBookFileDir = await mkdir(path + `/${category.toUpperCase()}/BookFile/`, {
        recursive: true,
      });
      const createBookCoverFileDir = await mkdir(path + `/${category.toUpperCase()}/BookCoverFile/`, {
        recursive: true,
      });
      console.trace("success to to create folder!");
      return true;
    } catch (err) {
      console.trace("Failed to to create folder!");
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

async function removeFileIfError(Cover, File) {}
