# Change OS configuration for holberton user to fix open file limit
exec { 'change-os-configuration-for-holberton-user':
  command => 'sed -i "/holberton hard/s/5/50000/" /etc/security/limits.conf && sed -i "/holberton soft/s/4/50000/" /etc/security/limits.conf',
  path    => '/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin',
}
