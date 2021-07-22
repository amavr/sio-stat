'use strict';

const express = require('express');
const path = require('path');
const log4js = require('log4js');
const moment = require('moment');

const cfg = require('../../config').api;
const CONST = require('../../resources/const');
const holder = require('../../helpers/sql_holder');
const Utils = require('../../helpers/utils');
const db = require('../../helpers/db');
const dbg_data = require('../../config/dbg_const.json');
const FileHelper = require('../../helpers/file_helper');

const excel = require("exceljs");

const log = log4js.getLogger('API');
const router = express.Router();

router.get('/test', async (req, res) => {
    try {
        const rows = await db.select('select 1 from dual', {});
        res.send({ success: true });
    }
    catch (ex) {
        res.status(500).json({ msg: ex.message }).end();
        log.error(ex);
    }
});

router.get('/added/:dep', async (req, res) => {
    try {
        let rows = [];
        const binds = {
            dep: req.params.dep,
            beg: req.query.beg ? moment(req.query.beg).format("YYYY-MM-DD") : moment().format("YYYY-MM-DD"),
            end: req.query.end ? moment(req.query.end).format("YYYY-MM-DD") : moment().format("YYYY-MM-DD")
        }
        rows = await db.selectSqlName('rep_add_obj', binds);

        res.send(rows);
    }
    catch (ex) {
        res.status(500).json({ msg: ex.message }).end();
        log.error(ex);
    }
});

router.get('/added/:dep/xls', async (req, res) => {
    try {
        let rows = [];

        const binds = {
            dep: req.params.dep,
            beg: req.query.beg ? moment(req.query.beg).format("YYYY-MM-DD") : moment().format("YYYY-MM-DD"),
            end: req.query.end ? moment(req.query.end).format("YYYY-MM-DD") : moment().format("YYYY-MM-DD")
        }

        if(req.query.period){
            binds.end = moment().format("YYYY-MM-DD");
            if(req.query.period.toLowerCase() === 'm'){
                binds.beg = moment().subtract(1, 'months').format("YYYY-MM-DD");
            }
            else if(req.query.period.toLowerCase() === 'w'){
                binds.beg = moment().subtract(7, 'days').format("YYYY-MM-DD");
            }
        }

        const common_style = {
            views: [{
                state: 'frozen',
                ySplit: 1,
                showGridLines: false,
            }]
        };

        const border_style = { top: { style: 'thin', color: { argb: 'FF999999' } } };
        const selected = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFFCC' } };

        const workbook = new excel.Workbook();

        const times = {
            dog: [null, null, null],
            obj: [null, null, null],
            att: [null, null, null],
            pnt: [null, null, null],
            pu: [null, null, null],
        };

        const dog_sheet = workbook.addWorksheet('Договоры', common_style);
        dog_sheet.autoFilter = 'A1:F1';
        dog_sheet.columns = [
            // { header: "Дата", key: "DT", width: 12 },
            { header: "ИНН", key: "ABN_INN", width: 15 },
            { header: "Абонент", key: "ABN_NAME", width: 50 },
            { header: "№ Договора", key: "DOG_NUM", width: 16, style: { fill: selected } },
            { header: "KODP", key: "ABN_ID", width: 11 },
            { header: "KOD_DOG", key: "DOG_ID", width: 11 },
        ];
        times.dog[0] = moment();
        rows = await db.selectSqlName('rep_add_dog', binds);
        times.dog[1] = moment();
        dog_sheet.addRows(rows);
        formatSheet(dog_sheet, 'ABN_INN', border_style);
        times.dog[2] = moment();

        const obj_sheet = workbook.addWorksheet('Объекты', common_style);
        obj_sheet.autoFilter = 'A1:I1';
        obj_sheet.columns = [
            // { header: "Дата", key: "DT", width: 12 },
            { header: "ИНН", key: "ABN_INN", width: 15 },
            { header: "Абонент", key: "ABN_NAME", width: 50 },
            { header: "№ договора", key: "DOG_NUM", width: 16 },
            { header: "№ объекта", key: "OBJ_NUM", width: 18, style: { numFmt: '0', fill: selected } },
            { header: "Имя объекта", key: "OBJ_NAME", width: 50, style: { fill: selected } },
            { header: "Адрес объекта", key: "ADDR", width: 80, style: { fill: selected } },
            { header: "KODP", key: "ABN_ID", width: 11 },
            { header: "KOD_DOG", key: "DOG_ID", width: 11 },
            { header: "KOD_NUMOBJ", key: "OBJ_ID", width: 11 },
        ];
        times.obj[0] = moment();
        rows = await db.selectSqlName('rep_add_obj', binds);
        times.obj[1] = moment();
        obj_sheet.addRows(rows);
        formatSheet(obj_sheet, 'DOG_NUM', border_style);
        times.obj[2] = moment();


        // obj_sheet.getRow(4).outlineLevel = 0;
        // obj_sheet.getRow(5).outlineLevel = 1;

        // const att_sheet = workbook.addWorksheet('ТчкПост', common_style);
        // att_sheet.autoFilter = 'A1:K1';
        // att_sheet.columns = [
        //     // { header: "Дата", key: "DT", width: 12 },
        //     { header: "ИНН", key: "ABN_INN", width: 15 },
        //     { header: "Абонент", key: "ABN_NAME", width: 50 },
        //     { header: "№ договора", key: "DOG_NUM", width: 16 },
        //     { header: "№ объекта", key: "OBJ_NUM", width: 18, style: { numFmt: '0' } },
        //     { header: "Имя объекта", key: "OBJ_NAME", width: 50 },
        //     { header: "Адрес объекта", key: "ADDR", width: 80 },
        //     { header: "Имя ТП", key: "ATT_NAME", width: 50, style: { fill: selected } },
        //     { header: "KODP", key: "ABN_ID", width: 11 },
        //     { header: "KOD_DOG", key: "DOG_ID", width: 11 },
        //     { header: "KOD_NUMOBJ", key: "OBJ_ID", width: 11 },
        //     { header: "KOD_ATTPOINT", key: "ATT_ID", width: 11 },
        // ];
        times.att[0] = moment();
        // rows = await db.selectSqlName('rep_add_att', binds);
        times.att[1] = moment();
        // att_sheet.addRows(rows);
        // formatSheet(att_sheet, 'OBJ_NUM', border_style);
        times.att[2] = moment();

        const pnt_sheet = workbook.addWorksheet('ТчкУчета', common_style);
        pnt_sheet.autoFilter = 'A1:N1';
        pnt_sheet.columns = [
            // { header: "Дата", key: "DT", width: 12 },
            { header: "ИНН", key: "ABN_INN", width: 15 },
            { header: "Абонент", key: "ABN_NAME", width: 50 },
            { header: "№ договора", key: "DOG_NUM", width: 16 },
            { header: "№ объекта", key: "OBJ_NUM", width: 18, style: { numFmt: '0' } },
            { header: "Имя объекта", key: "OBJ_NAME", width: 50 },
            { header: "Адрес объекта", key: "ADDR", width: 80 },
            { header: "Имя ТП", key: "ATT_NAME", width: 50 },
            { header: "№ ТУ", key: "PNT_NUM", width: 12, style: { fill: selected } },
            { header: "Имя ТУ", key: "PNT_NAME", width: 50, style: { fill: selected } },
            { header: "KODP", key: "ABN_ID", width: 11 },
            { header: "KOD_DOG", key: "DOG_ID", width: 11 },
            { header: "KOD_NUMOBJ", key: "OBJ_ID", width: 11 },
            { header: "KOD_ATTPOINT", key: "ATT_ID", width: 11 },
            { header: "KOD_POINT", key: "PNT_ID", width: 11 },
        ];
        times.pnt[0] = moment();
        rows = await db.selectSqlName('rep_add_pnt', binds);
        times.pnt[1] = moment();
        pnt_sheet.addRows(rows);
        formatSheet(pnt_sheet, 'ATT_NAME', border_style);
        times.pnt[2] = moment();

        const pu_sheet = workbook.addWorksheet('ПриборУчета', common_style);
        pu_sheet.autoFilter = 'A1:P1';
        pu_sheet.columns = [
            // { header: "Дата", key: "DT", width: 12 },
            { header: "ИНН", key: "ABN_INN", width: 15 },
            { header: "Абонент", key: "ABN_NAME", width: 50 },
            { header: "№ договора", key: "DOG_NUM", width: 16 },
            { header: "№ объекта", key: "OBJ_NUM", width: 18, style: { numFmt: '0' } },
            { header: "Имя объекта", key: "OBJ_NAME", width: 50 },
            { header: "Адрес объекта", key: "ADDR", width: 80 },
            { header: "Имя ТП", key: "ATT_NAME", width: 50 },
            { header: "№ ТУ", key: "PNT_NUM", width: 12 },
            { header: "Имя ТУ", key: "PNT_NAME", width: 50 },
            { header: "Номер ПУ", key: "PU_NUM", width: 20, style: { fill: selected } },
            { header: "Дата установки", key: "DT_BEG", width: 12, style: { fill: selected, alignment: {horizontal: 'center'}} },
            { header: "KODP", key: "ABN_ID", width: 11 },
            { header: "KOD_DOG", key: "DOG_ID", width: 11 },
            { header: "KOD_NUMOBJ", key: "OBJ_ID", width: 11 },
            { header: "KOD_ATTPOINT", key: "ATT_ID", width: 11 },
            { header: "KOD_POINT", key: "PNT_ID", width: 11 },
            { header: "KOD_POINT_PU", key: "PU_ID", width: 11 },
        ];
        times.pu[0] = moment();
        rows = await db.selectSqlName('rep_add_pu', binds);
        times.pu[1] = moment();
        pu_sheet.addRows(rows);
        formatSheet(pu_sheet, 'PNT_ID', border_style);
        times.pu[2] = moment();

        printTimes('DOG', times.dog);
        printTimes('OBJ', times.obj);
        printTimes('ATT', times.att);
        printTimes('PNT', times.pnt);
        printTimes('PU ', times.pu);

        let dep = null;
        for (const d of CONST.DEPS) {
            if (d.KODP == binds.dep) {
                dep = d;
                break;
            }
        }
        const docName = `${dep.CODE}-${binds.beg}-${binds.end}`;

        // res is a Stream object
        res.setHeader(
            "Content-Type",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        );
        res.setHeader(
            "Content-Disposition",
            "attachment; filename=" + docName + ".xlsx"
        );

        return workbook.xlsx.write(res).then(function () {
            res.status(200).end();
        });
    }
    catch (ex) {
        res.status(500).json({ msg: ex.message }).end();
        log.error(ex);
    }
});

function printTimes(label, times){
    log.debug(`${label}: ${times[2].diff(times[0], 'seconds')}\t${times[1].diff(times[0], 'seconds')}\t${times[2].diff(times[1], 'seconds')}`);
}

function formatSheet(sheet, groupColumn, groupBorder) {
    const cCount = sheet.actualColumnCount;
    const prev = { val: '', rowNum: 0 }

    sheet.getColumn(groupColumn).eachCell({ includeEmpty: true }, function (cell, rowNum) {
        if (prev.val !== cell.value) {
            prev.val = cell.value;
            prev.rowNum = rowNum;
            // sheet.getRow(rowNum).border = border;
            const row = sheet.getRow(prev.rowNum);
            for (let i = 1; i <= cCount; i++) {
                row.getCell(i).border = groupBorder;
            }
        }
    });

    sheet.getRow(1).eachCell( (cell, colNumber) => {
        cell.fill = {type: 'pattern', pattern: 'solid', fgColor: {argb: 'FF538DD5'}};
        cell.font = {color: {argb: 'FFFFFFFF'}};
    });
}

module.exports = router;