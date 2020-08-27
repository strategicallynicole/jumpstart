"use strict";

var sass = require('sass');

var fs = require('fs-extra');

var path = require('path');

module.exports = function (scssPath, cssPath) {
  //If cssPath directory doesn't exist...
  if (!fs.existsSync(path.dirname(cssPath))) {
    //Encapsulate rendered css from scssPath into result variable
    var result = sass.renderSync({
      file: scssPath
    }); //Create cssPath directory recursively

    fs.mkdir(path.dirname(cssPath), {
      recursive: true
    }) //Then write result css string to cssPath file
    .then(function () {
      return fs.writeFile(cssPath, result.css.toString());
    })["catch"](function (error) {
      return console.error(error);
    });
  } //Watch for changes to scssPath directory...


  fs.watch(path.dirname(scssPath), function () {
    console.log("Watching ".concat(path.dirname(scssPath), "...")); //Encapsulate rendered css from scssPath into watchResult variable

    var watchResult = sass.renderSync({
      file: scssPath
    }); //Then write result css string to cssPath file

    fs.writeFile(cssPath, watchResult.css.toString())["catch"](function (error) {
      return console.error(error);
    });
  });
};