//
// Text for About area in Foreign Born
//
//

var ForeignBornCopy = {};

//copy for errors when data is missing
ForeignBornCopy.errors = {};
ForeignBornCopy.errors['NO_COUNTRY_DATA_FOR_COUNTY'] = "Specific country data does not exist at the county level for the selected year";
ForeignBornCopy.errors['NO_COUNTY_DATA'] = "This county had no foreign-born population in the selected year"
ForeignBornCopy.errors['NO_COUNTY'] = "This county did not exist in the selected year";

//copy for lower right decade descriptions
ForeignBornCopy.years = {};
ForeignBornCopy.years['1850'] = "In 1850, more than 2 of every 5 immigrants had been born in Ireland. Many had left fleeing growing poverty and later the potato famine. They mainly settled in urban areas of the northeast.";
ForeignBornCopy.years['1860'] = "In 1860 nearly a third of the foreign born had emigrated from Germany. In contrast to the Irish, Germans migrated as families, tended to be skilled workers or farmers, and settled more in the agricultural interior rather than the urban northeast.";
ForeignBornCopy.years['1870'] = "In 1870, the Swedish and Norwegian-born population of the US was over 200,000. Mostly land-hungry farmers who left countries with limited tillable land where the population was growing quickly, they largely settled in the agricultural upper midwest.";
ForeignBornCopy.years['1880'] = "In 1880, the Chinese-born population was concentrated in northern California. Almost exclusively male, many Chinese migrants came to labor on railroad construction. With the Chinese Exclusion Act of 1882, the US targeted this immigrant community with racist immigration restrictions.";
ForeignBornCopy.years['1890'] = "In 1890, the number of Italian immigrants had begun to grow substantially. Facilitated by cheaper travel across the Atlantic on steamships, about four million travelled to America between 1880 and 1920, most settling in the urban northeast, particularly New York.";
ForeignBornCopy.years['1900'] = "In 1900, tens of thousands of Eastern European Jews had immigrated to the US. They fled religious persecution, particularly in Russia but also Austria, Poland, and Hungary. They settled mostly in cities, particularly in New York.";
ForeignBornCopy.years['1910'] = "In 1910, hundreds of thousands of French Canadians immigrants were clustered almost exclusively in New England. Most had been farm families who were attracted by the economic opportunities of the region's mills.";
ForeignBornCopy.years['1920'] = "";
ForeignBornCopy.years['1930'] = "In 1930, both the number and percentage of foreign born began a decline that would last for decades. In the 1920s the Congress instituted a national origins quota system designed to curtail immigration from eastern and southern Europe as well as Asia.";
ForeignBornCopy.years['1940'] = "";
ForeignBornCopy.years['1950'] = "";
ForeignBornCopy.years['1960'] = "";
ForeignBornCopy.years['1970'] = "In 1970, a large community of Cubans was concentrated in south Florida around Miami. Mostly middle class and white, most had fled the the island after Fidel Castro camp to power, instituting a socialist government.";
ForeignBornCopy.years['1980'] = "In 1980, for the first time the country listed in the census with the largest number of immigrants living in the US was not European. The Immigration Act of 1965 had effectively ended the national origins quota system, opening the US to substantial increases in immigration from non-western-European counties.";
ForeignBornCopy.years['1990'] = "In 1990, the number of foreign born from Mexico dwarfed that of any other individual country. Concentrated along the southern border, most Mexican migrants came to the US in search of jobs.";
ForeignBornCopy.years['2000'] = "";

module.exports = ForeignBornCopy;
