import express from "express";
import { ApiError } from "./utils/ApiError.js";
import cookieParser from "cookie-parser";
import cors from "cors";
import { sessionMiddleware } from "./db/server.db.js";

const app = express();


app.use(cors({
    origin: process.env.CORS_ORIGIN, 
    credentials: true,
}));

app.use(express.json({ limit: '18kb' }));
app.use(express.urlencoded({ limit: '18kb', extended: true }));
app.use(cookieParser());
app.use(express.static('public'));
app.use(sessionMiddleware);


import UserOtpRoutes from './routers/User.auth.routes.js';
app.use("/api/v1/User", UserOtpRoutes);


//routes = /api/v1/User/upload
import UserFileRoutes from "./routers/User.file.routes.js";
app.use("/api/vi/User",UserFileRoutes);



app.use((req, res, next) => {
    res.status(404).json({ message: 'Not Found' });
});


app.use((err, req, res, next) => {
    if (err instanceof ApiError) {
        return res.status(err.statusCode).json(err.toJson());
    }
    console.error(err.stack);
    return res.status(500).json({ message: 'Internal Server Error' });
});



export { app };