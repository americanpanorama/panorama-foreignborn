#Data used in Foreign Born

####site_foreignborn_rolled_country_counts_materialized
**Parent:** `site_foreignborn_rolled_country_counts`

**Tables:**
* foreign_born_country_points
* foreign_born2

**SQL**
```sql
SELECT fbcp.the_geom_webmercator, g.category_id, g.year, g.country, g.count, fbcp.continent FROM (SELECT category_id, year, country, SUM(count) as count FROM (SELECT fbcp.cartodb_id, fbcp.the_geom_webmercator, fbcp.country, fb.count, fb.year, fbcp.category_id from foreign_born_country_points fbcp join foreign_born2 fb on fbcp.category_id = fb.category) a GROUP BY year, country, category_id) g join foreign_born_country_points fbcp on g.category_id = fbcp.category_id
```

####site_foreignborn_counties_prod_materialized
**Parent:** `site_foreignborn_counties_prod`

**Tables:**
* counties_2010
* population_data2

**SQL**
```sql
SELECT q1.state_terr,q1.name,q1.year,q1.area_sqmi,q1.count,q2.count as cty_pop,q1.start_n,q1.end_n,q1.nhgis_join,q1.the_geom FROM (SELECT counties_2010.state_terr,counties_2010.name,counties_2010.cartodb_id, ST_Simplify(counties_2010.the_geom, 1) as the_geom, counties_2010.area_sqmi, population_data2.year, population_data2.count, counties_2010.start_n, counties_2010.end_n, RTRIM(population_data2.nhgis_join) as nhgis_join FROM population_data2 join counties_2010 on RTRIM(population_data2.nhgis_join) = counties_2010.nhgis_join WHERE population_data2.population_category_id=68 and year * 10000 + 0101 >= start_n and year * 10000 + 0101 <= end_n) q1 JOIN (SELECT year, SUM(count) as count, RTRIM(nhgis_join) as nhgis_join FROM population_data2 WHERE population_category_id = 64 GROUP BY year, RTRIM(nhgis_join)) q2 on q1.nhgis_join = q2.nhgis_join and q1.year = q2.year
```

####site_foreignborn_us_pop_totals_materialized
**Parent:** `site_foreignborn_us_pop_totals`

**Tables:**
* population_data2

**SQL**
```sql
SELECT year, SUM(count) as pop FROM population_data2 WHERE population_category_id = 64 GROUP BY year
```

####site_foreignborn_county_breakdowns_materialized
**Parent:** `site_foreignborn_county_breakdowns`

**Tables:**
* foreign_born2
* foreign_born_country_points
* population_data2

**SQL**
```sql
SELECT a.country, a.nhgis_join, a.count, a.year, b.count as place_total FROM (SELECT fbcp.country, RTRIM(fb.nhgis_join) as nhgis_join, SUM(fb.count) as count, fb.year from foreign_born2 fb join foreign_born_country_points fbcp on fbcp.category_id = fb.category group by RTRIM(fb.nhgis_join), fbcp.country, fb.year) a JOIN (SELECT year, SUM(count) as count, RTRIM(nhgis_join) as nhgis_join FROM population_data2 WHERE population_category_id = 64 GROUP BY year, RTRIM(nhgis_join)) b on a.nhgis_join = b.nhgis_join and a.year = b.year
```

####site_foreignborn_country_to_county_counts_materialized
**Parent:** `site_foreignborn_country_to_county_counts`

**Tables:**
* foreign_born2
* foreign_born_country_points

**SQL**
```sql
select fb.category, fbcp.country, fb.count, fb.nhgis_join, fb.year from foreign_born2 fb join foreign_born_country_points fbcp on fb.category = fbcp.category_id

```

####us_county_mapshaper_materialized
**Parent:** `us_county_mapshaper`