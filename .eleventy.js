require("dotenv").config();

const cleanCSS = require("clean-css");
const fs = require("fs");
const pluginRSS = require("@11ty/eleventy-plugin-rss");
const localImages = require("eleventy-plugin-local-images");
const lazyImages = require("eleventy-plugin-lazyimages");
const ghostContentAPI = require("@tryghost/content-api");
const emojiRegex = require("emoji-regex");
const slugify = require("slugify");
const syntaxHighlight = require("@11ty/eleventy-plugin-syntaxhighlight");
const pluginRss = require("@11ty/eleventy-plugin-rss");
const markdownIt = require("markdown-it");
const markdownItAnchor = require("markdown-it-anchor");
const packageVersion = require("./package.json").version;
const htmlMinTransform = require("./_config/html-min-transform.js");

// Init Ghost API
const api = new ghostContentAPI({
  url: process.env.GHOST_API_URL,
  key: process.env.GHOST_CONTENT_API_KEY,
  version: "v2"
});

module.exports = function(eleventyConfig) {
  eleventyConfig.addLayoutAlias('slides', '_layouts/slides.njk');
  eleventyConfig.addLayoutAlias('home', '_layouts/base2.njk');

     // Eleventy configuration
     return {
      dir: {
        input: "src",
        output: "dist",
        includes: "_includes",
        layouts: "_layouts",
        
  
      },
  
      // Files read by Eleventy, add as needed
      templateFormats: ["css", "njk", "md", "txt"],
      htmlTemplateEngine: "njk",
      markdownTemplateEngine: "njk",
      passthroughFileCopy: true
    };
};

// Strip Ghost domain from urls
const stripDomain = url => {
  return url.replace(process.env.GHOST_API_URL, "");
};

module.exports = function(config) {
  // Minify HTML
  config.addTransform("htmlmin", htmlMinTransform);

  // Assist RSS feed template
  config.addPlugin(pluginRSS);

  // Apply performance attributes to images
  config.addPlugin(lazyImages, {
    cacheFile: ""
  });

  // Copy images over from Ghost
  config.addPlugin(localImages, {
    distPath: "dist",
    assetPath: "/assets/images",
    selector: "img",
    attribute: "data-src", // Lazy images attribute
    verbose: false
  });

  // Inline CSS
  config.addFilter("cssmin", code => {
    return new cleanCSS({}).minify(code).styles;
  });

  config.addFilter("getReadingTime", text => {
    const wordsPerMinute = 200;
    const numberOfWords = text.split(/\s/g).length;
    return Math.ceil(numberOfWords / wordsPerMinute);
  });

  // Date formatting filter
  config.addFilter("htmlDateString", dateObj => {
    return new Date(dateObj).toISOString().split("T")[0];
  });

  // Don't ignore the same files ignored in the git repo
  config.setUseGitIgnore(false);

  // Get all pages, called 'docs' to prevent
  // conflicting the eleventy page object
  config.addCollection("docs", async function(collection) {
    collection = await api.pages
      .browse({
        include: "authors",
        limit: "all"
      })
      .catch(err => {
        console.error(err);
      });

    collection.map(doc => {
      doc.url = stripDomain(doc.url);
      doc.primary_author.url = stripDomain(doc.primary_author.url);

      // Convert publish date into a Date object
      doc.published_at = new Date(doc.published_at);
      return doc;
    });

    return collection;
  });

  // Get all posts
  config.addCollection("posts", async function(collection) {
    collection = await api.posts
      .browse({
        include: "tags,authors",
        limit: "all"
      })
      .catch(err => {
        console.error(err);
      });

    collection.forEach(post => {
      post.url = stripDomain(post.url);
      post.primary_author.url = stripDomain(post.primary_author.url);
      post.tags.map(tag => (tag.url = stripDomain(tag.url)));

      // Convert publish date into a Date object
      post.published_at = new Date(post.published_at);
    });

    // Bring featured post to the top of the list
    collection.sort((post, nextPost) => nextPost.featured - post.featured);

    return collection;
  });

  // Get all authors
  config.addCollection("authors", async function(collection) {
    collection = await api.authors
      .browse({
        limit: "all"
      })
      .catch(err => {
        console.error(err);
      });

    // Get all posts with their authors attached
    const posts = await api.posts
      .browse({
        include: "authors",
        limit: "all"
      })
      .catch(err => {
        console.error(err);
      });

    // Attach posts to their respective authors
    collection.forEach(async author => {
      const authorsPosts = posts.filter(post => {
        post.url = stripDomain(post.url);
        return post.primary_author.id === author.id;
      });
      if (authorsPosts.length) author.posts = authorsPosts;

      author.url = stripDomain(author.url);
    });

    return collection;
  });

  // Get all tags
  config.addCollection("tags", async function(collection) {
    collection = await api.tags
      .browse({
        include: "count.posts",
        limit: "all"
      })
      .catch(err => {
        console.error(err);
      });

    // Get all posts with their tags attached
    const posts = await api.posts
      .browse({
        include: "tags,authors",
        limit: "all"
      })
      .catch(err => {
        console.error(err);
      });

    // Attach posts to their respective tags
    collection.forEach(async tag => {
      const taggedPosts = posts.filter(post => {
        post.url = stripDomain(post.url);
        return post.primary_tag && post.primary_tag.slug === tag.slug;
      });
      if (taggedPosts.length) tag.posts = taggedPosts;

      tag.url = stripDomain(tag.url);
    });

    return collection;
  });




};

module.exports = function (eleventyConfig) {
  eleventyConfig.addPlugin(syntaxHighlight);
  eleventyConfig.addPlugin(pluginRss);

  eleventyConfig.addWatchTarget("./src/sass/");

  eleventyConfig.addPassthroughCopy("./src/css");
  eleventyConfig.addPassthroughCopy("./src/fonts");
  eleventyConfig.addPassthroughCopy("./src/img");
  eleventyConfig.addPassthroughCopy("./src/favicon.png");

  eleventyConfig.addShortcode("year", () => `${new Date().getFullYear()}`);
  eleventyConfig.addShortcode("packageVersion", () => `v${packageVersion}`);

  eleventyConfig.addFilter("slug", (str) => {
    if (!str) {
      return;
    }

    const regex = emojiRegex();
    // Remove Emoji first
    let string = str.replace(regex, "");

    return slugify(string, {
      lower: true,
      replacement: "-",
      remove: /[*+~·,()'"`´%!?¿:@\/]/g,
    });
  });

  eleventyConfig.addFilter("jsonTitle", (str) => {
    if (!str) {
      return;
    }
    let title = str.replace(/((.*)\s(.*)\s(.*))$/g, "$2&nbsp;$3&nbsp;$4");
    title = title.replace(/"(.*)"/g, '\\"$1\\"');
    return title;
  });

  /* Markdown Overrides */
  let markdownLibrary = markdownIt({
    html: true,
  }).use(markdownItAnchor, {
    permalink: true,
    permalinkClass: "tdbc-anchor",
    permalinkSymbol: "#",
    permalinkSpace: false,
    level: [1, 2, 3],
    slugify: (s) =>
      s
        .trim()
        .toLowerCase()
        .replace(/[\s+~\/]/g, "-")
        .replace(/[().`,%·'"!?¿:@*]/g, ""),
  });
  eleventyConfig.setLibrary("md", markdownLibrary);


 


};