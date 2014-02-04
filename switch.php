<?php
$b=$_GET["b"];
$d=$_GET["d"];
$u=$_GET["u"];
$s=$_GET["s"];
$output["status"]=exec("cd /var/www/home/rc/ex/lights && sudo ./$b $d $u $s");
$output['q'] = "cd /var/www/home/rc/ex/lights && sudo ./$b $d $u $s";
$output['qui'] = exec("whoami");
echo json_encode($output);
?>