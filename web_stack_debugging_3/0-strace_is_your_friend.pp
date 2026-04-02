# Fix WordPress 500 error by correcting .phpp typo to .php in wp-settings.php
exec { 'fix-wordpress':
  command => 'sed -i s/phpp/php/g /var/www/html/wp-settings.php',
  path    => '/usr/local/bin/:/bin/',
}
