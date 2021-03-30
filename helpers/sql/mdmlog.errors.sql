WITH 
    times AS (SELECT (SELECT MIN(dt) FROM sio_times WHERE dt > T.dt) AS dt_end, t.dt dt_beg FROM SIO_TIMES t WHERE ID = :label_id)
    , errs AS (
        SELECT COUNT(1) num, /*COUNT(DISTINCT TRAN_ID) tran_num, */ERR_GRP as MSG 
          FROM SIO_MDM_LOG, times 
         WHERE LVL = 'ERR'
           AND DT BETWEEN times.DT_BEG AND nvl(times.DT_END, DT)
         GROUP BY ERR_GRP ORDER BY 1 DESC
    )
SELECT * FROM errs