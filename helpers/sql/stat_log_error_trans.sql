WITH X AS (
  SELECT /* + RULE */ /* + INDEX(SIO_MDM_LOG IX_SIO_MDM_LOG_ERR_GRP) */ tran_id, MIN(dt) AS dt
    FROM SIO_MDM_LOG 
--  WHERE MSG LIKE nvl(:expr, MSG)
  WHERE (:expr IS NULL OR ERR_GRP LIKE :expr)
    AND ID BETWEEN :beg_id AND nvl(:end_id, id)
  GROUP BY tran_id
  ORDER BY 2 DESC
)
SELECT * FROM X WHERE ROWNUM < 20000
