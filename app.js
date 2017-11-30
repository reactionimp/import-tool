const parse = require("csv-parser");
const fs = require("fs");
const path = require("path");
const leftPad = require("left-pad");
const objectId = require("objectid");
const stripTags = require("striptags");
const Spinner = require("cli-spinner").Spinner;
const Entities = require('html-entities').XmlEntities;

const entities = new Entities();

const spinner = new Spinner("Processing Magento CSV data... %s");
spinner.setSpinnerString('|/-\\');
spinner.start();

const parser = parse({ delimiter: `,`, escape: `"` });

const products = [];

const targettedBrands = [
  "Hoshizaki",
  "Cuno",
  "Ice-O-Matic",
  "ITV",
  "Manitowoc",
  "Perlick",
  "Scotsman",
  "Everpure"
];

let additionalAttributes;
let brand;
let id;
let freeShipping;
let shippingTime;
let quickShip;
let netSuiteId;
let keywords;
let warrantyInfo;
let category;

/**
 * Extracts specified attribute from query
 *
 * @query String (ex: "foo=bar,baz=qux")
 * @variable String
 */

function extractAttributeFromString(query, variable, noSplit = false) {
  
  const regex = new RegExp("(" + variable + "=.*?),[^\ ]");
  const found = regex.exec(query);
  
  let attributes;
  let result;

  if (found && found[1] && found[1].match(", ") && !noSplit) {
    attributes = found[1].split("=").map((current, index, all) => current.split(", "));

    result = attributes[1];
  } else if (found && found[1]) {
    result = found[1].split("=")[1];
  }
 
  return result;
}

parser.on("readable", () => {

  while (row = parser.read()) {
    //console.log("-- NEW ROW --")
    
    additionalAttributes = row && row.additional_attributes ? row.additional_attributes : null;
    brand = additionalAttributes ? extractAttributeFromString(additionalAttributes, "brand") : null;
    freeShipping = extractAttributeFromString(additionalAttributes, "free_shipping");
    shippingTime = extractAttributeFromString(additionalAttributes, "shipping_time");
    quickShip = extractAttributeFromString(additionalAttributes, "quick_ship");
    netSuiteId = extractAttributeFromString(additionalAttributes, "netsuite_internal_id");
    keywords = extractAttributeFromString(additionalAttributes, "search_keywords");
    warrantyInfo = stripTags(extractAttributeFromString(additionalAttributes, "warranty_info"));
    category = extractAttributeFromString(additionalAttributes, "categories");
    googleShoppingTitle = extractAttributeFromString(additionalAttributes, "google_shopping_title");
    googleDescription = extractAttributeFromString(additionalAttributes, "google_description", true);
    googleProductTaxonomy = extractAttributeFromString(additionalAttributes, "google_product_taxonomy");
    customLabel0 = extractAttributeFromString(additionalAttributes, "custom_label_attribute");
    customLabel1 = extractAttributeFromString(additionalAttributes, "custom_label_attribute2");
    metaTitle = extractAttributeFromString(additionalAttributes, "meta_title");
    productSpecs = extractAttributeFromString(additionalAttributes, "product_specs");
    energyStar = extractAttributeFromString(additionalAttributes, "energy_star_badge2");

    if (typeof keywords === "string") {
      keywords = [ keywords ];
    }

    if (brand && targettedBrands.find((currentBrand, brandIndex, brands) => brand.toLowerCase() === currentBrand.toLowerCase())) { 

      if (row.url_key) {
        tempId = leftPad(row.url_key, 24, "0");
      } else {
        tempId = objectId().toString();
      }
    
      products.push({
        _id: tempId,
        type: "simple",
        shopId: "J8Bhq3uTtdgwZx3rz",
        vendor: brand,
        title: row.name,
        description: stripTags(row.description),
        pageTitle: stripTags(row.short_description),
        "price.range": row.price,
        "price.min": parseFloat(row.price),
        "price.max": parseFloat(row.price),
        handle: row.url_key || tempId,
        isVisible: true,
        isLowQuantity: false,
        isBackorder: true,
        hashtags: [ "rpjCvTBGjhBi2xdro" ],
        createdAt: {
          "$date": new Date()
        },
        // Custom attributes begin here
        freeShipping: freeShipping && freeShipping.toLowerCase() === "yes" ? true : false,
        shippingTime,
        quickShip: quickShip && quickShip.toLowerCase() === "yes" ? true : false,
        netSuiteId,
        searchKeywords: keywords,
        warrantyInfo,
        categories: row.categories.split(","),
        googleShoppingTitle,
        googleDescription,
        googleProductTaxonomy,
        customLabel0,
        customLabel1,
        displayActualPrice: row.msrp_display_actual_price_type,
        metaTitle: row.meta_title,
        metaDescription: row.meta_description,
        metaKeywords: row.meta_keywords.split(", "),
        productSpecs,
        energyStar: energyStar && energyStar.toLowerCase() === "yes" ? true : false,
      });
     
      products.push({
        _id: objectId().toString(),
        ancestors: [ tempId ],
        title: row.name,
        price: parseFloat(row.price),
        specialPrice: parseFloat(row.special_price) ? parseFloat(row.special_price) : parseFloat(row.price),
        inventoryManagement: true,
        inventoryPolicy: true,
        inventoryQuantity: 15,
        isVisible: true,
        isDeleted: false,
        createdAt: {
          "$date": new Date()
        },
        weight: parseInt(row.weight) ? parseInt(row.weight) : 1,
        shopId: "J8Bhq3uTtdgwZx3rz",
        taxable: true,
        type: "variant",
        sku: row.sku
      });
    }
  }
});

parser.on("finish", () => {
  fs.writeFile("Products.json", JSON.stringify(products, null, 2).replace(new RegExp(/&nbsp;/gi), ""), (err) => {
    spinner.stop();

    if (err) {
      console.error(`An error happened when saving Products.json: ${err}`);
    } else {
      console.log(`\n✅  Products.json saved!`);
    }
  });
});

fs.createReadStream(path.resolve(__dirname, "data.csv")).pipe(parser);

