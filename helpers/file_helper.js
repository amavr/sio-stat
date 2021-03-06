'use strict';

const path = require('path');
const fs = require('fs');
const readline = require('readline');
const lineReader = require('line-reader');
const fsp = fs.promises;
const moment = require('moment');
const iconv = require('iconv-lite');

const Utils = require('./utils');
const { config } = require('process');

const TYPE_NAMES = {
    type_61: "6.1",
    type_131: "13.1",
    type_161: "16.1"
}


class FileHelper {

    static FileExistsSync(fpath) {
        return fs.existsSync(fpath);
    }

    static getFilesSync(dirPath, options) {
        return fs.readdirSync(dirPath, options);
    }

    static getFiles(dirPath, options) {
        return fsp.readdir(dirPath, options);
    }

    static readAsObject(filePath) {
        return new Promise((resolve, reject) => {
            // fsp.readFile(filePath)
            FileHelper.readText(filePath)
                .then(data => {
                    resolve(JSON.parse(data));
                })
                .catch(err => {
                    reject(err);
                });
        });
    }

    static readAsObjectSync(filePath) {
        const buf = fs.readFileSync(filePath, 'utf8');
        return JSON.parse(buf);
    }

    static read(filePath) {
        return new Promise((resolve, reject) => {
            fsp.readFile(filePath, 'utf8')
                .then(data => {
                    resolve(data);
                })
                .catch(err => {
                    reject(err);
                });
        });
    }

    // static readByLine(filePath, onLine) {
    //     lineReader.eachLine(filePath, (line, last) => {
    //         onLine(line);
    //     });
    // }

    static processLineByLine(filePath, onLine) {
        return new Promise((resolve, reject) => {
            const stream = fs.createReadStream(filePath);

            const rl = readline.createInterface({
                input: stream,
                crlfDelay: Infinity
            });
            // Note: we use the crlfDelay option to recognize all instances of CR LF
            // ('\r\n') in input.txt as a single line break.

           
            stream.on('end', () => resolve());
            stream.on('error', () => reject(error));
            rl.on('line', onLine);
        });
    }

    // ????????????????! ?????????? ?????????????????? 1251!!!
    static readLines(filePath, onLine, onComplete) {
        return new Promise((resolve, reject) => {
            const stream = fs.createReadStream(filePath)
                .pipe(iconv.decodeStream('win1251'));

            const rl = readline.createInterface({
                input: stream,
                crlfDelay: Infinity
            });
            // Note: we use the crlfDelay option to recognize all instances of CR LF
            // ('\r\n') in input.txt as a single line break.
           
            stream.on('end', () => resolve());
            stream.on('error', () => reject(error));
            rl.on('line', onLine);
            rl.on('close', onComplete);
        });
    }

    static async saveObj(filePath, obj) {
        const json = JSON.stringify(obj, null, 4);
        return await FileHelper.save(filePath, json);
    }

    static async save(filePath, val) {
        FileHelper.checkDir(filePath);
        return await fsp.writeFile(filePath, val);
    }

    static saveObjSync(filePath, obj) {
        const json = JSON.stringify(obj, null, 4);
        FileHelper.saveSync(filePath, json);
    }

    static saveSync(filePath, val) {
        FileHelper.checkDir(filePath);
        fs.writeFileSync(filePath, val);
    }

    static moveFileSync(sour, dest, onError) {
        FileHelper.checkDir(dest);
        fs.rename(sour, dest, err => {
            if (err) {
                if (onError === undefined) {
                    console.error(err);
                }
                else {
                    onError(err);
                }
            }
        });
    }

    static append(filePath, data) {
        fsp.appendFile(filePath, data);
    }

    static appendSync(filePath, data) {
        fs.appendFileSync(filePath, data);
    }

    static checkDir(filePath) {
        const dir = path.dirname(filePath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
    }

    static getTimeFilename(ext) {
        return moment().format('YYYYMMDD-HHmmss-SSSS') + '.' + (ext ? ext.replace(/^\.*/g, '') : 'json');
    }

    static readText(filePath) {
        return new Promise((resolve, reject) => {
            let buf = '';
            fs.createReadStream(filePath, { flags: 'r', encoding: 'utf-8' })
                .on('data', chunk => {
                    buf += chunk;
                })
                .on('error', err => {
                    reject(err);
                })
                .on('close', () => {
                    resolve(buf);
                })
        });
    }

    static isCurrent(dirName, nowStr) {
        if (dirName) {
            return (nowStr + '/').startsWith(dirName + '/');
        }
        else {
            return false;
        }
    }

    static getCurFolder(momento) {
        momento.minute(momento.minute() < 30 ? 0 : 30);
        return momento.format('YYYY/M/D/H/mm');
    }

    static getDirItems(dir) {
        const items = {
            files: [],
            dirs: []
        }

        fs.readdirSync(dir, { withFileTypes: true }).forEach(item => {
            if (item.isDirectory()) {
                items.dirs.push(item.name);
            } else {
                items.files.push(item.name);
            }
        });

        return items;
    }

    /// ???????????????? ??????????, ?????????????? ???????????? ????????????
    static requestFiles(rootDir, recurDir, limitFiles) {
        recurDir = recurDir.replace(/\\/g, '/');
        // console.log(recurDir);

        const now = moment();
        /// ?????????????? ??????????, ?????????????? ???????????? ??????????????
        const nowStr = FileHelper.getCurFolder(now);
        const dir = path.join(rootDir, recurDir);

        /// ???????????????? ?????????????????????????????? ???????????? ?????????? ?? ???????????? ????????????
        let items = FileHelper.getDirItems(dir);


        /// ???????? ?? ?????????? ?????????????????? ??????????, ???? ?? ?????? ???????????? ???????????? ???? ??????????????
        /// ???????????? ?????????????? ??????????
        if (items.files.length > 0) {
            if (items.files.length > limitFiles) {
                items.files.splice(limitFiles);
            }
            // console.log(dir);
            /// ?????????????? ?????????? ?????? ?????????????????????????? ?? ?????????? ????????????
            items.files = items.files.map(f => path.join(recurDir, f));
            return items;
        }

        /// ???? ?????????? ????????! ?????????? ????????????????
        if (items.dirs.length > 0) {
            // items.dirs.sort();
            /// ?????????????????? ?????????? ?? ??????????????????
            for (const d of items.dirs) {
                try {
                    items = FileHelper.requestFiles(rootDir, path.join(recurDir, d), limitFiles);
                    /// ?????????? ????????, - ???? ??????????
                    if (items.files.length > 0) {
                        // console.log('return items');
                        /// ?????????? ???? ????????????????
                        return items;
                    }
                }
                catch (ex) {
                    console.error(ex);
                    console.log(`rootDir: [${rootDir}]`);
                    console.log(`recurDir: [${recurDir}]`);
                }

            }
            /// ?????????? ?????????????????? ????????????????????, ??.??. ?????????????????????? ?????????? ?????? ?????????????? ?????????????????? ????????????????
            items = FileHelper.getDirItems(dir);
            // console.log(`check dirs for ${dir}: ${items.dirs.length}`)
            if (items.dirs.length > 0) {
                // console.log(`checked: ${items.dirs[0].name}`);
            }
        }

        /// ???????????????? ???????????? ??????????
        if (
            /// ???? ???????????? ?????????????????????? ???? ??????????????
            recurDir.length > 0
            /// ?? ?????? ?????? ????????????
            && items.files.length === 0
            /// ?? ?????? ?????? ????????????????
            && items.dirs.length === 0
            /// ?? ?????? ???? ?????????????? (???? ??????????????)
            && FileHelper.isCurrent(recurDir, nowStr) === false
        ) {
            console.log(`del recurDir: [${recurDir}] nowStr: [${nowStr}]`);
            fs.rmdirSync(dir);
        }

        return items;
    }

    static getFileDirToProcess(type_path) {
        return new Promise(function (resolve, reject) {

            let infiles_path = path.join(utildir.get_in(utildir.opt), type_path);
            // ?????????? ???? ?????????????????? ?????????????? ??????
            utildir.getOldestDir(infiles_path).then(function (year) {
                if (year === null) {
                    resolve(null);
                } else {
                    let infiles_path_year = infiles_path + year;
                    utildir.getOldestDir(infiles_path_year).then(function (month) {
                        if (month === null) {
                            fs.rmdirSync(infiles_path_year);
                            resolve(null);
                        } else {
                            let infiles_path_month = infiles_path_year + month;
                            utildir.getOldestDir(infiles_path_month).then(function (day) {
                                if (day === null) {
                                    fs.rmdirSync(infiles_path_month);
                                    resolve(null);
                                } else {
                                    let infiles_path_day = infiles_path_month + day;
                                    utildir.getOldestDir(infiles_path_day).then(function (hours) {
                                        if (hours === null) {
                                            fs.rmdirSync(infiles_path_day);
                                            resolve(null);
                                        } else {
                                            let infiles_path_hours = infiles_path_day + hours;
                                            utildir.getOldestDir(infiles_path_hours).then(function (minutes) {
                                                if (minutes === null) {
                                                    fs.rmdirSync(infiles_path_hours);
                                                    resolve(null);
                                                } else {
                                                    let infiles_path_minutes = infiles_path_hours + minutes;
                                                    resolve(infiles_path_minutes);
                                                }
                                            }).catch(function (err) {
                                                internalError(err);
                                                reject(err);
                                            });
                                        }
                                    }).catch(function (err) {
                                        internalError(err);
                                        reject(err);
                                    });
                                }
                            }).catch(function (err) {
                                internalError(err);
                                reject(err);
                            });
                        }
                    }).catch(function (err) {
                        internalError(err);
                        reject(err);
                    });
                }
            }).catch(function (err) {
                internalError(err);
                reject(err);
            });
        });
    };

}

module.exports = FileHelper;