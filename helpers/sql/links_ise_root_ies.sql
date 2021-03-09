SELECT DISTINCT replace(l2.ID_IES, 'http://trinidata.ru/sigma/', '') ies
  FROM IER_LINK_OBJECTS l, IER_LINK_OBJECTS l2
 WHERE l.ID_IES = :ies
   AND l2.ID = DBG_TOOLS.GET_ISE_ROOT(l.ID, l.KOD_OBJTYPE) 
   AND l2.KOD_OBJTYPE = 2
