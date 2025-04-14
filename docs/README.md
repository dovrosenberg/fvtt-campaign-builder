# World & Campaign Builder Documentation

This directory contains the source files for the World & Campaign Builder documentation website, which is built with Jekyll and hosted on GitHub Pages.

## Local Development

### Prerequisites

- Ruby (version 2.5.0 or higher)
- RubyGems
- GCC and Make

### Setup

1. Install Jekyll and Bundler:
   ```
   gem install jekyll bundler
   ```

2. Install dependencies:
   ```
   cd docs
   bundle install
   ```

3. Run the local development server:
   ```
   bundle exec jekyll serve
   ```

4. Open your browser to `http://localhost:4000/fvtt-campaign-builder/` to view the site

## Adding Content

### Creating a New Page

1. Create a new Markdown file in the appropriate directory
2. Add the following front matter at the top of the file:
   ```yaml
   ---
   layout: default
   title: Your Page Title
   nav_order: X  # Controls the order in the navigation
   parent: Parent Page Title  # If this is a child page
   ---
   ```
3. Add your content using Markdown

### Adding Images

1. Place images in the `assets/images` directory
2. Reference them in your Markdown:
   ```markdown
   ![Alt text](/fvtt-campaign-builder/assets/images/your-image.png)
   ```

## Deployment

The documentation is automatically deployed to GitHub Pages when changes are pushed to the master branch. No additional steps are required.

## Theme Customization

This site uses the [Just the Docs](https://just-the-docs.github.io/just-the-docs/) theme. See their documentation for customization options.