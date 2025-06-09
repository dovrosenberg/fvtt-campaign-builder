---
title: The Backend and Advanced Features
TODO: true
TODOWHAT: talk about autocomplete -- or maybe move that to nvaigation/UI and flesh out the features section more
prev: 
  text: 'Campaigns (Playing)'
  link: '/reference/playing'
next: 
  text: 'Configuration'
  link: '/reference/configuration'
---
# Advanced Features

TODO: talk about autocomplete {#autocomplete}

You'll see features throughout this documentation labeled "Advanced Feature".  These features require the setup and configuration described here to make them available.

## Features {#features}
### AI Integration

The module includes optional AI-powered features for generating descriptions and images. These features require setting up a backend server, which is much easier than it sounds (see below).

[TODO - link these to the relevant sections of the docs and flesh them out more]
With AI integration, you can:
- Generate detailed descriptions for Characters, locations, and organizations
- Create images based on your descriptions
- Generate names for NPCs, towns, shops, and taverns -- infinitely renewed RollTables

To use AI generation:
1. Set up the backend server (see below)
2. In the module settings, enter your API URL and token
3. When creating or editing a Setting element, click the "Generate" button

### A note on image generation

In order to save costs, the backend uses Replicate.com for image generation, using a model that spins down between uses.  This means that the first time you generate an image in a given period, it may take significantly longer than subsequent runs because the model has to start.  After that, you'll see more rapid creation (still ~30 seconds) until the model times out again (~15 minutes of not being used).

## Costs {#costs}
The backend runs in the cloud.  In all cases, it uses accounts that you setup and control and you do not need to share your passwords/tokens with anyone, or even put them in Foundry.  The various accounts were selected with the goal of being as low cost as possible:

### Google Cloud Platform
You should be able to stay within the free tier of GCP for processing.  Storage is 5GB free then ~$0.02 per GB after that.  Egress is 1GB free then $0.12/GB after that.

That's likely enough for most use cases, and pretty cheap for storage.  But if you're creating lots of images and/or running frequent games with lots of players, you may hit the limits.  It can alternately be configured to store images in AWS S3.  So if you are already using AWS for Foundry, you can attach to the same bucket and avoid Google storage altogether.  This also lets Foundry work directly with the output file images, so it's much more convenient (at least given the current Campaign Builder functionality).

For heavy users, BackBlaze storage would be significantly cheaper (not free but only $0.005/GB for storage and $0.01/GB for egress), so we could add that as an option in the future.  Let me know if you're running into limits.

### OpenAI
[Open AI](https://openai.com/api) is used to generate text (descriptions, names, rolltable results, etc.).  The cost is minimal - approximately $0.15 for 5000 AI-generated character descriptions - but at the current time, OpenAI has a minimum purchase of $5.00 and the credits expire after a year, so you should think of it as $5/year.  I'll be looking at switching to another providerto avoid this minimum charge.

### Replicate
[Replicate](https://replicate.com/) is used to generate images.  The cost is approximately $0.01 per image, and you are only billed for actual usage.

## Setup {#setup}

The backend is at https://github.com/dovrosenberg/fvtt-fcb-backend.

Setting it up is pretty straightforward but requires some basic comfort with command-line scripts (you don't need to create any - just edit and run).

### Requirements 
The backend script supports Ubuntu/Debian (including WSL), MacOS (requires Homebrew), and Windows (requires Powershell).  Note: It has not been well-tested in Powershell.  I recommend using WSL for Windows if possible, but if you do use Powershell, file an issue if you run into trouble.  

Everything runs in the cloud, so there aren't any particular hardware requirements.  You will need to create accounts at Google Cloud, OpenAI, and Replicate.com.

### Prerequisites (you'll only need to do this one time - not for every update)
There are lot of steps here, but if you follow the directions below, it should be pretty straightforward.

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
  
### Set environment variables (You generally only need to do this once, but will need to update the file if you ever change any of your tokens)
  
1. Run this to download a template variable file.  Run it from the directory where you downloaded the key file in step 4 above.
    ```sh
    curl -sSL https://github.com/dovrosenberg/fvtt-fcb-backend/releases/latest/download/env.template -o .env
    ```

2. Edit the newly created .env file (in your favorite editor) to put in the needed settings (explained in detail in the comments in the .env file).
      
### Deploy the backend (You'll just do this part whenever you want to upgrade to a new release of this backend)

**Notes:**
  - The next step might take a few minutes to run - especially after the line around Setting IAM Policy.
  - You may also see a warning: *Your active project does not match the quota project in your local Application Default Credentials file. This might result in unexpected quota issues*  You can ignore this.

 **For Ubuntu/Debian/WSL (recommended for Windows) or MacOS**
  - Run the following in your terminal (in MacOS, this requires Homebrew):
      ```sh
      curl -sSL https://github.com/dovrosenberg/fvtt-fcb-backend/releases/latest/download/deploy-gcp.sh | bash
    ```
 
**For Windows Powershell users:**

  - Open PowerShell as Administrator
  - Run the following command:
    ```powershell
    curl -sSL https://github.com/dovrosenberg/fvtt-fcb-backend/releases/latest/download/deploy-gcp.ps1 | powershell
    ```
    ```powershell
    Set-ExecutionPolicy RemoteSigned -Scope CurrentUser
    ```

### Setup Foundry (You'll do this after each deploy)
Whenever you deploy the backend, the script will give you a URL and API token.  These are unique to you and shouldn't be shared.  In theory, anyone who has them could use the API to generate text/images via your accounts.  You will put them in the module settings (GM-only) in Foundry to make the connection.
1. Copy the generated API URL (like `https://fvtt-fcb-backend-1018734923.us-central1.run.app`) and token that are output from the deploy script and paste them into Foundry VTT settings.
2. If you ever need them again (ex. to add to a different Foundry world), you can find them at https://console.cloud.google.com/run?project=fcb-backend (click on the machine, then 'revisions' then the latest revision to see the token under 'environment variables')

### Adding email support
If you want to use email there are a few extra steps you need to take.  I highly recommend doing this after the initial deploy runs, though in theory you could probably do it as part of the initial deploy, I guess.

1. Create a free gmail account that you will send "to do" emails to (https://accounts.google.com/signup).  Make the password secure.  Do not set up 2FA.  Log into that account

2. Enable the gmail api - https://console.cloud.google.com/apis/api/gmail.googleapis.com/overview, make sure the right project is showing, then click "Enable".

3. Configure OAuth - https://console.cloud.google.com/auth/overview, make sure the right project is showing, and hit "Get Started".  
    
    (Step 1) Enter an App name (whatever you want - something like fcb-backend is fine), User Support Email is your gmail address - not the one you created 
    
    (Step 2-Audience) - choose External

    (Step 3 - Contact info) - your email address again.  Then agree to the question on step 4 and finish then hit Create.

4. Add "test" user - go to https://console.cloud.google.com/auth/audience and under "Test users" hit add users and enter the gmail address you created to receive emails way back in step a.  We use "test" users because this is an external app that we won't ever publish.

5. Add OAuth Client - go to https://console.cloud.google.com/auth/clients, hit "Create Client" and pick "Web Application" as the type.  Give it a name - again something lik fcb-backend is fine.  Under "Authorized redirect URIs, add a URI and enter http://localhost:3000/oauth2callback.  Hit create.

6. **VERY IMPORTANT!!!** Copy the Client ID and Client secret into your .env file.  If you can't do that right now, copy them somewhere else safe in the meantime -- you won't be able to get the secret again later.  Then hit OK

7. Don't forget to set INCLUDE_EMAIL_SETUP to true in your env file.  Then rerun the deploy script 
    ```
    curl -sSL https://github.com/dovrosenberg/fvtt-fcb-backend/releases/latest/download/env.template -o .env
    ```

    It will ask you to open a URL in the browser and prompt for a code.  Open that URL.  You will be asked to login.  **IMPORTANT!!!** You need to login with the gmail account you created for this - not your normal one. You will get a security warning.  Hit Continue.  You'll get another security warning.  Hit continue again.  You will get a "refused to connect" message - totally fine - don't close the window and see the next step.  

8. Find the code in the URL - it starts after the 'code=' and ends right before the '&scope'... copy everything in between and paste into the terminal where it's waiting for the auth code.  Copy the refresh token it gives you into your .env file. and rerun the deploy script 
    ```
    curl -sSL https://github.com/dovrosenberg/fvtt-fcb-backend/releases/latest/download/env.template -o .env
    ```

9. That's it!  You won't have to do this again for future deployments unless you wanted to change the email address.
    
### Using AWS S3 Instead of Google Cloud Storage (still need Google Cloud for everything else above)

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


