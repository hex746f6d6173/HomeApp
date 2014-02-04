<html>

<head>
	<style>
	*{
		margin:0px;
		padding:0px;
	}
	</style>
</head>
<body>
<?php
error_reporting("E_ALL");
$dir=scandir("motion");
rsort($dir);
$q=$_GET["q"];
if($q==""){
foreach($dir as $file){
	if($file=="." || $file==".."){
		
	}else{
		$ext = pathinfo("motion/".$file, PATHINFO_EXTENSION);
		if($ext=="jpg"){
			echo '<img src="motion/'.$file.'"/><br/>';
		}
	}
}
}else{
	$i=0;
	foreach($dir as $file){
		if($i==0){
			if($file=="." || $file==".."){
				
			}else{
				$ext = pathinfo("motion/".$file, PATHINFO_EXTENSION);
				if($ext=="jpg"){
					echo '<img src="motion/'.$file.'" width="300px"/><br/>';
					$i++;
				}
			}
		}
	}
}
?>
</body>
</html>