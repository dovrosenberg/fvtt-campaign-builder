---
title: Advanced Settings Menu
prev: 
  text: 'Module Settings/Configuration'
  link: '/reference/configuration/'
next: 
  text: 'Custom Fields Menu'
  link: '/reference/configuration/custom-fields'
---

# Advanced Settings Menu

This is where you configure your backend if you are using Advanced Features.

## Backend Tab
This is required to use any backend feature.  
![Backend Tab](/assets/images/advanced-settings-backend.webp)
  - **Backend URL**: The URL of the backend server from the [deploy script](/reference/backend/setup#deploy)
  - **API Token**: The security token that the backend deploy script gives you (also from the deploy script)

## AI Models Tab
For selecting the AI models you want to use
![AI Models Tab](/assets/images/advanced-settings-aimodels.webp)

## Email
Settings for the [Email to Ideas List](/reference/backend/email).  Note that this feature does not use AI and can be used independently of the others (i.e. without providing AI API Keys).
![Email Tab](/assets/images/advanced-settings-email.webp)
  - **Use Gmail for Ideas**: Turn this on to use the ["Email to Ideas List"](/reference/backend/email) feature)
  - **Default Setting for email**: When using the Email to Ideas List, this setting determines which [^Setting] ideas go to (only needed if there's more than one).
  - **Default Campaign for email**: When using the Email to Ideas List, this setting determines which [^Campaign] within the above Setting ideas go to (only needed if there's more than one).
