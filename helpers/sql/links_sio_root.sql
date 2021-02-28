SELECT DISTINCT ABON_KODP 
  FROM VI_SIO 
 WHERE 'http://trinidata.ru/sigma/'||:key = 
 DECODE(:type, 
    1, DG_KOD_DOG, 
    2, ABON_KODP, 
    3, NOBJ_KOD_NUMOBJ, 
    4, ATTP_KOD_ATTPOINT, 
    7, PNT_KOD_POINT, 
    9, PU_KOD_POINT_PU, 
    10, INI_KOD_POINT_INI, 
    '')