<?php
//FUNCTION decrypts $encrypted_data using a secret $key
function Decryption($encrypted_data) {
	if (!extension_loaded('mcrypt')) {
		$decrypted_data = $encrypted_data;
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
		//decrypt data
		$decrypted_data = trim(mdecrypt_generic($TD, $encrypted_data));
		//terminate handler and close module
		mcrypt_generic_deinit($TD);
		mcrypt_module_close($TD);
		unset($key);
	}
	return $decrypted_data;
}
?>