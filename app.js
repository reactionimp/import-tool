const parse = require("csv-parser");
const fs = require("fs");
const path = require("path");
const leftPad = require("left-pad");
const objectId = require("objectid");
const stripTags = require("striptags");
const Spinner = require("cli-spinner").Spinner;

const spinner = new Spinner("Processing Magento CSV data... %s");
spinner.setSpinnerString('|/-\\');
spinner.start();

const parser = parse({ delimiter: `,` });

const products = [];

let tempAdditionalAttributes;
let tempBrand;
let tempId;

/**
 * Extracts specified attribute from query
 *
 * @query String (ex: "foo=bar,baz=qux")
 * @variable String
 */

function extractAttributeFromString(query, variable) {
  const variables = query.split(",");

  let currentPair;
  let attribute;

  variables.forEach((current, index, all) => {
    currentPair = current.split("=");

    try {
      if (decodeURIComponent(currentPair[0]) === variable) {
        attribute = decodeURIComponent(currentPair[1]);
     }
    } catch (err) {
      //console.error(err);
    }
  });

  return attribute;
}

parser.on("readable", () => {
  while (row = parser.read()) {
    tempAdditionalAttributes = row && row.additional_attributes ? row.additional_attributes : null;
    tempBrand = tempAdditionalAttributes ? extractAttributeFromString(tempAdditionalAttributes, "brand") : null;
    
    if (row.url_key) {
      tempId = leftPad(row.url_key, 24, "0");
    } else {
      tempId = objectId().toString();
    }

    products.push({
      _id: tempId,
      type: "simple",
      shopId: "J8Bhq3uTtdgwZx3rz",
      vendor: tempBrand,
      title: row.name,
      description: stripTags(row.description),
      "price.range": row.price,
      "price.min": parseFloat(row.price),
      "price.max": parseFloat(row.price),
      handle: row.url_key || tempId,
      isVisible: true,
      isLowQuantity: false,
      isBackorder: true,
      hashtags: [],
      createdAt: {
        "$date": new Date()
      }
    });
    
    products.push({
      _id: objectId().toString(),
      ancestors: [ tempId ],
      title: row.name,
      price: parseFloat(row.price),
      inventoryManagement: true,
      inventoryPolicy: true,
      inventoryQuantity: 15,
      isVisible: true,
      createdAt: {
        "$date": new Date()
      },
      weight: 1,
      shopId: "J8Bhq3uTtdgwZx3rz",
      taxable: true,
      type: "variant"
    });
  }
});

parser.on("finish", () => {
  fs.writeFile("data.json", JSON.stringify(products, null, 2), (err) => {
    spinner.stop();

    if (err) {
      console.error(`An error happened when saving data.json: ${err}`);
    } else {
      console.log(`\n✅  data.json saved!`);
    }
  });
});

fs.createReadStream(path.resolve(__dirname, "data.csv")).pipe(parser);

