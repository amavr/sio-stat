    WITH 
        times(dt) AS (
            SELECT TRUNC(TRUNC(SYSDATE - :day_r + 1) - (ROWNUM - 1) * 1/24/60, 'mi') 
              FROM ALL_OBJECTS 
             WHERE ROWNUM <= (trunc(SYSDATE - :day_r + 1) - trunc(SYSDATE - :day_l)) * 1440 + 1
        ),
        min_max(dt1, dt2) AS (
            SELECT MIN(dt), MAX(dt) FROM times
        ),
        datas(dt, tag, code, num)  AS (
            SELECT trunc(d.dt, 'mi'), d.tag, d.code, d.value 
              FROM SIO_COUNTERS_LOG d, min_max m
             WHERE d.tag = :tag
               AND d.dt BETWEEN m.dt1 AND m.dt2
        )
    SELECT to_char(trunc(T.dt, :trn), 'yyyy-mm-dd hh24:mi') time, d.tag, d.code, d.num
      FROM times T, datas d
     WHERE t.dt <= trunc(SYSDATE, :trn)
       AND d.dt (+) = t.dt
     ORDER BY T.dt, d.code