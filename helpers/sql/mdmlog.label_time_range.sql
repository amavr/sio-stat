WITH
    left_dt AS (SELECT dt FROM SIO_TIMES WHERE ID = :label_id),
    right_dt AS (SELECT MIN(t.dt) AS DT FROM SIO_TIMES t, left_dt l WHERE t.DT > l.DT)
SELECT left_dt.dt beg_dt, nvl(right_dt.dt, sysdate + 1) end_dt FROM left_dt, right_dt