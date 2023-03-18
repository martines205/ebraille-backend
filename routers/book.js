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
import express from "express";
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

import { bookCredentialIsSave, getBookName, addBookToDb, getBookPath, setBookmarkToDb, getBookList } from "../model/books/bookModel.js";

const currentId = Date.now() + "-" + Math.round(Math.random() * 1e9);

bookRouter.post("/uploadBook", [cpUpload, jsonParser, urlencoded], async function (req, res, next) {
  const isbn = req.body.isbn;

  if (isbn === "" || isbn === undefined) return res.send({ Status: false, errorMsg: `ISBN tidak boleh kosong` });

  if (req.files.bookFile[0].originalname.slice(req.files.bookFile[0].originalname.length - 4, req.files.bookFile[0].originalname.length).split(".")[1] !== "brf") {
    unlink(req.files.bookFile[0].path);
    unlink(req.files.bookCoverFile[0].path);
    res.send({ Status: false, errorMsg: `Book File is not valid!. book file should be on "brf" format` });
  } else if (req.files.bookCoverFile[0].mimetype !== "image/png" && req.files.bookCoverFile[0].mimetype !== "image/jpeg") {
    unlink(req.files.bookFile[0].path);
    unlink(req.files.bookCoverFile[0].path);
    res.send({ Status: false, errorMsg: `Book cover file is not valid!. book Cover file should be on "png or jpeg" format` });
  } else next();
});

bookRouter.post("/uploadBook", [jsonParser, urlencoded], async function (req, res) {
  let bookObject = structuredClone(req.body);
  const checkResult = await bookCredentialIsSave(req.body);
  const Bookcategory = req.body.categorys;
  let bookFilePath = "";
  let bookCoverFilePath = "";
  if (checkResult.isCredentialSafeToAdd) {
    await checkDirIsExistIfNotCreate(BookDir, Bookcategory);
    const name = await getBookName(Bookcategory);
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
    res.send("berhasil");
    addBookToDb(bookObject);
  } else {
    try {
      if (req.files.bookFile) {
        try {
          let bookFileExt = req.files.bookFile[0].mimetype.split("/")[1];
          await access(`uploads/${currentId}.${bookFileExt}`, constants.R_OK | constants.W_OK);
          await unlink(`uploads/${currentId}.${bookFileExt}`);
        } catch (error) {
          console.log();
          error;
        }
      }
      if (req.files.bookCoverFile) {
        try {
          let bookCoverFileExt = req.files.bookCoverFile[0].mimetype.split("/")[1];
          await access(`uploads/${currentId}.${bookCoverFileExt}`, constants.R_OK | constants.W_OK);
          await unlink(`uploads/${currentId}.${bookCoverFileExt}`);
        } catch (error) {
          console.log(error);
        }
      }
    } catch (error) {
      return res.send(error);
    }
    res.send("gagal bang");
  }
});

bookRouter.get("/getBook", [cpUpload, jsonParser, urlencoded], async function (req, res, next) {
  console.log(req.query);
  if (req.query.accessToken === undefined || req.query.accessToken === "") {
    res.send({ Status: false, errorMsg: "Toket ehhh..., token mana token nya!!!!" });
  } else if (req.query.accessToken !== "po**hub.com") {
    res.send({ Status: false, errorMsg: "Toketnya ehhh..., token nya salah weeiiii!!!!" });
  } else next();
});

bookRouter.get("/getBook", async function (req, res) {
  const result = await getBookList();
  console.log("result: ", result);
  res.send(result);
});

bookRouter.get("/downloadBook", async function (req, res, next) {
  if (req.query.accessToken === undefined || req.query.accessToken === "") {
    res.send({ Status: false, errorMsg: "Toket ehhh..., token mana token nya!!!!" });
  } else if (req.query.accessToken !== "po**hub.com") {
    res.send({ Status: false, errorMsg: "Toketnya ehhh..., token nya salah weeiiii!!!!" });
  } else next();
});
bookRouter.get("/downloadBook", async function (req, res) {
  const dBresult = await getBookPath(req.query.isbn);
  if (dBresult.result) {
    res.download(dBresult.path);
  } else res.send({ error: dBresult.errorMsg });
});

bookRouter.post("/setBookmark", [jsonParser, urlencoded], async function (req, res, next) {
  const bookmark = req.body.bookmarkInformation.length;
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
