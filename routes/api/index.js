'use strict';

const express = require('express');
const path = require('path');
const log4js = require('log4js');
const moment = require('moment');
const sqlFormatter = require('sql-formatter');

const cfg = require('../../config').api;
const CONST = require('../../resources/const');
const holder = require('../../helpers/sql_holder');
const Utils = require('../../helpers/utils');
const DBHelper = require('../../helpers/db_helper');
const dbg_data = require('../../config/dbg_const.json');
const sql_holder = require('../../helpers/sql_holder');
const adp = require('../../helpers/adapter');
const Adapter = require('../../helpers/adapter');

const log = log4js.getLogger('API');

const SAbon = require('../../models/sio_tree');
const {
    ALL_CHILDREN,
    WO_CHILDREN,
    DIR_CHILDREN,
    Glob,
    BaseNode,
    SioAbon,
    SioDog,
    SioObj,
    SioAttp,
    SioPoint,
    SioPU,
    SioRegister,
    IseDog } = require('../../models/sio_tree');

const http_codes = [204, 301, 304, 400, 401, 403, 404, 500, 503];

const db_helper = new DBHelper(cfg.db);
db_helper.init()
    .then((data) => {
        db_helper.updForecast(forecast_data);
        setTimeout(() => { db_helper.updForecast(forecast_data) }, 60000);
    });

const router = express.Router();

const forecast_data = {
    prev: null,
    last: {
        time: null,
        count: 0
    }
}

setInterval(async () => { await db_helper.updForecast(forecast_data); }, 300000);

router.post('/v1/auth', async (req, res) => {
    if (req.body.username === 'demo' && req.body.password === 'demo') {
        res.json({ success: true });
    }
    else {
        res.status(404).json({ success: false, msg: 'Неверный логин или пароль' });
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

router.get('/v1/forecast', async (req, res) => {
    log.debug('/v1/forecast');

    try {
        Utils.getForecastTime(forecast_data);
        res.json(forecast_data.answer);
    }
    catch (ex) {
        res.status(500).json({ msg: ex.message }).end();
    }
});

router.get('/v1/forecast/:recalc', async (req, res) => {
    log.debug('/v1/forecast/' + req.params.recalc);
    const do_recalc = req.params.recalc === '1' ? 1 : 0;
    const ans = await db_helper.dbgForecast(do_recalc);
    // console.log(ans);
    if (ans.success) {
        res.json({ end_dt: ans.dt, speed: data.speed, count: data.last.count });
    }
    else {
        res.status(500).json({ msg: ans.error }).end();
    }
});

router.get('/v1/pair-stat', async (req, res) => {
    log.debug('/v1/pair-stat');
    const sql = holder.get('pair_stat');
    // console.log(sql);
    const ans = await db_helper.select(sql, {});
    // console.log(ans);
    if (ans.success) {
        res.send(ans.rows);
    }
    else {
        res.status(500).json({ msg: ans.error }).end();
    }
});

router.get('/v1/handle-stat/:source', async (req, res) => {
    log.debug('/v1/handle-stat');
    const sql = holder.get('handle_stat').replace('#source#', req.params.source === 'i' ? 'VI_HANDLE_STAT' : 'VI_HANDLE_STAT_CALC');
    // console.log(sql);
    const ans = await db_helper.select(sql, {});
    // console.log(ans);
    if (ans.success) {
        res.send(ans.rows);
    }
    else {
        res.status(500).json({ msg: ans.error }).end();
    }
});

router.get('/v1/dbg-load61', async (req, res) => {
    const ans = await db_helper.select(holder.get('dbg-load61'), {});
    // console.log(ans);
    if (ans.success) {
        res.send(ans.rows);
    }
    else {
        res.status(500).json({ msg: ans.error }).end();
    }
});

router.post('/v2/counters', async (req, res) => {
    const cond = req.body;

    const binds_labs = { tag: cond.tag, dt_beg: moment(cond.dt_beg).toDate(), dt_end: moment(cond.dt_end).add(1, 'days').toDate() };
    const res_labs = await db_helper.select(holder.get('get_counter_labels'), binds_labs);
    const labels = res_labs.rows.map((col, i) => { return col.CODE; });

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
        for (const row of result.rows) {
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
    const labels = res_labs.rows.map((col, i) => { return col.CODE; });
    // delete binds.tag;

    const sql = holder.get('get_counters_full');
    // binds.fmt = cond.fmt;
    const result = await db_helper.select(sql, binds);
    if (result.success) {

        const data = {};
        for (const row of result.rows) {
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

router.get('/v1/log/range/:labelId', async (req, res) => {
    try {
        const sql = holder.get('log_label_time_range').replace(/##lab##/g, req.params.labelId);
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
    const msg_pattern = cond.msg ? cond.msg.substr(0, 50) + '%' : null;
    const binds = [msg_pattern, msg_pattern, cond.beg_id, cond.end_id];
    const result = await db_helper.select(holder.get('stat_log_error_trans'), binds);
    if (result.success) {
        res.send(result.rows);
    }
    else {
        res.status(500).send(result.error);
    }
});

router.get('/v1/transact/last', async (req, res) => {
    console.log('/api/v1/transact/last');
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

router.get('/v1/transact/:tran_id', async (req, res) => {
    const sql = holder.get('tran_rows');
    const binds = [req.params.tran_id];

    const result = await db_helper.select(sql, binds);
    const data = result.rows;
    if (result.success) {
        res.send(data);
    }
    else {
        res.status(500).send(result.error);
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

router.get('/v1/links/dblise', async (req, res) => {
    const sql = holder.get('links_dbl_ise');
    const result = await db_helper.execSql(sql);
    console.log(result.data.length);
    const data = result.data;
    if (result.success) {
        res.send(data);
    }
    else {
        res.status(500).send(result.error);
    }
});

router.get('/v1/links/info/:key', async (req, res) => {
    try {
        // req.params.key = Buffer.from(req.params.key, 'base64').toString();
        // req.params.key = req.params.key.startsWith('column') ? req.params.key : 'http://trinidata.ru/sigma/' + req.params.key;
        const key = req.params.key.startsWith('column') ? req.params.key : 'http://trinidata.ru/sigma/' + req.params.key;
        let sql = holder.get('links_ise_keys');
        let binds = [key];
        console.debug(req.params.key);

        let result = await db_helper.select(sql, binds);
        if (!result.success) {
            const msg = { message: result.error };
            res.status(500).send(msg);
            console.error(msg);
            return;
        }

        if (result.rows.length === 0) {
            const msg = { message: 'KEY PARAMETER NOT FOUND' };
            res.status(404).send(msg);
            console.error(msg);
            return;
        }

        /// массив пар [{ID, KOD_OBJTYPE, DT, FLOW_TYPE, TAG}]
        /// будет заполняться для всех уровней
        const pairs = result.rows;

        /// определение уровня пары
        const type = pairs[0].KOD_OBJTYPE;

        /// получение ID абонента для начала построения дерева объекта
        sql = `SELECT DBG_TOOLS.GET_SIO_ROOT( '${key}', ${type}) as ABON_KODP FROM dual`;
        result = await db_helper.select(sql, []);

        if (!result.success) {
            const msg = { message: result.error };
            res.status(500).send(msg);
            console.error(msg);
            return;
        }

        if (result.rows.length === 0) {
            const msg = { message: 'ABONENT NOT FOUND IN VI_SIO' };
            res.status(404).send(msg);
            console.error(msg);
            return;
        }

        const sio_abon_id = Adapter.deletePfx(result.rows[0].ABON_KODP);

        /// построение дерева объекта
        try {
            Glob.db_helper = db_helper;

            const abons = await SioAbon.findById(sio_abon_id, DIR_CHILDREN);
            for (const abon of abons) {
                abon.markBranch(req.params.key, 'selected', true);
            }
            // console.debug(abons);
            res.json(abons);
        }
        catch (ex) {
            const msg = { message: ex.message, stack: ex.stack };
            res.status(500).send(msg);
            console.error(msg);
            return;
        }
    }
    catch (ex) {
        const msg = { message: ex.message, stack: ex.stack };
        res.status(500).send(msg);
        console.error(msg);
        return;
    }
});

router.get('/v2/links/info/:key', async (req, res) => {
    try {
        // req.params.key = Buffer.from(req.params.key, 'base64').toString();
        // req.params.key = req.params.key.startsWith('column') ? req.params.key : 'http://trinidata.ru/sigma/' + req.params.key;
        const key = req.params.key.startsWith('column') ? req.params.key : CONST.SIO_ID_PFX + req.params.key;

        let abon = null;

        /// 1. get key chain to parent
        const chain_sql = `SELECT COLUMN_VALUE AS IES FROM TABLE(DBG_TOOLS.GET_SIO_KEYS_UP(:key))`;
        const chain_res = await db_helper.select(chain_sql, [key]);

        Glob.db_helper = db_helper;

        /// 2. query all nodes from chain by id
        if (chain_res.success) {
            if (chain_res.rows.length > 0) {

                if (chain_res.rows[0].IES.startsWith('0')) {
                    const parts = chain_res.rows[0].IES.split(',');
                    throw new Error(parts[1]);
                }

                let parent = null;
                for (let i = chain_res.rows.length - 1; i >= 0; i--) {
                    const parts = chain_res.rows[i].IES.split(',');
                    const node = await Glob.create(parts[1], parseInt(parts[0]));
                    if (abon === null) {
                        abon = node;
                    }
                    else {
                        await parent.replaceChild(node);
                    }
                    await node.loadChildren();
                    node.loaded = true;
                    parent = node;
                }
            }
        }
        else {
            throw new Error(chain_res.error);
        }

        abon.markBranch(req.params.key, 'selected', true);
        res.json([abon]);
    }
    catch (ex) {
        const msg = { message: ex.message, stack: ex.stack };
        res.status(500).send(msg);
        console.error(msg);
        return;
    }
});

router.get('/v1/links/node-children/:key', async (req, res) => {
    try {
        const key = req.params.key.startsWith('column') ? req.params.key : CONST.SIO_ID_PFX + req.params.key;

        let abon = null;

        /// 1. get key chain to parent
        const chain_sql = `SELECT COLUMN_VALUE AS IES FROM TABLE(DBG_TOOLS.GET_SIO_KEYS_UP(:key))`;
        const chain_res = await db_helper.select(chain_sql, [key]);

        Glob.db_helper = db_helper;

        /// 2. query all nodes from chain by id
        if (chain_res.success) {
            if (chain_res.rows.length > 0) {

                const parts = chain_res.rows[0].IES.split(',');

                if (chain_res.rows[0].IES.startsWith('0')) {
                    const parts = chain_res.rows[0].IES.split(',');
                    throw new Error(parts[1]);
                }

                const node = await Glob.create(parts[1], parseInt(parts[0]));
                await node.loadChildren();
                node.loaded = true;

                res.json(node.nodes);
            }
            else{
                res.json([]);
            }
        }
        else {
            throw new Error(chain_res.error);
        }
    }
    catch (ex) {
        const msg = { message: ex.message, stack: ex.stack };
        res.status(500).send(msg);
        console.error(msg);
    }
});

router.get('/v1/links/sio2ise/:key', async (req, res) => {
    try {

        // req.params.key = Buffer.from(req.params.key, 'base64').toString();
        const key = req.params.key.startsWith('column') ? req.params.key : 'http://trinidata.ru/sigma/' + req.params.key;

        // 1. Пары
        let sql = holder.get('links_ise_keys');
        let binds = [key];
        let result = await db_helper.select(sql, binds);

        Glob.db_helper = db_helper;

        let answer = [];
        // 2. Объекты
        for (const row of result.rows) {
            switch (row.KOD_OBJTYPE) {
                case 1:
                    const ise_info = await IseDog.load(row.ID);
                    answer.push(ise_info);
                    // row.visible = ise_rows.visible;
                    // Utils.copyProps(ise_rows[0], row);
                    break;
            }
        }
        res.send(answer);
    }
    catch (ex) {
        const msg = { message: ex.message, stack: ex.stack };
        res.status(500).send(msg);
        console.error(msg);
        return;
    }
});

router.get('/v1/test', async (req, res) => {
    try {
        const key = 'http://trinidata.ru/sigma/Системаио_995230_ТПО_ЮЛ_2215933653';
        let sql = 'SELECT COLUMN_VALUE AS IES FROM TABLE(DBG_TOOLS.GET_SIO_KEYS_UP(:key))';
        let binds = [key];
        let result = await db_helper.select(sql, binds);
        if (result.success) {
            res.json(result.rows);
        }
        else {
            throw new Error(result.error);
        }
    }
    catch (ex) {
        const msg = { message: ex.message, stack: ex.stack };
        res.status(500).send(msg);
        console.error(msg);
        return;
    }
});


router.get('/v1/links/sio_item/:type/:id', async (req, res) => {
    let sql = holder.get('links_sio_info_' + req.params.type);

    if (sql) {
        const binds = [req.params.id];

        const sio_result = await db_helper.select(sql, binds);
        if (sio_result.success) {

            if (sio_result.rows && sio_result.rows.length > 0) {
                const data = {
                    sio: sio_result.rows[0]
                }

                const ise_result = await db_helper.select(holder.get('links_ise_' + req.params.type), binds);
                const rows = ise_result.rows;
                if (ise_result.success) {
                    data.ise = ise_result.rows;
                    res.send(data);
                }
                else {
                    res.status(500).send({ error: ise_result.error });
                }
            }
            else {
                res.status(404).end();
            }
        }
        else {
            res.status(500).send({ error: result.error });
        }
    }
    else {
        res.status(400).send({ error: 'wrong type' });
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

router.post('/v1/file', async (req, res) => {
    console.log(req.headers);
    res.json({ success: true });
});



module.exports = router;