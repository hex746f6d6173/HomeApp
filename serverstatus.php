<?php
$content=file_get_contents("http://192.168.1.100/status.json");
if($content!=""){
	$json["status"]="1";	
}else{
	$json["status"]="0";
}
echo json_encode($json);
?>