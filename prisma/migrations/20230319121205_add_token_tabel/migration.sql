-- CreateTable
CREATE TABLE "TokenInformation" (
    "nik" VARCHAR NOT NULL,
    "password" VARCHAR NOT NULL,

    CONSTRAINT "TokenInformation_pkey" PRIMARY KEY ("nik")
);

-- CreateIndex
CREATE UNIQUE INDEX "TokenInformation_nik_key" ON "TokenInformation"("nik");
