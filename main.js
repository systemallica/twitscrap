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
  const browser = await puppeteer.launch({
    headless: false,
  });
  const page = await browser.newPage();
  await page.goto(url);
  await page.setViewport({
    width: 1200,
    height: 800,
  });

  await autoScroll(page);

  await parseContent(await page.content());

  await browser.close();
}

async function autoScroll(page) {
  await page.evaluate(async () => {
    await new Promise((resolve, reject) => {
      var totalHeight = 0;
      var distance = 100;
      var timer = setInterval(() => {
        var scrollHeight = document.body.scrollHeight;
        window.scrollBy(0, distance);
        totalHeight += distance;

        if (totalHeight >= scrollHeight) {
          clearInterval(timer);
          resolve();
        }
      }, 50);
    });
  });
}

async function parseContent(html) {
  // get a list of links
  urls = getImageLinks(html);
  console.log(`Number of pictures: ${urls.length}`);
  if (urls.length) {
    // check if "images" directory exists
    fs.access("./images", fs.constants.F_OK, error => {
      if (error) {
        // does not exist, so we create it
        fs.mkdir("./images", error => {
          if (error) throw error;
          console.log("created dir");
          urls.forEach(url => {
            downloadPicture(url);
          });
        });
      } else {
        // already exists
        urls.forEach(url => {
          downloadPicture(url);
        });
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
    console.log(`Picture ${basename} saved!`);
  });
}
