import dotenv from 'dotenv';
dotenv.config();//Imen : getting variables from .env

const envConfig  = {
    PORT : process.env.PORT ,
    DB_HOST: process.env.DB_HOST ,
    DB_USER: process.env.DB_USER ,
    DB_PASSWORD: process.env.DB_PASSWORD  ,
    DB_NAME: process.env.DB_NAME ,
    JWT_SECRET: process.env.JWT_SECRET  ,
    REFRESH_TOKEN_SECRET:process.env.REFRESH_TOKEN_SECRET
} ;

export default envConfig ;
