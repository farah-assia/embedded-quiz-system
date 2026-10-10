import express from 'express';
import cors from 'cors' ;
import morgan from 'morgan';

const appConfig = (app) => {
    app.use(express.json());
    app.use(cors()); //Imen : It allows cross-platform request 
    app.use(morgan("dev"));
};

export default appConfig ;