# Web Stack Debugging 4

In this web stack debugging task, we are testing how well our web server setup featuring Nginx is doing under pressure and it turns out it's not doing well: we are getting a huge amount of failed requests.

For the benchmarking, we are using ApacheBench which is a quite popular tool in the industry. It allows you to simulate HTTP requests to a web server.

## Requirements

### General

- All your files will be interpreted on Ubuntu 14.04 LTS
- All your files should end with a new line
- A README.md file at the root of the folder of the project is mandatory
- Your Puppet manifests must pass `puppet-lint` version 2.1.1 without any errors
- Your Puppet manifests must run without error
- Your Puppet manifests first line must be a comment explaining what the Puppet manifest is about
- Your Puppet manifests files must end with the extension `.pp`
- Files will be checked with Puppet v3.4

### More Info

Install puppet-lint:

```bash
$ apt-get install -y ruby
$ gem install puppet-lint -v 2.1.1
```

## Tasks

### 0. Sky is the limit, let's bring that limit higher

Using ApacheBench to benchmark, we find that Nginx is failing under load with 943 out of 2000 requests failing. The fix involves increasing the Nginx ULIMIT so it can handle more concurrent connections, then restarting the service.

**Requirements:**

- Your `0-the_sky_is_the_limit_not.pp` file must contain Puppet code
- You can use whatever Puppet resource type you want for your fix

**File:** `0-the_sky_is_the_limit_not.pp`
