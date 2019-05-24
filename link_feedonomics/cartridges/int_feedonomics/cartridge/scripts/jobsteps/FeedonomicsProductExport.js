/* Feedonomics Product Export Job */
'use strict';

var Logger = require('dw/system/Logger');
var Status = require('dw/system/Status');
var File = require('dw/io/File');

var FeedonomicsHelpers = require('~/cartridge/scripts/helpers/FeedonomicsHelpers');
var FileUtils = require('~/cartridge/scripts/util/FileUtils');
var FConstants = require('~/cartridge/scripts/util/FeedonomicsConstants');

var productsIter;
var fileWriter;
var headerColumn;
var csvWriter;

/**
 * Adds the column value to the CSV line Array of Product Feed export CSV file
 * @param {dw.catalog.Product} product - SFCC Product
 * @param {Object} columnValue - Catalog Feed Column
 * @param {Array} csvProductArray - CSV  Array
 */
function writeProductExportField(product,csvProductArray,columnValue) {
    switch (columnValue) {
        // Product ID
        case FConstants.HEADER_VALUES.ID:
            csvProductArray.push(product.ID || "");
            break;
        // Product Name
        case FConstants.HEADER_VALUES.NAME:
            csvProductArray.push(product.name || "");
            break;
        // Product Page Title
        case FConstants.HEADER_VALUES.TITLE:
            csvProductArray.push(product.pageTitle || "");
            break;
        // Product Description
        case FConstants.HEADER_VALUES.DESCRIPTION:
            csvProductArray.push(FeedonomicsHelpers.getDescription(product));
            break;
        // Product UPC
        case FConstants.HEADER_VALUES.UPC:
            csvProductArray.push(product.UPC || "");
            break;
        // Product Image
        case FConstants.HEADER_VALUES.IMAGE:
            csvProductArray.push(FeedonomicsHelpers.getProductImage(product) || "");
            break;
        // Product Link
        case FConstants.HEADER_VALUES.PRODUCT_LINK:
            var URLUtils = require('dw/web/URLUtils');
            csvProductArray.push(URLUtils.abs('Product-Show', 'pid', product.ID).toString());
            break;
        // Product Categories
        case FConstants.HEADER_VALUES.CATEGORY:
            csvProductArray.push(FeedonomicsHelpers.getOnlineSubCats(product));
            break;
        // Product's Master Product ID
        case FConstants.HEADER_VALUES.MASTER_PRODUCT_ID:
            csvProductArray.push(FeedonomicsHelpers.getMasterID(product));
            break;
        // Product's Brand
        case FConstants.HEADER_VALUES.BRAND:
            csvProductArray.push(product.brand);
            break;
        // Product's Base Price
        case FConstants.HEADER_VALUES.PRICE:
            csvProductArray.push(product.priceModel.price);
            break;
        // Product's ATS value
        case FConstants.HEADER_VALUES.INVENTORY:
            csvProductArray.push(FeedonomicsHelpers.getATSValue(product));
            break;
        // ProductName
        case FConstants.HEADER_VALUES.BOOKPRICE:
            csvProductArray.push(FeedonomicsHelpers.calculatePriceBookPrices(product));
            break;
        // ProductName
        case FConstants.HEADER_VALUES.PROMOPRICE:
            csvProductArray.push(FeedonomicsHelpers.calculatePromoPrice(product));
            break;
        // ProductName
        case FConstants.HEADER_VALUES.IN_STOCK:
            csvProductArray.push(FeedonomicsHelpers.getAvailabilityStatus(product));
            break;
        // ProductName
        case FConstants.HEADER_VALUES.ADDTIONAL_IMAGE_LINKS:
            csvProductArray.push(FeedonomicsHelpers.getAllImages(product));
            break;
        // Product's Custom Attributes JSON
        case FConstants.HEADER_VALUES.CUSTOM_FIELDS:
            csvProductArray.push(FeedonomicsHelpers.getAllCustomProps(product));
            break;
        // Product's Variation Attributes JSON
        case FConstants.HEADER_VALUES.VARIANT_ATTRIBUTES:
            csvProductArray.push(FeedonomicsHelpers.getAllVariationAttrs(product));
            break;
        // Product's ALL Type
        case FConstants.HEADER_VALUES.PRODUCT_TYPE:
            csvProductArray.push(FeedonomicsHelpers.getAllProductTypes(product));
            break;
        // Product's Manufacturer Name
        case FConstants.HEADER_VALUES.MANUFACTURER_NAME:
            csvProductArray.push(product.manufacturerName || "");
            break;
        // Product's Manufacturer SKU
        case FConstants.HEADER_VALUES.MANUFACTURER_SKU:
            csvProductArray.push(product.manufacturerSKU || "");
            break;
        // Product's Online Status
        case FConstants.HEADER_VALUES.ONLINE:
            csvProductArray.push(FeedonomicsHelpers.getOnlineStatus(product));
            break;
        default:
            csvProductArray.push("");
            break;
    }
}

exports.beforeStep = function() {
    var args = arguments[0];
    var targetFolder = args.TargetFolder;
    FeedonomicsHelpers.setLocale(args.LocaleID);

    if (args.isDisabled) {
        return new Status(Status.OK, 'OK', 'Step disabled, skip it...');
    }

    if (!targetFolder) {
        return new Status(Status.ERROR, 'ERROR', 'One or more mandatory parameters are missing.');
    }
    var FileWriter = require('dw/io/FileWriter');
    var CSVStreamWriter = require('dw/io/CSVStreamWriter');
    var fileName = FileUtils.createFileName((args.FileNamePrefix || FConstants.FILE_NAME.CATALOG));
    var folderFile = new File(File.getRootDirectory(File.IMPEX),targetFolder);
    if (!folderFile.exists() && !folderFile.mkdirs()) {
        return new Status(Status.ERROR,'Cannot create IMPEX folders {0}', (File.getRootDirectory(File.IMPEX).fullPath + args.TargetFolder));
    }
    var csvFile = new File(folderFile.fullPath + File.SEPARATOR + fileName);
    fileWriter = new FileWriter(csvFile);
    csvWriter = new CSVStreamWriter(fileWriter);
    //Push Header
    headerColumn = FeedonomicsHelpers.generateCSVHeader(FConstants.EXPORT_TYPE.CATALOG);
    csvWriter.writeNext(headerColumn);
    //Push Products
    var ProductMgr = require('dw/catalog/ProductMgr');
    productsIter = ProductMgr.queryAllSiteProducts();
}

exports.getTotalCount = function() {
    Logger.info("Processed products {0}", productsIter.count);
    return productsIter.count;
}


exports.read = function() {
    if( productsIter.hasNext() ) {
        return productsIter.next();
    }
}

exports.process = function( product ) {
     var csvProductArray = [];
     headerColumn.forEach(function (columnValue) { //eslint-disable-line
         writeProductExportField(this,csvProductArray,columnValue);
     },product);
     return csvProductArray;
}

exports.write = function(lines) {
    for (var i = 0; i < lines.size(); i++ ) {
        csvWriter.writeNext(lines.get(i).toArray());
    }
}

exports.afterStep = function() {
    productsIter.close();
    fileWriter.flush();
    csvWriter.close();
    fileWriter.close();
    return new Status(Status.OK);
}