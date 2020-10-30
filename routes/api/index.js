'use strict';

const express = require('express');
const path = require('path');
const log4js = require('log4js');
const moment = require('moment');
const sqlFormatter = require('sql-formatter');

const cfg = require('../../config').api;
const holder = require('../../helpers/sql_holder');
const Utils = require('../../helpers/utils');
const DBHelper = require('../../helpers/db_helper');
const dbg_data = require('../../config/dbg_const.json');

const log = log4js.getLogger('API');

const http_codes = [204, 301, 304, 400, 401, 403, 404, 500, 503];

const db_helper = new DBHelper(cfg.db);
db_helper.init();

const router = express.Router();


router.post('/v1/auth', async (req, res) => {
    if(req.body.username === 'demo' && req.body.password === 'demo'){
        res.json({success: true});
    }
    else{
        res.status(404).json({success: false, msg: 'Неверный логин или пароль'});
    }
});

router.get('/v1/sidebar/:user', async (req, res) => {

    // const role = dbg_data.users.


    res.json(
        [{
            title: 'Статистика',
            items: [
                {
                    title: 'Общая',
                    url: 'common'
                },
                {
                    title: 'Ошибки',
                    url: 'errors'
                },
                {
                    title: 'Загрузка',
                    url: 'loading'
                },
            ]
        },
        {
            title: 'Мониторинг',
            items: [
                {
                    title: 'Ошибки',
                    url: 'errors'
                },
                {
                    title: 'Загрузка',
                    url: 'loading'
                },
            ]
        }]);
});

router.get('/v1/msg', async (req, res) => {
    const dir = 'C:/temp/data/test';
    try {
        const n = Math.floor(Math.random() * 11);
        if (n < 9) {
            const fname = n < 6 ? 'good-161.json'
                : n === 8 ? 'bad-161.json'
                    : 'unknown-161.json';
            const data = await FileHelper.readText(path.join(dir, fname));
            res.header('file', fname);
            res.json(data);
        }
        else if (n === 9) {
            res.status(204).end();
        }
        else {
            const i = Math.floor(Math.random() * 9);
            res.status(http_codes[i]).end();
        }
    }
    catch (ex) {
        log.error(ex);
    }
});

router.get('/v1/pair-stat', async (req, res) => {
    log.debug('/v1/pair-stat');
    const sql = holder.get('pair_stat');
    // console.log(sql);
    const ans = await db_helper.select(sql, {});
    // console.log(ans);
    if (ans.success) {
        res.send(ans.data);
    }
    else {
        res.status(500).json({ msg: ans.error }).end();
    }
});

router.get('/v1/handle-stat', async (req, res) => {
    log.debug('/v1/handle-stat');
    const sql = holder.get('handle_stat');
    // console.log(sql);
    const ans = await db_helper.select(sql, {});
    // console.log(ans);
    if (ans.success) {
        res.send(ans.data);
    }
    else {
        res.status(500).json({ msg: ans.error }).end();
    }
});

router.get('/v1/dbg-load61', async (req, res) => {
    const ans = await db_helper.select(holder.get('dbg-load61'), {});
    // console.log(ans);
    if (ans.success) {
        res.send(ans.data);
    }
    else {
        res.status(500).json({ msg: ans.error }).end();
    }
});

router.post('/v2/counters', async (req, res) => {
    const cond = req.body;

    const binds_labs = { tag: cond.tag, dt_beg: moment(cond.dt_beg).toDate(), dt_end: moment(cond.dt_end).toDate() };
    const res_labs = await db_helper.select(holder.get('get_counter_labels'), binds_labs);
    const labels = res_labs.data.map((col, i) => { return col.CODE; });

    const now = moment();
    const l = now.diff(moment(cond.dt_beg).toDate(), 'days');
    const r = now.diff(moment(cond.dt_end).toDate(), 'days');
    const binds = { tag: cond.tag, day_l: l, day_r: r, trn: cond.trunc };

    const sql = holder.get('get_counters_full');
    console.log(binds);
    // console.log(sql);
    const result = await db_helper.select(sql, binds);
    if (result.success) {

        const data = {};
        for (const row of result.data) {
            const time = row.TIME.substr(8);
            if (data[time] === undefined) {
                data[time] = Utils.createObjectWithKeys(labels);
            }
            if (row.CODE) {
                data[time][row.CODE] = row.NUM;
            }
        }

        res.send(data).end();
    }
    else {
        res.status(500).json(result);
    }
});

router.post('/v1/counters', async (req, res) => {
    const cond = req.body;

    const binds = { tag: cond.tag, dt_beg: moment(cond.dt_beg).toDate(), dt_end: moment(cond.dt_end).toDate() };
    const res_labs = await db_helper.select(holder.get('get_counter_labels'), binds);
    const labels = res_labs.data.map((col, i) => { return col.CODE; });
    // delete binds.tag;

    const sql = holder.get('get_counters_full');
    // binds.fmt = cond.fmt;
    const result = await db_helper.select(sql, binds);
    if (result.success) {

        const data = {};
        for (const row of result.data) {
            const time = row.TIME.substr(8) + ':00';
            if (data[time] === undefined) {
                data[time] = Utils.createObjectWithKeys(labels);
            }
            data[time][row.CODE] = row.NUM;
        }

        res.send(data);
    }
    else {
        res.status(500).json(result);
    }
});

router.get('/v1/times/labels', async (req, res) => {
    try {
        const sql = 'SELECT id, dt, type, name FROM sio_times ORDER BY dt DESC';
        const result = await db_helper.execSql(sql);
        if (result.success) {
            res.send(result.data);
        }
        else {
            res.status(500).send(result.error);
        }
    }
    catch (ex) {
        res.status(500).send(ex.message);
    }
});

router.get('/v1/times/labels/:labelId', async (req, res) => {
    try {
        const sql = `SELECT code, val FROM sio_counters WHERE SIO_TIME_ID = '${req.params.labelId}' ORDER BY code`;
        const result = await db_helper.execSql(sql);
        if (result.success) {
            res.send(result.data);
        }
        else {
            res.status(500).send(result.error);
        }
    }
    catch (ex) {
        res.status(500).send(ex.message);
    }
});


router.get('/v1/times/labels/log/:labelId', async (req, res) => {
    try {
        const label_id = req.params.labelId;
        // const sql = `SELECT min(l.id) log_id FROM sio_mdm_log l, sio_times t  WHERE l.dt >= t.dt AND t.id = '${req.params.labelId}'`;
        const sql = holder.get('log_range_by_label').replace(/##lab##/g, label_id);
        // console.debug(sql);
        const result = await db_helper.execSql(sql);
        if (result.success) {
            res.send(result.data);
        }
        else {
            res.status(500).send(result.error);
        }
    }
    catch (ex) {
        res.status(500).send(ex.message);
    }
});


router.post('/v1/sql', async (req, res) => {
    const sql = req.body.sql;
    const fmt = sqlFormatter.format(sql, { language: "pl/sql", indent: '\t' }).replace(/=\s+>/g, '=>');
    // res.setHeader('Content-Type', 'text/plain');
    res.send({ sql: fmt });
});

router.post('/v1/errors', async (req, res) => {
    const cond = req.body;
    const sql = holder.get('stat_log_errors').replace('##beg_id##', cond.beg_id).replace('##end_id##', cond.end_id);
    const result = await db_helper.execSql(sql);
    const data = result.data === null 
        ? []
        : result.data.map((val, i) => {
            return [val.MSG, val.NUM];
        });
    res.send(data);
});

router.post('/v1/error-trans', async (req, res) => {
    const cond = req.body;
    // const binds = { expr: cond.expr, beg_id: cond.beg_id, dt_end: cond.end_id };
    const binds = [cond.msg.substr(0, 50) + '%', cond.beg_id, cond.end_id];
    const result = await db_helper.select(holder.get('stat_log_error_trans'), binds);
    if (result.success) {
        res.send(result.data);
    }
    else {
        res.status(500).send(result.error);
    }
});

router.get('/v1/transact/:tran_id', async (req, res) => {
    const sql = holder.get('tran_rows');
    const binds = [req.params.tran_id];

    const result = await db_helper.select(sql, binds);
    const data = result.data;
    if (result.success) {
        res.send(data);
    }
    else {
        res.status(500).send(result.error);
    }
});

router.get('/v1/transact/last', async (req, res) => {
    try {
        const sql = holder.get('last_tran_id');
        const result = await db_helper.execSql(sql);
        if (result.success) {
            if (result.data.length === 0) {
                res.status(204).send({ TRAN_ID: 0 });
            }
            else {
                res.send(result.data[0]);
            }
        }
        else {
            res.status(500).send(result.error);
        }
    }
    catch (ex) {
        res.status(500).send(ex.message);
    }
});


router.get('/v1/transactx/:tran_id', async (req, res) => {
    const cond = req.body;
    const sql = `SELECT m.* FROM SIO_MDM_LOG m WHERE m.TRAN_ID = ${req.params.tran_id} ORDER BY m.ID`;

    const result = await db_helper.execSql(sql);
    const data = result.data;
    if (result.success) {
        res.send(data);
    }
    else {
        res.status(500).send(result.error);
    }
});

router.get('/v1/stat/objects/added', async (req, res) => {
    const cond = req.body;
    const sql = holder.get('stat_add_objects');
    const result = await db_helper.execSql(sql);
    const counters = ['', 0, 0, 0, 0, 0, 0];
    const data = [];
    result.data.forEach(val => {
        counters[0] = val.YMD;
        counters[1] += val.ABON;
        counters[2] += val.DOG;
        counters[3] += val.OBJ;
        counters[4] += val.ATTP;
        counters[5] += val.PU;
        counters[6] += val.IND;
        data.push(Array.from(counters));
    });
    // const data = result.data.map((val, i) => {
    //     counters[0] = val.YMD;
    //     counters[1] += val.ABON;
    //     counters[2] += val.DOG;
    //     counters[3] += val.OBJ;
    //     counters[4] += val.ATTP;
    //     counters[5] += val.PU;
    //     counters[6] += val.IND;
    //     return Array.from(counters);//[val.YMD, val.ABON, val.DOG, val.OBJ, val.ATTP, val.PU, val.IND];
    // });
    res.header("Cache-Control", "no-cache, no-store, must-revalidate");
    res.header("Pragma", "no-cache");
    res.header("Expires", 0);
    res.send(data);
});



module.exports = router;