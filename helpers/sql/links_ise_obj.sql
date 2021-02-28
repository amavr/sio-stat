SELECT l.DT, l.TAG, l.FLOW_TYPE, T.NAME, o.NUM_OBJ, o.NAME, o.DAT_CREATE, h.KF_ADRESS_O, o.PRIM, o.P, o.U_M, o.D_M
  FROM IER_LINK_OBJECTS l, KR_NUMOBJ o, KS_TARIF t, KR_OBJECT o2, K_HOUSE h
 WHERE o.KOD_NUMOBJ  = l.ID
   AND o.KOD_OBJ = o2.KOD_OBJ
   AND h.KODD = o2.KODD
   AND t.TARIF = o.TARIF
   AND l.ID_IES = 'http://trinidata.ru/sigma/'||:id 
 ORDER BY l.DT
