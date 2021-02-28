'use strict';

const adp = require('../helpers/adapter');

class Glob {
    static db_helper = null;
    static async select(sql, binds) {
        return await this.db_helper.select(sql, binds);
    }
}

class SioAbon {

    static async findById(db_helper, abonId) {
        Glob.db_helper = db_helper;

        abonId = adp.deletePfx(abonId);
        const sql = `SELECT ABON_KODP, ABON_NAME, ABON_INN, ABON_ADRR_STR, DT FROM SIO_ABON WHERE ABON_KODP = 'http://trinidata.ru/sigma/${abonId}'`;
        const result = await Glob.select(sql, []);

        if (!result.success) {
            throw new Error(result.error);
        }
        if (result.rows.length === 0) {
            throw new Error('ABONENT NOT FOUND IN SIO_ABON');
        }
        if (result.rows.length > 1) {
            throw new Error(`MORE ONE ABONENT FOUND IN SIO_ABON WITH KEY ${this.abon_kodp}`);
        }

        const abon = new SioAbon(result.rows[0]);
        await abon.init();
        return abon;
    }


    constructor(row) {
        this.visible = {
            abon_kodp: adp.deletePfx(row.ABON_KODP),
            abon_name: row.ABON_NAME,
            abon_inn: row.ABON_INN,
            abon_adrr_str: row.ABON_ADRR_STR,
            sio_dt: row.DT,
        };
        this.id = this.visible.abon_kodp;
        this.title = `${this.visible.abon_name} (${this.visible.abon_inn})`
        this.dogs = [];
    }

    async init() {
        await this.loadDogs();
        await this.loadPairs();
    }

    async loadDogs(context) {
        this.dogs = await SioDog.findByParentId(this.id);
    }

    async loadPairs() {

    }
}

class SioDog {

    static async findByParentId(parentId) {
        // abonId = adp.deletePfx(abonId);

        const sql = `SELECT DG_KOD_DOG, DG_NDOG, DG_KIND, DG_DAT_NUMDOG, DG_DAT_FIN FROM SIO_DOG WHERE ABON_KODP = 'http://trinidata.ru/sigma/${parentId}'`;
        const result = await Glob.select(sql);

        if (!result.success) {
            throw new Error(result.error);
        }

        const items = [];
        for (const row of result.rows) {
            const item = new SioDog(row);
            await item.init();
            items.push(item);
        }
        return items;
    }

    constructor(row) {
        this.visible = {
            dg_kod_dog: adp.deletePfx(row.DG_KOD_DOG),
            dg_ndog: row.DG_NDOG,
            dg_kind: adp.deletePfx(row.DG_KIND),
            dg_dat_numdog: row.DG_DAT_NUMDOG,
            dg_dat_fin: row.DG_DAT_FIN,
        };
        this.id = this.visible.dg_kod_dog;
        this.title = `${this.visible.dg_ndog} (${this.visible.dg_dat_numdog})`;
        this.objects = [];
    }

    async init() {
        await this.loadObjects();
        await this.loadPairs();
    }

    async loadObjects() {
        this.objects = await SioObj.findByParentId(this.id);
    }

    async loadPairs() {

    }
}

class SioObj {

    static async findByParentId(parentId) {
        // dogId = adp.deletePfx(dogId);

        const sql = 'SELECT NOBJ_KOD_NUMOBJ, NOBJ_NUM, NOBJ_NAME, NOBJ_ADR_STR, NOBJ_DAT_CREATE, ' +
            'IEG_HANDLE_MDM.COMBINE_ADDR(NOBJ_ADR_REGION, NOBJ_ADR_DISTRICT, NOBJ_ADR_PLACE) AS NOBJ_ADDR_IES ' +
            `FROM SIO_OBJ WHERE DG_KOD_DOG = 'http://trinidata.ru/sigma/${parentId}'`;
        const result = await Glob.select(sql);

        if (!result.success) {
            throw new Error(result.error);
        }

        const items = [];
        for (const row of result.rows) {
            const item = new SioObj(row);
            await item.init();
            items.push(item);
        }
        return items;
    }

    constructor(row) {
        this.visible = {
            nobj_kod_numobj: adp.deletePfx(row.NOBJ_KOD_NUMOBJ),
            nobj_num: row.NOBJ_NUM,
            nobj_name: row.NOBJ_NAME,
            nobj_adr_str: row.NOBJ_ADR_STR,
            nobj_dat_create: row.NOBJ_DAT_CREATE,
            nobj_addr_ies: row.NOBJ_ADDR_IES,
        };
        this.id = this.visible.nobj_kod_numobj;
        this.title = `${this.visible.nobj_num} (${this.visible.nobj_name})`;
        this.sup_points = [];
    }

    async init() {
        await this.loadPoints();
        await this.loadPairs();
    }

    async loadPoints() {
        this.sup_points = await SioAttp.findByParentId(this.id);
    }

    async loadPairs() {

    }
}

class SioAttp {

    static async findByParentId(parentId) {
        // dogId = adp.deletePfx(dogId);

        const sql = 'SELECT ATTP_KOD_ATTPOINT, FLOW_TYPE, ATTP_NUM, ATTP_NAME, ATTP_KOD_V ' +
            `FROM SIO_ATTP WHERE NOBJ_KOD_NUMOBJ = 'http://trinidata.ru/sigma/${parentId}'`;
        const result = await Glob.select(sql);

        if (!result.success) {
            throw new Error(result.error);
        }

        const items = [];
        for (const row of result.rows) {
            const item = new SioAttp(row);
            await item.init();
            items.push(item);
        }
        return items;
    }

    constructor(row) {
        this.visible = {
            attp_kod_attpoint: adp.deletePfx(row.ATTP_KOD_ATTPOINT),
            flow_type: row.FLOW_TYPE,
            attp_num: row.ATTP_NUM,
            attp_name: row.ATTP_NAME,
            attp_kod_v: adp.deletePfx(row.ATTP_KOD_V),
        }
        this.id = this.visible.attp_kod_attpoint;
        this.title = `${this.visible.attp_num} (${this.visible.attp_name})`;
        this.cnt_points = [];
    }

    async init() {
        await this.loadPoints();
        await this.loadPairs();
    }

    async loadPoints() {
        this.cnt_points = await SioPoint.findByParentId(this.id);
    }

    async loadPairs() {

    }
}

class SioPoint {

    static async findByParentId(parentId) {
        // dogId = adp.deletePfx(dogId);

        const sql = 'SELECT P.PNT_KOD_POINT, p.NOBJ_KOD_NUMOBJ, P.FLOW_TYPE, P.PNT_NUM, P.PNT_NAME, P.PNT_DAT_S, P.PNT_DAT_PO, P.PNT_CALC_METHOD ' +
            'FROM SIO_ATTP_POINT a, SIO_POINT p ' +
            `WHERE a.ATTP_KOD_ATTPOINT = 'http://trinidata.ru/sigma/${parentId}' AND P.PNT_KOD_POINT = A.PNT_KOD_POINT`;
        const result = await Glob.select(sql);

        if (!result.success) {
            throw new Error(result.error);
        }

        const items = [];
        for (const row of result.rows) {
            const item = new SioPoint(row);
            await item.init();
            items.push(item);
        }
        return items;
    }

    constructor(row) {
        this.visible = {
            pnt_kod_point: adp.deletePfx(row.PNT_KOD_POINT),
            flow_type: row.FLOW_TYPE,
            nobj_kod_numobj: adp.deletePfx(row.NOBJ_KOD_NUMOBJ),
            pnt_num: row.PNT_NUM,
            pnt_name: row.PNT_NAME,
            pnt_dat_s: row.PNT_DAT_S,
            pnt_dat_po: row.PNT_DAT_PO,
            pnt_calc_method: adp.deletePfx(row.PNT_CALC_METHOD),
        }
        this.id = this.visible.pnt_kod_point;
        this.title = `${this.visible.pnt_num} (${this.visible.pnt_name})`;
        this.units = [];
    }

    async init() {
        await this.loadUnits();
        await this.loadPairs();
    }

    async loadUnits() {
        this.units = await SioPU.findByParentId(this.id);
    }

    async loadPairs() {

    }
}

class SioPU {

    static async findByParentId(parentId) {
        // dogId = adp.deletePfx(dogId);

        const sql = 'SELECT PU_KOD_POINT_PU, FLOW_TYPE, PU_NUM, PU_TYPE, PU_MODEL, PU_GOD_VIP, PU_DAT_PP, PU_DAT_S, PU_DAT_PO, PU_KIND ' +
            `FROM SIO_PU WHERE PNT_KOD_POINT = 'http://trinidata.ru/sigma/${parentId}'`;
        const result = await Glob.select(sql);

        if (!result.success) {
            throw new Error(result.error);
        }

        const items = [];
        for (const row of result.rows) {
            const item = new SioPU(row);
            await item.init();
            items.push(item);
        }
        return items;
    }

    constructor(row) {
        this.visible = {
            pu_kod_point_pu: adp.deletePfx(row.PU_KOD_POINT_PU),
            flow_type: row.FLOW_TYPE,
            pu_num: row.PU_NUM,
            pu_type: row.PU_TYPE,
            pu_model: row.PU_MODEL,
            pu_god_vip: row.PU_GOD_VIP,
            pu_dat_pp: row.PU_DAT_PP,
            pu_dat_s: row.PU_DAT_S,
            pu_dat_po: row.PU_DAT_PO,
            pu_kind: adp.deletePfx(row.PU_KIND),
        }
        this.id = this.visible.pu_kod_point_pu;
        this.title = this.visible.pu_kind ? `${this.visible.pu_kind} ${this.visible.pu_num}` : `Счетчик ${this.visible.pu_num}`;
        this.registers = [];
    }

    async init() {
        await this.loadRegisters();
        await this.loadPairs();
    }

    async loadRegisters() {
        this.registers = await SioRegister.findByParentId(this.id);
    }

    async loadPairs() {

    }
}

class SioRegister {

    static async findByParentId(parentId) {
        // dogId = adp.deletePfx(dogId);

        const sql = 'SELECT INI_KOD_POINT_INI, FLOW_TYPE, INI_KOD_DIRECTEN, INI_ENERGY, INI_KODINTERVAL, INI_RKOEF, INI_RAZR, INI_RAZR2 ' +
            `FROM SIO_INI WHERE PU_KOD_POINT_PU = 'http://trinidata.ru/sigma/${parentId}'`;
        const result = await Glob.select(sql);

        if (!result.success) {
            throw new Error(result.error);
        }

        const items = [];
        for (const row of result.rows) {
            const item = new SioRegister(row);
            await item.init();
            items.push(item);
        }
        return items;
    }

    constructor(row) {
        this.visible = {
            ini_kod_point_ini: adp.deletePfx(row.INI_KOD_POINT_INI),
            flow_type: row.FLOW_TYPE,
            ini_kod_directen: adp.deletePfx(row.INI_KOD_DIRECTEN),
            ini_energy: adp.deletePfx(row.INI_ENERGY),
            ini_kodinterval: adp.deletePfx(row.INI_KODINTERVAL),
            ini_rkoef: row.INI_RKOEF,
            ini_razr: row.INI_RAZR,
            ini_razr2: row.INI_RAZR2,
        }
        this.id = this.visible.ini_kod_point_ini;
        this.title = `${this.visible.ini_kodinterval} / ${this.visible.ini_kod_directen}`
    }

    async init() {
        await this.loadPairs();
    }

    async loadPairs() {

    }
}



module.exports = {
    SioAbon: SioAbon,
    SioDog: SioDog
}