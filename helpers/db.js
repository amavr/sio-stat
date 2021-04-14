'use strict';

const oracledb = require('oracledb');
const log = require('log4js').getLogger('DB');
const cfg = require('../config/cfg.json');

class OracleDB {

    constructor(){

        oracledb.extendedMetaData = true;
        oracledb.autoCommit = true;

        this.sqls = {};
        this.pool = null;

        this.params = cfg.api.db;
        log.info(this.params.name.toUpperCase());
    }

    setNamedSql(name, sql){
        this.sqls[name] = sql;
    }

    getSqlByName(name){
        return this.sqls[name];
    }


    async getConnection() {
        if(this.pool === null){
            this.pool = await oracledb.createPool(this.params);
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

    async select(sql, binds) {
        const dbcon = await this.getConnection();
        if(binds === undefined){
            binds = {};
        }
        const result = await dbcon.execute(sql, binds, {outFormat: oracledb.OBJECT});
        await this.close(dbcon);
        return result.rows;
    }

    async selectSqlName(sqlName, binds, replacings) {
        let sql = this.getSqlByName(sqlName);
        if(replacings){
            for(const [key, val] of Object.entries(replacings)){
                sql = sql.replace(key, val);
            }
        }
        log.debug(sql);
        log.debug(JSON.stringify(binds));
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