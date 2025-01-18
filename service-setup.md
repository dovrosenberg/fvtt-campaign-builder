# Instructions for setting up third party services

## Google cloud
In order to most effectively use third party APIs to do asynchronous work (ex. creating AI images in the background), we use a backend "server" to do the work.  We call this server from the module when needed and then get back the results.

For the technically sophisticated, this server could be anywhere, though I've found Google Cloud to be both highly affordable and much easier to configure than AWS, so have used that for simplicity.  These instructions could be easily adapted for those who prefer other solutions.

### Create an account and a project

