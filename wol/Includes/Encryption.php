<?php
//FUNCTION encrypts $decrypted_data using a secret $key
function Encryption($decrypted_data) {
	if (!extension_loaded('mcrypt')) {
		$encrypted_data = $decrypted_data;
	}
	else {
		//opens the cipher module
		$TD = mcrypt_module_open('tripledes', '', 'ecb', '');
		//create the IV and determine the keysize length, used MCRYPT_RAND on Windows instead 
		$IV = mcrypt_create_iv (mcrypt_enc_get_iv_size($TD), MCRYPT_RAND);
		//initialize encryption-buffers
		require("Includes/config.php");
		$key = substr($key, 0, mcrypt_enc_get_key_size($TD));
		$s=mcrypt_generic_init($TD, $key, $IV);
		if( ($s < 0) || ($s === false)) {
			die ("Foutmelding: niet in staat om de encryptiebuffers te initializeren!");
		}
		mcrypt_generic_init($TD, $key, $IV);
		//encrypt data
		$encrypted_data = mcrypt_generic($TD, $decrypted_data);
		//terminate handler and close module
		mcrypt_generic_deinit($TD);
		mcrypt_module_close($TD);
		unset($key);
	}
	return $encrypted_data;
}
?>