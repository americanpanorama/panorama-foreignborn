## US Counties prep
Output US Counties into GeoJSON & Topojson files broken up into decades.

## How to use
Download US Counties as a Shapefile from CartoDB into the data directory.  This query will create a table of all counties:
```sql
SELECT counties_2010.name, counties_2010.state_terr as state, counties_2010.the_geom, counties_2010.start_n, counties_2010.end_n, RTRIM(counties_2010.nhgis_join) as nhgis_join FROM counties_2010
```

Un-zip the Shapefile and update the `DATADIR` variable in the `Makefile` to the point to your newly created Shapefile directory.

Run `make all` in your shell.

GeoJSON files will be in `geojson` dir and Topojson files will be `topojson` dir.

