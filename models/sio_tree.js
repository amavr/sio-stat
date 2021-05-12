'use strict';

const log4js = require('log4js');
const adp = require('../helpers/adapter');
const db = require('../helpers/db');
const { GlobalISE, GlobISE } = require('./ise_nodes');
const log = log4js.getLogger('SIO-NODES');

class GlobSIO {
    static async create(id, objtype) {
        let res = null;
        switch (objtype) {
            case 2:
                res = await SioAbon.load(id);
                break;
            case 1:
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
            case 8:
                res = await SioPU.load(id);
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
        this.icon = 'id-card-o';
        // искомый узел в иерархии для выделения в интерфейсе
        this.equals = false;
        // ключ SIO (без префикса)
        this.id = '';
        // ключ SIO (без префикса) вышестоящего узла
        this.parent_id = '';
        // видимое наименование узла
        this.title = '';
        // иерархия подчиненых узлов
        this.nodes = [];
        // словарь подчиненных узлов для поиска по ключу SIO (без префикса)
        this.items = {};
        // для подгружаемой информации из интерфейса (здесь не заполняется)
        this.ise_nodes = [];
        // информация о найденных проблемах
        this.audit = { state: 'NS_GOOD' };
        // кол-во пар (ссылок)
        this.links = 0;
        // ссылки на вспомогательные страницы (лог, пары и пр.)
        this.refs = {};

        this.type = 'ABS';
        this.type_code = 0;
    }

    // используется для ISE узлов
    updateTitle() {
    }

    // static validateSioId(id) {
    //     return typeof id === 'string' ? adp.deletePfx(id) : id;
    // }

    static getCommonSQL() {
        return 'select 0 as dummy from dual';
    }

    static getSelfSQL() {
        return 'select 0 as dummy from dual';
    }

    static getChildrenSioSQL() {
        return 'select 0 as dummy from dual';
    }

    static async load(id) {
        // id = this.validateSioId(id);
        const sql = this.getSelfSQL();
        const rows = await db.select(sql, { id: adp.addPfx(id) });

        if (rows.length === 0) {
            const error = new Error(`${this.name} NOT FOUND IN DATABASE WITH KEY ${id} ${sql}`);
            error.code = 404;
            throw error;
        }
        if (rows.length > 1) {
            throw new Error(`MORE ONE ${this.name} FOUND WITH KEY ${id} \n${sql}`);
        }

        return this.create(rows[0]);
    }

    async loadSioChildren() {
        const sql = this.getChildrenSioSQL();
        if (sql !== null) {
            this.nodes = (await db.select(sql, { id: adp.addPfx(this.id) }))
                .map(row => this.createSioChild(row))
                .filter(child => child !== null);
            this.nodes.forEach(node => {
                this.items[node.id] = node;
            });
        }
        else {
            this.nodes = [];
        }
        log.debug(`${this.type} has ${this.nodes.length}`);
    }

    async loadIseChildren() {
        const sql = this.getChildrenIseSQL();
        console.log(sql);
        if (sql !== null) {
            const rows = await db.select(sql, { id: adp.addPfx(this.id) });
            rows.forEach(row => {
                this.setIseChildProps(row);
            });
        }
    }

    async loadChildren() {
        await this.loadSioChildren();
        await this.loadIseChildren();
        delete this.items;
    }

    static create(row) {
        return new BaseNode(row);
    }

    createSioChild(row) {
        return null;
    }

    setIseChildProps(row) {
        const node = this.items[adp.deletePfx(row.IES)];
        // если проблема уже найдена, то ее поиск не нужен
        if (node.audit.state != 'NS_GOOD') return;

        if (row.ID === null) {
            node.audit.state = 'NS_LOST';
        }
        else if (node.parent_id != row.P_IES) {
            node.audit.state = 'NS_DIFF';
        }
        else {
            node.links++;
            node.audit.state = node.links > 1 ? 'NS_MORE' : 'NS_GOOD';
        }
    }

    replaceChild(node) {
        for (const i in this.nodes) {
            if (this.nodes[i].id == node.id) {
                node.audit = this.nodes[i].audit;
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
        this.type_code = 2;
        this.id = this.visible.abon_kodp;
        this.parent_id = null;
        this.title = `${this.visible.abon_name} (${this.visible.abon_inn})`
        this.icon = 'file-earmark-person';
        this.refs = {
            'Лог': `/siotransacts.html?sio=${this.id}`,
        };
    }

    static getCommonSQL() {
        return "SELECT /*+ RULE*/ ABON_KODP, ABON_NAME, ABON_INN, ABON_ADRR_STR, DT FROM SIO_ABON WHERE 1=1";
    }

    static getSelfSQL() {
        return this.getCommonSQL() + " AND ABON_KODP = :id";
    }

    getChildrenSioSQL() {
        return SioDog.getCommonSQL() + " AND ABON_KODP = :id";
    }

    getChildrenIseSQL() {
        return "SELECT /*+ RULE*/ ds.DG_KOD_DOG ies, ld.ID, d.KODP p_id,  lp.ID_IES p_ies " +
            // дочерние узлы СИО
            "FROM SIO_DOG ds " +
            // дочерние пары
            "LEFT OUTER JOIN IER_LINK_OBJECTS ld ON (ld.ID_IES = ds.DG_KOD_DOG) " +
            // дочерние узлы ИСЭ
            "LEFT OUTER JOIN KR_DOGOVOR d ON (d.KOD_DOG = ld.ID) " +
            // вышестоящие пары (ИСЭ)
            "LEFT OUTER JOIN IER_LINK_OBJECTS lp ON (lp.KOD_OBJTYPE = 2 AND lp.ID = d.KODP) " +
            "WHERE ds.ABON_KODP = :id";
    }

    static create(row) {
        return new SioAbon(row);
    }

    createSioChild(row) {
        return new SioDog(row);
    }

    // setIseChildProps(row) {
    //     super.setIseChildProps(row);
    //     return new SioDog(row);
    // }
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
        this.type_code = 1;
        this.id = this.visible.dg_kod_dog;
        this.parent_id = row.ABON_KODP;
        this.title = `${this.visible.dg_ndog} (${this.visible.dg_dat_numdog})`;
        // this.icon = 'vector-pen';
        // this.icon = 'file-earmark-text';
        this.icon = 'stickies';
        this.refs = {
            'Лог': `/siotransacts.html?sio=${this.id}`,
        };
    }

    static getCommonSQL() {
        return "SELECT /*+ RULE*/ DG_KOD_DOG, ABON_KODP, DG_NDOG, DG_KIND, DG_DAT_NUMDOG, DG_DAT_FIN FROM SIO_DOG WHERE 1=1";
    }

    static getSelfSQL() {
        return this.getCommonSQL() + " AND DG_KOD_DOG = :id";
    }

    getChildrenSioSQL() {
        return SioObj.getCommonSQL() + " AND DG_KOD_DOG = :id";
    }

    getChildrenIseSQL() {
        return "SELECT /*+ RULE*/ s.NOBJ_KOD_NUMOBJ ies, ls.ID, i.KOD_DOG p_id,  li.ID_IES p_ies " +
            // дочерние узлы СИО
            "FROM SIO_OBJ s " +
            // дочерние пары
            "LEFT OUTER JOIN IER_LINK_OBJECTS ls ON (ls.ID_IES = s.NOBJ_KOD_NUMOBJ) " +
            // дочерние узлы ИСЭ
            "LEFT OUTER JOIN KR_NUMOBJ i ON (i.KOD_NUMOBJ = ls.ID) " +
            // вышестоящие пары (ИСЭ)
            "LEFT OUTER JOIN IER_LINK_OBJECTS li ON (li.KOD_OBJTYPE = 1 AND li.ID = i.KOD_DOG) " +
            "WHERE s.DG_KOD_DOG = :id ";
    }

    static create(row) {
        return new SioDog(row);
    }

    createSioChild(row) {
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
        this.type_code = 3;
        this.id = this.visible.nobj_kod_numobj;
        this.parent_id = row.DG_KOD_DOG;
        this.title = `${this.visible.nobj_num} (${this.visible.nobj_name})`;
        this.nodes = [];
        // this.icon = 'diagram-3-fill';
        this.icon = 'building';

        this.refs = {
            'Лог': `/siotransacts.html?sio=${this.id}`,
            'Объемы': `/siovolumes.html?nobj_kod_numobj=${this.id}`
        };
    }

    static getCommonSQL() {
        return 'SELECT /*+ RULE*/ NOBJ_KOD_NUMOBJ, DG_KOD_DOG, NOBJ_NUM, NOBJ_NAME, NOBJ_ADR_STR, NOBJ_DAT_CREATE, ' +
            'IEG_HANDLE_MDM.COMBINE_ADDR(NOBJ_ADR_REGION, NOBJ_ADR_DISTRICT, NOBJ_ADR_PLACE) AS NOBJ_ADDR_IES ' +
            'FROM SIO_OBJ WHERE 1=1';
    }

    static getSelfSQL() {
        return this.getCommonSQL() + " AND NOBJ_KOD_NUMOBJ = :id";
    }

    getChildrenSioSQL() {
        return SioAttp.getCommonSQL() + " AND NOBJ_KOD_NUMOBJ = :id";
    }

    getChildrenIseSQL() {
        return 'SELECT /*+ RULE */ DISTINCT A.ATTP_KOD_ATTPOINT ies, ld.ID, p.KOD_ATTPOINT p_id,  lb.ID_IES p_ies ' +
            'FROM SIO_ATTP a, IER_LINK_OBJECTS ld, HR_POINT p, KR_NUMOBJ o,  IER_LINK_OBJECTS lb ' +
            'WHERE ld.ID_IES = A.ATTP_KOD_ATTPOINT ' +
            'AND p.KOD_ATTPOINT = ld.ID ' +
            'AND o.KOD_OBJ = p.KOD_OBJ ' +
            'AND lb.ID = o.KOD_NUMOBJ ' +
            'AND lb.KOD_OBJTYPE = 3 ' +
            'AND lb.ID_IES = A.NOBJ_KOD_NUMOBJ ' +
            'AND a.NOBJ_KOD_NUMOBJ = :id';
    }

    static create(row) {
        return new SioObj(row);
    }

    createSioChild(row) {
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
        this.type_code = 4;
        this.id = this.visible.attp_kod_attpoint;
        this.parent_id = row.NOBJ_KOD_NUMOBJ;
        this.title = `${this.visible.attp_num} (${this.visible.attp_name})`;
        this.nodes = [];
        this.icon = 'plug';

        this.refs = {
            'Лог': `/siotransacts.html?sio=${this.id}`,
            'Объемы': `/siovolumes.html?attp_kod_attpoint=${this.id}`
        };
    }

    static getCommonSQL() {
        return 'SELECT /*+ RULE*/ ATTP_KOD_ATTPOINT, NOBJ_KOD_NUMOBJ, FLOW_TYPE, ATTP_NUM, ATTP_NAME, ATTP_KOD_V FROM SIO_ATTP WHERE 1=1';
    }

    static getSelfSQL() {
        return this.getCommonSQL() + " AND ATTP_KOD_ATTPOINT = :id";
    }

    getChildrenSioSQL() {
        return SioPoint.getCommonSQL() + " AND a.ATTP_KOD_ATTPOINT = :id";
    }

    getChildrenIseSQL() {
        return 'SELECT /*+ RULE */ DISTINCT ap.PNT_KOD_POINT ies, ls.ID, p.KOD_ATTPOINT p_id, li.ID_IES ' +
            'FROM SIO_ATTP_POINT ap, IER_LINK_OBJECTS ls, HR_POINT p, IER_LINK_OBJECTS li ' +
            'WHERE ls.ID_IES = ap.PNT_KOD_POINT ' +
            'AND p.KOD_POINT = ls.ID ' +
            'AND li.KOD_OBJTYPE = 7 ' +
            'AND li.ID = p.KOD_ATTPOINT ' +
            'AND li.ID_IES != ap.ATTP_KOD_ATTPOINT ' +
            'AND ap.ATTP_KOD_ATTPOINT = :id';
    }

    static create(row) {
        return new SioAttp(row);
    }

    createSioChild(row) {
        return new SioPoint(row);
    }

    // setIseChildProps(row) {
    //     return null;
    // }
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
            monthly: row.MVOLUMES,
        }
        this.source = 'SIO';
        this.type = 'PNT';
        this.type_code = 7;
        this.id = this.visible.pnt_kod_point;
        this.parent_id = row.ATTP_KOD_ATTPOINT;
        this.title = `${this.visible.pnt_num} (${this.visible.pnt_name})`;
        this.nodes = [];
        this.icon = 'node-plus';
        this.refs = {
            'Лог': `/siotransacts.html?sio=${this.id}`,
        };
    }

    static getCommonSQL() {
        // return 'SELECT DISTINCT P.PNT_KOD_POINT, a.ATTP_KOD_ATTPOINT, p.NOBJ_KOD_NUMOBJ, P.FLOW_TYPE, P.PNT_NUM, P.PNT_NAME, P.PNT_DAT_S, P.PNT_DAT_PO, P.PNT_CALC_METHOD ' +
        //     'FROM SIO_ATTP_POINT a, SIO_POINT p WHERE P.PNT_KOD_POINT = A.PNT_KOD_POINT';

        const sql = "SELECT /*+ rule */ DISTINCT P.PNT_KOD_POINT, a.ATTP_KOD_ATTPOINT, p.NOBJ_KOD_NUMOBJ, P.FLOW_TYPE, P.PNT_NUM, P.PNT_NAME, P.PNT_DAT_S, P.PNT_DAT_PO, P.PNT_CALC_METHOD, " +
            "'01:'||r.RASX_01||', 02:'||r.RASX_02||', 03:'||r.RASX_03||', 04:'||r.RASX_04||', 05:'||r.RASX_05||', 06:'||r.RASX_06||', 07:'||r.RASX_07||', 08:'||r.RASX_08||', 09:'||r.RASX_09||', 10:'||r.RASX_10||', 11:'||r.RASX_11||', 12:'||r.RASX_12 AS mvolumes " +
            "FROM SIO_ATTP_POINT a, SIO_POINT p, SIO_RASX r " +
            "WHERE p.PNT_KOD_POINT = a.PNT_KOD_POINT " +
            // "AND rownum < 2 "+
            "AND r.PNT_KOD_POINT (+) = p.PNT_KOD_POINT";
        
        log.debug(sql);

        return sql;
    }

    static getSelfSQL() {
        return this.getCommonSQL() + " AND p.PNT_KOD_POINT = :id";
    }

    getChildrenSioSQL() {
        return SioPU.getCommonSQL() + " AND PNT_KOD_POINT = :id";
    }

    getChildrenIseSQL() {
        return "SELECT /*+ RULE*/ s.PU_KOD_POINT_PU ies, ls.ID, li.ID p_id, li.ID_IES p_ies " +
            //  дочерние узлы СИО
            "FROM SIO_PU s " +
            // дочерние пары
            "LEFT OUTER JOIN IER_LINK_OBJECTS ls ON (ls.ID_IES = s.PU_KOD_POINT_PU) " +
            // дочерние узлы ИСЭ
            "LEFT OUTER JOIN HR_POINT_PU i1 ON (i1.KOD_POINT_PU = ls.ID AND ls.KOD_OBJTYPE = 9) " +
            "LEFT OUTER JOIN HR_POINT_TR i2 ON (i2.KOD_POINT_TR = ls.ID AND ls.KOD_OBJTYPE = 8) " +
            // вышестоящие пары (ИСЭ)
            "LEFT OUTER JOIN IER_LINK_OBJECTS li ON (li.KOD_OBJTYPE = 7 AND (li.ID = i1.KOD_POINT OR li.ID = i2.KOD_POINT)) " +
            "WHERE s.PNT_KOD_POINT = :id ";
    }

    static create(row) {
        return new SioPoint(row);
    }

    createSioChild(row) {
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
        this.type_code = 9;
        this.id = this.visible.pu_kod_point_pu;
        this.parent_id = row.PNT_KOD_POINT;
        this.title = this.visible.pu_kind ? `${this.visible.pu_kind} ${this.visible.pu_num}` : `Счетчик ${this.visible.pu_num}`;
        this.nodes = [];
        this.icon = 'speedometer2';
        this.refs = {
            'Лог': `/siotransacts.html?sio=${this.id}`,
        };
    }

    static getCommonSQL() {
        return 'SELECT /*+ RULE*/ PU_KOD_POINT_PU, PNT_KOD_POINT, FLOW_TYPE, PU_NUM, PU_TYPE, PU_MODEL, PU_GOD_VIP, PU_DAT_PP, PU_DAT_S, PU_DAT_PO, PU_KIND ' +
            'FROM SIO_PU WHERE 1=1';
    }

    static getSelfSQL() {
        return this.getCommonSQL() + " AND PU_KOD_POINT_PU = :id";
    }

    getChildrenSioSQL() {
        return SioRegister.getCommonSQL() + " AND PU_KOD_POINT_PU = :id";
    }

    getChildrenIseSQL() {
        //  у счетчиков (pu_kind == null) подчиненные узлы есть
        //  а у трансформатров (pu_kind != null) их нет 
        return this.visible.pu_kind
            ? null
            : "WITH ini AS (SELECT /*+ RULE */ i.KOD_POINT_INI, E.KOD_POINT_PU FROM HR_POINT_INI i, HR_POINT_EN e WHERE i.KOD_POINT_EN = e.KOD_POINT_EN) " +
                "SELECT /*+ RULE*/ s.INI_KOD_POINT_INI ies, ls.ID, i.KOD_POINT_PU p_id, li.ID_IES p_ies " +
                // дочерние узлы СИО
                "FROM SIO_INI s " +
                // дочерние пары
                "LEFT OUTER JOIN IER_LINK_OBJECTS ls ON (ls.ID_IES = s.INI_KOD_POINT_INI) " +
                // дочерние узлы ИСЭ
                "LEFT OUTER JOIN INI i ON (i.KOD_POINT_INI = ls.ID) " +
                // вышестоящие пары (ИСЭ)
                "LEFT OUTER JOIN IER_LINK_OBJECTS li ON (li.KOD_OBJTYPE = 9 AND li.ID = i.KOD_POINT_PU) " +
                "WHERE s.PU_KOD_POINT_PU = :id";
    }

    static create(row) {
        return new SioPU(row);
    }

    createSioChild(row) {
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
        this.type = 'REG';
        this.type_code = 10;
        this.id = this.visible.ini_kod_point_ini;
        this.parent_id = row.PU_KOD_POINT_PU;
        this.title = `${this.visible.ini_kodinterval} / ${this.visible.ini_kod_directen}`;
        this.nodes = [];
        // this.icon = 'toggles';
        // this.icon = 'menu-button-wide-fill';
        this.icon = 'segmented-nav';
       this.refs = {
            'Лог': `/siotransacts.html?sio=${this.id}`,
        };
    }

    static getCommonSQL() {
        return 'SELECT /*+ rule */ INI_KOD_POINT_INI, PU_KOD_POINT_PU, FLOW_TYPE, INI_KOD_DIRECTEN, INI_ENERGY, INI_KODINTERVAL, INI_RKOEF, INI_RAZR, INI_RAZR2 ' +
            'FROM SIO_INI WHERE 1=1';
    }

    static getSelfSQL() {
        return this.getCommonSQL() + " AND INI_KOD_POINT_INI = :id";
    }

    getChildrenSioSQL() {
        return null;
    }

    getChildrenIseSQL() {
        return null;
    }

    static create(row) {
        return new SioRegister(row);
    }

    // setIseChildProps(row) {
    //     return null;
    // }
}

class IseAbon extends BaseNode {

    constructor(row) {
        super();

        this.visible = {
            kodp: row.KODP,
            nump: row.NUMP,
            name: row.NAME,
            inn: row.INN,
            sname: row.SNAME,
            u_m: row.U_M,
            d_m: row.D_M,
            tag: null,
        };
        this.source = 'ISE';
        this.type = 'ABN';
        this.id = this.visible.kodp;
        this.parent_id = '';
        this.updateTitle();
    }

    updateTitle() {
        this.title = `${this.visible.nump} (${this.visible.tag})`;
    }

    static getMySQL() {
        return 'SELECT /*+ RULE*/ ID, KOD_OBJTYPE, FLOW_TYPE, DT, TAG, ' +
            'P.NUMP, P.NAME, P.INN, P.U_M, P.D_M ' +
            'FROM IER_LINK_OBJECTS l, KR_PAYER p ' +
            'WHERE l.KOD_OBJTYPE = 2 ' +
            'AND l.ID = P.KODP ' +
            'AND l.ID_IES = :ies';
    }


    static getCommonSQL() {
        return 'SELECT /*+ RULE*/ p.KODP, P.NUMP, P.NAME, P.INN, P.U_M, P.D_M FROM KR_PAYER p WHERE 1=1';
    }

    static getSelfSQL() {
        return this.getCommonSQL() + ` AND p.KODP = :id`;
    }

    getChildrenSioSQL() {
        return null;
    }

    static create(row) {
        return new IseAbon(row);
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
            tag: null,
        };
        this.source = 'ISE';
        this.type = 'DOG';
        this.id = this.visible.kod_dog;
        this.parent_id = '';
        this.updateTitle();
    }

    updateTitle() {
        this.title = `${this.visible.ndog} (${this.visible.sname})`;
    }

    static getCommonSQL() {
        return 'SELECT /*+ RULE*/ d.KOD_DOG as ID, d.KOD_DOG, d.NDOG, d.DAT_NUMDOG, d.PR_ACTIVE, o.SNAME, d.U_M, d.D_M FROM KR_DOGOVOR d, KR_ORG o WHERE o.KODP = d.DEP';
    }

    static getSelfSQL() {
        return this.getCommonSQL() + ` AND d.KOD_DOG = :id`;
    }

    getChildrenSioSQL() {
        return null;
    }

    static create(row) {
        return new IseDog(row);
    }

}

class IseObj extends BaseNode {

    constructor(row) {
        super();

        this.visible = {
            kod_numobj: row.KOD_NUMOBJ,
            name: row.NAME,
            dat_create: row.DAT_CREATE,
            pr_active: row.PR_ACTIVE,
            tarif: row.TARIF,
            u_m: row.U_M,
            d_m: row.D_M,
            tag: null,
        };
        this.source = 'ISE';
        this.type = 'OBJ';
        this.id = this.visible.kod_numobj;
        this.parent_id = '';
        this.title = '';
        this.updateTitle();
    }

    updateTitle() {
        this.title = `${this.visible.name} (${this.visible.tag})`;
    }

    static getCommonSQL() {
        return 'SELECT /*+ RULE*/ KOD_NUMOBJ, NAME, DAT_CREATE, TARIF, PR_ACTIVE FROM KR_NUMOBJ WHERE 1=1';
    }

    static getSelfSQL() {
        return this.getCommonSQL() + ` AND KOD_NUMOBJ = :id`;
    }

    getChildrenSioSQL() {
        return null;
    }

    static create(row) {
        return new IseObj(row);
    }
}

class IseAttp extends BaseNode {

    constructor(row) {
        super();

        this.visible = {
            kod_attpoint: row.KOD_ATTPOINT,
            attpoint_name: row.ATTPOINT_NAME,
            kod_src: row.KOD_SRC,
            kod_v: row.KOD_V,
            d_create: row.D_CREATE,
            d_finish: row.D_FINISH,
            tag: null,
        };
        this.source = 'ISE';
        this.type = 'ATP';
        this.id = this.visible.kod_attpoint;
        this.parent_id = '';
        this.title = '';
        this.updateTitle();
    }

    updateTitle() {
        this.title = `${this.visible.attpoint_name}`;
    }

    static getCommonSQL() {
        return 'SELECT /*+ RULE*/ KOD_ATTPOINT, ATTPOINT_NAME, KOD_SRC, KOD_V, D_CREATE, D_FINISH FROM HR_ATTPOINT WHERE 1=1';
    }

    static getSelfSQL() {
        return this.getCommonSQL() + ` AND KOD_ATTPOINT = :id`;
    }

    getChildrenSioSQL() {
        return null;
    }

    static create(row) {
        return new IseAttp(row);
    }
}

class IsePoint extends BaseNode {

    constructor(row) {
        super();

        this.visible = {
            kod_point: row.KOD_POINT,
            nomer: row.NOMER,
            mesto: row.MESTO,
            dat_s: row.DAT_S,
            dat_po: row.DAT_PO,
            name: row.NAME,
            tag: null,
        };
        this.source = 'ISE';
        this.type = 'PNT';
        this.id = this.visible.kod_point;
        this.parent_id = '';
        this.title = '';
        this.updateTitle();
    }

    updateTitle() {
        this.title = `${this.visible.name}`;
    }

    static getCommonSQL() {
        return 'SELECT /*+ RULE*/ KOD_POINT, NOMER, MESTO, DAT_S, DAT_PO, NAME FROM HR_POINT WHERE 1=1';
    }

    static getSelfSQL() {
        return this.getCommonSQL() + ` AND KOD_POINT = :id`;
    }

    getChildrenSioSQL() {
        return null;
    }

    static create(row) {
        return new IsePoint(row);
    }
}

class IseTr extends BaseNode {

    constructor(row) {
        super();

        this.visible = {
            kod_point_tr: row.KOD_POINT_TR,
            kod_tiptn: row.KOD_TIPTN,
            zav_nom: row.ZAV_NOM,
            kodsp_ttn_u: row.KODSP_TTN_U,
            dat_s: row.DAT_S,
            dat_po: row.DAT_PO,
            faza: row.FAZA,
            pr_active: row.PR_ACTIVE,
            d_m: row.D_M,
            u_m: row.U_M,
            tag: null,
        };
        this.source = 'ISE';
        this.type = 'TRS';
        this.id = this.visible.kod_point_tr;
        this.parent_id = '';
        this.title = '';
        this.updateTitle();
    }

    updateTitle() {
        this.title = `${this.visible.kod_tiptn}`;
    }

    static getCommonSQL() {
        return 'SELECT /*+ RULE*/ KOD_POINT_TR, KOD_TIPTN, ZAV_NOM, DAT_S, DAT_PO, KOD_BAL, FAZA, D_M, U_M, PR_ACTIVE, KODSP_TTN_U FROM HR_POINT_TR WHERE 1=1';
    }

    static getSelfSQL() {
        return this.getCommonSQL() + ` AND KOD_POINT_TR = :id`;
    }

    getChildrenSioSQL() {
        return null;
    }

    static create(row) {
        return new IseTr(row);
    }
}

class IsePU extends BaseNode {

    constructor(row) {
        super();

        this.visible = {
            kod_point_pu: row.KOD_POINT_PU,
            nom_pu: row.NOM_PU,
            dat_s: row.DAT_S,
            dat_po: row.DAT_PO,
            dat_pover: row.DAT_POVER,
            razr: row.RAZR,
            razr2: row.RAZR2,
            pr_active: row.PR_ACTIVE,
            d_m: row.D_M,
            u_m: row.U_M,
            tag: null,
        };
        this.source = 'ISE';
        this.type = 'PUE';
        this.id = this.visible.kod_point_pu;
        this.parent_id = '';
        this.title = '';
        this.updateTitle();
    }

    updateTitle() {
        this.title = `${this.visible.nom_pu}`;
    }

    static getCommonSQL() {
        return 'SELECT /*+ RULE*/ KOD_POINT_PU, NOM_PU, DAT_S, DAT_PO, DAT_POVER, RAZR, RAZR2, PR_ACTIVE, D_M, U_M  FROM HR_POINT_PU WHERE 1=1';
    }

    static getSelfSQL() {
        return this.getCommonSQL() + ` AND KOD_POINT_PU = :id`;
    }

    getChildrenSioSQL() {
        return null;
    }

    static create(row) {
        return new IsePU(row);
    }
}

class IseReg extends BaseNode {

    constructor(row) {
        super();

        this.visible = {
            kod_point_ini: row.KOD_POINT_INI,
            pr_active: row.PR_ACTIVE,
            dat_s: row.DAT_S,
            dat_po: row.DAT_PO,
            rkoeff: row.RKOEFF,
            kodinterval: row.KODINTERVAL,
            energy: row.ENERGY,
            kod_directen: row.KOD_DIRECTEN,
            tag: null,
        };
        this.interval = row.INTERVAL;
        this.source = 'ISE';
        this.type = 'REG';
        this.id = this.visible.kod_point_ini;
        this.parent_id = '';
        this.title = '';
        this.updateTitle();
    }

    updateTitle() {
        const dir = this.visible.kod_directen === 1 ? 'Прямое' : 'Обратное';
        const eng = this.visible.energy === 1 ? 'Активная' : 'Реактивная';
        this.title = `${this.interval} / ${dir} / ${eng}`;
    }

    static getCommonSQL() {
        return 'SELECT /*+ RULE*/ i.KOD_POINT_INI, i.PR_ACTIVE, i.DAT_S, i.DAT_PO, i.RKOEFF, i.KODINTERVAL, E.ENERGY, E.KOD_DIRECTEN, ' +
            "replace(d.ID_IES, 'http://trinidata.ru/sigma/ТарифнаяЗонаСуток', '') INTERVAL " +
            'FROM HR_POINT_INI i, HR_POINT_EN e, IER_LINK_DATADICTS d ' +
            'WHERE e.KOD_POINT_EN = i.KOD_POINT_EN AND d.KOD_DICT = 11 AND d.ID (+) = i.KODINTERVAL';
    }

    static getSelfSQL() {
        return this.getCommonSQL() + ` AND i.KOD_POINT_INI = :id`;
    }

    getChildrenSioSQL() {
        return null;
    }

    static create(row) {
        return new IseReg(row);
    }
}

module.exports = {
    ALL_CHILDREN: ALL_CHILDREN,
    WO_CHILDREN: WO_CHILDREN,
    DIR_CHILDREN: DIR_CHILDREN,
    GlobSIO: GlobSIO,
    BaseNode: BaseNode,
    SioAbon: SioAbon,
    SioDog: SioDog,
    SioObj: SioObj,
    SioAttp: SioAttp,
    SioPoint: SioPoint,
    SioPU: SioPU,
    SioRegister: SioRegister,
    IseAbon: IseAbon,
    IseDog: IseDog,
    IseObj: IseObj,
    IseAttp: IseAttp,
    IsePoint: IsePoint,
    IseTr: IseTr,
    IsePU: IsePU,
    IseReg: IseReg
}