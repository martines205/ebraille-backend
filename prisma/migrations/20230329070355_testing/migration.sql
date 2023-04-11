-- CreateTable
CREATE TABLE "Bookmark" (
    "userId" TEXT NOT NULL,
    "bookmarkInformation" JSON,

    CONSTRAINT "Bookmark_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "UserInformation" (
    "id" BIGSERIAL NOT NULL,
    "role" VARCHAR NOT NULL DEFAULT 'USER',
    "firstName" VARCHAR NOT NULL,
    "lastName" VARCHAR NOT NULL,
    "nik" VARCHAR NOT NULL,
    "gender" SMALLINT NOT NULL,
    "email" VARCHAR NOT NULL,
    "username" VARCHAR NOT NULL,
    "password" VARCHAR NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserInformation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TokenInformationDesktop" (
    "nik" VARCHAR NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "refreshToken" VARCHAR NOT NULL,

    CONSTRAINT "TokenInformationDesktop_pkey" PRIMARY KEY ("nik")
);

-- CreateTable
CREATE TABLE "TokenInformationWebsite" (
    "username" VARCHAR NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "refreshToken" VARCHAR NOT NULL,

    CONSTRAINT "TokenInformationWebsite_pkey" PRIMARY KEY ("username")
);

-- CreateTable
CREATE TABLE "BookInformation" (
    "id" BIGSERIAL NOT NULL,
    "year" VARCHAR NOT NULL,
    "availability" VARCHAR NOT NULL,
    "booksCode" VARCHAR NOT NULL,
    "languages" VARCHAR NOT NULL,
    "publishers" VARCHAR NOT NULL,
    "titles" VARCHAR NOT NULL,
    "maxBook" INTEGER NOT NULL DEFAULT 6,
    "bookCoverFilePath" VARCHAR,
    "bookFilePath" VARCHAR,
    "authors" VARCHAR NOT NULL,
    "isbn" VARCHAR NOT NULL,
    "categories" VARCHAR NOT NULL,
    "editions" VARCHAR NOT NULL,
    "uploader" VARCHAR NOT NULL,

    CONSTRAINT "BookInformation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TokenInformationDesktop_nik_key" ON "TokenInformationDesktop"("nik");

-- CreateIndex
CREATE UNIQUE INDEX "TokenInformationWebsite_username_key" ON "TokenInformationWebsite"("username");
