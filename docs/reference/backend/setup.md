---
title: Backend Installation and Setup
prev: 
  text: 'Backend Installation and Setup'
  link: '/reference/backend/setup'
next: 
  text: 'Email Functionality Setup'
  link: 'reference/backend/email'
---
# Backend Installation and Setup
The backend is at https://github.com/dovrosenberg/fvtt-fcb-backend.

Setting it up is pretty straightforward but requires some basic comfort with command-line scripts (you don't need to create any - just edit and run).

> [!INFO]
> You can connect the Campaign Builder module in multiple Foundry worlds (even on multiple Foundry servers) to the same backend if you want.  The only thing to note is that all generated images will be stored in the same output directory, so anyone with access from any of those different worlds will be able to see them all (unless you actively manage the directory and move things out).

## Requirements 
The backend script supports Ubuntu/Debian (including WSL), MacOS (requires Homebrew), and Windows (requires Powershell).  Note: It has not been well-tested in Powershell.  I recommend using WSL for Windows if possible, but if you do use Powershell, file an issue if you run into trouble.  

Everything runs in the cloud, so there aren't any particular hardware requirements.  You will need to create accounts at Google Cloud, OpenAI, and Replicate.com.

## Prerequisites 
> [!INFO]
> You'll only need to do this section one time - not for every update

You'll need to do this step before you can deploy the backend.

There are lot of steps here, but if you follow the directions below, it should be pretty straightforward.  If you run into trouble, please file an issue.

1. Setup Google Cloud

  - [Create a Google Cloud account](https://console.cloud.google.com/)
  - Go to the cloud overview dashboard
  - Create a new project - let's name it `FCB Backend`
    - Note the "project ID" that is generated when you put in the name - you can edit it, but don't need to
    - You will use this ID below (but will be able to find it again if you lose track of it now) 
  - Setup the services.  For each of these services, go to the link, make sure the right project is selected, and
    click "Enable".  They might each take a minute to run.
    - https://console.cloud.google.com/apis/library/cloudresourcemanager.googleapis.com
    - https://console.cloud.google.com/apis/library/run.googleapis.com
    - https://console.cloud.google.com/apis/library/storage.googleapis.com
    - https://console.cloud.google.com/apis/library/iam.googleapis.com


2. Install Google Cloud CLI (`gcloud`)
    
    https://cloud.google.com/sdk/docs/install and follow the instructions for your platform.

3. Create a service account and get credentials
  - Navigate to "IAM & Admin" in the dashboard or via this link: https://console.cloud.google.com/iam-admin/
  - Make sure you have the right project selected at the top, still
  - On the left side, select "Service Accounts"
  - Create a new service account:
    - Name (step 1): fcb-backend-service
    - Roles (step 2 - you can type these in the role box to find them, then click "Add another role"; you need the roles that exactly match these names):
      - Cloud Run Admin
      - Storage Admin
      - Service Account User
    - No need to grant users access (step 3)
  - In the list of users, click the email address of the new user.  Under "Keys" | "Add Key", select "Create new key"; select JSON and hit create
  - This will download the key file to your browser - move it into a temporary directory you'll be using below to deploy, and name it `gcp-service-key.json`

  4. Create accounts at openai.com and replicate.com.  You will need to create a token for each and supply it to the installation script, but it's best to generate them when you get to that step.

  5. Make sure you have openssl, jq, and curl installed:

      For Ubuntu/Debian:
      ```
      sudo apt-get update && sudo apt-get install -y openssl jq curl
      ```

      For MacOS:
      ```
      brew install openssl jq curl
      ```
  
## Set environment variables
> [!INFO]
> You generally only need to do this once, but you will need to update the file (step 2) if you ever change any of your tokens.
  
1. Run this to download a template variable file.  Run it from the directory where you downloaded the key file in step 4 above.
    ```sh
    curl -sSL https://github.com/dovrosenberg/fvtt-fcb-backend/releases/latest/download/env.template -o .env
    ```

2. Edit the newly created .env file (in your favorite editor) to put in the needed settings (explained in detail in the comments in the .env file).
      
## Deploy the backend
> [!INFO]
> You'll do this step the first time and then whenever you want to upgrade to a new release of this backend

### Run the deploy script
> [!NOTE]
> This step might take a few minutes to run - especially after the line around Setting IAM Policy.
> You may also see a warning: *Your active project does not match the quota project in your local Application Default Credentials file. This might result in unexpected quota issues.*  
> 
> You can safely ignore this.

#### For Ubuntu/Debian/WSL (recommended for Windows) or MacOS
  - Run the following in your terminal (in MacOS, this requires Homebrew):
      ```sh
      curl -sSL https://github.com/dovrosenberg/fvtt-fcb-backend/releases/latest/download/deploy-gcp.sh | bash
    ```
 
#### For Windows Powershell users:

  - Open PowerShell as Administrator
  - Run the following command:
    ```powershell
    curl -sSL https://github.com/dovrosenberg/fvtt-fcb-backend/releases/latest/download/deploy-gcp.ps1 | powershell
    ```
    ```powershell
    Set-ExecutionPolicy RemoteSigned -Scope CurrentUser
    ```

### Setup Foundry
> [!INFO]
> Every time you deploy, the URL may change, and the token **will** change.

When you complete the deploy step above, the script will output at the end a URL and an API token.  These are unique to you and shouldn't be shared.  In theory, anyone who has them could use the API to generate text/images via your accounts (though they can't directly access your Google/OpenAI/Replicate accounts).  

- The URL looks like: `https://fvtt-fcb-backend-jirs7fdjw-uc.run.app`
- The token looks like: `f3956b679b6542c6fe29fb2d851afa6dc038603b61aca9392225345d2008391e`

Those aren't real values, so don't get any ideas. 

Copy these values from your script's output and paste them into the [Module Settings] (GM-only) in Foundry to make the connection.

> [!INFO]
> If you ever need to find these values again without re-deploying (ex. to add to a different Foundry world), you can find them at https://console.cloud.google.com/run?project=fcb-backend (click on the 'fcb-backend', then 'revisions' then the latest revision to see the token under 'environment variables' on the right)

## Adding email support (optional)
See [Email Functionality Setup](/reference/backend/email) to enable this functionality.
   
## Using AWS S3 Instead of Google Cloud Storage (still need Google Cloud for everything else above)

If you prefer to use AWS S3 instead of Google Cloud Storage, follow these steps:

1. Set up an AWS S3 bucket
   - Follow the instructions at https://foundryvtt.com/article/aws-s3 to create and configure an S3 bucket
   - Make sure to configure the bucket policy and CORS settings as described in the Foundry VTT documentation

2. Update your `.env` file with AWS credentials
   - Add the following environment variables to your `.env` file:
     ```
     STORAGE_TYPE=aws
     AWS_BUCKET_NAME=your-bucket-name
     AWS_ACCESS_KEY_ID=your-access-key-id
     AWS_SECRET_ACCESS_KEY=your-secret-access-key
     AWS_REGION=us-east-1
     ```
   - You can use the same credentials that you've configured for Foundry VTT's S3 integration

3. Deploy the backend as described above
   - The deployment script will automatically detect and use your AWS configuration


