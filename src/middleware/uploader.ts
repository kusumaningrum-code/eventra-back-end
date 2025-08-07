import multer from "multer";
import { Request } from "express";

export const uploaderMemory = () => {
  return multer({
    storage: multer.memoryStorage(),
    limits: {
      fileSize: 10 * 1024 * 1024,
    },
    fileFilter: (
      req: Request,
      file: Express.Multer.File,
      callback: multer.FileFilterCallback
    ) => {
      const allowedMimes = [
        "image/jpeg",
        "image/jpg",
        "image/png",
        "image/gif",
        "image/webp",
      ];

      if (allowedMimes.includes(file.mimetype)) {
        callback(null, true);
      } else {
        callback(
          new Error("Only image files (JPEG, PNG, GIF, WebP) are allowed!")
        );
      }
    },
  });
};

export const uploader = (directory: string, filePrefix: string) => {
  const path = require("path");
  const fs = require("fs");

  const defaultDir = path.join(__dirname, "../../public");

  const ensureDirectoryExists = (dirPath: string) => {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
      console.log("Directory created:", dirPath);
    }
  };

  const configureStoreFile = multer.diskStorage({
    destination: (
      req: Request,
      file: Express.Multer.File,
      callback: (error: Error | null, destination: string) => void
    ) => {
      const fileDestination = path.join(defaultDir, directory);
      console.log("DESTINATION FILE STORE:", fileDestination);

      try {
        ensureDirectoryExists(fileDestination);
        callback(null, fileDestination);
      } catch (error) {
        console.error("Error creating directory:", error);
        callback(error as Error, fileDestination);
      }
    },
    filename: (
      req: Request,
      file: Express.Multer.File,
      callback: (error: Error | null, destination: string) => void
    ) => {
      try {
        const existName = file.originalname.split(".");
        const ext = existName[existName.length - 1];

        if (filePrefix) {
          const newName = `${filePrefix}${Date.now()}.${ext}`;
          callback(null, newName);
        } else {
          callback(null, file.originalname);
        }
      } catch (error) {
        console.error("Error generating filename:", error);
        callback(error as Error, file.originalname);
      }
    },
  });

  return multer({
    storage: configureStoreFile,
    limits: {
      fileSize: 10 * 1024 * 1024,
    },
    fileFilter: (req, file, callback) => {
      const allowedMimes = [
        "image/jpeg",
        "image/jpg",
        "image/png",
        "image/gif",
        "image/webp",
      ];

      if (allowedMimes.includes(file.mimetype)) {
        callback(null, true);
      } else {
        callback(new Error("Only image files are allowed!"));
      }
    },
  });
};
