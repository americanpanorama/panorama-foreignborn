#CartoDB data tables used in Foreign Born

**This file contains the queries used to generate each of the derived tables used by the application.** We call these tables "materialized", even though they are not technically [Materialized Views](http://www.postgresql.org/docs/9.3/static/sql-creatematerializedview.html) in the PostgreSQL sense. They are simply copies.

**Why do we do this?**
1. Using these copied tables is more efficient, because the query doesn't have to be run every time a new user loads the application.
2. They allow us to make the derived table public (so the application does not require API keys) while keeping the source data private.
3. They make the application more resilient in case the source data tables are undergoing modification or development. Using materialized tables means that the application will always be using a version of the data that is known to work.

**How to use these queries:**

1. Create a new empty table in the CartoDB web interface. This table will be used only temporarily, from which to create our materialized table.
2. Paste the SQL into the CartoDB "Custom SQL query" panel. Click "Apply query".
3. Select "Dataset from query" in the "Edit" menu.
4. Click on the name of the new table to change the name from `untitled_table_NN_copy` to `site_tablename_materialized`.
5. Select "Change privacy" in the "Edit" menu, so that the table is accessible to anyone "With link".
6. (optional) You can now delete the empty table you created in step 1.

The following sections list the names of each of the tables used by the application. The "Tables" section is a list of the source tables used by the query. The "SQL" section documents the query used to generate the derived table.


####site_foreignborn_rolled_country_counts_materialized
**Tables:**
* foreign_born_country_points
* foreign_born2

**SQL**
```sql
SELECT fbcp.the_geom_webmercator, g.category_id, g.year, g.country, g.count, fbcp.continent FROM (SELECT category_id, year, country, SUM(count) as count FROM (SELECT fbcp.cartodb_id, fbcp.the_geom_webmercator, fbcp.country, fb.count, fb.year, fbcp.category_id from foreign_born_country_points fbcp join foreign_born2 fb on fbcp.category_id = fb.category) a GROUP BY year, country, category_id) g join foreign_born_country_points fbcp on g.category_id = fbcp.category_id
```

####site_foreignborn_counties_prod_materialized
**Tables:**
* counties_2010
* population_data2

**SQL**
```sql
SELECT q1.state_terr,q1.name,q1.year,q1.area_sqmi,q1.count,q2.count as cty_pop,q1.start_n,q1.end_n,q1.nhgis_join,q1.the_geom FROM (SELECT counties_2010.state_terr,counties_2010.name,counties_2010.cartodb_id, ST_Simplify(counties_2010.the_geom, 1) as the_geom, counties_2010.area_sqmi, population_data2.year, population_data2.count, counties_2010.start_n, counties_2010.end_n, RTRIM(population_data2.nhgis_join) as nhgis_join FROM population_data2 join counties_2010 on RTRIM(population_data2.nhgis_join) = counties_2010.nhgis_join WHERE population_data2.population_category_id=68 and year * 10000 + 0101 >= start_n and year * 10000 + 0101 <= end_n) q1 JOIN (SELECT year, SUM(count) as count, RTRIM(nhgis_join) as nhgis_join FROM population_data2 WHERE population_category_id = 64 GROUP BY year, RTRIM(nhgis_join)) q2 on q1.nhgis_join = q2.nhgis_join and q1.year = q2.year
```

####site_foreignborn_us_pop_totals_materialized
**Tables:**
* population_data2

**SQL**
```sql
SELECT year, SUM(count) as pop FROM population_data2 WHERE population_category_id = 64 GROUP BY year
```

####site_foreignborn_county_breakdowns_materialized
**Tables:**
* foreign_born2
* foreign_born_country_points
* population_data2

**SQL**
```sql
SELECT a.country, a.nhgis_join, a.count, a.year, b.count as place_total FROM (SELECT fbcp.country, RTRIM(fb.nhgis_join) as nhgis_join, SUM(fb.count) as count, fb.year from foreign_born2 fb join foreign_born_country_points fbcp on fbcp.category_id = fb.category group by RTRIM(fb.nhgis_join), fbcp.country, fb.year) a JOIN (SELECT year, SUM(count) as count, RTRIM(nhgis_join) as nhgis_join FROM population_data2 WHERE population_category_id = 64 GROUP BY year, RTRIM(nhgis_join)) b on a.nhgis_join = b.nhgis_join and a.year = b.year
```

####site_foreignborn_country_to_county_counts_materialized
**Tables:**
* foreign_born2
* foreign_born_country_points
* population_data2

**SQL**
```sql
SELECT a.count, a.country, a.category, a.year, a.nhgis_join, b.place_total FROM (select fb.category, fbcp.country, fb.count, fb.nhgis_join, fb.year from foreign_born2 fb join foreign_born_country_points fbcp on fb.category = fbcp.category_id) a
JOIN (SELECT population_data2.count as place_total, population_data2.year, RTRIM(population_data2.nhgis_join) as nhgis_join from population_data2 where population_data2.population_category_id = 68) b on a.nhgis_join = b.nhgis_join and a.year = b.year
```

####us_county_mapshaper_materialized

**SQL**
```sql
SELECT * FROM us_county_mapshaper
```