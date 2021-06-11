'use strict';

const oracledb = require('oracledb');
const log = require('log4js').getLogger('DB');
const cfg = require('../config/cfg.json');

class OracleDB {

    constructor() {

        oracledb.extendedMetaData = true;
        oracledb.autoCommit = true;
        oracledb.fetchAsString = [ oracledb.CLOB ];
        
        this.sqls = {};
        this.pool = null;
        this.refs = {};

        this.params = cfg.api.db;
        log.info(this.params.name.toUpperCase());
    }

    setNamedSql(name, sql) {
        this.sqls[name] = sql;
    }

    getSqlByName(name) {
        return this.sqls[name];
    }

    async loadRefs(dbcon) {
        const sql = 'SELECT KOD_DICT, ID, ID_IES FROM IER_LINK_DATADICTS ORDER BY 1, 2, 3';
        const res = await dbcon.execute(sql, {}, { outFormat: oracledb.OBJECT });
        for (const row of res.rows) {
            if (this.refs[row.KOD_DICT] === undefined) {
                this.refs[row.KOD_DICT] = {};
            }
            this.refs[row.KOD_DICT][row.ID_IES] = row.ID;
        }
    }

    async getConnection() {
        if (this.pool === null) {
            this.pool = await oracledb.createPool(this.params);
            const dbcon = await this.pool.getConnection();
            await this.loadRefs(dbcon);
            log.info('IER_LINK_DATADICTS loaded');
            return dbcon;
        }
        return await this.pool.getConnection();
    }

    async close(dbcon) {
        if (dbcon) {
            try {
                await dbcon.close();
            }
            catch (ex) {
                log.error(ex.message);
            }
        }
    }

    async commit(dbcon) {
        await dbcon.commit();
    }

    async rollback(dbcon) {
        await dbcon.rollback();
    }

    async execute(sql, binds) {
        const dbcon = await this.getConnection();
        if (binds === undefined) {
            binds = {};
        }
        const result = await dbcon.execute(sql, binds, { outFormat: oracledb.OBJECT });
        await this.close(dbcon);
        return result;
    }

    async select(sql, binds) {
        const dbcon = await this.getConnection();
        if (binds === undefined) {
            binds = {};
        }
        const result = await dbcon.execute(sql, binds, { outFormat: oracledb.OBJECT });
        await this.close(dbcon);
        return result.rows;
    }

    async insertMany(sql, rows) {
        var options = {
            autoCommit: false,   // autocommit if there are no batch errors
            batchErrors: false   // true - продолжение выполнения, даже если существуют ошибки в части записей
        };

        const res = {
            execResult: null,
            success: false,
            error: null
        }

        if (rows.length > 0) {

            const me = this;
            let dbcon = null;
            try {
                dbcon = await this.getConnection();
                res.execResult = await dbcon.executeMany(sql, rows, options);
                res.success = res.execResult.rowsAffected === rows.length;
                await dbcon.commit();
            } catch (ex) {
                res.success = false;
                res.error = ex.message;
                console.log(res);
                console.log(`rows.length: ${rows.length}`);
                log.error(ex.message);
                await dbcon.rollback();
            }
            finally{
                await me.close(dbcon);
            }
        }

        return res;
    }

    async selectSqlName(sqlName, binds, replacings) {
        let sql = this.getSqlByName(sqlName);
        if (replacings) {
            for (const [key, val] of Object.entries(replacings)) {
                sql = sql.replace(key, val);
            }
        }
        log.debug(sql);
        if (binds) {
            log.debug(JSON.stringify(binds));
        }
        return await this.select(sql, binds);
    }

    async callProc(procName, binds) {
        const answer = {
            // {'<code>': [{id: '', ret_msg: ''}]}
        };

        const params = [];
        for (const key of Object.keys(binds)) {
            params.push(`${key} => :${key}`);
        }
        const sql = `begin ${procName}(${params.join()}); end;`;
        const dbcon = await this.getConnection();
        try {
            const res = await dbcon.execute(sql, binds, { resultSet: false });
            answer.data = res;
            answer.success = true;
        }
        catch (ex) {
            answer.error = ex.message;
            answer.success = false;
        }
        finally {
            this.close(dbcon);
        }
        return answer;
    }

}

module.exports = new OracleDB();