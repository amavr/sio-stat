SELECT DISTINCT 
    -- to_char(l.DT, 'YYYY-MM-DD') DT, 
    p.INN ABN_INN, p.NAME ABN_NAME, d.NDOG DOG_NUM, o.NUM_OBJ OBJ_NUM, o.NAME OBJ_NAME, a.ATTPOINT_NAME ATT_NAME, t.NOMER PNT_NUM, t.NAME PNT_NAME, u.NOM_PU PU_NUM, u.DAT_S dt_beg,
    f.SNAME DEP_NAME, p.KODP ABN_ID, d.KOD_DOG DOG_ID, o.KOD_NUMOBJ OBJ_ID, a.KOD_ATTPOINT ATT_ID, t.KOD_POINT PNT_ID, u.KOD_POINT_PU PU_ID, d.DEP, h.KF_ADRESS_O addr
  FROM IER_LINK_OBJECTS l, HR_ATTPOINT a, HR_POINT t, HR_POINT_PU u, KR_NUMOBJ o, KR_DOGOVOR d, KR_PAYER p, KR_ORG f, KR_OBJECT o2, K_HOUSE h
 WHERE l.KOD_OBJTYPE = 9
   AND l.dt BETWEEN TO_DATE(:beg, 'YYYY-MM-DD') AND TO_DATE(:end, 'YYYY-MM-DD')
   AND l.TAG = 'CH'
   AND u.KOD_POINT_PU = l.ID
   AND t.KOD_POINT = u.KOD_POINT
   AND t.KOD_ATTPOINT = a.KOD_ATTPOINT
   AND o.KOD_OBJ = t.KOD_OBJ
   AND o.KOD_OBJ = o2.KOD_OBJ
   AND h.KODD = o2.KODD
   AND d.KOD_DOG = o.KOD_DOG
   AND P.KODP = d.KODP
   AND f.KODP = d.DEP
   AND d.dep = :dep
 ORDER BY 2, 3, 4, 5, 7, 8, 10