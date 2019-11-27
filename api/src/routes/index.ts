import * as express from "express";
import NewsItem = require("../models/NewsItemModel");

export const register = (app: express.Application) => {
    const auth = app.locals.oidc;

    // define a route handler for the default home page
    app.get( "/", ( req: any, res ) => {
        res.send( "Hello world !" );
    });

    // define a secure route handler for the login page that redirects to /guitars
    app.get( "/login", auth.ensureAuthenticated(), (req, res ) => {
        res.redirect( "/page" );
    });

    // define a route to handle logout
    app.get( "/logout", ( req: any, res ) => {
        req.logout();
        res.redirect( "/" );
    });

    // define a secure route handler for the guitars page
    app.get( "/page", auth.ensureAuthenticated(), (req: any, res ) => {
        res.send( "logged in" + JSON.stringify(req.userContext) + " !!!" );
    });
};
