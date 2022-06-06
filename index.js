const fs = require('fs/promises');
const puppeteer = require('puppeteer');
//Puppeteer file for web automation and web scrapping

(async () => {

    const browser = await puppeteer.launch();//{ headless: false }
    const page = await browser.newPage();
    await page.goto('https://www.magmabrakes.com/catalog/');

    //Getting product details form catalogue page
    const getProductDetails = await page.evaluate(() => {
        let catalogueList = document.querySelectorAll("a[class ='woocommerce-LoopProduct-link woocommerce-loop-product__link']");
        const catalogueNames = [...catalogueList];
        return catalogueNames.map(h => ({ productName: h.innerText, productLink: h.href }));
    });

    let allData = [];

    //Determing number of products (pages to be scraped)
    let productsSize = Object.keys(getProductDetails).length;

    for (let i = 0; i < productsSize; i++) {


        let productName = getProductDetails[i].productName;
        let productLink = getProductDetails[i].productLink;

        // Clicking product to visit its page
        await Promise.all([page.click(`a[href='${productLink}']`), page.waitForNavigation()]);
         
        //Clicking Vehicle Fitment tab of the table 
        await Promise.all([page.click("li[id='tab-title-part_applications_tab']"), page.waitForResponse(response => response.status() === 200)]).catch((error) => {
            console.log('Error is  : ', error)
        });

        //Time for taking screenshot
        await page.waitForTimeout(4000);

        //Getting data from Vehicle Fitment table
        const getFitmentTable = await page.evaluate(() => {
            let btnList = document.querySelectorAll("table[class ='buyersguidetable']");
            let arr = [...btnList];

            //Converting data of table to JSON object
            function tableToJson(table) {
                var data = [];
                for (var i = 1; i < table.rows.length; i++) {
                    var tableRow = table.rows[i];
                    var rowData = [];
                    for (var j = 0; j < tableRow.cells.length; j++) {
                        rowData.push(tableRow.cells[j].innerHTML);;
                    }
                    data.push(rowData);
                }
                return data;
            }

            let tableData = tableToJson(arr[0]);

            return tableData;

        });

        let productData = getFitmentTable;
        
        //Creating a object for the current product
        let fitmentData = { sno: i + 1, name: productName, data: productData };

        //Pushing object into the final object
        allData.push(fitmentData);

        //Taking screenshot
        await page.screenshot({ path: `images/catalog-${i + 1}.png` });

        //Goin back to https://www.magmabrakes.com/catalog/ for going to another product
        await page.goBack();
        
        console.log(i+1);

    }
    let catalog = { name: 'catalog', catalogData: allData }

    //Saving the data to the file
    fs.writeFile('./file.json', JSON.stringify(catalog), function (err) { console.log(err) });

    await browser.close();
})();


