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

const main = url => {
  rp(url)
    .then(function(html) {
      //success!
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
    })
    .catch(error => {
      //handle error
      console.error(error);
    });
};

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

const downloadPicture = url => {
  const options = {
    url,
    encoding: null,
  };

  rp(options)
    .then(img => {
      // extract file name
      const basename = path.basename(url);
      // write the image
      fs.writeFile(`images/${basename}`, img, error => {
        if (error) throw error;
        console.log(`Picture ${basename} saved!`);
      });
    })
    .catch(error => {
      console.error(error);
    });
};
