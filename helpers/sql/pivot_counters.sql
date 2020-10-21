SELECT * FROM (SELECT to_char(dt, :fmt) time, code, value FROM SIO_COUNTERS_LOG WHERE TAG = :tag AND dt BETWEEN :dt_beg AND :dt_end)
PIVOT(
    SUM(VALUE) FOR code IN ('abon' A, 'dog' D, 'obj' O, 'attp' t, 'point' p, 'pu' u, 'ini' i)
)
ORDER BY 1