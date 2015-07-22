SHELL := /bin/bash
STARTDATE := 1850
ENDDATE := 2010
TOPOJSON := /usr/local/bin/topojson
OGR2OGR := /usr/local/bin/ogr2ogr
QUOTE := "

GEOJSONDIR := geojson
TOPOJSONDIR := topojson
SHPNAME := untitled_table_6
DATADIR := data/untitled_table_6
SOURCES := $(patsubst $(GEOJSONDIR)/%.geojson,%,$(wildcard $(GEOJSONDIR)/*.geojson)) \

all: clean \
	geojson \
	topojson \

clean:
		@echo Cleaning file directories
		@rm -rf $(GEOJSONDIR)/* \
		@rm -rf $(TOPOJSONDIR)/*

geojsondir:
	test -d $(GEOJSONDIR) || mkdir $(GEOJSONDIR)

topojsondir:
	test -d $(TOPOJSONDIR) || mkdir $(TOPOJSONDIR)

geojson: geojsondir \

	@echo Making geojson files...
	num=$(STARTDATE) ; \
	while [ $${num} -le $(ENDDATE) ] ; do \
		start=$$num; \
		end=$$num; \
		(( start = start * 10000 + 101)) ; \
		(( end = end + 10)) ; \
		(( end = end * 10000 + 101)) ; \
		query="SELECT * FROM $(SHPNAME) WHERE start_n >= $$start AND start_n < $$end"; \
		if [ $$num = $(STARTDATE) ] ; then \
		query="SELECT * FROM $(SHPNAME) WHERE start_n < $$end AND end_n > $$start"; \
		elif [ $$num = $(ENDDATE) ] ; then \
			query="SELECT * FROM $(SHPNAME) WHERE start_n >= $$start AND start_n < $$end"; \
		fi; \
		echo "$$query"; \
		$(OGR2OGR) -f GeoJSON  -sql "$$query" $(GEOJSONDIR)/$$num.geojson $(DATADIR)/$(SHPNAME).shp; \
		(( num = num + 10)) ; \
	done

topojson: topojsondir \

	@echo Making topojson files...
	for f in $(SOURCES) ; do \
		topojson -q 1e5 -s 0.0000001 -p -o $(TOPOJSONDIR)/$$f".json" $(GEOJSONDIR)/$$f".geojson"; \
	done; \

topojson_alt: topojsondir \

	for f in $(SOURCES) ; do \
		$(TOPOJSON) -q 60000 --simplify-proportion 0.7 -p -o $(TOPOJSONDIR)/$$f".json" $(GEOJSONDIR)/$$f".geojson"; \
	done; \


