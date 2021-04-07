WITH 
    trn AS (SELECT MAX(dt) AS dt, TRAN_ID FROM SIO_MDM_LOG WHERE key = :key GROUP BY TRAN_ID)
SELECT t.DT, t.TRAN_ID, l.NAME as LABEL
  FROM trn t, SIO_TIMES l
 WHERE t.dt > l.DT
   AND NOT EXISTS (SELECT 1 FROM sio_times WHERE dt > l.dt AND dt < T.dt)
 ORDER BY t.DT DESC