// nodejs
const fs = require("fs");
const path = require("path");
// scrapping
const rp = require("request-promise");
const $ = require("cheerio");
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
  const html = await rp(url);

  // get a list of links
  urls = getImageLinks(html);

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
