// nodejs
const fs = require("fs");
const path = require("path");
// scrapping
const axios = require("axios");
const $ = require("cheerio");
const puppeteer = require("puppeteer");
//others
const inquirer = require("inquirer");
const cliProgress = require("cli-progress");

// create a new progress bar instance and use shades_classic theme
const bar1 = new cliProgress.Bar({}, cliProgress.Presets.shades_classic);

let username;
let startTime;

const questions = [
  {
    type: "input",
    name: "username",
    message: "Enter a Twitter username(the part after the '@'):",
  },
];

inquirer.prompt(questions).then(answers => {
  username = answers["username"];
  const url = `https://twitter.com/${username}/media`;
  main(url);
});

async function main(url) {
  console.log("Fetching images...");
  console.log("This may take a couple of minutes...");
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.goto(url);

  startTime = new Date();

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
  const imgUrls = getImageLinks(html);
  const videoUrls = getVideoLinks(html);
  const urls = [...imgUrls, ...videoUrls];
  const urlsLength = imgUrls.length + videoUrls.length;
  // start the progress bar
  bar1.start(urlsLength, 0);

  if (urlsLength) {
    // check if "username" directory exists
    fs.access(`./${username}`, fs.constants.F_OK, async error => {
      if (error) {
        // does not exist, so we create it
        fs.mkdir(`./${username}`, async error => {
          if (error) throw error;
          await downloadMedias(urls);
        });
      } else {
        // already exists
        await downloadMedias(urls);
      }
    });
  }
}

// get a list of image links
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

// get a list of video links
const getVideoLinks = html => {
  const parsedHtml = $("video", html);
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

async function downloadMedias(urls) {
  for (let i = 0; i < urls.length; i++) {
    // update the current value in your application..
    await downloadMedia(urls[i]);
    bar1.update(i + 1);
  }
  // stop the progress bar
  bar1.stop();
  console.log("All done!");

  const endTime = new Date();
  let timeDiff = endTime - startTime; //in ms
  // strip the ms
  timeDiff /= 1000;
  // get seconds
  const seconds = Math.round(timeDiff);
  console.log(`Elapsed time: ${seconds} seconds`);
}

// download a picture from a link
async function downloadMedia(url) {
  // Media stream
  const media = await axios({
    method: "get",
    url,
    responseType: "stream",
  });

  const basename = path.basename(url);

  // This opens up the writeable stream at the specified path
  const writeStream = fs.createWriteStream(`${username}/${basename}`);

  // This pipes the media data to the file
  media.data.pipe(writeStream);

  // This is here incase any errors occur
  writeStream.on("error", err => {
    console.log(err);
  });
}
