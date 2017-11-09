// Copyright (c) 2017 The Regents of the University of Michigan.
// All Rights Reserved. Licensed according to the terms of the Revised
// BSD License. See LICENSE.txt for details.

/* eslint-disable no-unused-vars */
const csv = require("csv");
const exec = require("executive");
const fs = require("fs");
const http = require("http");
const querystring = require("querystring");
const { URL } = require("url");
const parseXML = require("xml2js").parseString;

const Lumberyard = require("lumberyard");
const FileTreeInspector = Lumberyard.FileTreeInspector();

let tsv = filePath => new Promise((resolve, reject) => {
  fs.readFile(filePath, (error, data) => {
    if (error)
      reject(error);

    else
      csv.parse(data, {"delimiter": "\t"}, (error, output) => {
        if (error)
          reject(error);

        else
          resolve(output);
      });
  });
});

let isBlankRow = row => {
  for (let cell of row)
    if (cell !== "")
      return false;

  return true;
};

let curl = (url, data) => new Promise(function(resolve, reject) {
  let options = new URL(url + "?" + querystring.stringify(data || {}));
  let result = "";

  let request = http.request(options, response => {
    response.setEncoding("utf8");

    response.on("data", chunk => {
      result += chunk;
    });

    response.on("end", () => {
      resolve(result);
    });
  });

  request.on("err", reject);
  request.end();
});

let curlXML = (url, data) => new Promise(function(resolve, reject) {
  curl(url, data).then(xml => {
    parseXML(xml, (error, value) => {
      if (error)
        reject(error);

      else
        resolve(value);
    });
  }, reject);
});

let alephURL = async function(barcode) {
  let internal = {
    "id": barcode,
    "type": "bc",
    "schema": "marcxml"
  };

  let mdp = {
    "id": "mdp." + barcode,
    "schema": "marcxml"
  };

  let data = await curlXML(
    "http://mirlyn-aleph.lib.umich.edu/cgi-bin/bc2meta", internal);

  if (data.error)
    data = await curlXML(
      "http://mirlyn-aleph.lib.umich.edu/cgi-bin/bc2meta", mdp);

  if (data.error)
    throw Error(data.error);

  return data;
};

let worldcatURL = async function(oclc) {
  let data = await curl(
    "http://www.worldcat.org/webservices/catalog/content/libraries/" + oclc, {
      "wskey": process.env.MDP_REJECT_WC_KEY,
      "format": "json",
      "maximumLibraries": "50"
    }
  );

  return JSON.parse(data);
};

let hathiOCLC = async function(oclc) {
  let data = await curl(
    "http://catalog.hathitrust.org/api/volumes/brief/oclc/"
    + oclc + ".json");

  return JSON.parse(data);
};

let hathiBIB = async function(bib) {
  let data = await curl(
    "http://catalog.hathitrust.org/api/volumes/brief/recordnumber/"
    + bib + ".json");

  return JSON.parse(data);
};

let getMarcData = async function(barcode) {
  let marc = await alephURL(barcode);
  let result = {};

  result.control = new Map();
  for (let controlfield of marc.record.controlfield)
    result.control.set(controlfield["$"].tag, controlfield["_"]);

  let rawData = new Map();
  for (let datafield of marc.record.datafield) {
    let attrs = datafield["$"];
    if (!rawData.has(attrs.tag))
      rawData.set(attrs.tag, new Map());

    let a = rawData.get(attrs.tag);
    for (let subfield of datafield.subfield) {
      if (!a.has(subfield["$"].code))
        a.set(subfield["$"].code, []);

      a.get(subfield["$"].code).push(subfield["_"]);
    }
  }

  result.data = function(a, b) {
    if (!rawData.has(a))
      return [];

    if (!rawData.get(a).has(b))
      return [];

    return rawData.get(a).get(b);
  };

  result.first = function(a, b) {
    let all = result.data(a, b);
    if (all.length === 0)
      return undefined;

    else
      return all[0];
  };

  return result;
};

const appendFile = (file, data) => new Promise((resolve, reject) => {
  fs.appendFile(file, data, error => {
    if (error)
      reject(error);
    else
      resolve();
  });
});

let institutions = new Map();

institutions.set("u-m", new Set([
  "EYM",
  "BEU",
  "E8W",
  "EER",
  "EKL",
  "EMI",
  "EUQ",
  "EYD",
  "HJ8",
  "U2T",
  "UMSPO",
  "UMDON"
]));

institutions.set("hathi", new Set([
  "HATHI"
]));

institutions.set("cic", new Set([
  // University of Chicago
  "CGU",
  "IAB",
  "KEH",

  // University of Illinois
  "UIU",
  "ILG",
  "IAL",
  "LSI",
  "RHU",
  "RQF",
  "RQR",

  // Indiana University
  "AAAMC",
  "FSIUL",
  "I3U",
  "IJZ",
  "IUB",
  "IUG",
  "IUL",
  "IULGB",
  "IULSP",
  "RQQ",
  "XUL",
  "XYA",

  // University of Iowa
  "NUI",
  "LUI",
  "UIL",
  "UKO",

  // Michigan State University
  "EEM",
  "EVK",
  "MIMSU",
  "MSUTA",
  "MSUTP",

  // University of Minnesota
  "MNU",
  "DIF",
  "HOR",
  "MCR",
  "MLL",
  "MND",
  "MNH",
  "MNU",
  "MNUDS",
  "MNX",
  "MNY",
  "NRI",
  "UMM",
  "UMMBL",
  "XOR",

  // Northwestern University
  "INU",
  "FSINU",
  "INL",
  "INM",
  "INUQR",
  "JCR",
  "TSINU",
  "YO5",

  // Ohio State University
  "OSU",
  "OHL",
  "OS0",
  "OS1",
  "OS6",
  "ZH5",
  "ZH6",

  // Pennsylvania State University
  "UPM",
  "UPC",

  // Purdue University
  "IPL",
  "IPC",
  "IPN",
  "IUP",
  "HV6",

  // University of Wisconsin - Madison
  "GZI"
]));

const lookUpBarcode = async function(barcode) {
  try {
    let marc = await getMarcData(barcode);
    let aleph = {};

    aleph.bib = marc.control.get("001");
    aleph.title = marc.first("245", "a");
    aleph.callno = marc.first("MDP", "h");
    aleph.description = marc.first("MDP", "z");

    if (marc.first("100", "a"))
      aleph.author = marc.first("100", "a");

    else if (marc.first("110", "a") && marc.first("110", "b"))
      aleph.author = marc.first("110", "a") + " " + marc.first("110", "b");

    else if (marc.first("110", "a"))
      aleph.author = marc.first("110", "a");

    else if (marc.first("110", "b"))
      aleph.author = marc.first("110", "b");

    else if (marc.first("111", "a"))
      aleph.author = marc.first("111", "a");

    else if (marc.first("130", "a"))
      aleph.author = marc.first("130", "a");

    for (let x of marc.data("035", "a")) {
      let match = x.match(/^\(OCoLC\).*?([0-9]+)$/);

      if (match) {
        aleph.oclc = match[1];
        while (aleph.oclc.length < 9)
          aleph.oclc = "0" + aleph.oclc;

        break;
      }
    }

    if (marc.control.has("008")) {
      let yearString = marc.control.get("008");
      aleph.years = [yearString.slice(7, 11), yearString.slice(11, 15)];
    }

    if (aleph.oclc) {
      let worldcat, hathiCount;

      try {
        let raw = await worldcatURL(aleph.oclc);
        worldcat = {"title": raw.title, "libraries": []};
        for (let library of raw.library)
          worldcat.libraries.push(library.oclcSymbol);
      } catch (error) {
        worldcat = null;
      }

      try {
        hathiCount = await hathiOCLC(aleph.oclc);
      } catch (error) {
        hathiCount = null;
      }
    }

    let row = [];
    row.push(aleph.bib || "");
    row.push(aleph.oclc || "");
    row.push(aleph.callno || "");
    row.push(aleph.author || "");
    row.push(aleph.title || "");
    row.push(aleph.desc || "");

    if (aleph.years)
      for (let year of aleph.years)
        row.push(year.replace("^^^^", ""));

    // unique
    row.push("");

    // cic
    row.push("");

    // noncic
    row.push("");

    // uofm
    row.push("");

    // whocares
    row.push("");

    // hathitrust_mdp
    row.push("");

    // hathitrust_other
    row.push("");

    // title_match_percent
    row.push("");

    return row;
  } catch (error) {
    return null;
  }
};

module.exports = function(logDir, alephDropbox, successDir) {
  return async function(pwd) {
    // we'll need a full list of barcodes in the end
    let barcodeFilename = alephDropbox
      + Lumberyard.tempName("/barcodes-YYYYmmdd.txt");

    let processLists = async function(root) {
      root.description = "mdp selection lists in " + pwd;

      // i'll assume that every file is a selection list
      let lists = await FileTreeInspector.getSizesUnder(pwd);

      root.all = "";

      root.runAfter = async function() {
        if (root.all.length > 0)
          await appendFile(barcodeFilename, root.all);
      };

      for (let listFilename of lists.keys())
        root.add(async function(list) {
          list.description = listFilename;

          // i expect every selection list to be a tab-separated file
          let data = await tsv(listFilename);

          if (data.length === 0)
            // i'm not ok with empty files
            throw Error(listFilename + " is empty");

          // if there's no header row, then the first data row is the
          // first row
          let rowStart = 0;

          if (/^[0-9]{14}$/.test(data[0][0])
            || /^[Bb][0-9]+$/.test(data[0][0])) {
            // if the first cell is a valid barcode identifier, then there
            // is no header, so we'll create a blank row to represent the
            // header
            list.header = [];
            for (let i = 0; i < data[0].length; i += 1)
              list.header.push("");
          } else {
            // if we have a header, then we'll skip it as a data row but
            // also add it as our list header
            rowStart = 1;
            list.header = data[0];
          }

          // look for DC|DX|DY|DZ in the filename
          let match = listFilename.match(/([Dd][CcXxYyZz])[^/]*$/);

          if (match === null)
            // we didn't find anything ergo no default
            list.defaultStatus = null;

          else
            // we found a default mirlyn status
            list.defaultStatus = match[1].toUpperCase();

          list.outputRows = [];

          list.runAfter = () => new Promise(function(resolve, reject) {
            // fill in the header with the new columns
            list.header.push("bib");
            list.header.push("oclc");
            list.header.push("callno");
            list.header.push("author");
            list.header.push("title");
            list.header.push("desc");
            list.header.push("pubdate");
            list.header.push("");
            list.header.push("unique");
            list.header.push("cic");
            list.header.push("noncic");
            list.header.push("uofm");
            list.header.push("whocares");
            list.header.push("hathitrust_mdp");
            list.header.push("hathitrust_other");
            list.header.push("title_match_percent");

            // convert rows into tab-delimited text
            let text = list.header.join("\t") + "\r\n";
            for (let row of list.outputRows)
              text += row.join("\t") + "\r\n";

            // overwrite the input file
            fs.writeFile(listFilename, text, error => {
              if (error)
                reject(error);

              else
                resolve();
            });
          });

          for (let i = rowStart; i < data.length; i += 1)
            if (!isBlankRow(list[i]))
              // we'll look at every nonblank row
              list.add(async function(row) {
                row.cells = list[i];
                row.barcode = row.cells[0];
                row.description = row.barcode;

                // the last cell should be the status
                let last = row.cells[row.cells.length - 1];
                if (/^[Dd][CcXxYyZz]$/.test(last))
                  // awesome, the last cell is the status
                  row.status = last.toUpperCase();

                else if (list.defaultStatus === null)
                  // the last cell isn't the status and we have no default
                  throw Error(listFilename
                    + " " + (i + 1).toString()
                    + " invalid status");

                else
                  // the last cell isn't the status but we have a default
                  row.status = list.defaultStatus;

                row.run = async function() {
                  let cols = await lookUpBarcode(row.barcode);
                  if (cols !== null) {
                    list.outputRows.push(row.cells.concat(cols));
                    root.all += row.barcode + "\t" + row.status + "\n";
                  }
                };
              });
        });
    };

    let logFile = Lumberyard.tempName(
      logDir + "/selection-list-YYYYmmdd-HHMMSS.log");

    try {
      await Lumberyard.ProcessTree(logFile, processLists);
    } catch (error) {
      await appendFile(logDir + "/error.log", logFile + "\n");
      throw error;
    }

    await exec("mv -i '" + pwd + "'/* '" + successDir + "'");
    await exec("rmdir '" + pwd + "'");
  };
};

console.log("selection-lists loads ok");
