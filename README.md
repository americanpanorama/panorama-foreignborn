# richmondatlas-foreignborn
Visualizing the number of people born outside the US and their country or region of origin.

Latest build can be viewed at http://studio.stamen.com/richmond/show/foreignborn


##Data Sets
A list of all base datasets for this project in CartoDB.  Each one these should have a public `materialized` view as well.

Dataset Name | Description
------------ | -----------
site_foreignborn_counties_prod | US County shapes with counts
site_foreignborn_rolled_country_counts | Country points with counts rolled up

##Dependencies
* [NPM](https://www.npmjs.com/)
* [CartoDB](https://cartodb.com/) account

##Setup
Make sure you have [NPM](https://www.npmjs.com/) installed.

Load required **NPM** modules.
```bash
npm install
```

Create a `.env.json` file from `.env.json.sample` in **root** directory and add your CartoDB account name to the `.env.json` file. Will look like this...
```json
{
  "siteroot" : "./",
  "cartodbAccountName" : "ACCOUNT NAME HERE"
}
```

##Develop
To run locally:
```bash
npm start
```
Open browser to http://localhost:8888/

##Build
To update the build directory
```bash
npm run build
```

##Deploy
Copy code from [build directory](./build) to server.  It's all **static files**, so no special server requirements needed.

##Deploy(Stamen Only)
```bash
scp -prq ./build/. studio.stamen.com:www/richmond/show/foreignborn/
scp -prq ./build/. studio.stamen.com:www/richmond/show/yyyy-mm-dd/
```



