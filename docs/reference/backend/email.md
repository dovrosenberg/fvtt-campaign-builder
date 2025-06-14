---
title: Email Functionality Setup
prev: 
  text: 'The Backend and Advanced Features'
  link: '/reference/backend'
next: 
  text: 'Module Configuration'
  link: '/reference/configuration'
---
# Email Functionality Setup
The backend has the capability to manage a (free) gmail account that you can then email with ideas and have those ideas automatically pulled into your campaign [ideas list](/reference/playing/content/campaign/ideas).

# Prerequisites
1. Before doing this, make sure you've already completed the basic [installation](./setup)

2. Create a free gmail account that you will send "Idea" emails to (https://accounts.google.com/signup).  Make the password secure.  Do not set up 2FA.  Log into that account

3. Enable the gmail api - https://console.cloud.google.com/apis/api/gmail.googleapis.com/overview, make sure the right project is showing, then click "Enable".

4. Configure OAuth - https://console.cloud.google.com/auth/overview, make sure the right project is showing, and hit "Get Started".  
    
    (Step 1) Enter an App name (whatever you want - something like fcb-backend is fine), User Support Email is your gmail address - not the one you created 
    
    (Step 2-Audience) - choose External

    (Step 3 - Contact info) - your email address again.  Then agree to the question on step 4 and finish then hit Create.

5. Add "test" user - go to https://console.cloud.google.com/auth/audience and under "Test users" hit add users and enter the gmail address you created to receive emails way back in step a.  We use "test" users because this is an external app that we won't ever publish.

6. Add OAuth Client - go to https://console.cloud.google.com/auth/clients, hit "Create Client" and pick "Web Application" as the type.  Give it a name - again something lik fcb-backend is fine.  Under "Authorized redirect URIs, add a URI and enter http://localhost:3000/oauth2callback.  Hit create.

7. **VERY IMPORTANT!!!** Copy the Client ID and Client secret into your .env file.  If you can't do that right now, copy them somewhere else safe in the meantime -- you won't be able to get the secret again later.  Then hit OK

8. Don't forget to set INCLUDE_EMAIL_SETUP to true in your env file.  Then rerun the deploy script 
    ```
    curl -sSL https://github.com/dovrosenberg/fvtt-fcb-backend/releases/latest/download/env.template -o .env
    ```

    It will ask you to open a URL in the browser and prompt for a code.  Open that URL.  You will be asked to login.  **IMPORTANT!!!** You need to login with the gmail account you created for this - not your normal one. You will get a security warning.  Hit Continue.  You'll get another security warning.  Hit continue again.  You will get a "refused to connect" message - totally fine - don't close the window and see the next step.  

9. Find the code in the URL - it starts after the 'code=' and ends right before the '&scope'... copy everything in between and paste into the terminal where it's waiting for the auth code.  Copy the refresh token it gives you into your .env file. and rerun the deploy script 
    ```
    curl -sSL https://github.com/dovrosenberg/fvtt-fcb-backend/releases/latest/download/env.template -o .env
    ```

10. That's it!  You won't have to do this again for future deployments unless you wanted to change the email address.