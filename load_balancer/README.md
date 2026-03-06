# Load Balancer

This project configures a load-balanced web infrastructure using Nginx and HAproxy.

## Files

| File | Description |
|------|-------------|
| `0-custom_http_response_header` | Bash script that configures Nginx to add a custom `X-Served-By` HTTP response header with the server's hostname |
| `1-install_load_balancer` | Bash script that installs and configures HAproxy to distribute traffic to web-01 and web-02 using roundrobin |

## Servers

| Name | IP |
|------|-----|
| 6979-web-01 | 13.218.57.12 |
| 6979-web-02 | 44.202.228.82 |
| 6979-lb-01 | Load balancer |
