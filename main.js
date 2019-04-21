// nodejs
const fs = require("fs");
const path = require("path");
// scrapping
const rp = require("request-promise");
const $ = require("cheerio");
const puppeteer = require("puppeteer");
//others
const inquirer = require("inquirer");

const questions = [
  {
    type: "input",
    name: "username",
    message: "Enter a Twitter username(the part after the '@'):",
  },
];

inquirer.prompt(questions).then(answers => {
  const url = `https://twitter.com/${answers["username"]}/media`;
  main(url);
});

async function main(url) {
  console.log("Fetching images...");
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.goto(url);

  await autoScroll(page);

  await parseContent(await page.content());

  await browser.close();
}

// Automatically scroll the puppeteer instance until the end of the page
async function autoScroll(page) {
  await page.evaluate(async () => {
    await new Promise((resolve, reject) => {
      var totalHeight = 0;
      var distance = 100;
      var timer = setInterval(() => {
        var scrollHeight = document.body.scrollHeight;
        // Scroll 100 px
        window.scrollBy(0, distance);
        totalHeight += distance;
        // Check if we are at the end of the page
        const isLoadingComplete = $("div.has-more-items").length === 0;

        if (isLoadingComplete && totalHeight >= scrollHeight) {
          // Stop scrolling
          clearInterval(timer);
          resolve();
        }
      }, 1);
    });
  });
}

async function parseContent(html) {
  // get a list of links
  urls = getImageLinks(html);
  console.log(`Number of images: ${urls.length}`);
  if (urls.length) {
    // check if "images" directory exists
    fs.access("./images", fs.constants.F_OK, error => {
      if (error) {
        // does not exist, so we create it
        fs.mkdir("./images", error => {
          if (error) throw error;
          downloadPictures(urls);
        });
      } else {
        // already exists
        downloadPictures(urls);
      }
    });
  }
}

// get a list of links
const getImageLinks = html => {
  const parsedHtml = $(".AdaptiveMedia-photoContainer > img", html);
  const urls = [];

  // Create an array of the img links
  for (let i = 0; i < parsedHtml.length; i++) {
    const url = parsedHtml[i].attribs.src;
    if (url) {
      urls.push(url);
    }
  }

  return urls;
};

downloadPictures = urls => {
  const length = urls.length;
  urls.forEach((url, i) => {
    console.log(`Downloading ${i + 1}/${length}...`);
    downloadPicture(url);
  });
  console.log("All done!");
};

// download a picture from a link
async function downloadPicture(url) {
  const options = {
    url,
    encoding: null,
  };

  const img = await rp(options);

  // extract file name
  const basename = path.basename(url);
  // write the image
  fs.writeFile(`images/${basename}`, img, error => {
    if (error) throw error;
  });
}
