SELECT TRAN_ID FROM SIO_MDM_LOG WHERE id = (SELECT MAX(id) FROM SIO_MDM_LOG)