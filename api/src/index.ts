import dotenv from "dotenv";
import express from "express";
import mongoose = require("mongoose");
import path from "path";
import * as sessionAuth from "./middleware/sessionAuth";
import * as routes from "./routes";

// Initialize config file .env
dotenv.config();

const port = process.env.SERVER_PORT;
const app = express();

// app.set( "views", path.join( __dirname, "views" ) );
// app.set( "view engine", "ejs" );

// Connecting to MongoDB
mongoose.connect(process.env.MONGODB_URL).then(() => {
    // tslint:disable-next-line:no-console
    mongoose.connection.on("error", (err: any) => console.log("Database connection error:", err));
    // tslint:disable-next-line:no-console
    mongoose.connection.once("open", () => console.log("Connected to Database!"));
// tslint:disable-next-line:no-console
}, () => console.log("Not connected !!!!"));

sessionAuth.register(app);
routes.register(app);

// Start the Express server
// tslint:disable-next-line:no-console
app.listen(port, () => console.log(`server started at http://localhost:${port}`));
