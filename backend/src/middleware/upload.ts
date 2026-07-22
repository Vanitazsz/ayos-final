import multer from "multer";
import { env } from "../config/env.js";
import { AppError } from "../utils/errors.js";

export const receiveUpload=multer({storage:multer.memoryStorage(),limits:{fileSize:env.MAX_UPLOAD_BYTES,files:1}}).single("file");
export function requireUploadFile(file?:Express.Multer.File):Express.Multer.File{if(!file)throw new AppError(422,"validation_error","A multipart file field is required",{file:["File is required"]});return file}
