'use strict';

const createError = require('http-errors');
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const log4js = require('log4js');
const oracledb = require('oracledb');

const ofs = 10;
console.log("".padEnd(32, '='));
console.log("Platform:".padStart(ofs), process.platform);
console.log("Version:".padStart(ofs), process.version);
console.log("Arch:".padStart(ofs), process.arch);
console.log("OracleDB:".padStart(ofs), oracledb.versionString);
console.log("Client:".padStart(ofs), oracledb.oracleClientVersionString);
console.log("".padEnd(32, '='));

const apiRouter = require('./routes/api');
const app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

const log = log4js.getLogger('app');

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

// app.use(function (req, res, next) {
//     console.log(req.path);
//     next();
// });

app.use(express.static(path.join(__dirname, 'public')));

app.use('/api', apiRouter);

app.use('*', (req, res, next) => {
    const fpath = path.resolve('./views/template.html');
    res.sendFile(fpath);
    // next();
});


// catch 404 and forward to error handler
app.use(function (req, res, next) {
    // console.log(req.path);
    next(createError(404));
});

// error handler
app.use(function (err, req, res, next) {
    // set locals, only providing error in development
    res.locals.message = err.message;
    res.locals.error = req.app.get('env') === 'development' ? err : {};
    // render the error page
    res.status(err.status || 500).json('Sorry, not found');
    log.warn(err.message);
});

module.exports = app;
