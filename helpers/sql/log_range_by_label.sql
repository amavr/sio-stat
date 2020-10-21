WITH 
min_log (id) AS (
    SELECT min(l.id) min_id FROM sio_mdm_log l, sio_times t  WHERE l.dt >= t.dt AND t.id = '##lab##'
    ),
next_dt (dt) AS (
    SELECT MIN(n.dt) FROM sio_times n, sio_times c WHERE n.dt > c.dt AND c.id = '##lab##'
    ),
max_log (id) AS (
    SELECT max(l.id) min_id FROM sio_mdm_log l, next_dt t  WHERE l.dt < t.dt
)
SELECT l1.id beg_id, l2.id end_id FROM min_log l1, max_log l2