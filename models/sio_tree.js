'use strict';

const adp = require('../helpers/adapter');

class Glob {
    static db_helper = null;

    static async select(sql, binds) {
        return await this.db_helper.select(sql, binds);
    }

    static async create(id, objtype) {
        let res = null;
        switch (objtype) {
            case 1:
                res = await SioAbon.load(id);
                break;
            case 2:
                res = await SioDog.load(id);
                break;
            case 3:
                res = await SioObj.load(id);
                break;
            case 4:
                res = await SioAttp.load(id);
                break;
            case 7:
                res = await SioPoint.load(id);
                break;
            case 9:
                res = await SioPU.load(id);
                break;
            case 10:
                res = await SioRegister.load(id);
                break;
        }
        return res;
    }
}

const ALL_CHILDREN = -1;
const WO_CHILDREN = 0;
const DIR_CHILDREN = 1;

class BaseNode {

    constructor() {
        this.visible = {};
        this.source = '-';
        this.type = 'BASE';
        this.equals = false;
        this.id = '';
        this.parent_id = '';
        this.title = '';
        this.nodes = [];
        this.ise_nodes = [];
    }

    static validateSioId(id) {
        return typeof id === 'string' ? adp.deletePfx(id) : id;
    }

    static getCommonSQL() {
        return 'select 0 as dummy from dual';
    }

    static getSelfSQL() {
        return 'select 0 as dummy from dual';
    }

    static getChildrenSQL() {
        return 'select 0 as dummy from dual';
    }

    static async load(id) {
        // id = this.validateSioId(id);
        const sql = this.getSelfSQL();
        const result = await Glob.select(sql, [adp.addPfx(id)]);

        if (result.rows.length === 0) {
            throw new Error(`${this.type} NOT FOUND IN SIO_ABON`);
        }
        if (result.rows.length > 1) {
            throw new Error(`MORE ONE ${this.type} FOUND WITH KEY ${id}`);
        }

        return this.create(result.rows[0]);
    }

    async loadChildren() {
        const sql = this.getChildrenSQL();
        if (sql !== null) {
            const result = await Glob.select(sql, [adp.addPfx(this.id)]);

            const nodes = [];
            if (result.success) {
                for (const row of result.rows) {
                    const child = this.createChild(row);
                    if (child) nodes.push(child);
                }
            }
            this.nodes = nodes;

        }
    }

    static create(row) {
        return new BaseNode(row);
    }

    createChild(row) {
        return null;
    }

    replaceChild(node) {
        for (const i in this.nodes) {
            if (this.nodes[i].id == node.id) {
                this.nodes[i] = node;
                break;
            }
        }
    }

    markBranch(key, propName, propVal) {
        let found = this.id == key;
        this.equals = found;
        if (!found) {
            for (const item of this.nodes) {
                found = found || item.markBranch(key, propName, propVal);
            }
        }
        if (found) {
            this[propName] = propVal;
        }
        return found;
    }

}


class SioAbon extends BaseNode {

    constructor(row) {
        super();

        this.visible = {
            abon_kodp: adp.deletePfx(row.ABON_KODP),
            abon_name: row.ABON_NAME,
            abon_inn: row.ABON_INN,
            abon_adrr_str: row.ABON_ADRR_STR,
            sio_dt: row.DT,
        };
        this.source = 'SIO';
        this.type = 'ABN';
        this.id = this.visible.abon_kodp;
        this.parent_id = null;
        this.title = `${this.visible.abon_name} (${this.visible.abon_inn})`
    }

    static getCommonSQL() {
        return "SELECT ABON_KODP, ABON_NAME, ABON_INN, ABON_ADRR_STR, DT FROM SIO_ABON WHERE 1=1";
    }

    static getSelfSQL() {
        return this.getCommonSQL() + " AND ABON_KODP = :id";
    }

    getChildrenSQL() {
        return SioDog.getCommonSQL() + " AND ABON_KODP = :id";
    }

    static create(row) {
        return new SioAbon(row);
    }

    createChild(row) {
        return new SioDog(row);
    }
}

class SioDog extends BaseNode {

    constructor(row) {
        super();

        this.visible = {
            dg_kod_dog: adp.deletePfx(row.DG_KOD_DOG),
            dg_ndog: row.DG_NDOG,
            dg_kind: adp.deletePfx(row.DG_KIND),
            dg_dat_numdog: row.DG_DAT_NUMDOG,
            dg_dat_fin: row.DG_DAT_FIN,
        };
        this.source = 'SIO';
        this.type = 'DOG';
        this.id = this.visible.dg_kod_dog;
        this.parent_id = row.ABON_KODP;
        this.title = `${this.visible.dg_ndog} (${this.visible.dg_dat_numdog})`;
    }

    static getCommonSQL() {
        return "SELECT DG_KOD_DOG, ABON_KODP, DG_NDOG, DG_KIND, DG_DAT_NUMDOG, DG_DAT_FIN FROM SIO_DOG WHERE 1=1";
    }

    static getSelfSQL() {
        return this.getCommonSQL() + " AND DG_KOD_DOG = :id";
    }

    getChildrenSQL() {
        return SioObj.getCommonSQL() + " AND DG_KOD_DOG = :id";
    }

    static create(row) {
        return new SioDog(row);
    }

    createChild(row) {
        return new SioObj(row);
    }
}

class SioObj extends BaseNode {

    constructor(row) {
        super();
        this.visible = {
            nobj_kod_numobj: adp.deletePfx(row.NOBJ_KOD_NUMOBJ),
            nobj_num: row.NOBJ_NUM,
            nobj_name: row.NOBJ_NAME,
            nobj_adr_str: row.NOBJ_ADR_STR,
            nobj_dat_create: row.NOBJ_DAT_CREATE,
            nobj_addr_ies: row.NOBJ_ADDR_IES,
        };
        this.source = 'SIO';
        this.type = 'OBJ';
        this.id = this.visible.nobj_kod_numobj;
        this.parent_id = row.DG_KOD_DOG;
        this.title = `${this.visible.nobj_num} (${this.visible.nobj_name})`;
        this.nodes = [];
    }

    static getCommonSQL() {
        return 'SELECT NOBJ_KOD_NUMOBJ, DG_KOD_DOG, NOBJ_NUM, NOBJ_NAME, NOBJ_ADR_STR, NOBJ_DAT_CREATE, ' +
            'IEG_HANDLE_MDM.COMBINE_ADDR(NOBJ_ADR_REGION, NOBJ_ADR_DISTRICT, NOBJ_ADR_PLACE) AS NOBJ_ADDR_IES ' +
            'FROM SIO_OBJ WHERE 1=1';
    }

    static getSelfSQL() {
        return this.getCommonSQL() + " AND NOBJ_KOD_NUMOBJ = :id";
    }

    getChildrenSQL() {
        return SioAttp.getCommonSQL() + " AND NOBJ_KOD_NUMOBJ = :id";
    }

    static create(row) {
        return new SioObj(row);
    }

    createChild(row) {
        return new SioAttp(row);
    }
}

class SioAttp extends BaseNode {

    constructor(row) {
        super();
        this.visible = {
            attp_kod_attpoint: adp.deletePfx(row.ATTP_KOD_ATTPOINT),
            flow_type: row.FLOW_TYPE,
            attp_num: row.ATTP_NUM,
            attp_name: row.ATTP_NAME,
            attp_kod_v: adp.deletePfx(row.ATTP_KOD_V),
        }
        this.source = 'SIO';
        this.type = 'ATP';
        this.id = this.visible.attp_kod_attpoint;
        this.parent_id = row.NOBJ_KOD_NUMOBJ;
        this.title = `${this.visible.attp_num} (${this.visible.attp_name})`;
        this.nodes = [];
    }

    static getCommonSQL() {
        return 'SELECT ATTP_KOD_ATTPOINT, NOBJ_KOD_NUMOBJ, FLOW_TYPE, ATTP_NUM, ATTP_NAME, ATTP_KOD_V FROM SIO_ATTP WHERE 1=1';
    }

    static getSelfSQL() {
        return this.getCommonSQL() + " AND ATTP_KOD_ATTPOINT = :id";
    }

    getChildrenSQL() {
        return SioPoint.getCommonSQL() + " AND a.ATTP_KOD_ATTPOINT = :id";
    }

    static create(row) {
        return new SioAttp(row);
    }

    createChild(row) {
        return new SioPoint(row);
    }
}

class SioPoint extends BaseNode {

    constructor(row) {
        super();
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
        this.source = 'SIO';
        this.type = 'PNT';
        this.id = this.visible.pnt_kod_point;
        this.parent_id = row.ATTP_KOD_ATTPOINT;
        this.title = `${this.visible.pnt_num} (${this.visible.pnt_name})`;
        this.nodes = [];
    }

    static getCommonSQL() {
        return 'SELECT DISTINCT P.PNT_KOD_POINT, a.ATTP_KOD_ATTPOINT, p.NOBJ_KOD_NUMOBJ, P.FLOW_TYPE, P.PNT_NUM, P.PNT_NAME, P.PNT_DAT_S, P.PNT_DAT_PO, P.PNT_CALC_METHOD ' +
            'FROM SIO_ATTP_POINT a, SIO_POINT p WHERE P.PNT_KOD_POINT = A.PNT_KOD_POINT';
    }

    static getSelfSQL() {
        return this.getCommonSQL() + " AND p.PNT_KOD_POINT = :id";
    }

    getChildrenSQL() {
        return SioPU.getCommonSQL() + " AND PNT_KOD_POINT = :id";
    }

    static create(row) {
        return new SioPoint(row);
    }

    createChild(row) {
        return new SioPU(row);
    }
}

class SioPU extends BaseNode {

    constructor(row) {
        super();
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
        this.source = 'SIO';
        this.type = 'PUE';
        this.id = this.visible.pu_kod_point_pu;
        this.parent_id = row.PNT_KOD_POINT;
        this.title = this.visible.pu_kind ? `${this.visible.pu_kind} ${this.visible.pu_num}` : `Счетчик ${this.visible.pu_num}`;
        this.nodes = [];
    }

    static getCommonSQL() {
        return 'SELECT PU_KOD_POINT_PU, PNT_KOD_POINT, FLOW_TYPE, PU_NUM, PU_TYPE, PU_MODEL, PU_GOD_VIP, PU_DAT_PP, PU_DAT_S, PU_DAT_PO, PU_KIND ' +
            'FROM SIO_PU WHERE 1=1';
    }

    static getSelfSQL() {
        return this.getCommonSQL() + " AND PU_KOD_POINT_PU = :id";
    }

    getChildrenSQL() {
        return SioRegister.getCommonSQL() + " AND PU_KOD_POINT_PU = :id";
    }

    static create(row) {
        return new SioPU(row);
    }

    createChild(row) {
        return new SioRegister(row);
    }
}

class SioRegister extends BaseNode {

    constructor(row) {
        super();
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
        this.source = 'SIO';
        this.type = 10;
        this.id = this.visible.ini_kod_point_ini;
        this.parent_id = row.PU_KOD_POINT_PU;
        this.title = `${this.visible.ini_kodinterval} / ${this.visible.ini_kod_directen}`;
        this.nodes = [];
    }

    static getCommonSQL() {
        return 'SELECT INI_KOD_POINT_INI, PU_KOD_POINT_PU, FLOW_TYPE, INI_KOD_DIRECTEN, INI_ENERGY, INI_KODINTERVAL, INI_RKOEF, INI_RAZR, INI_RAZR2 ' +
            'FROM SIO_INI WHERE 1=1';
    }

    static getSelfSQL() {
        return this.getCommonSQL() + " AND INI_KOD_POINT_INI = :id";
    }

    getChildrenSQL() {
        return null;
    }

    static create(row) {
        return new SioRegister(row);
    }
}

class IseDog extends BaseNode {

    constructor(row) {
        super();

        this.visible = {
            kod_dog: row.KOD_DOG,
            ndog: row.NDOG,
            dat_numdog: row.DAT_NUMDOG,
            pr_active: row.PR_ACTIVE,
            sname: row.SNAME,
            u_m: row.U_M,
            d_m: row.D_M,
        };
        this.source = 'ISE';
        this.type = 'DOG';
        this.id = this.visible.kod_dog;
        this.parent_id = '';
        this.title = `${this.visible.ndog} (${this.visible.sname})`;
    }

    static getFindSql(id) {
        return 'SELECT d.KOD_DOG, d.NDOG, d.DAT_NUMDOG, d.PR_ACTIVE, o.SNAME, d.U_M, d.D_M ' +
            `FROM KR_DOGOVOR d, KR_ORG o WHERE d.KOD_DOG = ${id} AND o.KODP = d.DEP`;
    }

    static create(row) {
        return new IseDog(row);
    }

    async init(withChildren) {
        if (withChildren) {
            await this.loadObjects();
        }
        await this.loadPairs();
    }

    async loadObjects() {
        // this.nodes = await SioObj.findById(this.id, true);
    }

    async loadPairs() {

    }
}


module.exports = {
    ALL_CHILDREN: ALL_CHILDREN,
    WO_CHILDREN: WO_CHILDREN,
    DIR_CHILDREN: DIR_CHILDREN,
    Glob: Glob,
    BaseNode: BaseNode,
    SioAbon: SioAbon,
    SioDog: SioDog,
    SioObj: SioObj,
    SioAttp: SioAttp,
    SioPoint: SioPoint,
    SioPU: SioPU,
    SioRegister: SioRegister,
    IseDog: IseDog,
}