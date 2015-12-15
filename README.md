# panorama-foreignborn
Foreign-Born Population 1850-2010

Latest build can be viewed at [http://dsl.richmond.edu/panorama/foreignborn](http://dsl.richmond.edu/panorama/foreignborn)


##Data Sets
A list of all base datasets for this project in CartoDB can be found in [data/README.md](data/README.md)

##Dependencies
* [NPM](https://www.npmjs.com/)
* [CartoDB](https://cartodb.com/) account

##Setup
Make sure you have [NPM](https://www.npmjs.com/) installed. If it's been a while since you last installed or updated, you may want to reinstall. This install is tested successfully against `0.12.7`

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


##Deploy
**To use development code**: Copy the [build directory](./build) to your server, but for **production** you will want to run:
```
npm run dist
```

This will create a `dist` directory. Move this directory to your server.

Both directories are all **static files**, so no special server requirements needed.
