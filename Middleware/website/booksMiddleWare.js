import { getBookIsbnList } from "../../model/books/bookModel.js";

export async function validateBookmarkSchema(req, res, next) {
  const bookmarks = req.body.bookmarkInformation;
  if (Array.isArray(bookmarks) && bookmarks.length !== 0) {
    const isDataBookmarkValid = bookmarks.filter((bookmark) => {
      const isbn = bookmark[`${Object.keys(bookmark)}`];
      if (isbn.hasOwnProperty("bookPage") == false || isbn.hasOwnProperty("bookLine") == false) return bookmark;
    });
    if (isDataBookmarkValid.length === 0) {
      return next();
    } else return res.status(400).send({ status: false, error: "Bookmark Schema is invalid" });
  } else if (Array.isArray(bookmarks) && bookmarks.length === 0) next();
  else return res.status(400).send({ status: false, error: "Bookmark field should be an Array of Object" });
}

export async function validateBookmarkIsbn(req, res, next) {
  const bookmarks = req.body.bookmarkInformation;
  if (Array.isArray(bookmarks) && bookmarks.length !== 0) {
    const isbnListOnRequest = getListOfIsbnFromBookmarkList(bookmarks);
    try {
      const listOfIsbnInDb = await getBookIsbnList();
      const invalidIsbn = isbnListOnRequest.filter((isbn) => {
        if (!listOfIsbnInDb.hasOwnProperty(isbn)) {
          return isbn;
        }
      });
      if (invalidIsbn.length !== 0) {
        const errorIsbn = invalidIsbn.length === 1 ? invalidIsbn[0] : invalidIsbn;
        return res.status(400).send({
          status: false,
          error: "Gagal menambahkan bookmark pada sistem",
          message: `ISBN berikut invalid:{ ${errorIsbn} }`,
        });
      } else return next();
    } catch (error) {
      return res.status(400).send({ status: false, error: "Server Error!" });
    }
  }
}

function getListOfIsbnFromBookmarkList(bookmarks) {
  return bookmarks.map((bookmark) => {
    return Object.keys(bookmark)[0];
  });
}
