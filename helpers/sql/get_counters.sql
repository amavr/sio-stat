SELECT to_char(dt, :fmt) time, tag, code, SUM(value) num
  FROM SIO_COUNTERS_LOG 
 WHERE dt BETWEEN :dt_beg AND :dt_end
   AND tag = :tag
 GROUP BY to_char(dt, :fmt), tag, code
 ORDER BY 1, 2, 3