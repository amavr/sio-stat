SELECT distinct code
  FROM SIO_COUNTERS_LOG 
 WHERE dt BETWEEN :dt_beg AND :dt_end
   AND tag = :tag
