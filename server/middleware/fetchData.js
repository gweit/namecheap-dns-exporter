// server/middleware/fetchData.js
import { defineEventHandler, readBody } from 'h3';
import { DOMParser } from 'xmldom'
import xpath from 'xpath'
import fs from 'fs'

// In-memory storage for fetched data
// const data = fs.readFile('./tldlist.json', 'utf-8');
let storedData = [];

export default defineEventHandler(async(event) => {

  if (event.req.method === 'POST') {
    const body = await readBody(event)
  

// Function to fetch data from the external API and store it
async function fetchData() {
  try {
    const response = await $fetch(body.url);

      const parser = new DOMParser();
      const xmlTldList = parser.parseFromString(response, "text/xml");

      // Use an XPath selector to find all <host> elements within the appropriate namespace
      const select = xpath.useNamespaces({"ns": "http://api.namecheap.com/xml.response"});

      // Select all <host> elements
      const tlds = select("//ns:Tld", xmlTldList);
      console.info(tlds.length)

      let tldlist_count = 0
      storedData = []

      tlds.forEach(tld => {
        const name = tld.getAttribute("Name");
        storedData.push(name)
        tldlist_count++
        if (tldlist_count === tlds.length) {
          fs.writeFileSync('./tldlist.json', JSON.stringify(storedData, null, 2));
          console.log('Data fetched and saved to tldlist.json');
        }
      })

  } catch (error) {
    console.error('Error fetching data:', error);
  }
}

// Fetch data initially and then at regular intervals (e.g., every hour)

if (storedData.length === 0) {
  fetchData();  
}

setInterval(fetchData, 3600000); // 3600000 ms = 1 hour

} //if


  // Store the fetched data in the request context
  event.context.storedData = storedData;
});
