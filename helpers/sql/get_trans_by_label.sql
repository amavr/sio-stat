WITH 
X as (
    SELECT /*+ RULE */ MIN(T1.DT) BEG_DT, MIN(T2.DT) END_DT 
      FROM SIO_TIMES T1, SIO_TIMES T2 
     WHERE T1.DT < T2.DT 
       AND T1.ID = '##ID##'
),
y AS (
    SELECT /*+ RULE */ DISTINCT tran_id FROM sio_mdm_log, x WHERE dt BETWEEN x.beg_dt AND x.end_dt
--    SELECT ID, tran_id, dt, tag, lvl, msg, key
--      FROM sio_mdm_log, x 
--     WHERE dt BETWEEN x.beg_dt AND x.end_dt
)
SELECT * FROM y;