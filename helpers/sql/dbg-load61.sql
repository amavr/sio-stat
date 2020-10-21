WITH 
    seg AS (SELECT KOD_OBJTYPE, FLOW_TYPE, COUNT(DISTINCT L.ID_IES) AS NUM FROM sio_links l WHERE L.SOUR = 'SEG'
             GROUP BY KOD_OBJTYPE, FLOW_TYPE
            ),
    msg AS (SELECT KOD_OBJTYPE, FLOW_TYPE, COUNT(DISTINCT L.ID_IES) AS NUM FROM sio_links l WHERE l.SOUR = 'MSG'
             GROUP BY KOD_OBJTYPE, FLOW_TYPE
           ),
    err AS (SELECT KOD_OBJTYPE, FLOW_TYPE, COUNT(DISTINCT L.ID_IES) AS NUM FROM sio_links l WHERE l.SOUR = 'ERR'
               AND NOT EXISTS (SELECT 1 FROM sio_links x WHERE x.SOUR IN ('SEG') AND l.KOD_OBJTYPE = x.KOD_OBJTYPE AND l.ID_IES = x.ID_IES AND l.FLOW_TYPE = x.FLOW_TYPE)
             GROUP BY KOD_OBJTYPE, FLOW_TYPE
           ),
    err_x AS (SELECT KOD_OBJTYPE, FLOW_TYPE, COUNT(DISTINCT L.ID_IES) AS NUM FROM sio_links l WHERE l.SOUR = 'ERR'
               AND EXISTS (SELECT 1 FROM sio_links x WHERE x.SOUR IN ('SEG') AND l.KOD_OBJTYPE = x.KOD_OBJTYPE AND l.ID_IES = x.ID_IES AND l.FLOW_TYPE = x.FLOW_TYPE)
             GROUP BY KOD_OBJTYPE, FLOW_TYPE
           ),
    seg_x AS (SELECT KOD_OBJTYPE, FLOW_TYPE, COUNT(DISTINCT ID_IES) AS NUM FROM sio_links l WHERE l.SOUR = 'SEG'
                 AND NOT EXISTS (SELECT 1 FROM IER_LINK_OBJECTS WHERE L.ID_IES = ID_IES AND L.FLOW_TYPE = FLOW_TYPE)
               GROUP BY KOD_OBJTYPE, FLOW_TYPE
               ),
    lnk_f AS (SELECT KOD_OBJTYPE, FLOW_TYPE, COUNT(DISTINCT L.ID_IES) AS NUM FROM IER_LINK_OBJECTS l WHERE l.TAG IN ('FA', 'FP', 'FF')
                 AND EXISTS (SELECT 1 FROM sio_links WHERE L.ID_IES = ID_IES AND L.FLOW_TYPE = FLOW_TYPE AND SOUR = 'SEG')
               GROUP BY KOD_OBJTYPE, FLOW_TYPE
               ),
    lnk_a AS (SELECT KOD_OBJTYPE, FLOW_TYPE, COUNT(DISTINCT L.ID_IES) AS NUM FROM IER_LINK_OBJECTS l WHERE l.TAG = 'CH'
                 AND EXISTS (SELECT 1 FROM sio_links WHERE L.ID_IES = ID_IES AND L.FLOW_TYPE = FLOW_TYPE AND SOUR = 'SEG')
               GROUP BY KOD_OBJTYPE, FLOW_TYPE
               )
SELECT flw.FLOW AS FLOW_TYPE, ot.KOD_OBJTYPE, 
        DECODE(ot.KOD_OBJTYPE,
            1, 'Договор',
            2, 'Абонент',
            3, 'Объект',
            4, 'ТчкПост',
            7, 'ТчкУч',
            9, 'ПриборУч',
            10, 'Регистр',
            'Прочее'
            ) NAME,
-- OT.NAME,
        SUM(nvl(msg.num, 0) + nvl(seg.num, 0) + nvl(err.num, 0)) receive,
        SUM(nvl(lnk_f.num, 0)) linked,
        SUM(nvl(err.num, 0)) errors,
        SUM(nvl(lnk_a.num, 0)) added,
        SUM(nvl(seg_x.num, 0)) no_links,
        SUM(nvl(err_x.num, 0)) err_and_seg
  FROM (SELECT 'ЮЛ' AS FLOW FROM DUAL UNION SELECT 'ИЖС' FROM DUAL UNION SELECT 'МКД_КВ' FROM DUAL) flw
  INNER JOIN IEK_OBJTYPE ot ON (ot.KOD_OBJTYPE <= 10)
  LEFT OUTER JOIN msg ON (flw.FLOW = msg.flow_type AND ot.KOD_OBJTYPE = msg.kod_objtype)
  LEFT OUTER JOIN seg ON (flw.FLOW = seg.flow_type AND ot.KOD_OBJTYPE = seg.kod_objtype)
  LEFT OUTER JOIN err ON (flw.FLOW = err.flow_type AND ot.KOD_OBJTYPE = err.kod_objtype)
  LEFT OUTER JOIN err_x ON (flw.FLOW = err_x.flow_type AND ot.KOD_OBJTYPE = err_x.kod_objtype)
  LEFT OUTER JOIN seg_x ON (flw.FLOW = seg_x.flow_type AND ot.KOD_OBJTYPE = seg_x.kod_objtype)
  LEFT OUTER JOIN lnk_f ON (flw.FLOW = lnk_f.flow_type AND ot.KOD_OBJTYPE = lnk_f.kod_objtype)
  LEFT OUTER JOIN lnk_a ON (flw.FLOW = lnk_a.flow_type AND ot.KOD_OBJTYPE = lnk_a.kod_objtype)
 GROUP BY flw.FLOW, ot.KOD_OBJTYPE, OT.NAME
 ORDER BY 1, 2