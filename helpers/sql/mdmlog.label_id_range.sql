WITH 
   dts AS (SELECT MIN(c.dt) AS dt_l, nvl(MIN(n.dt), SYSDATE) AS dt_r FROM sio_times n, sio_times c WHERE n.dt (+) > c.dt AND c.id = :label_id),
   ids AS (SELECT MIN(id) beg_id, MAX(id) end_id FROM dts, SIO_MDM_LOG WHERE dt BETWEEN dts.DT_L AND dts.DT_R)
SELECT * FROM ids
