WITH 
    times AS (SELECT (SELECT MAX(dt) FROM sio_times WHERE dt < T.dt) AS dt_beg, t.dt dt_end FROM SIO_TIMES t WHERE ID = :LABEL)
    , errs AS (
        SELECT COUNT(1) num, /*COUNT(DISTINCT TRAN_ID) tran_num, */ERR_GRP as MSG 
          FROM SIO_MDM_LOG, times 
         WHERE LVL = 'ERR'
           AND DT BETWEEN nvl(times.DT_BEG, DT) AND times.DT_END
         GROUP BY ERR_GRP ORDER BY 1 DESC
    )
SELECT * FROM errs