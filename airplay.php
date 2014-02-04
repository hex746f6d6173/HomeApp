	<?php
	$connection = ssh2_connect('192.168.1.101', 22);
	ssh2_auth_password($connection, 'pi', 'fleismann');
	
	$stream = ssh2_exec($connection, 'sudo /etc/init.d/shairport restart');
	stream_set_blocking($stream, true);
	echo stream_get_contents($stream);
	fclose($stream);
	?>