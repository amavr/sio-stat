SELECT tran_id, MIN(dt) AS dt
  FROM SIO_MDM_LOG 
 WHERE MSG LIKE :expr 
   AND ID BETWEEN :beg_id AND nvl(:end_id, id)
 GROUP BY tran_id
 ORDER BY 2 DESC

