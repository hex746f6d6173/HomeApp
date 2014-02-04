<?php
function is_online() { $retval = 0; system("ping iPhoneTomas.local -c1 -q -w1", $retval); return $retval == 0; }
if(is_online()){
	echo "hoi";
}else{
	echo "doi";
}
?>