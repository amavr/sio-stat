SELECT l.DT, l.TAG, l.FLOW_TYPE, d.KOD_DOG, d.NDOG, o.NAME, d.PR_ACTIVE
  FROM IER_LINK_OBJECTS l, KR_DOGOVOR d, KR_ORG o
 WHERE d.KOD_DOG  = l.ID
   AND o.KODP = d.DEP
   AND l.ID_IES = 'http://trinidata.ru/sigma/'||:key 
 ORDER BY l.DT