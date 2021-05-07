'use strict';

const express = require('express');
const path = require('path');
const log4js = require('log4js');
const moment = require('moment');
const sqlFormatter = require('sql-formatter');
const onHeaders = require('on-headers');

const cfg = require('../../config').api;
const CONST = require('../../resources/const');
const holder = require('../../helpers/sql_holder');
const Utils = require('../../helpers/utils');
const db = require('../../helpers/db');
const dbg_data = require('../../config/dbg_const.json');
const FileHelper = require('../../helpers/file_helper');
const adp = require('../../helpers/adapter');
const Adapter = require('../../helpers/adapter');

const log = log4js.getLogger('API');

const SAbon = require('../../models/sio_tree');
const {
    ALL_CHILDREN,
    WO_CHILDREN,
    DIR_CHILDREN,
    GlobSIO,
    BaseNode,
    SioAbon,
    SioDog,
    SioObj,
    SioAttp,
    SioPoint,
    SioPU,
    SioRegister,
    IseDog,
    IseAbon,
    IseObj,
    IseAttp,
    IsePoint,
    IsePU,
    IseTr,
    IseReg
} = require('../../models/sio_tree');
const { localsAsTemplateData } = require('hbs');
const OracleDB = require('oracledb');

const http_codes = [204, 301, 304, 400, 401, 403, 404, 500, 503];

setImmediate(async () => {
    const dir = './helpers/sql/';
    const files = await FileHelper.getFiles(dir);
    for (const file of files) {
        const name = path.parse(file).name;
        const sql = await FileHelper.read(path.join(dir, file));
        db.setNamedSql(name, sql);
    }

    // log.info('start calc rows')
    // const tabs = [{name: 'SIO_MSG6_1', key: 'NOBJ_KOD_NUMOBJ'}, {name: 'SIO_MSG13_1', key: 'PACK_IES'}, {name: 'SIO_MSG16_1', key: 'NOBJ_KOD_NUMOBJ'}];
    // for(const tab of tabs){
    //     const count = await loadTab(tab.name, tab.key);
    //     log.info(`${tab.name}: ${count}`)
    // }
});


const loadTab = async function (tab, key) {
    const fname = `D:/IE/tmp/${tab}.txt`;
    // await FileHelper.save(fname, '');
    let rows = await db.select(`SELECT DISTINCT ${key} FROM ${tab}`);
    await FileHelper.save(fname, rows.map(row => row[key]).join('\n'));
    // const lines = [];
    // for(const row of rows){
    //     lines.push(row[key]);
    //     if(lines.length >= 1000){
    //         await FileHelper.append(fname, lines.join('\r\n'));
    //         lines.length = 0;
    //     }
    // }
    // await FileHelper.append(fname, lines.join('\r\n'));
    return rows.length;
}

const router = express.Router();

const forecast_data = {
    prev: null,
    last: {
        time: null,
        count: 0
    }
}

setInterval(async () => {
    try {
        if (forecast_data.last.time) {
            forecast_data.prev = {
                time: forecast_data.last.time,
                count: forecast_data.last.count
            }
        }
        const rows = await db.select('SELECT SYSDATE DT, COUNT(1) NUM FROM SIO_MSG6_1 WHERE FILENAME NOT IN (SELECT filename FROM SIO_READY_FILES6_1)');
        // const rows = await db.select('SELECT SYSDATE DT, COUNT(1) NUM FROM SIO_MSG13_1 WHERE FILENAME NOT IN (SELECT filename FROM SIO_READY_FILES13_1)');
        // const rows = await db.select('SELECT SYSDATE DT, COUNT(1) NUM FROM SIO_MSG16_1 WHERE FILENAME NOT IN (SELECT filename FROM SIO_READY_FILES16_1)');

        forecast_data.last.time = moment(rows[0].DT);
        forecast_data.last.count = rows[0].NUM;
        log.debug(JSON.stringify(forecast_data, null, '\t'));
    }
    catch (ex) {
        log.error(ex);
    }

}, 30000);

function scrubETag(res) {
    onHeaders(res, function () {
        this.removeHeader('ETag')
    })
}



router.get('/v1/ping', async (req, res) => {
    try {
        const rows = await db.select('select 1 from dual', {});
        res.send({ success: true });
    }
    catch (ex) {
        res.status(500).json({ msg: ex.message }).end();
        log.error(ex);
    }
});

router.post('/v1/auth', async (req, res) => {
    if (req.body.username === 'demo' && req.body.password === 'demo') {
        res.json({ success: true });
    }
    else {
        res.status(404).json({ success: false, msg: 'Неверный логин или пароль' });
    }
});

router.get('/v1/refs/id/:code/:ies', async (req, res) => {
    try {
        const val = db.refs[req.params.code][req.params.ies];
        res.send({ id: val });
    }
    catch (ex) {
        res.status(500).json({ msg: ex.message }).end();
        log.error(ex);
    }
});

router.get('/v1/refs', async (req, res) => {
    try {
        res.send(db.refs);
    }
    catch (ex) {
        res.status(500).json({ msg: ex.message }).end();
        log.error(ex);
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

router.get('/v1/forecast', async (req, res) => {
    log.debug('/v1/forecast');

    try {
        Utils.getForecastTime(forecast_data);
        res.json(forecast_data.answer);
    }
    catch (ex) {
        res.status(500).json({ msg: ex.message }).end();
        log.error(ex);
    }
});

router.get('/v1/pair-stat', async (req, res) => {
    log.debug('/v1/pair-stat');

    try {
        const rows = await db.selectSqlName('pair-stat', {});
        res.send(rows);
    }
    catch (ex) {
        res.status(500).json({ msg: ex.message }).end();
        log.error(ex);
    }
});

router.get('/v1/handle-stat/:source', async (req, res) => {
    log.debug('/v1/handle-stat');
    try {
        const replacings = {};
        replacings['#source#'] = req.params.source === 'i' ? 'VI_HANDLE_STAT' : 'VI_HANDLE_STAT_CALC';
        const rows = await db.selectSqlName('stat.handle', {}, replacings);
        res.send(rows);
    }
    catch (ex) {
        res.status(500).json({ msg: ex.message }).end();
        log.error(ex);
    }
});

router.post('/v2/counters', async (req, res) => {
    const cond = req.body;

    try {

        const binds_labs = { tag: cond.tag, dt_beg: moment(cond.dt_beg).toDate(), dt_end: moment(cond.dt_end).add(1, 'days').toDate() };
        const lab_rows = await db.selectSqlName('get_counter_labels', binds_labs);
        const labels = lab_rows.map((col, i) => { return col.CODE; });

        const now = moment();
        const l = now.diff(moment(cond.dt_beg).toDate(), 'days');
        const r = now.diff(moment(cond.dt_end).toDate(), 'days');

        const binds = { tag: cond.tag, day_l: l, day_r: r, trn: cond.trunc };
        const rows = await db.selectSqlName('get_counters_full', binds);

        const data = {};
        for (const row of rows) {
            const time = row.TIME.substr(8);
            if (data[time] === undefined) {
                data[time] = Utils.createObjectWithKeys(labels);
            }
            if (row.CODE) {
                data[time][row.CODE] = row.NUM;
            }
        }

        res.send(data);
    }
    catch (ex) {
        res.status(500).json({ msg: ex.message }).end();
        log.error(ex);
    }
});

router.get('/v1/times/labels', async (req, res) => {
    try {
        const sql = 'SELECT id, dt, type, name FROM sio_times ORDER BY dt DESC';
        const rows = await db.select(sql);
        res.send(rows);
    }
    catch (ex) {
        res.status(500).json({ msg: ex.message }).end();
        log.error(ex);
    }
});

// depricated
router.get('/v1/times/labels/log/:labelId', async (req, res) => {
    try {
        const rows = await db.selectSqlName('mdmlog.label_id_range', { label_id: req.params.labelId });
        res.send(rows);
    }
    catch (ex) {
        res.status(500).json({ msg: ex.message }).end();
        log.error(ex);
    }
});

// depricated
router.get('/v1/log/range/:labelId', async (req, res) => {
    try {
        const rows = await db.selectSqlName('mdmlog.label_time_range', { label_id: req.params.labelId });
        res.send(rows);
    }
    catch (ex) {
        res.status(500).json({ msg: ex.message }).end();
        log.error(ex);
    }
});

// depricated
router.get('/v1/times/labels/:labelId', async (req, res) => {
    try {
        const sql = `SELECT code, val FROM sio_counters WHERE SIO_TIME_ID = :label_id ORDER BY code`;
        const rows = await db.select(sql, { label_id: req.params.labelId });
        res.send(rows);
    }
    catch (ex) {
        res.status(500).json({ msg: ex.message }).end();
        log.error(ex);
    }
});

router.get('/v1/log/errors/:labelId', async (req, res) => {
    try {
        const rows = await db.selectSqlName('mdmlog.errors', { label_id: req.params.labelId });
        const data = rows === null
            ? []
            : rows.map((val, i) => {
                return [val.MSG, val.NUM];
            });

        res.send(data);
    }
    catch (ex) {
        res.status(500).json({ msg: ex.message }).end();
        log.error(ex);
    }
});

router.post('/v1/log/transacts', async (req, res) => {
    try {
        const msg_expr = req.body.msg ? req.body.msg.substr(0, 50) + '%' : null;
        const rows = await db.selectSqlName('mdmlog.transacts', { label_id: req.body.labelId, msg: msg_expr });
        res.send(rows);
    }
    catch (ex) {
        res.status(500).json({ msg: ex.message }).end();
        log.error(ex);
    }
});

router.post('/v1/sql', async (req, res) => {
    const sql = req.body.sql;
    const fmt = sqlFormatter.format(sql, { language: "pl/sql", indent: '\t' }).replace(/=\s+>/g, '=>');
    res.send({ sql: fmt });
});

router.get('/v1/transact/last', async (req, res) => {
    try {
        const rows = await db.selectSqlName('mdmlog.last_transact_id');
        if (rows.length === 0) {
            res.status(204).send({ TRAN_ID: 0 });
        }
        else {
            res.send(rows[0]);
        }
    }
    catch (ex) {
        res.status(500).json({ msg: ex.message }).end();
        log.error(ex);
    }
});

router.get('/v1/transact/:tran_id', async (req, res) => {
    try {
        const rows = await db.selectSqlName('mdmlog.tran_rows', { tran_id: req.params.tran_id });
        res.send(rows);
    }
    catch (ex) {
        res.status(500).json({ msg: ex.message }).end();
        log.error(ex);
    }
});

router.get('/v1/links/dblise', async (req, res) => {
    try {
        const rows = await db.selectSqlName('links.dbl_ise');
        res.send(rows);
    }
    catch (ex) {
        res.status(500).json({ msg: ex.message }).end();
        log.error(ex);
    }
});

router.get('/v2/links/info/', async (req, res) => {
    res.status(400).json({ msg: 'URL не содежит параметр SIO с идетификатором' })
});

router.get('/v2/links/info/:key', async (req, res) => {
    try {
        // req.params.key = Buffer.from(req.params.key, 'base64').toString();
        // req.params.key = req.params.key.startsWith('column') ? req.params.key : 'http://trinidata.ru/sigma/' + req.params.key;
        const key = req.params.key.startsWith('column') ? req.params.key : CONST.SIO_ID_PFX + req.params.key;

        let abon = null;

        /// 1. get key chain to parent
        const chain_sql = `SELECT COLUMN_VALUE AS IES FROM TABLE(DBG_TOOLS.GET_SIO_KEYS_UP(:key))`;
        const binds = { key: req.params.key.startsWith('column') ? req.params.key : CONST.SIO_ID_PFX + req.params.key };
        log.debug(`GET_SIO_KEYS_UP ${binds.key}`);
        const chain_rows = await db.select(chain_sql, binds);
        log.debug(`found ${chain_rows.length} keys`);

        /// 2. query all nodes from chain by id
        if (chain_rows.length > 0) {

            if (chain_rows[0].IES.startsWith('0')) {
                // const parts = chain_rows[0].IES.split(',');
                throw new Error(chain_rows[0].IES.substr(2));
            }

            let parent = null;
            for (let i = chain_rows.length - 1; i >= 0; i--) {
                const parts = chain_rows[i].IES.split(',');
                const node = await GlobSIO.create(parts[1], parseInt(parts[0]));
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
        else{
            const error = new Error(`Узел '${CONST.SIO_ID_PFX + req.params.key}' не имеет пары`);
            error.code = 404;
            throw error;
        }
        abon.markBranch(req.params.key, 'selected', true);
        res.json([abon]);
    }
    catch (ex) {
        if(ex.code === undefined) ex.code = 500;
        res.status(ex.code).json({ msg: ex.message }).end();
        log.error(ex);
    }
});

router.get('/v1/links/node-children/:key', async (req, res) => {
    try {

        const sql = 'SELECT /*+ RULE */ KOD_OBJTYPE FROM IER_LINK_OBJECTS WHERE ID_IES = :key AND ROWNUM < 2';
        const binds = { key: req.params.key.startsWith('column') ? req.params.key : CONST.SIO_ID_PFX + req.params.key };
        const rows = await db.select(sql, binds);
        if (rows.length > 0) {
            const node = await GlobSIO.create(binds.key, rows[0].KOD_OBJTYPE);
            await node.loadChildren();
            node.loaded = true;

            res.json(node.nodes);
        }
        else {
            res.json([]);
        }
    }
    catch (ex) {
        if(ex.code === undefined) ex.code = 500;
        res.status(ex.code).json({ msg: ex.message }).end();
        log.error(ex);
    }
});

router.get('/v1/links/check-children/:key', async (req, res) => {
    try {
        res.send({ audit: {} });
        return;

        scrubETag(res);

        const key = req.params.key.startsWith('column') ? req.params.key : CONST.SIO_ID_PFX + req.params.key;

        /// 1. get key chain to parent
        const chain_sql = `SELECT IDX, VAL, VAL2 FROM TABLE(DBG_TOOLS.CHILD_CHECKER(:key)) WHERE VAL2 IS NOT NULL ORDER BY VAL`;
        const binds = { key: req.params.key.startsWith('column') ? req.params.key : CONST.SIO_ID_PFX + req.params.key };
        const rows = await db.select(chain_sql, binds);

        /// 2. query all nodes from chain by id
        const sio_keys = {};
        for (const row of rows) {
            if (sio_keys[row.VAL] === undefined) {
                sio_keys[row.VAL] = [{ IDX: row.IDX, VAL: row.VAL, VAL2: row.VAL2 }];
            }
        }

        res.send({ audit: sio_keys });
    }
    catch (ex) {
        res.status(500).json({ msg: ex.message }).end();
        log.error(ex);
    }
});

router.get('/v1/links/sio2ise/:key', async (req, res) => {
    try {
        // req.params.key = Buffer.from(req.params.key, 'base64').toString();
        const binds = { key: req.params.key.startsWith('column') ? req.params.key : 'http://trinidata.ru/sigma/' + req.params.key };

        // 1. Пары
        const rows = await db.selectSqlName('links.ise_keys', binds);

        const items = [];
        // 2. Объекты
        for (const row of rows) {
            let ise_node = null;
            switch (row.KOD_OBJTYPE) {
                case 2:
                    ise_node = await IseAbon.load(row.ID);
                    break;
                case 1:
                    ise_node = await IseDog.load(row.ID);
                    break;
                case 3:
                    ise_node = await IseObj.load(row.ID);
                    break;
                case 4:
                    ise_node = await IseAttp.load(row.ID);
                    break;
                case 7:
                    ise_node = await IsePoint.load(row.ID);
                    break;
                case 8:
                    ise_node = await IseTr.load(row.ID);
                    break;
                case 9:
                    ise_node = await IsePU.load(row.ID);
                    break;
                case 10:
                    ise_node = await IseReg.load(row.ID);
                    break;
            }
            if (ise_node) {
                ise_node.visible.dt = row.DT;
                ise_node.visible.flow = row.FLOW_TYPE
                ise_node.visible.tag = row.TAG;
                ise_node.updateTitle();
                items.push(ise_node);
            }
        }
        res.send({ ise_nodes: items });
    }
    catch (ex) {
        res.status(500).json({ msg: ex.message }).end();
        log.error(ex);
    }
});

router.get('/v1/links/log/:key', async (req, res) => {
    try {
        const binds = { key: req.params.key.startsWith('column') ? req.params.key : 'http://trinidata.ru/sigma/' + req.params.key };
        const rows = await db.selectSqlName('links_transacts', binds);
        res.send(rows);
    }
    catch (ex) {
        res.status(500).json({ msg: ex.message }).end();
        log.error(ex);
    }
});

router.get('/v1/links/find/:field/:val/:field_out', async (req, res) => {
    try {
        let ok = true;
        const field_val = req.params.field.toUpperCase();
        const subst = {};
        subst['#field_val#'] = field_val;
        subst['#field_out#'] = req.params.field_out.toUpperCase();

        switch (field_val) {
            case 'ABON_INN':
                subst['#field_key#'] = 'ABON_KODP';
                break;
            case 'DG_NDOG':
                subst['#field_key#'] = 'DG_KOD_DOG';
                break;
            case 'NOBJ_NUM':
                subst['#field_key#'] = 'NOBJ_KOD_NUMOBJ';
                break;
            case 'PU_NUM':
                subst['#field_key#'] = 'PU_KOD_POINT_PU';
                break;
            default:
                ok = false;
                break;
        }

        if (ok) {
            const rows = await db.selectSqlName('links.find_in_msg', { val: req.params.val }, subst);
            res.send(rows.map((row) => Object.entries(row)[0][1].substr(26)));
        }
        else {
            res.status(400).json({ msg: `Unknown field ${req.params.field} in route` }).end();
        }
    }
    catch (ex) {
        res.status(500).json({ msg: ex.message }).end();
        log.error(ex);
    }
});

router.get('/v1/links/check/:field/:key', async (req, res) => {
    try {
        const field = req.params.field.toUpperCase();
        const subst = {};
        subst['#FLD#'] = field;
        const binds = { val: req.params.key };

        await db.execute('DELETE FROM GLB_SIO_NUMS');
        await db.execute(`INSERT INTO GLB_SIO_NUMS(${field}) VALUES(:VAL)`, binds);

        const rows = await db.selectSqlName('links.sio-ise-compare');
        res.send(rows);
    }
    catch (ex) {
        res.status(500).json({ msg: ex.message }).end();
        log.error(ex);
    }
});

router.get('/v1/links/volumes/:field/:key', async (req, res) => {
    try {
        const field = req.params.field.toUpperCase();
        const subst = {};
        subst['#field_val#'] = field;
        const binds = { key: req.params.key.startsWith('http') ? req.params.key : 'http://trinidata.ru/sigma/' + req.params.key };

        const answer = {};

        let rows = await db.selectSqlName('links.16_attp', binds, subst);
        for (const row of rows) {
            if (answer[row.YM] === undefined) {
                answer[row.YM] = {}
            }
            if (answer[row.YM][row.OBJ_IES] === undefined) {
                answer[row.YM][row.OBJ_IES] = {}
            }
            if (answer[row.YM][row.OBJ_IES][row.ATP_IES] === undefined) {
                answer[row.YM][row.OBJ_IES][row.ATP_IES] = { atp: [], ini: [] };
            }
            answer[row.YM][row.OBJ_IES][row.ATP_IES].atp.push(row);
        }

        rows = await db.selectSqlName('links.16_ini', binds, subst);
        for (const row of rows) {
            if (answer[row.YM] === undefined) {
                answer[row.YM] = {}
            }
            if (answer[row.YM][row.OBJ_IES] === undefined) {
                answer[row.YM][row.OBJ_IES] = {}
            }
            if (answer[row.YM][row.OBJ_IES][row.ATP_IES] === undefined) {
                answer[row.YM][row.OBJ_IES][row.ATP_IES] = { atp: [], ini: [] };
            }
            answer[row.YM][row.OBJ_IES][row.ATP_IES].ini.push(row);
        }

        res.send(answer);
    }
    catch (ex) {
        res.status(500).json({ msg: ex.message }).end();
        log.error(ex);
    }
});

router.get('/v1/links/check/', async (req, res) => {
    try {
        const binds = {};

        let rows = await db.selectSqlName('links.sio-ise-compare', binds);
        res.send(rows);
    }
    catch (ex) {
        res.status(500).json({ msg: ex.message }).end();
        log.error(ex);
    }
});

router.get('/v1/test', async (req, res) => {
    try {
        const binds = { 
            keys: {
                type: OracleDB.DB_TYPE_OBJECT,
                val: ['http://trinidata.ru/sigma/Системаио_995230_ЭО_ЮЛ_6371703812', 'http://trinidata.ru/sigma/Системаио_995230_ЭО_ЮЛ_4906075804']
            }
        }
        let sql = 'SELECT l.* from ier_link_objects l, TABLE(:keys) t where l.id_ies = t.column_value';
        let rows = await db.select(sql, binds);
        res.json(rows);
    }
    catch (ex) {
        res.status(500).json({ msg: ex.message }).end();
        log.error(ex);
    }
});

router.get('/v1/links/sio_item/:type/:id', async (req, res) => {

    try {
        let sql = holder.get('links.sio_info_' + req.params.type);

        if (sql) {
            const binds = { key: req.params.id };

            const sio_rows = await db.select(sql, binds);
            if (sio_rows && sio_rows.length > 0) {
                const data = {
                    sio: sio_rows[0]
                }

                const ise_rows = await db.select('links.ise_' + req.params.type, binds);
                data.ise = ise_rows;
                res.send(data);
            }
            else {
                res.status(404).end();
            }
        }
        else {
            res.status(400).json({ msg: 'wrong type' }).end();
        }
    }
    catch (ex) {
        res.status(500).json({ msg: ex.message }).end();
        log.error(ex);
    }
});

router.get('/v1/stat/objects/added', async (req, res) => {
    const rows = await db.selectSqlName('stat_add_objects');
    const counters = ['', 0, 0, 0, 0, 0, 0];
    const data = [];
    rows.forEach(row => {
        counters[0] = row.YMD;
        counters[1] += row.ABON;
        counters[2] += row.DOG;
        counters[3] += row.OBJ;
        counters[4] += row.ATTP;
        counters[5] += row.PU;
        counters[6] += row.IND;
        data.push(Array.from(counters));
    });
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