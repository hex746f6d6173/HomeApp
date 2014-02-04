<?php
while(1){
$settemp=file_get_contents("temp.json");
$livetemp=file_get_contents("gettemp.json");
if($livetemp<$settemp){
	//KOUDER
	echo "1";
}else{
	//WARMER
	echo "0";
}
}
?>
