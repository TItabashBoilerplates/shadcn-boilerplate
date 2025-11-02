usage: sqlacodegen [-h] [--options OPTIONS] [--version] [--schemas SCHEMAS]
                   [--generator {dataclasses,declarative,sqlmodels,tables}]
                   [--tables TABLES] [--noviews] [--outfile OUTFILE]
                   [url]

Generates SQLAlchemy model code from an existing database.

positional arguments:
  url                   SQLAlchemy url to the database

options:
  -h, --help            show this help message and exit
  --options OPTIONS     options (comma-delimited) passed to the generator
                        class
  --version             print the version number and exit
  --schemas SCHEMAS     load tables from the given schemas (comma-delimited)
  --generator {dataclasses,declarative,sqlmodels,tables}
                        generator class to use
  --tables TABLES       tables to process (comma-delimited, default: all)
  --noviews             ignore views (always true for sqlmodels generator)
  --outfile OUTFILE     file to write output to (default: stdout)
