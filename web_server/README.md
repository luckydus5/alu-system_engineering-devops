Web Server Configuration – ALU System Engineering DevOps

This project covers fundamental system administration and web server configuration tasks using Bash and Nginx on Ubuntu.

It demonstrates secure file transfer, web server installation, DNS configuration, HTTP redirection, and custom error page handling.

📁 Directory
alu-system_engineering-devops/web_server
0. Transfer a File to a Server

File: 0-transfer_file

Objective

Create a Bash script that transfers a file from a client machine to a remote server using scp.

Requirements Implemented

Accepts 4 parameters:

Path to file

Server IP

SSH username

Path to private SSH key

Displays usage message if parameters are missing

Transfers file to remote user's home directory (~/)

Disables strict host key checking

Example Usage
./0-transfer_file some_page.html 8.8.8.8 ubuntu ~/.ssh/private_key
1. Install Nginx Web Server

File: 1-install_nginx_web_server

Objective

Configure a fresh Ubuntu server to:

Install Nginx

Listen on port 80

Serve a page containing:

Holberton School for the win!
Notes

Uses apt-get -y

Does not use systemctl

Ensures service is running

Overwrites default Nginx index page

Validation
curl localhost

Expected output:

Holberton School for the win!
2. Setup a Domain Name

File: 2-setup_a_domain_name

Objective

Register a .tech domain

Configure DNS A record to point to server IP

Ensure propagation

Verify registrar is Dotserve Inc

Verification Commands
dig yourdomain.tech

Check A record resolves to your server IP.

3. HTTP Redirection

File: 3-redirection

Objective

Configure Nginx so that:

/redirect_me

returns:

301 Moved Permanently

Redirects to:

https://www.youtube.com/watch?v=QH2-TGUlwu4
Validation
curl -sI http://your_server_ip/redirect_me/

Expected:

HTTP status 301

Correct Location header

4. Custom 404 Page

File: 4-not_found_page_404

Objective

Configure Nginx to:

Return HTTP 404

Display custom message:

Ceci n'est pas une page
Validation
curl http://your_server_ip/nonexistent

Expected:

HTTP 404 status

Custom message displayed

5. Beautiful 404 Page

File: 5-design_a_beautiful_404_page.html

Objective

Design a creative 404 page.

Requirements:

Must contain the string:

Ceci n'est pas une page

Must return HTTP 404 status

Should be visually styled (HTML/CSS)

Design inspiration:

GitHub

DigitalOcean

Lego

Blizzard

🛠 Technologies Used

Bash

Ubuntu

Nginx

DNS configuration

SSH & SCP

🔎 Logs Location

If debugging Nginx:

/var/log/nginx/error.log
/var/log/nginx/access.log
🚀 Skills Demonstrated

Remote file transfer via SSH

Automated server configuration

Web server setup and validation

DNS record management

HTTP status codes understanding

Error handling in web applications

Author

Olivier Dusabamahoro
ALU – System Engineering & DevOps
