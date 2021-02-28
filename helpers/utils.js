'use strict';

const moment = require('moment');


module.exports = class Utils {

    static sleep(ms) {
        return new Promise((resolve) => {
            setTimeout(resolve, ms);
        });
    }

    static extractLastSegment(url) {
        return url ? url.substring(url.lastIndexOf('/') + 1) : '';
    }

    static getHash(str) {
        // return Array.from(str).reduce((s, c) => Math.imul(31, s) + c.charCodeAt(0) | 0, 0);
        return Array.from(str).reduce((s, c) => {
            return Math.imul(31, s) + c.charCodeAt(0) | 0
        }, 0);
    }

    static randomString(size) {
        var result = '';
        var characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        var charactersLength = characters.length;
        for (var i = 0; i < size; i++) {
            result += characters.charAt(Math.floor(Math.random() * charactersLength));
        }
        return result;
    }

    static getTimeLabel(fmt){
        return moment().format(fmt ? fmt : 'YYYYMMDD-HHmmss-SSS');
    }

    static createObjectWithKeys(keyArray){
        const res = {};
        keyArray.forEach(item => res[item] = 0);
        return res;
    }

    static getForecastTime(data){
        data.answer = {
            end_dt: null,
            speed: null,
            count: null
        }
        if(data.prev && data.last){
            if(data.last.count === 0){
                data.answer.end_dt = data.last.time;
            }
            else{
                const n = data.prev.count - data.last.count;
                const dif = moment.duration(data.last.time.diff(data.prev.time)).asSeconds();
                data.answer.speed = Math.round(n / dif * 100) / 100;
                data.answer.count = data.last.count;
                let secs = null;
                if(data.answer.speed === 0){
                    data.answer.end_dt = null;
                }
                else{
                    data.answer.end_dt = moment(data.last.time.toDate());
                    secs = data.last.count / data.answer.speed;
                    data.answer.end_dt.add(secs, 'seconds');
                }
                console.log(`count: ${n}, seconds: ${secs}, speed: ${data.answer.speed} rows/sec`);
                console.log(`forecast: ${data.answer.end_dt}`);
            }
        }
    }
}

