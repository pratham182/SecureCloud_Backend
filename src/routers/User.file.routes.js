import { Router } from 'express';
import { upload } from '../config/multer.js';


import { downloadFile, getFile, uploadFile } from '../Controllers/FileUpload.controller.js';
import { verifySession } from '../Middlewares/AuthMiddleware/auth.middlewares.js';
import express from "express"

const router=express.Router();

router.post('/upload', upload.single('file'), verifySession, uploadFile);

router.get('/files/:id', verifySession, getFile);

router.get('/files/:id/download', verifySession, downloadFile);


export default router;
